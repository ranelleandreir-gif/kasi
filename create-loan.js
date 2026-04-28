import { db } from "./firebase.js";
import { addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

window.createLoan = async function () {

  const borrowerName = document.getElementById("borrowerName")?.value;
  const amount = document.getElementById("amount")?.value;
  const address = document.getElementById("address")?.value;

  if (!borrowerName || !amount || !address) {
    alert("Fill all fields");
    return;
  }

  try {
    await addDoc(collection(db, "loans"), {
      borrowerName: borrowerName.trim(),
      amount: Number(amount),
      address: address.trim(),
      balance: Number(amount),
      status: "pending",
      assignedCollectorId: null,
      assignedCollectorName: null,
      createdAt: serverTimestamp()
    });

    alert("Loan created successfully!");
    document.getElementById("borrowerName").value = "";
    document.getElementById("amount").value = "";
    document.getElementById("address").value = "";
  } catch (error) {
    alert("Error: " + error.message);
  }
}