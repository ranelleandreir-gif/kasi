import { db } from "./firebase.js";
import {
  collection,
  onSnapshot,
  updateDoc,
  doc,
  serverTimestamp,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const list = document.getElementById("list");

// 👤 CURRENT COLLECTOR
const collectorId = localStorage.getItem("uid");

if (!collectorId) {
  alert("No collector login detected");
  window.location.href = "login.html";
}

// ==========================
// 📡 REAL TIME LOANS (ASSIGNED ONLY)
// ==========================
function loadTasks() {

  const q = query(
    collection(db, "loans"),
    where("assignedCollectorId", "==", collectorId)
  );

  onSnapshot(q, (snapshot) => {

    list.innerHTML = "";

    if (snapshot.empty) {
      list.innerHTML = "<p>📭 No assigned tasks</p>";
      return;
    }

    snapshot.forEach((docSnap) => {

      const d = docSnap.data();

      const div = document.createElement("div");
      div.className = "card";

      div.innerHTML = `
        <h3>👤 ${d.borrowerName}</h3>
        <p>💰 ₱${d.amount}</p>
        <p>📍 Address: ${d.address || "No address"}</p>
        <p>📦 Status: <b>${d.status}</b></p>
        <p>⏰ Balance: ₱${d.balance}</p>

        <button class="done">✔ Collected</button>
        <button class="pending">⏳ Unpaid</button>
      `;

      div.querySelector(".done").onclick = async () => {
        await updateDoc(doc(db, "loans", docSnap.id), {
          status: "collected",
          collectedAt: serverTimestamp()
        });
        alert("Marked as collected! Cashier will confirm payment.");
      };

      div.querySelector(".pending").onclick = async () => {
        await updateDoc(doc(db, "loans", docSnap.id), {
          status: "unpaid"
        });
        alert("Marked as unpaid.");
      };

      list.appendChild(div);
    });
  });
}

loadTasks();