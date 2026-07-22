import { auth, db } from "./firebase.js";
import { signInWithEmailAndPassword } 
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, updateDoc, serverTimestamp } 
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const btn = document.getElementById("loginBtn");
const msg = document.getElementById("msg");
const loader = document.getElementById("loader");

btn.addEventListener("click", async () => {

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    msg.textContent = "Fill all fields";
    msg.style.color = "#f87171";
    return;
  }

  btn.disabled = true;
  loader.classList.add("show");
  msg.textContent = "";
  document.getElementById("backBtn").style.display = "none";

  try {

    const userCred = await signInWithEmailAndPassword(auth, email, password);

    const uid = userCred.user.uid;

    const userSnap = await getDoc(doc(db, "users", uid));

    if (!userSnap.exists()) {
      msg.textContent = "User profile not found";
      msg.style.color = "red";
      document.getElementById("backBtn").style.display = "block";
      return;
    }

    const data = userSnap.data();

    // 🔥 SAVE IMPORTANT DATA (FIX FOR ALL DASHBOARDS)
    localStorage.setItem("uid", uid);
    localStorage.setItem("role", data.role || "");
    localStorage.setItem("assignedName", data.assignedName || "");
    localStorage.setItem("email", data.email || "");

    // 🔥 SET ONLINE STATUS
    await updateDoc(doc(db, "users", uid), {
      online: true,
      lastSeen: serverTimestamp()
    });
    console.log("✅ Set online status for user:", uid);

    // 🔥 STATUS CHECK
    if (data.deleted) {
      msg.textContent = "Account deleted. Contact admin to recover.";
      msg.style.color = "red";
      document.getElementById("backBtn").style.display = "block";
      return;
    }

    if (data.status === "pending") {
      msg.textContent = "Account still pending admin approval";
      msg.style.color = "orange";
      document.getElementById("backBtn").style.display = "block";
      return;
    }

    if (data.status === "rejected") {
      msg.textContent = "Account rejected by admin";
      msg.style.color = "red";
      document.getElementById("backBtn").style.display = "block";
      return;
    }

    // 🔥 ROLE REDIRECT SYSTEM
    msg.textContent = "Approved — redirecting to your dashboard...";
    msg.style.color = "#22c55e";

    const requestedRole = (new URLSearchParams(window.location.search).get("role") || localStorage.getItem("selectedRole") || "").trim().toLowerCase();

    if (requestedRole && data.role !== requestedRole) {
      msg.textContent = `Access denied. This account is ${data.role}, not ${requestedRole}.`;
      msg.style.color = "#f87171";
      document.getElementById("backBtn").style.display = "block";
      return;
    }

    if (!requestedRole) {
      msg.textContent = "Please select a portal first.";
      msg.style.color = "#f87171";
      document.getElementById("backBtn").style.display = "block";
      return;
    }

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
        msg.style.color = "#f87171";
        document.getElementById("backBtn").style.display = "block";
    }

  } catch (err) {
    msg.textContent = err.message;
    msg.style.color = "red";
    document.getElementById("backBtn").style.display = "block";
  } finally {
    btn.disabled = false;
    loader.classList.remove("show");
  }
});

// =====================
// 🔙 BACK BUTTON FUNCTION
// =====================
window.goBack = () => {
  window.location.href = "role-selector.html";
};