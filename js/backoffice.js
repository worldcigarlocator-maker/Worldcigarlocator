// ===== Supabase Init =====
const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co"; 
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."; // din anon key här
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

let pendingStores = [];
let approvedStores = [];

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("pendingViewBtn").addEventListener("click", () => switchView("pending"));
  document.getElementById("archiveViewBtn").addEventListener("click", () => switchView("archive"));
  document.getElementById("homeBtn").addEventListener("click", () => window.location.href = "index.html");

  document.getElementById("pendingTypeFilter").addEventListener("change", filterPending);
  document.getElementById("searchInput").addEventListener("input", filterArchive);
  document.getElementById("sortSelect").addEventListener("change", filterArchive);
  document.getElementById("archiveTypeFilter").addEventListener("change", filterArchive);

  loadStores();
});

async function loadStores() {
  const { data, error } = await supabase.from("stores").select("*");
  if (error) {
    console.error(error);
    return;
  }
  pendingStores = data.filter(s => !s.approved);
  approvedStores = data.filter(s => s.approved);

  renderPending(pendingStores);
  renderArchive(approvedStores);
}

function renderStars(rating) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(i <= rating ? "★" : "☆");
  }
  return `<span class="stars">${stars.join("")}</span>`;
}

function renderPending(stores) {
  const section = document.getElementById("pendingSection");
  section.innerHTML = "";
  stores.forEach(store => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <span class="badge pending">Pending ⏳</span>
      <h3>${store.name || "Unnamed"}</h3>
      <p>${store.city || ""}, ${store.country || ""}</p>
      ${renderStars(store.rating || 0)}
      <div class="card-actions">
        <button class="btn-approve">Approve</button>
        <button class="btn-edit">Edit</button>
        <button class="btn-delete">Delete</button>
      </div>
    `;
    setupCardActions(card, store, false);
    section.appendChild(card);
  });
}

function renderArchive(stores) {
  const section = document.getElementById("archiveSection");
  section.innerHTML = "";
  stores.forEach(store => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <span class="badge approved">Approved ✅</span>
      <h3>${store.name || "Unnamed"}</h3>
      <p>${store.city || ""}, ${store.country || ""}</p>
      ${renderStars(store.rating || 0)}
      <div class="card-actions">
        <button class="btn-edit">Edit</button>
        <button class="btn-delete">Delete</button>
      </div>
    `;
    setupCardActions(card, store, true);
    section.appendChild(card);
  });
}

function setupCardActions(card, store, isArchive) {
  const btnApprove = card.querySelector(".btn-approve");
  if (btnApprove) {
    btnApprove.addEventListener("click", async () => {
      await supabase.from("stores").update({ approved: true }).eq("id", store.id);
      loadStores();
    });
  }

  const btnEdit = card.querySelector(".btn-edit");
  btnEdit.addEventListener("click", () => toggleEdit(card, store));

  const btnDelete = card.querySelector(".btn-delete");
  btnDelete.addEventListener("click", async () => {
    if (confirm("Delete this store?")) {
      await supabase.from("stores").delete().eq("id", store.id);
      loadStores();
    }
  });
}

function toggleEdit(card, store) {
  let editFields = card.querySelector(".card-edit-fields");
  if (editFields) {
    editFields.classList.remove("show");
    setTimeout(() => editFields.remove(), 400);
    return;
  }

  editFields = document.createElement("div");
  editFields.className = "card-edit-fields";
  editFields.innerHTML = `
    <input type="text" id="edit-name-${store.id}" value="${store.name || ""}" placeholder="Name"/>
    <input type="text" id="edit-phone-${store.id}" value="${store.phone || ""}" placeholder="Phone"/>
    <input type="text" id="edit-website-${store.id}" value="${store.website || ""}" placeholder="Website"/>
    <input type="text" id="edit-city-${store.id}" value="${store.city || ""}" placeholder="City"/>
    <input type="text" id="edit-country-${store.id}" value="${store.country || ""}" placeholder="Country"/>
    <p><strong>Rating:</strong> ${renderStars(store.rating || 0)} (read-only)</p>
    <button class="save-btn">Save Changes</button>
  `;
  card.appendChild(editFields);
  requestAnimationFrame(() => editFields.classList.add("show"));

  editFields.querySelector(".save-btn").addEventListener("click", async () => {
    const newData = {
      name: document.getElementById(`edit-name-${store.id}`).value,
      phone: document.getElementById(`edit-phone-${store.id}`).value,
      website: document.getElementById(`edit-website-${store.id}`).value,
      city: document.getElementById(`edit-city-${store.id}`).value,
      country: document.getElementById(`edit-country-${store.id}`).value
    };
    await supabase.from("stores").update(newData).eq("id", store.id);
    loadStores();
  });
}

// Filters
function filterPending() {
  const type = document.getElementById("pendingTypeFilter").value;
  let filtered = pendingStores;
  if (type !== "all") {
    filtered = filtered.filter(s => s.type === type);
  }
  renderPending(filtered);
}

function filterArchive() {
  const query = document.getElementById("searchInput").value.toLowerCase();
  const sortBy = document.getElementById("sortSelect").value;
  const type = document.getElementById("archiveTypeFilter").value;

  let filtered = approvedStores.filter(s =>
    (s.name || "").toLowerCase().includes(query) ||
    (s.city || "").toLowerCase().includes(query) ||
    (s.country || "").toLowerCase().includes(query)
  );

  if (type !== "all") {
    filtered = filtered.filter(s => s.type === type);
  }

  if (sortBy === "name") {
    filtered.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  } else if (sortBy === "city") {
    filtered.sort((a, b) => (a.city || "").localeCompare(b.city || ""));
  } else if (sortBy === "country") {
    filtered.sort((a, b) => (a.country || "").localeCompare(b.country || ""));
  } else if (sortBy === "rating") {
    filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } else {
    filtered.sort((a, b) => b.id - a.id);
  }

  renderArchive(filtered);
}

// Toggle views
function switchView(view) {
  document.getElementById("pendingSection").classList.toggle("hidden", view !== "pending");
  document.getElementById("pendingFilter").classList.toggle("hidden", view !== "pending");

  document.getElementById("archiveSection").classList.toggle("hidden", view !== "archive");
  document.getElementById("archiveControls").classList.toggle("hidden", view !== "archive");

  document.getElementById("pendingViewBtn").classList.toggle("active", view === "pending");
  document.getElementById("archiveViewBtn").classList.toggle("active", view === "archive");
}
