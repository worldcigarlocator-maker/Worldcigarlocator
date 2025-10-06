// ===== Supabase Init =====
const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co"; 
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."; // din anon key här
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

let pendingStores = [];
let approvedStores = [];

document.getElementById("homeBtn").addEventListener("click", () => {
  window.location.href = "index.html"; // byt till din riktiga startsida
});

document.getElementById("pendingViewBtn").addEventListener("click", () => {
  document.getElementById("pending-section").classList.remove("hidden");
  document.getElementById("archive-section").classList.add("hidden");
  document.getElementById("pendingViewBtn").classList.add("active");
  document.getElementById("archiveViewBtn").classList.remove("active");
});

document.getElementById("archiveViewBtn").addEventListener("click", () => {
  document.getElementById("archive-section").classList.remove("hidden");
  document.getElementById("pending-section").classList.add("hidden");
  document.getElementById("archiveViewBtn").classList.add("active");
  document.getElementById("pendingViewBtn").classList.remove("active");
});

// Render stars
function renderStars(rating) {
  const maxStars = 5;
  let stars = "";
  for (let i = 1; i <= maxStars; i++) {
    stars += `<span class="${i <= rating ? "star-filled" : ""}">★</span>`;
  }
  return `<div class="stars">${stars}</div>`;
}

// Render cards
function renderCards(stores, container, isArchive) {
  container.innerHTML = "";

  stores.forEach(store => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      ${isArchive 
        ? `<div class="approved-badge">Approved ✅</div>` 
        : `<div class="pending-badge">Pending ⏳</div>`}
      <h3>${store.name || "Unnamed"}</h3>
      <p><strong>City:</strong> ${store.city || "-"}</p>
      <p><strong>Country:</strong> ${store.country || "-"}</p>
      <p><strong>Phone:</strong> ${store.phone || "-"}</p>
      <p><strong>Website:</strong> ${store.website || "-"}</p>
      <p><strong>Type:</strong> ${store.type || "-"}</p>
      <p><strong>Rating:</strong> ${renderStars(store.rating || 0)}</p>
      <div class="card-buttons">
        ${!isArchive ? `<button class="btn-approve">Approve</button>` : ""}
        <button class="btn-edit">Edit</button>
        <button class="btn-delete">Delete</button>
      </div>
    `;

    // Approve
    const approveBtn = card.querySelector(".btn-approve");
    if (approveBtn) {
      approveBtn.addEventListener("click", async () => {
        await supabase.from("stores").update({ approved: true }).eq("id", store.id);
        loadStores();
      });
    }

    // Edit
    card.querySelector(".btn-edit").addEventListener("click", async () => {
      const newName = prompt("Edit name:", store.name || "");
      const newPhone = prompt("Edit phone:", store.phone || "");
      const newWebsite = prompt("Edit website:", store.website || "");
      const newCity = prompt("Edit city:", store.city || "");
      const newCountry = prompt("Edit country:", store.country || "");
      // rating ska inte ändras här
      await supabase.from("stores").update({
        name: newName,
        phone: newPhone,
        website: newWebsite,
        city: newCity,
        country: newCountry
      }).eq("id", store.id);
      loadStores();
    });

    // Delete
    card.querySelector(".btn-delete").addEventListener("click", async () => {
      if (confirm("Are you sure you want to delete this store?")) {
        await supabase.from("stores").delete().eq("id", store.id);
        loadStores();
      }
    });

    container.appendChild(card);
  });
}

// Pending filter
const pendingFilter = document.getElementById("pendingFilter");
pendingFilter.addEventListener("change", () => {
  renderPending();
});

// Archive filter + search + sort
const archiveFilter = document.getElementById("archiveFilter");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");

archiveFilter.addEventListener("change", renderFilteredApproved);
searchInput.addEventListener("input", renderFilteredApproved);
sortSelect.addEventListener("change", renderFilteredApproved);

function renderPending() {
  const container = document.getElementById("pending-cards");
  let filtered = pendingStores;
  const filterValue = pendingFilter.value;
  if (filterValue !== "all") {
    filtered = filtered.filter(s => (s.type || "").toLowerCase() === filterValue);
  }
  renderCards(filtered, container, false);
}

function renderFilteredApproved() {
  const container = document.getElementById("approved-cards");
  let filtered = approvedStores;

  // Filter by type
  const filterValue = archiveFilter.value;
  if (filterValue !== "all") {
    filtered = filtered.filter(s => (s.type || "").toLowerCase() === filterValue);
  }

  // Search
  const searchTerm = searchInput.value.toLowerCase();
  if (searchTerm) {
    filtered = filtered.filter(store =>
      (store.name || "").toLowerCase().includes(searchTerm) ||
      (store.city || "").toLowerCase().includes(searchTerm) ||
      (store.country || "").toLowerCase().includes(searchTerm)
    );
  }

  // Sort
  const sortBy = sortSelect.value;
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
      return direction === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });
  }

  renderCards(filtered, container, true);
}

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

  pendingStores = data.filter(s => !s.approved);
  approvedStores = data.filter(s => s.approved);

  renderPending();
  renderFilteredApproved();
}

loadStores();
