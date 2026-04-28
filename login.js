import { auth, db } from "./firebase.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {

  const loginBtn = document.getElementById("loginBtn");

  loginBtn.addEventListener("click", async () => {

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    // validation
    if (!email || !password) {
      alert("Please fill all fields");
      return;
    }

    if (!email.includes("@")) {
      alert("Invalid email format");
      return;
    }

    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);

      const userDoc = await getDoc(doc(db, "users", userCred.user.uid));

      if (!userDoc.exists()) {
        alert("User data not found!");
        return;
      }

      const userData = userDoc.data();

      if (userData.status !== "approved") {
        alert("Waiting for admin approval.");
        return;
      }

      if (userData.role === "admin") {
        window.location.href = "admin.html";
      } else if (userData.role === "cashier") {
        window.location.href = "cashier.html";
      } else {
        window.location.href = "collector.html";
      }

    } catch (error) {
      alert(error.message);
    }

  });

});