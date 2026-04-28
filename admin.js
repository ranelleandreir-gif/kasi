import { auth, db } from "./firebase.js";
import {
  collection,
  doc,
  updateDoc,
  deleteDoc,
  query,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const usersDiv = document.getElementById("users");
const tasksDiv = document.getElementById("tasks");


// 🔐 ADMIN PROTECTION
onAuthStateChanged(auth, async (user) => {

  if (!user) {
    window.location.href = "login.html";
    return;
  }

  loadUsers();
  loadTasks();
});


// 👤 REAL-TIME USERS
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
        <p>${data.email} - ${data.role}</p>
        <button onclick="setRole('${docSnap.id}','cashier')">Cashier</button>
        <button onclick="setRole('${docSnap.id}','collector')">Collector</button>
        <button onclick="removeUser('${docSnap.id}')">Delete</button>
      `;

      usersDiv.appendChild(div);
    });
  });
}


// 📦 REAL-TIME TASKS
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
        <p>${data.name} - ${data.status}</p>
        <button onclick="deleteTask('${docSnap.id}')">Delete</button>
      `;

      tasksDiv.appendChild(div);
    });
  });
}


// 🔥 ACTIONS
window.setRole = async (id, role) => {
  await updateDoc(doc(db, "users", id), { role });
};

window.removeUser = async (id) => {
  await deleteDoc(doc(db, "users", id));
};

window.deleteTask = async (id) => {
  await deleteDoc(doc(db, "collections", id));
};

import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let totalUsers = 0;
let pending = 0;
let approved = 0;
let cashiers = 0;
let collectors = 0;


// 👤 REAL-TIME USERS ANALYTICS
onSnapshot(collection(db, "users"), (snap) => {

  totalUsers = 0;
  pending = 0;
  approved = 0;
  cashiers = 0;
  collectors = 0;

  snap.forEach(doc => {
    const d = doc.data();
    totalUsers++;

    if (d.status === "pending") pending++;
    if (d.status === "approved") approved++;

    if (d.role === "cashier") cashiers++;
    if (d.role === "collector") collectors++;
  });

  // UPDATE UI
  document.getElementById("totalUsers").innerText = totalUsers;
  document.getElementById("pending").innerText = pending;
  document.getElementById("approved").innerText = approved;
  document.getElementById("cashiers").innerText = cashiers;
  document.getElementById("collectors").innerText = collectors;
});
