import { auth, db } from "./firebase.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, setDoc, getDocs, collection } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

    // 🔥 CREATE AUTH USER
    const userCred = await createUserWithEmailAndPassword(auth, email, password);

    // 🔥 COUNT EXISTING USERS PER ROLE
    const snap = await getDocs(collection(db, "users"));

    let cashierCount = 0;
    let collectorCount = 0;

    snap.forEach(doc => {
      const d = doc.data();
      if (d.role === "cashier" && d.status === "approved") cashierCount++;
      if (d.role === "collector" && d.status === "approved") collectorCount++;
    });

    // 🔥 AUTO ASSIGN NUMBER
    let assignedName = "";

    if (role === "cashier") {
      assignedName = `cashier${cashierCount + 1}`;
    } else {
      assignedName = `collector${collectorCount + 1}`;
    }

    // 🔥 SAVE USER
    await setDoc(doc(db, "users", userCred.user.uid), {
      name,
      email,
      role,
      assignedName,
      status: "pending"
    });

    msg.textContent = "Request sent. Waiting for admin approval.";
    msg.style.color = "green";

  } catch (err) {
    msg.textContent = err.message;
    msg.style.color = "red";
  }
};