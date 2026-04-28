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
  await updateDoc(doc(db, "users", uid), {
    status: "approved"
  });
}