import { updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

async function markCollected(loanId) {
  await updateDoc(doc(db, "loans", loanId), {
    status: "collected"
  });
}