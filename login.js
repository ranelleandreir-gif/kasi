import { auth, db } from "./firebase.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const loginBtn = document.getElementById("loginBtn");
const loader = document.getElementById("loader");

loginBtn.addEventListener("click", async () => {

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  const selectedRole = localStorage.getItem("selectedRole");

  if (!selectedRole) {
    alert("No role selected");
    return;
  }

  loader.style.display = "block";

  try {

    const userCred = await signInWithEmailAndPassword(auth, email, password);

    const snap = await getDoc(doc(db, "users", userCred.user.uid));

    if (!snap.exists()) {
      alert("No user profile found");
      return;
    }

    const data = snap.data();

    // 🔥 REAL ROLE CHECK (IMPORTANT)
    if (data.role !== selectedRole) {
      alert("Wrong role selected!");
      return;
    }

    // 🔥 REDIRECT BASED ON REAL ROLE
    if (data.role === "admin") {
      window.location.href = "welcome.html";
    }
    else if (data.role === "cashier") {
      window.location.href = "cashier-dashboard.html";
    }
    else if (data.role === "collector") {
      window.location.href = "collector-dashboard.html";
    }

  } catch (err) {
    alert(err.message);
  }

  loader.style.display = "none";

});