/* ============================================================
   start.js — World Cigar Locator (Frontend Final v3)
   ============================================================ */

const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ---------- Hjälpfunktioner ---------- */
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

/* ---------- Automatisk kontinentidentifiering ---------- */
function getContinentFromCountry(country) {
  const c = (country || "").toLowerCase();
  if (["sweden","germany","france","italy","spain","norway","finland","denmark","netherlands","belgium","austria","switzerland","poland","czech republic","czechia"].includes(c)) return "Europe";
  if (["united states","usa","canada","mexico","cuba","dominican republic"].includes(c)) return "North America";
  if (["brazil","argentina","chile","peru","colombia","uruguay","paraguay"].includes(c)) return "South America";
  if (["china","japan","india","thailand","malaysia","singapore","israel","turkey","vietnam","indonesia"].includes(c)) return "Asia";
  if (["south africa","nigeria","kenya","morocco","egypt","ghana"].includes(c)) return "Africa";
  if (["australia","new zealand","fiji"].includes(c)) return "Oceania";
  return "Other";
}

/* ---------- Bygg vänstermeny ---------- */
async function buildSidebar() {
  const menu = document.getElementById("sidebarMenu");
  if (!menu) return;

  menu.innerHTML = `<li style="color:#999">Loading…</li>`;

  const { data: stores, error } = await supabase
    .from("stores_public")
    .select("id, name, city, country, type, phone, website, rating, photo_url, photo_reference")
    .eq("approved", true)
    .eq("deleted", false);

  if (error) {
    console.error("Error loading stores:", error);
    menu.innerHTML = `<li style="color:#f56">Failed to load data</li>`;
    return;
  }

  console.log(`✅ Loaded ${stores.length} stores`);

  const grouped = {};
  for (const s of stores) {
    const cont = getContinentFromCountry(s.country);
    if (!grouped[cont]) grouped[cont] = {};
    const ctry = s.country || "Unknown";
    if (!grouped[cont][ctry]) grouped[cont][ctry] = {};
    const city = s.city || "Unknown";
    if (!grouped[cont][ctry][city]) grouped[cont][ctry][city] = [];
    grouped[cont][ctry][city].push(s);
  }

  menu.innerHTML = "";
  Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b)) // 🌍 Sort continents A–Z
    .forEach(([continent, countries]) => {
      const li = el("li", "continent");
      const btn = el("button", "continent-btn");
      const arrow = el("span", "arrow", "▶");
      const label = el("span", "label", continent);
      const count = Object.values(countries)
        .reduce((acc, c) => acc + Object.values(c).reduce((a, b) => a + b.length, 0), 0);
      const badge = el("span", "pill", count);
      btn.append(arrow, label, badge);
      li.appendChild(btn);

      const nested = el("ul", "nested");
      li.appendChild(nested);

      let loaded = false;
      btn.addEventListener("click", () => {
        const isOpen = nested.classList.toggle("show");
        arrow.style.transform = isOpen ? "rotate(90deg)" : "rotate(0deg)";
        btn.style.background = isOpen ? "#333" : "#222";
        if (isOpen && !loaded) {
          renderCountries(countries, nested);
          loaded = true;
        }
      });

      menu.appendChild(li);
    });
}

function renderCountries(countries, container) {
  container.innerHTML = "";
  Object.entries(countries)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([country, cities]) => {
      const li = el("li", "country-item");
      const btn = el("button", "country-btn");
      const arrow = el("span", "arrow", "▶");
      const label = el("span", "label", country);
      const count = Object.values(cities).reduce((a, b) => a + b.length, 0);
      const badge = el("span", "pill", count);
      btn.append(arrow, label, badge);
      li.appendChild(btn);

      const nested = el("ul", "nested");
      li.appendChild(nested);

      let loaded = false;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = nested.classList.toggle("show");
        arrow.style.transform = isOpen ? "rotate(90deg)" : "rotate(0deg)";
        btn.style.background = isOpen ? "#333" : "#222";
        if (isOpen && !loaded) {
          renderCities(cities, nested);
          loaded = true;
        }
      });

      container.appendChild(li);
    });
}

function renderCities(cities, container) {
  container.innerHTML = "";
  Object.entries(cities)
    .sort(([, a], [, b]) => b.length - a.length) // 🏙️ Sort by count
    .forEach(([city, stores]) => {
      const li = el("li", "city-item");
      const btn = el("button", "city-btn");
      const arrow = el("span", "arrow", "▶");
      const label = el("span", "label", city);
      const badge = el("span", "pill", stores.length);
      btn.append(arrow, label, badge);
      li.appendChild(btn);

      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        document.querySelector(".main").scrollIntoView({ behavior: "smooth" });
        renderStores(stores);
      });

      container.appendChild(li);
    });
}

/* ---------- Kort i MAIN ---------- */
function renderStores(stores) {
  const grid = document.getElementById("storeGrid");
  if (!grid) return;
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
        <img src="${imgSrc}" alt="${esc(s.name)}" class="card-img">
        <span class="type-badge" style="background:${badgeColor}">${esc(s.type || "Store")}</span>
      </div>
      <div class="card-content">
        <h3 class="card-title">${esc(s.name)}</h3>
        <div class="rating-stars">${stars}</div>
        <p class="card-info"><strong>📍</strong> ${esc(s.city || "Unknown")}, ${esc(s.country || "")}</p>
        ${s.phone ? `<p class="card-info"><strong>📞</strong> ${esc(s.phone)}</p>` : ""}
        ${s.website ? `<p class="card-info"><strong>🌐</strong> <a href="${esc(s.website)}" target="_blank">${esc(s.website)}</a></p>` : ""}
      </div>
    `;
    grid.appendChild(card);
  });

  console.log(`📦 Rendered ${stores.length} stores in main`);
}

/* ---------- Init ---------- */
document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ start.js loaded, building sidebar...");
  buildSidebar();
});
