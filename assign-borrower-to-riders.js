window.assignCollector = async (loanId) => {

  const usersSnap = await getDocs(collection(db, "users"));

  let collectors = [];

  usersSnap.forEach(d => {
    const u = d.data();

    if (u.role === "collector" && u.status === "approved") {
      collectors.push({
        id: d.id,
        name: u.assignedName || u.name
      });
    }
  });

  if (collectors.length === 0) {
    alert("No collectors");
    return;
  }

  const selected = collectors[0]; // or random / dropdown later

  await updateDoc(doc(db, "loans", loanId), {
    assignedCollectorId: selected.id,
    assignedCollectorName: selected.name
  });

  alert("Assigned to " + selected.name);
};