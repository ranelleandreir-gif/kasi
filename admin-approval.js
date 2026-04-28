import { db } from "./firebase.js";
import { collection, getDocs, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

async function loadPendingUsers() {
  const querySnapshot = await getDocs(collection(db, "users"));

  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();

    if (data.status === "pending") {
      console.log(docSnap.id, data);
    }
  });
}

async function approveUser(uid) {
  const usersSnap = await getDocs(collection(db, "users"));
  let count = 0;
  let role = "";

  usersSnap.forEach((d) => {
    const u = d.data();
    if (d.id === uid) {
      role = u.role;
    }
  });

  usersSnap.forEach((d) => {
    const u = d.data();
    if (u.role === role && u.status === "approved") {
      count++;
    }
  });

  const name = role === "cashier"
    ? `cashier${count + 1}`
    : role === "collector"
      ? `collector${count + 1}`
      : `admin${count + 1}`;

  await updateDoc(doc(db, "users", uid), {
    status: "approved",
    assignedName: name
  });
}