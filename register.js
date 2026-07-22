import { auth, db } from "./firebase.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

async function register() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const role = document.getElementById("role").value;

  if (role !== "admin" && role !== "cashier" && role !== "collector") {
    alert("Invalid role selected.");
    return;
  }

  const userCred = await createUserWithEmailAndPassword(auth, email, password);
  const isAdmin = role === "admin";

  await setDoc(doc(db, "users", userCred.user.uid), {
    name: email.split("@")[0],
    email: email,
    role: role,
    status: isAdmin ? "approved" : "pending",
    assignedName: isAdmin ? "admin1" : ""
  });

  alert(isAdmin ? "Admin account created successfully." : "Registered! Wait for admin approval.");
}