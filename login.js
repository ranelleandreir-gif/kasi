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

    // 🔐 AUTH LOGIN
    const userCred = await signInWithEmailAndPassword(auth, email, password);

    // 📦 GET FIRESTORE PROFILE
    const snap = await getDoc(doc(db, "users", userCred.user.uid));

    if (!snap.exists()) {
      alert("No user profile found");
      return;
    }

    const data = snap.data();

    // ❌ CHECK APPROVAL FIRST
    if (data.status !== "approved") {
      alert("Account not approved by admin yet");
      return;
    }

    // 🚀 ROLE ROUTING (BASED SA DATABASE ONLY)

    switch (data.role) {

      case "admin":
        window.location.href = "welcome.html";
        break;

      case "cashier":
        window.location.href = `cashier-dashboard.html?user=${data.assignedName}`;
        break;

      case "collector":
        window.location.href = `collector-dashboard.html?user=${data.assignedName}`;
        break;

      default:
        alert("Unknown role");
    }

  } catch (err) {
    alert(err.message);
  }

  loader.style.display = "none";
  loginBtn.disabled = false;
});