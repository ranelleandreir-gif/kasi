async function confirmPayment(loanId) {
  await updateDoc(doc(db, "loans", loanId), {
    status: "confirmed"
  });
}