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
  let role = "";
  const numbers = [];

  usersSnap.forEach((d) => {
    const u = d.data();
    if (d.id === uid) {
      role = u.role;
    }
  });

  if (!role) return;

  usersSnap.forEach((d) => {
    const u = d.data();
    if (u.role === role && u.status === "approved" && typeof u.assignedName === "string") {
      const match = u.assignedName.match(new RegExp(`^${role}(\\d+)$`));
      if (match) numbers.push(Number(match[1]));
    }
  });

  const nextNumber = numbers.length ? Math.max(...numbers) + 1 : 1;
  const name = `${role}${nextNumber}`;

  await updateDoc(doc(db, "users", uid), {
    status: "approved",
    assignedName: name
  });
}