/* ============================================================
   start.js — World Cigar Locator (Frontend v5.1 Safe Test)
   ============================================================ */

const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ---------- Helpers ---------- */
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}
function esc(str) {
  return String(str || "")
    .replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[c]);
}

/* ============================================================
   Load & Render Stores
   ============================================================ */
async function loadStores(filter = {}, searchTerm = "") {
  const grid = document.getElementById("storeGrid");
  const heading = document.getElementById("resultHeading");
  if (!grid) return;

  grid.innerHTML = `<p style="color:#777;text-align:center;">Loading…</p>`;

  // 🔧 simplified safe query (no order/filters yet)
  let query = supabase
    .from("stores_public")
    .select("*")
    .limit(20);

  const { data: stores, error } = await query;

  // 🧠 log output to console
  console.log("📡 Supabase response:", { data: stores, error });

  if (error) {
    console.error("❌ Error fetching stores:", error);
    grid.innerHTML = `<p style="color:#c33;text-align:center;">Error loading stores.</p>`;
    return;
  }

  if (!stores || stores.length === 0) {
    grid.innerHTML = `<p style="color:#777;text-align:center;">No approved stores found.</p>`;
    return;
  }

  heading.textContent = "Latest 20 worldwide";
  renderStoreCards(stores);
}

/* ============================================================
   Render Cards
   ============================================================ */
function renderStoreCards(stores) {
  const grid = document.getElementById("storeGrid");
  grid.innerHTML = "";

  stores.forEach((s) => {
    const card = el("div", "store-card");

    const imgSrc = s.photo_url
      ? s.photo_url
      : s.photo_reference
      ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${s.photo_reference}&key=AIzaSyDdn7E6_dfwUjGQ1IUdJ2rQXUeEYIIzVtQ`
      : "images/store.jpg";

    let badgeColor = "#b8860b";
    if ((s.type || "").toLowerCase().includes("lounge")) badgeColor = "#28a745";
    if ((s.type || "").toLowerCase().includes("other")) badgeColor = "#ff8c00";

    const rating = Math.round(Number(s.rating) || 0);
    const stars = Array.from({ length: 5 })
      .map((_, i) => (i < rating ? "★" : "☆"))
      .join("");

    card.innerHTML = `
      <div class="card-top">
        <img src="${imgSrc}" alt="${esc(s.name)}" class="store-img" />
        <span class="type-badge" style="background:${badgeColor}">
          ${esc(s.type || "Store")}
        </span>
      </div>
      <div class="card-body">
        <div class="title-wrap"><h3 class="card-title">${esc(s.name)}</h3></div>
        <div class="rating-stars">${stars}</div>
        <p class="card-info"><strong>📍</strong> ${esc(s.city || "Unknown")}, ${esc(
      s.country || ""
    )}</p>
        ${
          s.phone
            ? `<p class="card-info"><strong>📞</strong> ${esc(s.phone)}</p>`
            : ""
        }
        ${
          s.website
            ? `<p class="card-info"><strong>🌐</strong> <a href="${esc(
                s.website
              )}" target="_blank">${esc(s.website)}</a></p>`
            : ""
        }
      </div>
    `;
    grid.appendChild(card);
  });
}

/* ============================================================
   Init
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Frontend v5.1 test mode loaded");
  loadStores();

  const searchInput = document.getElementById("searchInput");
  const searchBtn = document.getElementById("searchBtn");
  const clearBtn = document.getElementById("clearBtn");

  searchBtn?.addEventListener("click", () => loadStores({}, searchInput.value.trim()));
  clearBtn?.addEventListener("click", () => {
    searchInput.value = "";
    loadStores();
  });
  searchInput?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") loadStores({}, e.target.value.trim());
  });
});
