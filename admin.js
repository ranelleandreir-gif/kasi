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