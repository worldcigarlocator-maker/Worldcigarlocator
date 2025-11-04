/* ============================================================
   Backoffice — Moderation / Management (V4.3)
   ============================================================ */

console.log("✅ Backoffice JS v4.3 loaded (cards+list+proxy fixed)");

const WCL = {};
WCL.SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
WCL.SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";
WCL.PHOTO_PROXY_URL =
  "https://gbxxoeplkzbhsvagnfsr.functions.supabase.co/photo-proxy";
WCL.GITHUB_STORE_FALLBACK =
  "https://worldcigarlocator-maker.github.io/Worldcigarlocator/images/store.jpg";

WCL.supabase = window.supabase.createClient(
  WCL.SUPABASE_URL,
  WCL.SUPABASE_ANON_KEY
);

let STORES = [];
let CURRENT_TAB = "pending";
let CURRENT_VIEW = "cards";

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Backoffice initialized");

  document.querySelectorAll(".pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".pill").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      CURRENT_TAB = btn.dataset.tab;
      loadStores();
    });
  });

  document.querySelectorAll(".seg").forEach((seg) => {
    seg.addEventListener("click", () => {
      document.querySelectorAll(".seg").forEach((s) => s.classList.remove("active"));
      seg.classList.add("active");
      CURRENT_VIEW = seg.dataset.view;
      renderView();
    });
  });

  loadStores();
});

/* ============================================================
   Load Stores (Safe + Status-based)
   ============================================================ */
async function loadStores() {
  console.log("🔄 Loading stores for tab:", CURRENT_TAB);
  const cardsWrap = document.getElementById("cards");
  const tableWrap = document.getElementById("table");
  cardsWrap.innerHTML = `<p style="text-align:center;color:#888;">Loading…</p>`;
  tableWrap.style.display = "none";
  cardsWrap.style.display = "block";

  try {
    let query = WCL.supabase
      .from("stores")
      .select(
        "id,name,city,country,continent,type,access,rating,approved,flagged,deleted,status,photo_reference,place_id"
      );

    switch (CURRENT_TAB) {
      case "pending":
        query = query.eq("status", "pending").eq("deleted", false);
        break;
      case "approved":
        query = query.eq("approved", true).eq("deleted", false);
        break;
      case "flagged":
        query = query.eq("flagged", true).eq("deleted", false);
        break;
      case "deleted":
        query = query.eq("deleted", true);
        break;
      case "all":
        query = query.eq("deleted", false);
        break;
    }

    const { data, error } = await query.order("id", { ascending: false });

    if (error) throw error;

    STORES = data || [];
    console.log(`✅ Loaded ${STORES.length} stores`);
    renderView();
  } catch (err) {
    console.error("💥 loadStores failed:", err);
    cardsWrap.innerHTML = `<div class="error">Error loading stores</div>`;
  }
}

/* ============================================================
   Render View
   ============================================================ */
function renderView() {
  if (CURRENT_VIEW === "cards") renderCards();
  else renderList();
}

/* ============================================================
   Render Cards (color-coded)
   ============================================================ */
function renderCards() {
  const wrap = document.getElementById("cards");
  wrap.innerHTML = "";

  if (!STORES.length) {
    wrap.innerHTML = `<p style="text-align:center;color:#999;">No stores found.</p>`;
    return;
  }

  STORES.forEach((s) => {
    const card = document.createElement("div");
    card.className = "store-card";

    // ✅ Color based on status
    let colorClass = "";
    if (s.deleted) colorClass = "deleted";
    else if (s.flagged) colorClass = "flagged";
    else if (s.approved) colorClass = "approved";
    else colorClass = "pending";
    card.classList.add(colorClass);

    const img =
      s.photo_reference
        ? `${WCL.PHOTO_PROXY_URL}?photo_reference=${encodeURIComponent(
            s.photo_reference
          )}&maxwidth=800`
        : WCL.GITHUB_STORE_FALLBACK;

    const stars = Array.from({ length: 5 })
      .map((_, i) => (i < (Math.round(s.rating) || 0) ? "★" : "☆"))
      .join("");

    card.innerHTML = `
      <img class="store-photo" src="${img}" alt="${s.name}">
      <div class="store-body">
        <div class="title">${s.name}</div>
        <div class="meta">${s.city || "Unknown"}, ${s.country || ""}</div>
        <div class="stars">${stars}</div>
        <div class="tag">${s.type || "N/A"} • ${s.access || "-"}</div>
        <div class="status">${s.status?.toUpperCase() || (s.approved ? "APPROVED" : "PENDING")}</div>
      </div>
    `;

    wrap.appendChild(card);
  });
}

/* ============================================================
   Render List
   ============================================================ */
function renderList() {
  const tbody = document.getElementById("tbody");
  const tableWrap = document.getElementById("table");
  const cardsWrap = document.getElementById("cards");
  tbody.innerHTML = "";
  tableWrap.style.display = "block";
  cardsWrap.style.display = "none";

  if (!STORES.length) {
    tbody.innerHTML = `<tr><td colspan="11" style="text-align:center;color:#888;">No stores found.</td></tr>`;
    return;
  }

  STORES.forEach((s) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${s.name}</td>
      <td>${s.country}</td>
      <td>${s.continent || "-"}</td>
      <td>${s.city}</td>
      <td>${s.type || "-"}</td>
      <td>${s.access || "-"}</td>
      <td>${s.rating || "-"}</td>
      <td>${s.status || (s.approved ? "approved" : "pending")}</td>
      <td>${s.flagged ? "⚠️" : ""}</td>
      <td>${s.deleted ? "🗑" : ""}</td>
      <td class="t-actions">—</td>
    `;
    tbody.appendChild(tr);
  });
}
