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

    const userRef = doc(db, "users", userCred.user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      throw new Error("No user data found in Firestore");
    }

    const data = userSnap.data();

    if (data.role === "admin") {
      window.location.href = "welcome.html";
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