/* ============================================================
   WCL Backoffice V4.4 – Stable cards/list system + filtering
   ============================================================ */

console.log("✅ Backoffice V4.4 loaded");

const WCL = {};
WCL.SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
WCL.SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";
WCL.supabase = window.supabase.createClient(WCL.SUPABASE_URL, WCL.SUPABASE_ANON_KEY);

// Global state
let STORES = [];
let CURRENT_TAB = "pending";
let CURRENT_VIEW = "cards";

/* ============================================================
   Load Stores
   ============================================================ */
async function loadStores() {
  console.log("🔄 Loading stores for tab:", CURRENT_TAB);
  const cardsWrap = document.getElementById("cards");
  const tableWrap = document.getElementById("table");
  cardsWrap.innerHTML = `<p style="text-align:center;color:#888;">Loading…</p>`;
  tableWrap.style.display = "none";
  cardsWrap.style.display = "block";

  try {
    let query = WCL.supabase.from("stores").select(
      "id, name, city, country, continent, type, access, rating, approved, flagged, deleted, status, photo_reference, place_id"
    );

    if (CURRENT_TAB === "pending") query = query.eq("approved", false).eq("flagged", false).eq("deleted", false);
    else if (CURRENT_TAB === "approved") query = query.eq("approved", true).eq("deleted", false);
    else if (CURRENT_TAB === "flagged") query = query.eq("flagged", true).eq("deleted", false);
    else if (CURRENT_TAB === "deleted") query = query.eq("deleted", true);
    else if (CURRENT_TAB === "all") query = query.eq("deleted", false); // ✅ Exclude deleted from All

    const { data, error } = await query.order("id", { ascending: false });

    if (error) {
      console.error("❌ Supabase error:", error);
      cardsWrap.innerHTML = `<div class="error">Error loading stores</div>`;
      return;
    }

    STORES = data || [];
    console.log(`✅ Loaded ${STORES.length} stores`);
    renderView();
  } catch (err) {
    console.error("💥 loadStores failed:", err);
    document.getElementById("cards").innerHTML = `<div class="error">Error loading stores</div>`;
  }
}

/* ============================================================
   Rendering
   ============================================================ */
function renderView() {
  const cardsWrap = document.getElementById("cards");
  const tableWrap = document.getElementById("table");

  if (CURRENT_VIEW === "cards") {
    tableWrap.style.display = "none";
    cardsWrap.style.display = "block";
    renderCards();
  } else {
    cardsWrap.style.display = "none";
    tableWrap.style.display = "block";
    renderList();
  }
}

/* ============================================================
   Render Cards
   ============================================================ */
function renderCards() {
  const wrap = document.getElementById("cards");
  wrap.innerHTML = "";

  if (!STORES.length) {
    wrap.innerHTML = `<div class="muted">No stores found in this category.</div>`;
    return;
  }

  const cards = STORES.map(store => `
    <div class="store-card">
      <img class="store-photo" src="https://gbxxoeplkzbhsvagnfsr.functions.supabase.co/photo-proxy?photo_reference=${encodeURIComponent(store.photo_reference || "")}&maxwidth=400" 
           onerror="this.src='https://worldcigarlocator-maker.github.io/Worldcigarlocator/images/store.jpg'">
      <div class="store-body">
        <h3>${store.name || "(No name)"}</h3>
        <p>📍 ${store.city || "-"}, ${store.country || ""}</p>
        <p>⭐ ${store.rating || "–"}</p>
        <p>🌍 ${store.continent || "Other"}</p>
        <p>🏷️ ${store.type || "–"} / ${store.access || "–"}</p>
        <div class="status">
          ${store.approved ? "✅ APPROVED" :
            store.flagged ? "⚠️ FLAGGED" :
            store.deleted ? "🗑️ DELETED" :
            "⏳ PENDING"}
        </div>
        <div class="actions">
          <button class="btn small" onclick="approveStore(${store.id})">Approve</button>
          <button class="btn small ghost" onclick="flagStore(${store.id})">Flag</button>
          <button class="btn small danger" onclick="deleteStore(${store.id})">Delete</button>
        </div>
      </div>
    </div>
  `).join("");

  wrap.innerHTML = `<div class="grid-cards">${cards}</div>`;
}

/* ============================================================
   Render List
   ============================================================ */
function renderList() {
  const tbody = document.getElementById("tbody");
  tbody.innerHTML = "";

  if (!STORES.length) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;color:#666;">No stores found</td></tr>`;
    return;
  }

  STORES.forEach(store => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${store.name || "-"}</td>
      <td>${store.country || "-"}</td>
      <td>${store.continent || "-"}</td>
      <td>${store.city || "-"}</td>
      <td>${store.type || "-"}</td>
      <td>${store.access || "-"}</td>
      <td>${store.rating || "-"}</td>
      <td>${store.status || "-"}</td>
      <td>${store.approved ? "✅" : store.flagged ? "⚠️" : store.deleted ? "🗑️" : "⏳"}</td>
      <td>
        <button class="btn small" onclick="approveStore(${store.id})">Approve</button>
        <button class="btn small ghost" onclick="flagStore(${store.id})">Flag</button>
        <button class="btn small danger" onclick="deleteStore(${store.id})">Delete</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

/* ============================================================
   Actions
   ============================================================ */
async function approveStore(id) {
  await WCL.supabase.from("stores").update({ approved: true, flagged: false, deleted: false, status: "approved" }).eq("id", id);
  loadStores();
}
async function flagStore(id) {
  await WCL.supabase.from("stores").update({ flagged: true, approved: false, deleted: false, status: "flagged" }).eq("id", id);
  loadStores();
}
async function deleteStore(id) {
  await WCL.supabase.from("stores").update({ deleted: true, flagged: false, approved: false, status: "deleted" }).eq("id", id);
  loadStores();
}

/* ============================================================
   Tabs + View Toggles
   ============================================================ */
document.querySelectorAll(".pill").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".pill").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    CURRENT_TAB = btn.dataset.tab;
    loadStores();
  });
});

document.querySelectorAll(".seg").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".seg").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    CURRENT_VIEW = btn.dataset.view;
    renderView();
  });
});

/* ============================================================
   Init
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  loadStores();
});
