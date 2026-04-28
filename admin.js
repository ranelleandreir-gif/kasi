import { auth, db } from "./firebase.js";
import {
  collection,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const usersDiv = document.getElementById("users");
const tasksDiv = document.getElementById("tasks");

// 🔐 ADMIN CHECK
onAuthStateChanged(auth, async (user) => {

  if (!user) {
    window.location.href = "login.html";
    return;
  }

  loadUsers();
  loadTasks();
  loadAnalytics();
});


// 👤 USERS (REAL TIME)
function loadUsers() {

  const q = query(collection(db, "users"));

  onSnapshot(q, (snapshot) => {

    usersDiv.innerHTML = "<h2>👤 USERS (LIVE)</h2>";

    snapshot.forEach((docSnap) => {

      const data = docSnap.data();

      const div = document.createElement("div");
      div.style.padding = "10px";
      div.style.margin = "10px";
      div.style.borderRadius = "8px";
      div.style.background = "rgba(255,255,255,0.08)";

      div.innerHTML = `
        <p>${data.email}</p>
        <p>Role: ${data.role}</p>
        <p>Status: ${data.status || "none"}</p>

        <button onclick="setRole('${docSnap.id}','cashier')">Cashier</button>
        <button onclick="setRole('${docSnap.id}','collector')">Collector</button>
        <button onclick="approveUser('${docSnap.id}')">Approve</button>
        <button onclick="removeUser('${docSnap.id}')">Delete</button>
      `;

      usersDiv.appendChild(div);
    });
  });
}


// 📦 TASKS (REAL TIME)
function loadTasks() {

  const q = query(collection(db, "collections"));

  onSnapshot(q, (snapshot) => {

    tasksDiv.innerHTML = "<h2>📦 TASKS (LIVE)</h2>";

    snapshot.forEach((docSnap) => {

      const data = docSnap.data();

      const div = document.createElement("div");
      div.style.padding = "10px";
      div.style.margin = "10px";
      div.style.borderRadius = "8px";
      div.style.background = "rgba(255,255,255,0.08)";

      div.innerHTML = `
        <p>${data.name || "No Name"}</p>
        <p>Status: ${data.status || "pending"}</p>
        <button onclick="deleteTask('${docSnap.id}')">Delete</button>
      `;

      tasksDiv.appendChild(div);
    });
  });
}


// 📊 ANALYTICS (REAL TIME FIXED)
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


// 🔥 ACTIONS
window.setRole = async (id, role) => {
  await updateDoc(doc(db, "users", id), { role });
};

window.approveUser = async (id) => {
  await updateDoc(doc(db, "users", id), { status: "approved" });
};

window.removeUser = async (id) => {
  await deleteDoc(doc(db, "users", id));
};

window.deleteTask = async (id) => {
  await deleteDoc(doc(db, "collections", id));
};

import { doc, updateDoc, getDocs, collection } 
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

window.approveUser = async function (id, role) {

  const snap = await getDocs(collection(db, "users"));

  let count = 0;

  snap.forEach((d) => {
    const u = d.data();
    if (u.role === role && u.status === "approved") {
      count++;
    }
  });

  let assignedName =
    role === "cashier"
      ? `cashier${count + 1}`
      : `collector${count + 1}`;

  await updateDoc(doc(db, "users", id), {
    status: "approved",
    assignedName
  });

  alert("Approved!");
};

window.approveUser = async function (id, role) {

  const snap = await getDocs(collection(db, "users"));

  let count = 0;

  snap.forEach(d => {
    const u = d.data();
    if (u.role === role && u.status === "approved") {
      count++;
    }
  });

  let assignedName =
    role === "cashier"
      ? `cashier${count + 1}`
      : `collector${count + 1}`;

  await updateDoc(doc(db, "users", id), {
    status: "approved",
    assignedName
  });

  alert("Approved!");
};