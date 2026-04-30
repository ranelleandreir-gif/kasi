import { auth, db } from "./firebase.js";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


let adminId = null;

// =====================
// 🔐 ADMIN CHECK
// =====================
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  adminId = user.uid;
  loadUsers();
  loadLoans();
  loadAnalytics();
});


// =====================
// 📊 ANALYTICS
// =====================
function loadAnalytics() {
  onSnapshot(collection(db, "users"), (snap) => {

    let total = 0, pending = 0, approved = 0, cashiers = 0, collectors = 0;

    snap.forEach(d => {
      const u = d.data();
      total++;

      if (u.status === "pending") pending++;
      if (u.status === "approved") approved++;
      if (u.role === "cashier") cashiers++;
      if (u.role === "collector") collectors++;
    });

    setText("totalUsers", total);
    setText("pending", pending);
    setText("approved", approved);
    setText("cashiers", cashiers);
    setText("collectors", collectors);
  });
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.innerText = val;
}


// =====================
// 👤 USERS (FOLDER SYSTEM)
// =====================
function loadUsers() {

  onSnapshot(collection(db, "users"), (snap) => {

    const usersBox = document.getElementById("users");
    if (!usersBox) return;

    usersBox.innerHTML = "";

    // 🗂 GROUPED FOLDERS
    const folders = {
      admin: [],
      cashier: [],
      collector: [],
      pending: []
    };

    snap.forEach(d => {
      const u = d.data();

      if (u.status === "pending") folders.pending.push({ id: d.id, ...u });
      else folders[u.role]?.push({ id: d.id, ...u });
    });

    renderFolder("🟡 PENDING USERS", folders.pending, usersBox);
    renderFolder("💰 CASHIERS", folders.cashier, usersBox);
    renderFolder("🚚 COLLECTORS (RIDERS)", folders.collector, usersBox);
    renderFolder("👑 ADMIN", folders.admin, usersBox);
  });
}


// =====================
// 📁 USER FOLDER RENDER
// =====================
function renderFolder(title, list, parent) {

  const box = document.createElement("div");
  box.style.margin = "15px 0";
  box.style.padding = "10px";
  box.style.background = "rgba(255,255,255,0.05)";
  box.style.borderRadius = "10px";

  box.innerHTML = `<h3>${title} (${list.length})</h3>`;

  list.forEach(u => {

    const div = document.createElement("div");
    div.style.padding = "10px";
    div.style.margin = "8px 0";
    div.style.background = "rgba(255,255,255,0.06)";
    div.style.borderRadius = "8px";

    div.innerHTML = `
      <b>${u.name || "No Name"}</b><br>
      ${u.email}<br>
      Role: ${u.role} | Status: ${u.status}<br>
      Assigned: ${u.assignedName || "-"}<br><br>

      <button onclick="approveUser('${u.id}','${u.role}')">Approve</button>
      <button onclick="setRole('${u.id}','cashier')">Cashier</button>
      <button onclick="setRole('${u.id}','collector')">Collector</button>
      <button onclick="deleteUser('${u.id}')">Delete</button>
    `;

    box.appendChild(div);
  });

  parent.appendChild(box);
}


// =====================
// 📦 BORROWERS / LOANS FOLDER
// =====================
function loadLoans() {

  onSnapshot(collection(db, "loans"), (snap) => {

    const loansBox = document.getElementById("loans");
    if (!loansBox) return;

    loansBox.innerHTML = "";

    const active = [];
    const paid = [];

    snap.forEach(d => {
      const l = d.data();
      if (l.status === "paid") paid.push({ id: d.id, ...l });
      else active.push({ id: d.id, ...l });
    });

    renderLoanFolder("📦 ACTIVE LOANS (BORROWERS)", active, loansBox);
    renderLoanFolder("✅ PAID LOANS", paid, loansBox);
  });
}


// =====================
// 📁 LOAN FOLDER RENDER
// =====================
function renderLoanFolder(title, list, parent) {

  const box = document.createElement("div");
  box.style.margin = "15px 0";
  box.style.padding = "10px";
  box.style.background = "rgba(255,255,255,0.05)";
  box.style.borderRadius = "10px";

  box.innerHTML = `<h3>${title} (${list.length})</h3>`;

  list.forEach(l => {

    const div = document.createElement("div");
    div.style.padding = "10px";
    div.style.margin = "8px 0";
    div.style.background = "rgba(255,255,255,0.06)";
    div.style.borderRadius = "8px";

    const isPaid = l.status === "paid";
    div.innerHTML = `
      <b>👤 ${l.borrowerName}</b><br>
      💰 ₱${l.amount} | Balance ₱${l.balance}<br>
      🚚 Collector: ${l.assignedCollectorName || "-"}<br>
      📦 Status: ${l.status}<br><br>

      ${isPaid ? "" : `<button onclick="editLoanBalance('${l.id}', ${l.balance})">Edit Balance</button><button onclick="markPaid('${l.id}')">Mark Paid</button>`}
      <button onclick="deleteLoan('${l.id}')">Delete</button>
    `;

    box.appendChild(div);
  });

  parent.appendChild(box);
}


// =====================
// 🔥 APPROVE USER
// =====================
window.approveUser = async (id, role) => {

  const snap = await getDocs(collection(db, "users"));
  const numbers = [];

  snap.forEach(d => {
    const u = d.data();
    if (u.role === role && u.status === "approved" && typeof u.assignedName === "string") {
      const match = u.assignedName.match(new RegExp(`^${role}(\\d+)$`));
      if (match) numbers.push(Number(match[1]));
    }
  });

  const nextNumber = numbers.length ? Math.max(...numbers) + 1 : 1;
  const name = `${role}${nextNumber}`;

  await updateDoc(doc(db, "users", id), {
    status: "approved",
    assignedName: name
  });

  alert(`User approved! They can now log in as ${name}.`);
};


// =====================
// ❌ REJECT USER
// =====================
window.rejectUser = async (id) => {
  await updateDoc(doc(db, "users", id), {
    status: "rejected"
  });
  alert("User rejected!");
};


// =====================
// 🔧 ROLE CHANGE
// =====================
window.setRole = async (id, role) => {
  await updateDoc(doc(db, "users", id), { role });
  alert(`Role changed to ${role}`);
};


// =====================
// ➕ CREATE LOAN
// =====================
window.createLoan = async () => {
  const borrowerName = document.getElementById("borrowerName")?.value.trim();
  const amount = document.getElementById("amount")?.value.trim();
  const address = document.getElementById("address")?.value.trim();

  if (!borrowerName || !amount || !address) {
    alert("Fill all fields!");
    return;
  }

  try {
    const docRef = await addDoc(collection(db, "loans"), {
      borrowerName,
      amount: Number(amount),
      address,
      balance: Number(amount),
      status: "pending",
      assignedCollectorId: null,
      assignedCollectorName: null,
      createdAt: serverTimestamp()
    });

    alert("Loan created! Now assign a collector.");
    
    // Clear inputs
    document.getElementById("borrowerName").value = "";
    document.getElementById("amount").value = "";
    document.getElementById("address").value = "";

    // Optional: auto-assign first available collector
    await autoAssignCollector(docRef.id);
  } catch (error) {
    alert("Error: " + error.message);
  }
};


// =====================
// 🚚 AUTO ASSIGN FIRST COLLECTOR
// =====================
async function autoAssignCollector(loanId) {
  try {
    const usersSnap = await getDocs(collection(db, "users"));
    
    let collectors = [];
    usersSnap.forEach(d => {
      const u = d.data();
      if (u.role === "collector" && u.status === "approved") {
        collectors.push({
          id: d.id,
          name: u.assignedName || u.name
        });
      }
    });

    if (collectors.length > 0) {
      const selected = collectors[0];
      await updateDoc(doc(db, "loans", loanId), {
        assignedCollectorId: selected.id,
        assignedCollectorName: selected.name,
        status: "assigned",
        assignedCashierId: null,
        assignedCashierName: "",
        collectedAt: null,
        confirmedAt: null,
        confirmedById: null
      });
    }
  } catch (error) {
    console.log("Auto-assign failed:", error);
  }
}


// =====================
// 🚚 MANUAL ASSIGN COLLECTOR
// =====================
window.assignCollector = async (loanId) => {
  const collectorId = prompt("Enter Collector ID:");
  if (!collectorId) return;

  const userSnap = await getDocs(collection(db, "users"));
  let found = false;

  userSnap.forEach(d => {
    if (d.id === collectorId) {
      const u = d.data();
      updateDoc(doc(db, "loans", loanId), {
        assignedCollectorId: d.id,
        assignedCollectorName: u.assignedName || u.name,
        status: "assigned",
        assignedCashierId: null,
        assignedCashierName: "",
        collectedAt: null,
        confirmedAt: null,
        confirmedById: null
      });
      alert("Assigned to " + (u.assignedName || u.name));
      found = true;
    }
  });

  if (!found) alert("Collector not found!");
};


// =====================
// ❌ DELETE USER
// =====================
window.deleteUser = async (id) => {
  await deleteDoc(doc(db, "users", id));
};


// =====================
// ❌ DELETE LOAN
// =====================
window.deleteLoan = async (id) => {
  await deleteDoc(doc(db, "loans", id));
};


// =====================
// � EDIT ACTIVE LOAN BALANCE
// =====================
window.editLoanBalance = async (id, currentBalance) => {
  const input = window.prompt("Enter new remaining balance:", currentBalance);
  if (input === null) return;

  const newBalance = Number(input);
  if (Number.isNaN(newBalance) || newBalance < 0) {
    alert("Please enter a valid non-negative number.");
    return;
  }

  const updates = {
    balance: newBalance,
    lastAdminEditedAt: serverTimestamp(),
    lastAdminEditedBy: adminId
  };

  if (newBalance === 0) {
    updates.status = "paid";
  }

  await updateDoc(doc(db, "loans", id), updates);
  alert("Active loan balance updated.");
};


// =====================
// �💰 MARK PAID (CASHIER SYSTEM READY)
// =====================
window.markPaid = async (id) => {
  await updateDoc(doc(db, "loans", id), {
    status: "paid",
    balance: 0
  });
};