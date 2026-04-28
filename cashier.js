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

      // Show only COLLECTED loans for cashier to confirm
      if (l.status !== "collected") return;

      const div = document.createElement("div");
      div.className = "card";

      div.innerHTML = `
        <h3>👤 ${l.borrowerName}</h3>
        💰 Amount: ₱${l.amount}<br>
        💵 Balance: ₱${l.balance}<br>
        🚚 Collector: ${l.assignedCollectorName}<br>
        📍 Address: ${l.address || "N/A"}<br><br>

        <input type="number" placeholder="Amount Paid" id="pay-${d.id}" min="0" max="${l.balance}" />

        <button onclick="payLoan('${d.id}','${l.borrowerName}',${l.balance})">
          ✔ Confirm Payment
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
    alert("Enter valid amount");
    return;
  }

  if (amountPaid > currentBalance) {
    alert(`Cannot pay more than balance (₱${currentBalance})`);
    return;
  }

  const newBalance = currentBalance - amountPaid;

  try {
    // 1. UPDATE LOAN
    await updateDoc(doc(db, "loans", loanId), {
      balance: newBalance,
      status: newBalance === 0 ? "paid" : "collected",
      confirmedAt: serverTimestamp(),
      confirmedById: cashierId
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

    alert(`✅ Payment confirmed! Remaining: ₱${newBalance}`);
    input.value = "";
  } catch (error) {
    alert("Error: " + error.message);
  }
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