/* ============================================================
   start.js — World Cigar Locator (Frontend v5)
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

  let query = supabase
    .from("stores_public")
    .select(
      "id, name, city, country, type, phone, website, rating, photo_url, photo_reference, approved, deleted, created_at"
    )
    .eq("approved", true)
    .eq("deleted", false)
    .order("created_at", { ascending: false });

  // Limit only for non-filtered searches
  if (!filter.city && !filter.country && !filter.continent && !searchTerm) {
    query = query.limit(20);
  }

  if (searchTerm) {
    query = query.or(
      `name.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%,country.ilike.%${searchTerm}%`
    );
  }

  const { data: stores, error } = await query;
  if (error) {
    console.error("Error fetching stores:", error);
    grid.innerHTML = `<p style="color:#c33;text-align:center;">Error loading stores.</p>`;
    return;
  }

  // Filter by sidebar selection if present
  let filtered = stores;
  if (filter.city) filtered = filtered.filter((s) => (s.city || "").toLowerCase() === filter.city.toLowerCase());
  else if (filter.country) filtered = filtered.filter((s) => (s.country || "").toLowerCase() === filter.country.toLowerCase());
  else if (filter.continent) filtered = filtered.filter((s) => getContinentFromCountry(s.country) === filter.continent);

  heading.textContent = searchTerm
    ? `Results for “${searchTerm}”`
    : filter.city
    ? `${filter.city}`
    : filter.country
    ? `${filter.country}`
    : filter.continent
    ? `${filter.continent}`
    : "Latest 20 worldwide";

  if (!filtered || filtered.length === 0) {
    grid.innerHTML = `<p style="color:#777;text-align:center;">No approved stores found.</p>`;
    return;
  }

  renderStoreCards(filtered);
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
   Sidebar (Continents / Countries / Cities)
   ============================================================ */
function getContinentFromCountry(country) {
  const c = (country || "").toLowerCase();
  if (
    [
      "sweden",
      "germany",
      "france",
      "italy",
      "spain",
      "norway",
      "finland",
      "denmark",
      "netherlands",
      "belgium",
      "austria",
      "switzerland",
      "poland",
      "czech republic",
      "czechia",
    ].includes(c)
  )
    return "Europe";
  if (["united states", "usa", "canada", "mexico", "cuba", "dominican republic"].includes(c))
    return "North America";
  if (["brazil", "argentina", "chile", "peru", "colombia", "uruguay", "paraguay"].includes(c))
    return "South America";
  if (["china", "japan", "india", "thailand", "malaysia", "singapore", "israel", "turkey", "vietnam", "indonesia"].includes(c))
    return "Asia";
  if (["south africa", "nigeria", "kenya", "morocco", "egypt", "ghana"].includes(c))
    return "Africa";
  if (["australia", "new zealand", "fiji"].includes(c)) return "Oceania";
  return "Other";
}

async function buildSidebar() {
  const menu = document.getElementById("sidebarMenu");
  if (!menu) return;
  menu.innerHTML = `<li style="color:#999">Loading…</li>`;

  const { data: stores, error } = await supabase
    .from("stores_public")
    .select("id, name, city, country, approved, deleted")
    .eq("approved", true)
    .eq("deleted", false);

  if (error || !stores) {
    menu.innerHTML = `<li style="color:#f56">Failed to load data</li>`;
    return;
  }

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
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([continent, countries]) => {
      const line = el("button", "line continent");
      line.innerHTML = `<span class="arrow">▶</span><span class="label">${continent}</span><span class="pill">${Object.values(countries)
        .reduce((acc, c) => acc + Object.values(c).reduce((a, b) => a + b.length, 0), 0)}</span>`;
      const nested = el("div", "nested");

      line.addEventListener("click", () => {
        const isOpen = nested.classList.toggle("show");
        line.classList.toggle("open", isOpen);
        line.querySelector(".arrow").style.transform = isOpen ? "rotate(90deg)" : "rotate(0deg)";
        if (isOpen) nested.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });

      // Countries
      Object.entries(countries)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([country, cities]) => {
          const lineCountry = el("button", "line country");
          lineCountry.innerHTML = `<span class="arrow">▶</span><span class="label">${country}</span><span class="pill">${Object.values(cities).reduce(
            (a, b) => a + b.length,
            0
          )}</span>`;
          const nestedCity = el("div", "nested");

          lineCountry.addEventListener("click", (e) => {
            e.stopPropagation();
            const isOpen = nestedCity.classList.toggle("show");
            lineCountry.classList.toggle("open", isOpen);
            lineCountry.querySelector(".arrow").style.transform = isOpen ? "rotate(90deg)" : "rotate(0deg)";
          });

          // Cities
          Object.entries(cities)
            .sort(([, a], [, b]) => b.length - a.length)
            .forEach(([city, cityStores]) => {
              const btnCity = el("button", "line city");
              btnCity.innerHTML = `<span class="label">${city}</span><span class="pill">${cityStores.length}</span>`;
              btnCity.addEventListener("click", (e) => {
                e.stopPropagation();
                document.querySelector(".main").scrollIntoView({ behavior: "smooth" });
                loadStores({ city });
              });
              nestedCity.appendChild(btnCity);
            });

          nested.appendChild(lineCountry);
          nested.appendChild(nestedCity);
        });

      menu.append(line, nested);
      line.addEventListener("click", () => {
        loadStores({ continent });
      });
    });
}

/* ============================================================
   Init
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Frontend v5 ready");
  buildSidebar();
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
