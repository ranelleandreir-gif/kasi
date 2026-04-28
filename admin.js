import { auth, db } from "./firebase.js";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const userList = document.getElementById("userList");

// 🔐 ADMIN GUARD (SECURITY FIX)
onAuthStateChanged(auth, async (user) => {

  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const adminSnap = await getDoc(doc(db, "users", user.uid));

  if (!adminSnap.exists() || adminSnap.data().role !== "admin") {
    alert("Access denied");
    window.location.href = "login.html";
    return;
  }

  loadUsers(); // run only if admin
});

// 📊 LOAD USERS
async function loadUsers() {

  const snapshot = await getDocs(collection(db, "users"));

  let total = 0;
  let pending = 0;
  let cashiers = 0;

  userList.innerHTML = "";

  snapshot.forEach((docSnap) => {

    const data = docSnap.data();
    total++;

    if (data.status === "pending") pending++;
    if (data.role === "cashier") cashiers++;

    // show only pending users
    if (data.status === "pending") {

      const div = document.createElement("div");
      div.className = "user-card";

      div.innerHTML = `
        <span>${data.email || "No Email"} - ${data.role}</span>
        <div>
          <button class="approve">Approve</button>
          <button class="reject">Reject</button>
        </div>
      `;

      const approveBtn = div.querySelector(".approve");
      const rejectBtn = div.querySelector(".reject");

      // ✅ APPROVE
      approveBtn.onclick = async () => {
        approveBtn.disabled = true;

        await updateDoc(doc(db, "users", docSnap.id), {
          status: "approved"
        });

        loadUsers();
      };

      // ❌ REJECT
      rejectBtn.onclick = async () => {
        rejectBtn.disabled = true;

        await updateDoc(doc(db, "users", docSnap.id), {
          status: "rejected"
        });

        loadUsers();
      };

      userList.appendChild(div);
    }
  });

  // 📊 COUNTERS
  document.getElementById("totalUsers").innerText = total;
  document.getElementById("pending").innerText = pending;
  document.getElementById("cashiers").innerText = cashiers;

  // 🧠 EMPTY STATE FIX
  if (!userList.hasChildNodes()) {
    userList.innerHTML = "<p>No pending users</p>";
  }
}
