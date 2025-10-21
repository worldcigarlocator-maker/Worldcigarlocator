/* ============================================================
   start.js — World Cigar Locator (Frontend, no DB continent field)
   ============================================================ */

// === Supabase-konfiguration (Publik, endast läsning) ===
const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// === Hjälpfunktioner ===
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

// === Automatisk kontinent-identifiering ===
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

// === Bygg vänstermeny (kontinent → land → stad) ===
async function buildSidebar() {
  const menu = document.getElementById("sidebarMenu");
  if (!menu) return;

  menu.innerHTML = `<li style="color:#999">Loading…</li>`;

  // Hämta alla godkända butiker från stores_public
  const { data: stores, error } = await supabase
    .from("stores_public")
    .select("id, name, city, country, type, phone, website, photo_url, photo_reference")
    .eq("approved", true)
    .eq("deleted", false);

  if (error) {
    console.error("Error loading stores:", error);
    menu.innerHTML = `<li style="color:#f56">Failed to load data</li>`;
    return;
  }

  // Gruppera data: kontinent → land → stad
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

  // Rendera kontinenter
  menu.innerHTML = "";
  Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
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
      btn.addEventListener("click", async () => {
        const isOpen = nested.classList.toggle("show");
        arrow.style.transform = isOpen ? "rotate(90deg)" : "rotate(0deg)";
        btn.style.background = isOpen ? "#333" : "#222";
        if (!loaded) {
          renderCountries(countries, nested);
          loaded = true;
        }
      });

      menu.appendChild(li);
    });
}

// === Rendera länder ===
function renderCountries(countries, container) {
  container.innerHTML = "";
  Object.entries(countries)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([country, cities]) => {
      const li = el("li", "country-item");
      const arrow = el("span", "arrow", "▶");
      const label = el("span", "label", country);
      const count = Object.values(cities).reduce((a, b) => a + b.length, 0);
      const badge = el("span", "pill", count);
      li.append(arrow, label, badge);

      const nested = el("ul", "nested");
      li.appendChild(nested);

      let loaded = false;
      li.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = nested.classList.toggle("show");
        arrow.style.transform = isOpen ? "rotate(90deg)" : "rotate(0deg)";
        li.style.background = isOpen ? "#292929" : "#181818";
        if (!loaded) {
          renderCities(cities, nested);
          loaded = true;
        }
      });

      container.appendChild(li);
    });
}

// === Rendera städer ===
function renderCities(cities, container) {
  container.innerHTML = "";
  Object.entries(cities)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([city, stores]) => {
      const li = el("li", "country-item");
      const arrow = el("span", "arrow", "▶");
      const label = el("span", "label", city);
      const badge = el("span", "pill", stores.length);
      li.append(arrow, label, badge);

      const nested = el("ul", "nested");
      li.appendChild(nested);

      li.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = nested.classList.toggle("show");
        arrow.style.transform = isOpen ? "rotate(90deg)" : "rotate(0deg)";
        li.style.background = isOpen ? "#292929" : "#181818";
        if (isOpen) renderStores(stores, nested);
      });

      container.appendChild(li);
    });
}

// === Rendera butikskort ===
function renderStores(stores, container) {
  const grid = el("div", "store-grid");
  stores.forEach((s) => {
    const card = el("div", "store-card");
    const imgSrc = s.photo_url
      ? s.photo_url
      : s.photo_reference
      ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${s.photo_reference}&key=AIzaSyDdn7E6_dfwUjGQ1IUdJ2rQXUeEYIIzVtQ`
      : "images/store.jpg";

    card.innerHTML = `
      <img src="${imgSrc}" alt="store">
      <h3>${esc(s.name)}</h3>
      <p>${esc(s.city || "Unknown")}, ${esc(s.country || "")}</p>
      <p style="color:#b8860b;font-weight:bold;">${esc(s.type || "")}</p>
      ${s.website ? `<a href="${esc(s.website)}" target="_blank">Visit website</a>` : ""}
    `;
    grid.appendChild(card);
  });
  container.innerHTML = "";
  container.appendChild(grid);
}

// === Init ===
document.addEventListener("DOMContentLoaded", buildSidebar);
