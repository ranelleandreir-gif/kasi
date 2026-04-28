import { auth, db } from "./firebase.js";
import {
  collection,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  getDocs,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { onAuthStateChanged } 
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const usersDiv = document.getElementById("users");
const tasksDiv = document.getElementById("tasks");

// =====================
// 🔐 ADMIN CHECK
// =====================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  loadUsers();
  loadTasks();
  loadAnalytics();
});


// =====================
// 👤 USERS REAL-TIME
// =====================
function loadUsers() {

  onSnapshot(query(collection(db, "users")), (snapshot) => {

    usersDiv.innerHTML = "<h2>👤 USERS (LIVE)</h2>";

    snapshot.forEach((docSnap) => {

      const d = docSnap.data();

      const div = document.createElement("div");
      div.style.padding = "10px";
      div.style.margin = "10px";
      div.style.borderRadius = "8px";
      div.style.background = "rgba(255,255,255,0.08)";

      div.innerHTML = `
        <p>Email: ${d.email}</p>
        <p>Role: ${d.role}</p>
        <p>Status: ${d.status || "pending"}</p>
        <p>Assigned: ${d.assignedName || "-"}</p>

        <button onclick="approveUser('${docSnap.id}','${d.role}')">Approve</button>
        <button onclick="setRole('${docSnap.id}','cashier')">Cashier</button>
        <button onclick="setRole('${docSnap.id}','collector')">Collector</button>
        <button onclick="removeUser('${docSnap.id}')">Delete</button>
      `;

      usersDiv.appendChild(div);
    });
  });
}


// =====================
// 📦 TASKS REAL-TIME
// =====================
function loadTasks() {

  onSnapshot(query(collection(db, "loans")), (snapshot) => {

    tasksDiv.innerHTML = "<h2>📦 LOANS (LIVE)</h2>";

    snapshot.forEach((docSnap) => {

      const d = docSnap.data();

      const div = document.createElement("div");
      div.style.padding = "10px";
      div.style.margin = "10px";
      div.style.borderRadius = "8px";
      div.style.background = "rgba(255,255,255,0.08)";

      div.innerHTML = `
        <p>${d.borrowerName}</p>
        <p>Balance: ${d.balance}</p>
        <p>Collector: ${d.assignedCollectorName}</p>
        <button onclick="deleteTask('${docSnap.id}')">Delete</button>
      `;

      tasksDiv.appendChild(div);
    });
  });
}


// =====================
// 📊 ANALYTICS REAL-TIME
// =====================
function loadAnalytics() {

  onSnapshot(collection(db, "users"), (snap) => {

    let total = 0;
    let pending = 0;
    let approved = 0;
    let cashiers = 0;
    let collectors = 0;

    snap.forEach(doc => {
      const d = doc.data();

      total++;

      if (d.status === "pending") pending++;
      if (d.status === "approved") approved++;

      if (d.role === "cashier") cashiers++;
      if (d.role === "collector") collectors++;
    });

    document.getElementById("totalUsers").innerText = total;
    document.getElementById("pending").innerText = pending;
    document.getElementById("approved").innerText = approved;
    document.getElementById("cashiers").innerText = cashiers;
    document.getElementById("collectors").innerText = collectors;
  });
}


// =====================
// 🔥 APPROVE USER (AUTO NAME)
// =====================
window.approveUser = async (id, role) => {

  const snap = await getDocs(collection(db, "users"));

  let count = 0;

  snap.forEach((d) => {
    const u = d.data();
    if (u.role === role && u.status === "approved") {
      count++;
    }
  });

  const assignedName =
    role === "cashier"
      ? `cashier${count + 1}`
      : `collector${count + 1}`;

  await updateDoc(doc(db, "users", id), {
    status: "approved",
    assignedName
  });

  alert("User Approved: " + assignedName);
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
window.deleteTask = async (id) => {
  await deleteDoc(doc(db, "loans", id));
};


// =====================
// 💰 CREATE LOAN (ADMIN)
// =====================
window.createLoan = async () => {

  const name = document.getElementById("borrowerName").value;
  const amount = Number(document.getElementById("amount").value);
  const collectorId = document.getElementById("collectorSelect").value;
  const collectorName = document.getElementById("collectorName").value;

  if (!name || !amount || !collectorId) {
    alert("Fill all fields");
    return;
  }

  await addDoc(collection(db, "loans"), {
    borrowerName: name,
    amount,
    balance: amount,
    assignedCollectorId: collectorId,
    assignedCollectorName: collectorName,
    status: "active",
    createdAt: serverTimestamp()
  });

  alert("Loan Created!");
};