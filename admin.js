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

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// DOM
const usersDiv = document.getElementById("users");
const loansDiv = document.getElementById("loans");

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
  loadCollectorsDropdown();
});


// =====================
// 👤 USERS REALTIME
// =====================
function loadUsers() {

  onSnapshot(collection(db, "users"), (snap) => {

    usersDiv.innerHTML = "";

    let total = 0, pending = 0, approved = 0, cashiers = 0, collectors = 0;

    snap.forEach(d => {

      const u = d.data();
      total++;

      if (u.status === "pending") pending++;
      if (u.status === "approved") approved++;
      if (u.role === "cashier") cashiers++;
      if (u.role === "collector") collectors++;

      const div = document.createElement("div");
      div.className = "item";

      div.innerHTML = `
        <b>${u.name}</b><br>
        ${u.email}<br>
        Role: ${u.role} | ${u.status}<br>
        Assigned: ${u.assignedName || "-"}

        <br><br>
        <button class="approve" onclick="approveUser('${d.id}','${u.role}')">Approve</button>
        <button class="reject" onclick="rejectUser('${d.id}')">Reject</button>
        <button class="blue" onclick="setRole('${d.id}','cashier')">Cashier</button>
        <button class="blue" onclick="setRole('${d.id}','collector')">Collector</button>
        <button class="reject" onclick="removeUser('${d.id}')">Delete</button>
      `;

      usersDiv.appendChild(div);
    });

    // dashboard counters
    document.getElementById("totalUsers").innerText = total;
    document.getElementById("pending").innerText = pending;
    document.getElementById("approved").innerText = approved;
    document.getElementById("cashiers").innerText = cashiers;
    document.getElementById("collectors").innerText = collectors;
  });
}


// =====================
// 📦 LOANS REALTIME
// =====================
function loadLoans() {

  onSnapshot(collection(db, "loans"), (snap) => {

    loansDiv.innerHTML = "";

    snap.forEach(d => {

      const l = d.data();

      const div = document.createElement("div");
      div.className = "item";

      div.innerHTML = `
        <b>👤 ${l.borrowerName}</b><br>
        💰 ₱${l.amount} | Balance ₱${l.balance}<br>
        📦 ${l.status}<br>
        👷 ${l.assignedCollectorName || "-"}

        <br><br>
        <button class="approve" onclick="markPaid('${d.id}')">Mark Paid</button>
        <button class="reject" onclick="deleteLoan('${d.id}')">Delete</button>
      `;

      loansDiv.appendChild(div);
    });
  });
}


// =====================
// 👷 COLLECTOR DROPDOWN
// =====================
function loadCollectorsDropdown() {

  onSnapshot(collection(db, "users"), (snap) => {

    const select = document.getElementById("collectorSelect");
    if (!select) return;

    select.innerHTML = `<option value="">Select Collector</option>`;

    snap.forEach(d => {
      const u = d.data();

      if (u.role === "collector" && u.status === "approved") {
        const opt = document.createElement("option");
        opt.value = d.id;
        opt.textContent = u.assignedName || u.name;
        select.appendChild(opt);
      }
    });
  });
}


// =====================
// 🔥 APPROVE USER (AUTO NAME)
// =====================
window.approveUser = async (id, role) => {

  const snap = await getDocs(collection(db, "users"));

  let count = 0;

  snap.forEach(d => {
    const u = d.data();
    if (u.role === role && u.status === "approved") count++;
  });

  const assignedName =
    role === "cashier"
      ? `cashier${count + 1}`
      : `collector${count + 1}`;

  await updateDoc(doc(db, "users", id), {
    status: "approved",
    assignedName
  });

  alert("Approved: " + assignedName);
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
// 💰 CREATE LOAN (WORKING)
// =====================
window.createLoan = async () => {

  const name = document.getElementById("borrowerName").value.trim();
  const amount = Number(document.getElementById("amount").value);
  const collectorId = document.getElementById("collectorSelect").value;

  if (!name || !amount || !collectorId) {
    alert("Fill all fields");
    return;
  }

  const snap = await getDocs(collection(db, "users"));

  let collectorName = "";

  snap.forEach(d => {
    if (d.id === collectorId) {
      collectorName = d.data().assignedName || d.data().name;
    }
  });

  await addDoc(collection(db, "loans"), {
    borrowerName: name,
    amount,
    balance: amount,
    status: "active",
    assignedCollectorId: collectorId,
    assignedCollectorName: collectorName,
    createdAt: serverTimestamp()
  });

  alert("Loan Created!");
};


// =====================
// 💰 MARK PAID
// =====================
window.markPaid = async (id) => {
  await updateDoc(doc(db, "loans", id), {
    status: "paid",
    balance: 0
  });
};