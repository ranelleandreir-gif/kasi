import { db } from "./firebase.js";
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function loadCollectors() {

  onSnapshot(collection(db, "users"), (snap) => {

    const div = document.getElementById("collectorsTab");
    div.innerHTML = "<h2>🚚 Collector Folders</h2>";

    snap.forEach(d => {
      const u = d.data();

      if (u.role === "collector") {

        div.innerHTML += `
          <div class="item">
            <b>${u.assignedName || u.name}</b><br>
            Status: ${u.status}
          </div>
        `;
      }
    });
  });
}