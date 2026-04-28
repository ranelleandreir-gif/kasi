import { auth, db } from "./firebase.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const loginBtn = document.getElementById("loginBtn");
const loader = document.getElementById("loader");

loginBtn.addEventListener("click", async () => {

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    alert("Fill all fields");
    return;
  }

  loader.style.display = "block";
  loginBtn.disabled = true;

  try {
    const userCred = await signInWithEmailAndPassword(auth, email, password);

    const userDoc = await getDoc(doc(db, "users", userCred.user.uid));

    if (!userDoc.exists()) {
      alert("No user data found");
      return;
    }

    const data = userDoc.data();

    // 🔥 ROLE REDIRECT FIX
    if (data.role === "admin") {
      window.location.href = "admin-dashboard.html";
    } 
    else if (data.role === "cashier") {
      window.location.href = "cashier.html";
    } 
    else {
      window.location.href = "collector.html";
    }

  } catch (error) {
    alert(error.message);
  }

  loader.style.display = "none";
  loginBtn.disabled = false;

});