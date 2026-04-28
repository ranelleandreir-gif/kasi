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

// ❗ SAFETY CHECK
if (!collectorId) {
  alert("No collector login detected");
  window.location.href = "login.html";
}


// ==========================
// 📡 REAL TIME TASKS (ONLY MINE)
// ==========================
function loadTasks() {

  const q = query(
    collection(db, "collections"),
    where("assignedCollectorId", "==", collectorId)
  );

  onSnapshot(q, (snapshot) => {

    list.innerHTML = "";

    if (snapshot.empty) {
      list.innerHTML = "<p>No assigned tasks</p>";
      return;
    }

    snapshot.forEach((docSnap) => {

      const d = docSnap.data();

      const div = document.createElement("div");
      div.className = "card";

      div.innerHTML = `
        <h3>${d.name}</h3>
        <p>📍 ${d.address}</p>
        <p>📝 ${d.note || "No notes"}</p>
        <p>Status: <b>${d.status}</b></p>

        <button class="done">✔ Mark Collected</button>
        <button class="pending">⏳ Mark Pending</button>
      `;

      // ✔ collected
      div.querySelector(".done").onclick = async () => {
        await updateDoc(doc(db, "collections", docSnap.id), {
          status: "collected",
          collectedAt: serverTimestamp()
        });
      };

      // ⏳ pending
      div.querySelector(".pending").onclick = async () => {
        await updateDoc(doc(db, "collections", docSnap.id), {
          status: "pending"
        });
      };

      list.appendChild(div);
    });
  });
}

loadTasks();