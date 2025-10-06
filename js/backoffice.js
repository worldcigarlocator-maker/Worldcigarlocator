// ===== Supabase Init =====
const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co"; 
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."; // din anon key här
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Globals
let pendingStores = [];
let approvedStores = [];

// Load stores
async function loadStores() {
  const { data, error } = await supabase.from("stores").select("*").order("id", { ascending: false });
  if (error) {
    console.error(error);
    return;
  }

  pendingStores = data.filter(s => !s.approved);
  approvedStores = data.filter(s => s.approved);

  renderCards(pendingStores, document.getElementById("pending-list"), false);
  renderCards(approvedStores, document.getElementById("approved-list"), true);
}

// Render cards
function renderCards(stores, container, isArchive) {
  container.innerHTML = "";
  stores.forEach(store => {
    const card = document.createElement("div");
    card.className = "store-card";

    // Badge
    let badgeHtml = "";
    if (store.flagged) {
      badgeHtml = `<div class="flagged-badge">Illegal 🚫</div>`;
    } else if (isArchive) {
      badgeHtml = `<div class="approved-badge">Approved ✅</div>`;
    } else {
      badgeHtml = `<div class="pending-badge">Pending ⏳</div>`;
    }

    // Stars (read-only)
    let starsHtml = "";
    for (let i = 1; i <= 5; i++) {
      starsHtml += `<span class="star ${i <= (store.rating || 0) ? "selected" : ""}">★</span>`;
    }

    card.innerHTML = `
      ${badgeHtml}
      <h3>${store.name || "Unnamed"}</h3>
      <p>${store.address || ""}</p>
      <p>${store.city || ""}, ${store.country || ""}</p>
      <p>📞 ${store.phone || "-"}</p>
      <p>🌐 ${store.website || "-"}</p>
      <p>Type: ${store.type || "-"}</p>
      <div class="stars">${starsHtml}</div>
      <div class="button-row">
        ${!isArchive ? `<button class="approve-btn">Approve</button>` : ""}
        <button class="edit-btn">Edit</button>
        <button class="delete-btn">Delete</button>
      </div>
      <div class="edit-form"></div>
    `;

    // Buttons
    const approveBtn = card.querySelector(".approve-btn");
    const editBtn = card.querySelector(".edit-btn");
    const deleteBtn = card.querySelector(".delete-btn");
    const editForm = card.querySelector(".edit-form");

    if (approveBtn) {
      approveBtn.addEventListener("click", async () => {
        await supabase.from("stores").update({ approved: true }).eq("id", store.id);
        loadStores();
      });
    }

    editBtn.addEventListener("click", () => toggleEditForm(store, editForm));
    deleteBtn.addEventListener("click", async () => {
      if (confirm("Delete this store?")) {
        await supabase.from("stores").delete().eq("id", store.id);
        loadStores();
      }
    });

    container.appendChild(card);
  });
}

// Toggle inline edit
function toggleEditForm(store, container) {
  if (container.innerHTML !== "") {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = `
    <div class="edit-fields">
      <input type="text" id="edit-name-${store.id}" value="${store.name || ""}" placeholder="Name" />
      <input type="text" id="edit-phone-${store.id}" value="${store.phone || ""}" placeholder="Phone" />
      <input type="text" id="edit-website-${store.id}" value="${store.website || ""}" placeholder="Website" />
      <input type="text" id="edit-city-${store.id}" value="${store.city || ""}" placeholder="City" />
      <input type="text" id="edit-country-${store.id}" value="${store.country || ""}" placeholder="Country" />
      <button class="save-edit-btn">Save Changes</button>
    </div>
  `;

  container.querySelector(".save-edit-btn").addEventListener("click", async () => {
    const updates = {
      name: document.getElementById(`edit-name-${store.id}`).value.trim(),
      phone: document.getElementById(`edit-phone-${store.id}`).value.trim(),
      website: document.getElementById(`edit-website-${store.id}`).value.trim(),
      city: document.getElementById(`edit-city-${store.id}`).value.trim(),
      country: document.getElementById(`edit-country-${store.id}`).value.trim()
    };
    await supabase.from("stores").update(updates).eq("id", store.id);
    loadStores();
  });
}

// Search + filter + sort
document.getElementById("searchInput")?.addEventListener("input", applyArchiveFilters);
document.getElementById("typeFilterArchive")?.addEventListener("change", applyArchiveFilters);
document.getElementById("sortArchive")?.addEventListener("change", applyArchiveFilters);

function applyArchiveFilters() {
  const term = document.getElementById("searchInput").value.toLowerCase();
  const type = document.getElementById("typeFilterArchive").value;
  const sort = document.getElementById("sortArchive").value;

  let filtered = approvedStores.filter(s =>
    (s.name || "").toLowerCase().includes(term) ||
    (s.city || "").toLowerCase().includes(term) ||
    (s.country || "").toLowerCase().includes(term)
  );

  if (type !== "All") {
    filtered = filtered.filter(s => s.type === type);
  }

  // Sorting
  if (sort === "name") filtered.sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === "city") filtered.sort((a, b) => a.city.localeCompare(b.city));
  else if (sort === "country") filtered.sort((a, b) => a.country.localeCompare(b.country));
  else if (sort === "rating") filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  else if (sort === "newest") filtered.sort((a, b) => b.id - a.id);

  renderCards(filtered, document.getElementById("approved-list"), true);
}

// Init
loadStores();
