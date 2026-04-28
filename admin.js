import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const userList = document.getElementById("userList");

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

      // approve
      div.querySelector(".approve").onclick = async () => {
        await updateDoc(doc(db, "users", docSnap.id), {
          status: "approved"
        });
        loadUsers();
      };

      // reject
      div.querySelector(".reject").onclick = async () => {
        await updateDoc(doc(db, "users", docSnap.id), {
          status: "rejected"
        });
        loadUsers();
      };

      userList.appendChild(div);
    }
  });

  document.getElementById("totalUsers").innerText = total;
  document.getElementById("pending").innerText = pending;
  document.getElementById("cashiers").innerText = cashiers;
}

loadUsers();