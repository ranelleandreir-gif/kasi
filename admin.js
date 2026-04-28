import { auth, db } from "./firebase.js";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


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
// 📊 ANALYTICS
// =====================
function loadAnalytics() {
  onSnapshot(collection(db, "users"), (snap) => {

    let total = 0, pending = 0, approved = 0, cashiers = 0, collectors = 0;

    snap.forEach(d => {
      const u = d.data();
      total++;

      if (u.status === "pending") pending++;
      if (u.status === "approved") approved++;
      if (u.role === "cashier") cashiers++;
      if (u.role === "collector") collectors++;
    });

    setText("totalUsers", total);
    setText("pending", pending);
    setText("approved", approved);
    setText("cashiers", cashiers);
    setText("collectors", collectors);
  });
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.innerText = val;
}


// =====================
// 👤 USERS (FOLDER SYSTEM)
// =====================
function loadUsers() {

  onSnapshot(collection(db, "users"), (snap) => {

    const usersBox = document.getElementById("users");
    if (!usersBox) return;

    usersBox.innerHTML = "";

    // 🗂 GROUPED FOLDERS
    const folders = {
      admin: [],
      cashier: [],
      collector: [],
      pending: []
    };

    snap.forEach(d => {
      const u = d.data();

      if (u.status === "pending") folders.pending.push({ id: d.id, ...u });
      else folders[u.role]?.push({ id: d.id, ...u });
    });

    renderFolder("🟡 PENDING USERS", folders.pending, usersBox);
    renderFolder("💰 CASHIERS", folders.cashier, usersBox);
    renderFolder("🚚 COLLECTORS (RIDERS)", folders.collector, usersBox);
    renderFolder("👑 ADMIN", folders.admin, usersBox);
  });
}


// =====================
// 📁 USER FOLDER RENDER
// =====================
function renderFolder(title, list, parent) {

  const box = document.createElement("div");
  box.style.margin = "15px 0";
  box.style.padding = "10px";
  box.style.background = "rgba(255,255,255,0.05)";
  box.style.borderRadius = "10px";

  box.innerHTML = `<h3>${title} (${list.length})</h3>`;

  list.forEach(u => {

    const div = document.createElement("div");
    div.style.padding = "10px";
    div.style.margin = "8px 0";
    div.style.background = "rgba(255,255,255,0.06)";
    div.style.borderRadius = "8px";

    div.innerHTML = `
      <b>${u.name || "No Name"}</b><br>
      ${u.email}<br>
      Role: ${u.role} | Status: ${u.status}<br>
      Assigned: ${u.assignedName || "-"}<br><br>

      <button onclick="approveUser('${u.id}','${u.role}')">Approve</button>
      <button onclick="setRole('${u.id}','cashier')">Cashier</button>
      <button onclick="setRole('${u.id}','collector')">Collector</button>
      <button onclick="deleteUser('${u.id}')">Delete</button>
    `;

    box.appendChild(div);
  });

  parent.appendChild(box);
}


// =====================
// 📦 BORROWERS / LOANS FOLDER
// =====================
function loadLoans() {

  onSnapshot(collection(db, "loans"), (snap) => {

    const loansBox = document.getElementById("loans");
    if (!loansBox) return;

    loansBox.innerHTML = "";

    const active = [];
    const paid = [];

    snap.forEach(d => {
      const l = d.data();
      if (l.status === "paid") paid.push({ id: d.id, ...l });
      else active.push({ id: d.id, ...l });
    });

    renderLoanFolder("📦 ACTIVE LOANS (BORROWERS)", active, loansBox);
    renderLoanFolder("✅ PAID LOANS", paid, loansBox);
  });
}


// =====================
// 📁 LOAN FOLDER RENDER
// =====================
function renderLoanFolder(title, list, parent) {

  const box = document.createElement("div");
  box.style.margin = "15px 0";
  box.style.padding = "10px";
  box.style.background = "rgba(255,255,255,0.05)";
  box.style.borderRadius = "10px";

  box.innerHTML = `<h3>${title} (${list.length})</h3>`;

  list.forEach(l => {

    const div = document.createElement("div");
    div.style.padding = "10px";
    div.style.margin = "8px 0";
    div.style.background = "rgba(255,255,255,0.06)";
    div.style.borderRadius = "8px";

    div.innerHTML = `
      <b>👤 ${l.borrowerName}</b><br>
      💰 ₱${l.amount} | Balance ₱${l.balance}<br>
      🚚 Collector: ${l.assignedCollectorName || "-"}<br>
      📦 Status: ${l.status}<br><br>

      <button onclick="markPaid('${l.id}')">Mark Paid</button>
      <button onclick="deleteLoan('${l.id}')">Delete</button>
    `;

    box.appendChild(div);
  });

  parent.appendChild(box);
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

  const name =
    role === "cashier"
      ? `cashier${count + 1}`
      : `collector${count + 1}`;

  await updateDoc(doc(db, "users", id), {
    status: "approved",
    assignedName: name
  });
};


// =====================
// 🔧 ROLE CHANGE
// =====================
window.setRole = async (id, role) => {
  await updateDoc(doc(db, "users", id), { role });
};


// =====================
// ❌ DELETE USER
// =====================
window.deleteUser = async (id) => {
  await deleteDoc(doc(db, "users", id));
};


// =====================
// ❌ DELETE LOAN
// =====================
window.deleteLoan = async (id) => {
  await deleteDoc(doc(db, "loans", id));
};


// =====================
// 💰 MARK PAID (CASHIER SYSTEM READY)
// =====================
window.markPaid = async (id) => {
  await updateDoc(doc(db, "loans", id), {
    status: "paid",
    balance: 0
  });
};