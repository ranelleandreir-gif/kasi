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

async function enforceCollectorAccess() {
  const user = auth.currentUser;
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const snap = await getDoc(doc(db, "users", user.uid));
  const userData = snap.data() || {};

  if (userData.role !== "collector") {
    alert("This account is not allowed to access the collector portal.");
    await signOut(auth);
    window.location.href = "role-selector.html";
    return;
  }
}

enforceCollectorAccess();

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
    where("assignedCollectorId", "==", collectorId),
    where("status", "in", ["assigned", "collected", "unpaid"])
  );

  onSnapshot(q, (snapshot) => {

    list.innerHTML = "";

    if (snapshot.empty) {
      list.innerHTML = "<p>📭 No assigned tasks</p>";
      return;
    }

    snapshot.forEach((docSnap) => {
      const d = docSnap.data();
      const statusLabel = d.status === "collected"
        ? "📦 Collected"
        : d.status === "unpaid"
        ? "⏳ Unpaid"
        : "📝 Assigned";
      const statusClass = d.status === "collected" ? "collected" : "unpaid";

      const div = document.createElement("div");
      div.className = "card";

      div.innerHTML = `
        <div class="item-title">
          <h3>👤 ${d.borrowerName}</h3>
          <span class="badge ${statusClass}">${statusLabel}</span>
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