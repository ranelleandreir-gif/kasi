import { db, auth } from "./firebase.js";
import {
  collection,
  onSnapshot,
  updateDoc,
  doc,
  serverTimestamp,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const list = document.getElementById("list");

// 👤 CURRENT COLLECTOR
const collectorId = localStorage.getItem("uid");

if (!collectorId) {
  alert("No collector login detected");
  window.location.href = "login.html";
}

// =====================
// 🎯 ACTION OVERLAY
// =====================
function runAction(title, message, action) {
  const overlay = document.getElementById("actionOverlay");
  const titleEl = document.getElementById("actionTitle");
  const messageEl = document.getElementById("actionMessage");

  titleEl.textContent = title;
  messageEl.textContent = message;
  overlay.classList.add("active");

  setTimeout(() => {
    action().then(() => {
      overlay.classList.remove("active");
    }).catch((error) => {
      console.error("Action failed:", error);
      overlay.classList.remove("active");
    });
  }, 500);
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
        <div class="item-title">
          <h3>👤 ${d.borrowerName}</h3>
          <span class="badge ${d.status === 'collected' ? 'collected' : 'unpaid'}">${d.status === 'collected' ? '📦 Collected' : '⏳ Unpaid'}</span>
        </div>
        <div class="row">
          <span>💰 Amount: ₱${d.amount}</span>
          <span>⏰ Balance: ₱${d.balance}</span>
        </div>
        <div class="row">
          <span>📍 Address: ${d.address || "No address"}</span>
        </div>
        <div class="row">
          <button class="collected" onclick="markCollected('${docSnap.id}')">✔ Collected</button>
          <button class="unpaid" onclick="markUnpaid('${docSnap.id}')">⏳ Unpaid</button>
        </div>
      `;

      list.appendChild(div);
    });
  });
}

// =====================
// 🎯 MARK FUNCTIONS
// =====================
window.markCollected = async (loanId) => {
  runAction("Marking as Collected", "Updating loan status for cashier review...", async () => {
    await updateDoc(doc(db, "loans", loanId), {
      status: "collected",
      collectedAt: serverTimestamp()
    });
  });
};

window.markUnpaid = async (loanId) => {
  runAction("Marking as Unpaid", "Updating loan status...", async () => {
    await updateDoc(doc(db, "loans", loanId), {
      status: "unpaid"
    });
  });
};

loadTasks();

// =====================
// 🚪 LOGOUT
// =====================
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const auth = getAuth();

// global logout (para gumana sa onclick)
window.logout = () => {
  if (!auth) {
    console.error("Auth not initialized");
    window.location.href = "role-selector.html";
    return;
  }

  signOut(auth)
    .then(() => {
      console.log("User logged out");
      window.location.href = "role-selector.html";
    })
    .catch((error) => {
      console.error("Logout error:", error);
      window.location.href = "role-selector.html";
    });
};