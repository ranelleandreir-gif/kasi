import { db } from "./firebase.js";
import { updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

async function confirmPayment(loanId) {
  await updateDoc(doc(db, "loans", loanId), {
    status: "confirmed"
  });
}