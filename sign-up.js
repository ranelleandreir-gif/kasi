import { auth, db } from "./firebase.js";
import { createUserWithEmailAndPassword } 
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, setDoc } 
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

window.signup = async function () {

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const role = document.getElementById("role").value;
  const msg = document.getElementById("msg");

  if (!name || !email || !password) {
    msg.textContent = "Fill all fields";
    msg.style.color = "red";
    return;
  }

  try {

    const userCred = await createUserWithEmailAndPassword(auth, email, password);

    // 🔥 SAVE AS PENDING ONLY
    await setDoc(doc(db, "users", userCred.user.uid), {
      name,
      email,
      role,
      status: "pending"
    });

    msg.textContent = "Request sent! Wait admin approval.";
    msg.style.color = "green";

  } catch (err) {
    msg.textContent = err.message;
    msg.style.color = "red";
  }
};