import { auth, db } from "./firebase.js";
import { signInWithEmailAndPassword } 
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } 
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const btn = document.getElementById("loginBtn");
const msg = document.getElementById("msg");

btn.addEventListener("click", async () => {

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    msg.textContent = "Fill all fields";
    msg.style.color = "red";
    return;
  }

  try {

    const userCred = await signInWithEmailAndPassword(auth, email, password);

    const uid = userCred.user.uid;

    const userSnap = await getDoc(doc(db, "users", uid));

    if (!userSnap.exists()) {
      msg.textContent = "User profile not found";
      msg.style.color = "red";
      return;
    }

    const data = userSnap.data();

    // 🔥 SAVE IMPORTANT DATA (FIX FOR ALL DASHBOARDS)
    localStorage.setItem("uid", uid);
    localStorage.setItem("role", data.role || "");
    localStorage.setItem("assignedName", data.assignedName || "");
    localStorage.setItem("email", data.email || "");

    // 🔥 STATUS CHECK
    if (data.status === "pending") {
      msg.textContent = "Account still pending admin approval";
      msg.style.color = "orange";
      return;
    }

    if (data.status === "rejected") {
      msg.textContent = "Account rejected by admin";
      msg.style.color = "red";
      return;
    }

    // 🔥 ROLE REDIRECT SYSTEM
    switch (data.role) {

      case "admin":
        window.location.href = "welcome.html";
        break;

      case "cashier":
        window.location.href = "cashier.html";
        break;

      case "collector":
        window.location.href = "collector.html";
        break;

      default:
        msg.textContent = "Invalid role";
    }

  } catch (err) {
    msg.textContent = err.message;
    msg.style.color = "red";
  }
});