import { addDoc, collection } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

async function createLoan() {
  await addDoc(collection(db, "loans"), {
    borrower: "Juan",
    amount: 5000,
    status: "pending",
    collectorId: null
  });
}