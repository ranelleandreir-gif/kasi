function loadBorrowers() {

  onSnapshot(collection(db, "loans"), (snap) => {

    const div = document.getElementById("borrowersTab");
    div.innerHTML = "<h2>📦 New Borrowers</h2>";

    snap.forEach(d => {
      const l = d.data();

      div.innerHTML += `
        <div class="item">
          <b>${l.borrowerName}</b><br>
          ₱${l.amount}<br>
          Status: ${l.status}<br>
          Assigned: ${l.assignedCollectorName || "NONE"}

          <br><br>
          <button onclick="assignCollector('${d.id}')">Assign Collector</button>
        </div>
      `;
    });
  });
}