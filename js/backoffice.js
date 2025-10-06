// ===== Supabase Init =====
const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co"; 
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."; // din anon key här
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

let approvedStores = [];

// Toggle views
document.getElementById("pendingViewBtn").addEventListener("click", () => {
  document.getElementById("pending-section").classList.remove("hidden");
  document.getElementById("archive-section").classList.add("hidden");
  document.getElementById("archive-controls").classList.add("hidden");

  document.getElementById("pendingViewBtn").classList.add("active");
  document.getElementById("archiveViewBtn").classList.remove("active");
});

document.getElementById("archiveViewBtn").addEventListener("click", () => {
  document.getElementById("pending-section").classList.add("hidden");
  document.getElementById("archive-section").classList.remove("hidden");
  document.getElementById("archive-controls").classList.remove("hidden");

  document.getElementById("pendingViewBtn").classList.remove("active");
  document.getElementById("archiveViewBtn").classList.add("active");
});

// Back to Home
document.getElementById("homeBtn").addEventListener("click", () => {
  window.location.href = "index.html"; // Ändra till din startsida
});

// Load stores
async function loadStores() {
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .order("created_at", { ascending: false }); // senaste först

  if (error) {
    console.error("Error loading stores:", error);
    return;
  }

  const pending = data.filter(s => !s.approved);
  approvedStores = data.filter(s => s.approved);

  renderCards(pending, document.getElementById("pending-section"), false);
  renderFilteredApproved();
}

// Render cards
function renderCards(stores, container, isArchive) {
  container.innerHTML = "";
  stores.forEach(store => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h3>${store.name || "Unnamed"}</h3>
      <p><strong>City:</strong> ${store.city || "-"}</p>
      <p><strong>Country:</strong> ${store.country || "-"}</p>
      <p><strong>Phone:</strong> ${store.phone || "-"}</p>
      <p><strong>Website:</strong> ${store.website || "-"}</p>
      <p><strong>Rating:</strong> ${store.rating || 0}</p>
      <div class="card-buttons">
        ${!isArchive ? `<button class="btn-approve">Approve</button>` : ""}
        <button class="btn-edit">Edit</button>
        <button class="btn-delete">Delete</button>
      </div>
    `;

    const approveBtn = card.querySelector(".btn-approve");
    if (approveBtn) {
      approveBtn.addEventListener("click", async () => {
        await supabase.from("stores").update({ approved: true }).eq("id", store.id);
        loadStores();
      });
    }

    const editBtn = card.querySelector(".btn-edit");
    editBtn.addEventListener("click", async () => {
      const newPhone = prompt("Enter new phone:", store.phone || "");
      if (newPhone !== null) {
        await supabase.from("stores").update({ phone: newPhone }).eq("id", store.id);
        loadStores();
      }
    });

    const deleteBtn = card.querySelector(".btn-delete");
    deleteBtn.addEventListener("click", async () => {
      if (confirm("Delete this store?")) {
        await supabase.from("stores").delete().eq("id", store.id);
        loadStores();
      }
    });

    container.appendChild(card);
  });
}

// Search + sort for archive
document.getElementById("searchInput").addEventListener("input", renderFilteredApproved);
document.getElementById("sortSelect").addEventListener("change", renderFilteredApproved);

function renderFilteredApproved() {
  const query = document.getElementById("searchInput").value.toLowerCase();
  let filtered = approvedStores.filter(store =>
    (store.name || "").toLowerCase().includes(query) ||
    (store.city || "").toLowerCase().includes(query) ||
    (store.country || "").toLowerCase().includes(query)
  );

  const sortBy = document.getElementById("sortSelect").value;
  if (sortBy) {
    const [field, direction] = sortBy.split("-");
    filtered.sort((a, b) => {
      let valA = a[field] || "";
      let valB = b[field] || "";
      if (field === "rating") {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
        return direction === "asc" ? valA - valB : valB - valA;
      }
      valA = valA.toString().toLowerCase();
      valB = valB.toString().toLowerCase();
      return direction === "asc"
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    });
  }

  renderCards(filtered, document.getElementById("archive-section"), true);
}

// Init
loadStores();
