import { auth, db } from "./firebase.js";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const list = document.getElementById("paymentsList");

let cashierId = null;
let cashierName = null;


// =====================
// 🔐 CASHIER LOGIN CHECK
// =====================
onAuthStateChanged(auth, async (user) => {

  if (!user) {
    window.location.href = "login.html";
    return;
  }

  cashierId = user.uid;

  const snap = await getDoc(doc(db, "users", user.uid));
  cashierName = snap.data()?.assignedName || snap.data()?.name;

  loadLoans();
  loadPayments();
});


// =====================
// 📦 LOAD ACTIVE LOANS
// =====================
function loadLoans() {

  onSnapshot(collection(db, "loans"), (snap) => {

    const loansDiv = document.getElementById("loansList");
    if (!loansDiv) return;

    loansDiv.innerHTML = "";

    snap.forEach(d => {

      const l = d.data();

      if (l.status === "paid") return;

      const div = document.createElement("div");
      div.className = "card";

      div.innerHTML = `
        <h3>👤 ${l.borrowerName}</h3>
        💰 Balance: ₱${l.balance}<br>
        🚚 Collector: ${l.assignedCollectorName}<br><br>

        <input type="number" placeholder="Amount Paid" id="pay-${d.id}" />

        <button onclick="payLoan('${d.id}','${l.borrowerName}',${l.balance})">
          💰 Receive Payment
        </button>
      `;

      loansDiv.appendChild(div);
    });
  });
}


// =====================
// 💰 PAYMENT FUNCTION (MAIN LOGIC)
// =====================
window.payLoan = async (loanId, borrowerName, currentBalance) => {

  const input = document.getElementById("pay-" + loanId);
  const amountPaid = Number(input.value);

  if (!amountPaid || amountPaid <= 0) {
    alert("Invalid amount");
    return;
  }

  if (amountPaid > currentBalance) {
    alert("Overpayment not allowed");
    return;
  }

  const newBalance = currentBalance - amountPaid;

  // 1. UPDATE LOAN
  await updateDoc(doc(db, "loans", loanId), {
    balance: newBalance,
    status: newBalance === 0 ? "paid" : "active"
  });

  // 2. SAVE PAYMENT HISTORY
  await addDoc(collection(db, "payments"), {
    loanId,
    borrowerName,
    amountPaid,
    remainingBalance: newBalance,
    cashierId,
    cashierName,
    createdAt: serverTimestamp()
  });

  alert("Payment recorded!");
};


// =====================
// 📊 PAYMENT HISTORY
// =====================
function loadPayments() {

  onSnapshot(collection(db, "payments"), (snap) => {

    const div = document.getElementById("paymentsList");
    if (!div) return;

    div.innerHTML = "<h3>📜 Payment History</h3>";

    snap.forEach(d => {

      const p = d.data();

      const item = document.createElement("div");
      item.className = "item";

      item.innerHTML = `
        👤 ${p.borrowerName}<br>
        💰 Paid: ₱${p.amountPaid}<br>
        📉 Remaining: ₱${p.remainingBalance}<br>
        👨‍💼 Cashier: ${p.cashierName}<br>
      `;

      div.appendChild(item);
    });
  });
}