import { auth, db } from "./firebase.js";
import {
  collection,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { onAuthStateChanged } 
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const usersDiv = document.getElementById("users");
const loansDiv = document.getElementById("tasks");


// =====================
// 🔐 ADMIN CHECK
// =====================
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  loadUsers();
  loadLoans();
  loadAnalytics();
});


// =====================
// 👤 USERS
// =====================
function loadUsers() {

  onSnapshot(collection(db, "users"), (snapshot) => {

    usersDiv.innerHTML = "<h2>👤 USERS</h2>";

    snapshot.forEach((docSnap) => {

      const u = docSnap.data();

      const div = document.createElement("div");
      div.className = "user";

      div.innerHTML = `
        <b>${u.name}</b><br>
        ${u.email}<br>
        ${u.role} | ${u.status}<br>
        ${u.assignedName || "-"}

        <br><br>
        <button onclick="approveUser('${docSnap.id}','${u.role}')">Approve</button>
        <button onclick="setRole('${docSnap.id}','cashier')">Cashier</button>
        <button onclick="setRole('${docSnap.id}','collector')">Collector</button>
        <button onclick="removeUser('${docSnap.id}')">Delete</button>
      `;

      usersDiv.appendChild(div);
    });
  });
}


// =====================
// 📦 LOANS
// =====================
function loadLoans() {

  onSnapshot(collection(db, "loans"), (snapshot) => {

    loansDiv.innerHTML = "<h2>📦 LOANS</h2>";

    snapshot.forEach((docSnap) => {

      const l = docSnap.data();

      const div = document.createElement("div");

      div.innerHTML = `
        <b>${l.borrowerName}</b><br>
        ₱${l.balance} | ${l.status}<br>
        Collector: ${l.assignedCollectorName}<br><br>

        <button onclick="deleteLoan('${docSnap.id}')">Delete</button>
      `;

      loansDiv.appendChild(div);
    });
  });
}


// =====================
// 📊 ANALYTICS
// =====================
function loadAnalytics() {

  onSnapshot(collection(db, "users"), (snap) => {

    let total = 0;
    let pending = 0;
    let approved = 0;
    let cashiers = 0;
    let collectors = 0;

    snap.forEach(d => {

      const u = d.data();
      total++;

      if (u.status === "pending") pending++;
      if (u.status === "approved") approved++;

      if (u.role === "cashier") cashiers++;
      if (u.role === "collector") collectors++;
    });

    document.getElementById("totalUsers").innerText = total;
    document.getElementById("pending").innerText = pending;
    document.getElementById("approved").innerText = approved;
    document.getElementById("cashiers").innerText = cashiers;
    document.getElementById("collectors").innerText = collectors;
  });
}


// =====================
// 🔥 APPROVE USER
// =====================
window.approveUser = async (id, role) => {

  const snap = await getDocs(collection(db, "users"));

  let count = 0;

  snap.forEach(d => {
    const u = d.data();
    if (u.role === role && u.status === "approved") count++;
  });

  const assigned =
    role === "cashier"
      ? `cashier${count + 1}`
      : `collector${count + 1}`;

  await updateDoc(doc(db, "users", id), {
    status: "approved",
    assignedName: assigned
  });

  alert("Approved: " + assigned);
};


// =====================
// 🔧 CHANGE ROLE
// =====================
window.setRole = async (id, role) => {
  await updateDoc(doc(db, "users", id), { role });
};


// =====================
// ❌ DELETE USER
// =====================
window.removeUser = async (id) => {
  await deleteDoc(doc(db, "users", id));
};


// =====================
// ❌ DELETE LOAN
// =====================
window.deleteLoan = async (id) => {
  await deleteDoc(doc(db, "loans", id));
};


// =====================
// 💰 CREATE LOAN (AUTO ASSIGN COLLECTOR)
// =====================
window.createLoan = async () => {

  const name = document.getElementById("borrowerName").value;
  const amount = Number(document.getElementById("amount").value);

  if (!name || !amount) {
    alert("Fill all fields");
    return;
  }

  const snap = await getDocs(collection(db, "users"));

  let collectors = [];

  snap.forEach(d => {
    const u = d.data();
    if (u.role === "collector" && u.status === "approved") {
      collectors.push({
        id: d.id,
        name: u.assignedName
      });
    }
  });

  if (collectors.length === 0) {
    alert("No collectors available");
    return;
  }

  // 🔥 RANDOM ASSIGN
  const assigned = collectors[Math.floor(Math.random() * collectors.length)];

  await addDoc(collection(db, "loans"), {
    borrowerName: name,
    amount,
    balance: amount,
    status: "active",
    assignedCollectorId: assigned.id,
    assignedCollectorName: assigned.name,
    createdAt: serverTimestamp()
  });

  alert("Loan assigned to " + assigned.name);
};

import { db } from "./firebase.js";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================
   📦 LIVE LOANS
========================= */
onSnapshot(collection(db, "loans"), (snap) => {

  const list = document.getElementById("loansList");
  list.innerHTML = "";

  snap.forEach((d) => {

    const l = d.data();

    const div = document.createElement("div");
    div.className = "box";

    div.innerHTML = `
      <b>👤 Borrower:</b> ${l.borrowerName}<br>
      💰 Amount: ₱${l.amount || 0}<br>
      📉 Balance: ₱${l.balance || 0}<br>
      📦 Status: ${l.status || "active"}<br>
      👷 Collector: ${l.assignedCollectorName || "none"}<br><br>

      <button class="approve">Mark Paid</button>
      <button class="delete">Delete</button>
    `;

    /* ✔ MARK PAID */
    div.querySelector(".approve").onclick = async () => {
      await updateDoc(doc(db, "loans", d.id), {
        status: "paid",
        balance: 0
      });

      toast("Loan marked as PAID");
    };

    /* ❌ DELETE */
    div.querySelector(".delete").onclick = async () => {
      await deleteDoc(doc(db, "loans", d.id));
      toast("Loan deleted");
    };

    list.appendChild(div);
  });

});

import { onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

onSnapshot(collection(db,"users"), (snap)=>{

  let total=0, pending=0, approved=0, cashiers=0, collectors=0;

  snap.forEach(d=>{
    const u=d.data();

    total++;
    if(u.status==="pending") pending++;
    if(u.status==="approved") approved++;
    if(u.role==="cashier") cashiers++;
    if(u.role==="collector") collectors++;
  });

  document.getElementById("total").innerText=total;
  document.getElementById("pending").innerText=pending;
  document.getElementById("approved").innerText=approved;
  document.getElementById("cashiers").innerText=cashiers;
  document.getElementById("collectors").innerText=collectors;

});

// =========================
// 👷 LOAD COLLECTORS DROPDOWN
// =========================
onSnapshot(collection(db,"users"), (snap)=>{

  const select = document.getElementById("collectorSelect");

  if(!select) return;

  select.innerHTML = `<option value="">Select Collector</option>`;

  snap.forEach(d=>{
    const u = d.data();

    if(u.role === "collector" && u.status === "approved"){

      const option = document.createElement("option");
      option.value = d.id;
      option.textContent = u.assignedName || u.name;

      select.appendChild(option);
    }
  });
});


// =========================
// 💰 CREATE LOAN FUNCTION
// =========================
window.createLoan = async () => {

  const name = document.getElementById("borrowerName").value;
  const amount = Number(document.getElementById("amount").value);
  const collectorId = document.getElementById("collectorSelect").value;

  if(!name || !amount || !collectorId){
    alert("Fill all fields");
    return;
  }

  // get collector name
  const snap = await getDocs(collection(db,"users"));
  let collectorName = "";

  snap.forEach(d=>{
    if(d.id === collectorId){
      collectorName = d.data().assignedName || d.data().name;
    }
  });

  await addDoc(collection(db,"loans"),{
    borrowerName:name,
    amount,
    balance:amount,
    status:"active",
    assignedCollectorId:collectorId,
    assignedCollectorName:collectorName,
    createdAt:serverTimestamp()
  });

  alert("Loan Created Successfully!");
};