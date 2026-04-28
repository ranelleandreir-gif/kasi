import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  onSnapshot,
  updateDoc,
  doc,
  serverTimestamp,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const list = document.getElementById("list");

// 👤 current collector (from login)
const collectorId = localStorage.getItem("uid");


// ==========================
// ➕ ADD TASK (ADMIN ONLY USE)
// ==========================
window.addTask = async function () {

  const name = document.getElementById("name").value;
  const address = document.getElementById("address").value;
  const note = document.getElementById("note").value;
  const assignedCollectorId = document.getElementById("collectorId").value;

  if (!name || !address || !assignedCollectorId) {
    alert("Fill required fields");
    return;
  }

  await addDoc(collection(db, "collections"), {
    name,
    address,
    note,
    assignedCollectorId,
    status: "pending",
    createdAt: serverTimestamp()
  });

  alert("Task assigned!");
};


// ==========================
// 📡 REAL-TIME LOAD (COLLECTOR ONLY)
// ==========================
function loadTasks() {

  const q = query(
    collection(db, "collections"),
    where("assignedCollectorId", "==", collectorId)
  );

  onSnapshot(q, (snapshot) => {

    list.innerHTML = "";

    snapshot.forEach((docSnap) => {

      const data = docSnap.data();

      const div = document.createElement("div");
      div.className = "card";

      div.innerHTML = `
        <h3>${data.name}</h3>
        <p>📍 ${data.address}</p>
        <p>📝 ${data.note || "No notes"}</p>
        <p>Status: ${data.status}</p>

        <button class="done">Mark Collected</button>
        <button class="pending">Mark Pending</button>
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