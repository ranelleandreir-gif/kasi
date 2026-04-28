import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const list = document.getElementById("list");

// ➕ ADD TASK
window.addTask = async function () {

  const name = document.getElementById("name").value;
  const address = document.getElementById("address").value;
  const note = document.getElementById("note").value;

  if (!name || !address) {
    alert("Fill required fields");
    return;
  }

  await addDoc(collection(db, "collections"), {
    name,
    address,
    note,
    status: "pending",
    createdAt: serverTimestamp()
  });

  loadTasks();
};

// 📋 LOAD TASKS
async function loadTasks() {

  const snap = await getDocs(collection(db, "collections"));

  list.innerHTML = "";

  snap.forEach((docSnap) => {

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

    // ✔ mark collected
    div.querySelector(".done").onclick = async () => {
      await updateDoc(doc(db, "collections", docSnap.id), {
        status: "collected"
      });
      loadTasks();
    };

    // ⏳ mark pending
    div.querySelector(".pending").onclick = async () => {
      await updateDoc(doc(db, "collections", docSnap.id), {
        status: "pending"
      });
      loadTasks();
    };

    list.appendChild(div);
  });
}

loadTasks();