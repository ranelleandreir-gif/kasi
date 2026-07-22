import { auth, db } from "./firebase.js";
import { createUserWithEmailAndPassword } 
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, setDoc, serverTimestamp } 
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

window.signup = async function () {

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const role = document.getElementById("role").value;
  const msg = document.getElementById("msg");

  if (!name || !email || !password || !role) {
    msg.textContent = "Fill all fields";
    msg.style.color = "red";
    return;
  }

  if (role !== "admin" && role !== "cashier" && role !== "collector") {
    msg.textContent = "Only admin, cashier, and collector accounts can be created here.";
    msg.style.color = "red";
    return;
  }

  try {

    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    const isAdmin = role === "admin";

    // 🔥 SAVE TO FIRESTORE
    await setDoc(doc(db, "users", userCred.user.uid), {
      name,
      email,
      role,
      status: isAdmin ? "approved" : "pending",
      assignedName: isAdmin ? "admin1" : "",
      createdAt: serverTimestamp()
    });

    msg.textContent = isAdmin
      ? "Admin account created successfully. You can now log in."
      : "Request sent! Waiting for admin approval...";
    msg.style.color = "green";

  } catch (err) {
    msg.textContent = err.message;
    msg.style.color = "red";
  }
};