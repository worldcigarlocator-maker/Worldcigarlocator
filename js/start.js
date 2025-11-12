/* ============================================================
   start.js — World Cigar Locator (Frontend v7 – proxy ready)
   ============================================================ */

// ✅ Supabase setup via proxy
const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ==== Cards grid – kompakt backoffice-style ==== */
.store-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); /* smalare */
  gap: 0.9rem;
  align-items: start;
}

/* Kortens ram + hover */
.store-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  color: #eee;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}
.store-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.25),
              0 0 0 2px rgba(184, 134, 11, 0.28);
}

/* Bildhöjd något lägre för fler kort i grid */
.store-img {
  width: 100%;
  height: 140px;
  object-fit: cover;
  background: #000;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.85rem;
  flex-grow: 1;
  justify-content: flex-start;
}

/* Namn – exakt två rader */
.title-wrap {
  min-height: 2.6em;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.card-title {
  font-size: 0.95rem;
  color: #fff;
  line-height: 1.3;
  margin: 0;
}

/* Typbadges (store/lounge) */
.type-badge-inline {
  font-weight: 800;
  font-size: 0.72rem;
  border-radius: 6px;
  padding: 0.22rem 0.5rem;
  text-transform: uppercase;
  color: #fff;
  letter-spacing: 0.4px;
}
.type-badge-inline.store { background: #28a745; }
.type-badge-inline.lounge { background: #007bff; }

.badge-row {
  display: flex;
  gap: 0.35rem;
  margin-bottom: 0.2rem;
  flex-wrap: wrap;
}

.rating-stars {
  color: var(--accent);
  font-size: 1rem;
}

/* Flagga + land + stad */
.locrow {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: #ddd;
  font-size: 0.9rem;
}
.flag-emoji {
  font-size: 1rem;
  line-height: 1;
}

/* Info-rader */
.card-info {
  font-size: 0.85rem;
  color: #ccc;
  line-height: 1.25;
  word-break: break-word;
}
.card-info strong {
  color: var(--accent);
}
.truncate {
  display: inline-block;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}


// ✅ Proxy for photo loading
const PHOTO_PROXY_URL =
  "https://gbxxoeplkzbhsvagnfsr.functions.supabase.co/photo-proxy";
const GOOGLE_KEY = "AIzaSyDdn7E6_dfwUjGQ1IUdJ2rQXUeEYIIzVtQ";


function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}
function esc(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

/* ============================================================
   Helpers
   ============================================================ */

function buildPhotoProxyUrl(ref, w = 800) {
  if (!ref) return null;
  return `${PHOTO_PROXY_URL}?photo_reference=${encodeURIComponent(ref)}&maxwidth=${w}`;
}

function getContinentFromCountry(country) {
  const c = (country || "").toLowerCase();
  if (
    [
      "sweden", "germany", "france", "italy", "spain", "norway",
      "finland", "denmark", "netherlands", "belgium", "austria",
      "switzerland", "poland", "czech republic", "czechia"
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
  if (["australia", "new zealand", "fiji"].includes(c))
    return "Oceania";
  return "Other";
}

/* ============================================================
   Load Stores
   ============================================================ */
async function loadStores(filter = {}, searchTerm = "") {
  const grid = document.getElementById("storeGrid");
  const heading = document.getElementById("resultHeading");
  const showAllBtn = document.getElementById("showAllBtn");
  if (!grid) return;
  grid.innerHTML = `<p style="color:#777;text-align:center;">Loading…</p>`;

  let query = supabase
    .from("stores_public")
    .select("*")
    .order("id", { ascending: false });

  if (filter.city) query = query.eq("city", filter.city);
  else if (filter.country) query = query.eq("country", filter.country);
  else if (filter.continent) {
    const { data: all, error } = await query;
    if (error) {
      grid.innerHTML = `<p style="color:#c33;text-align:center;">Error loading stores.</p>`;
      return;
    }
    const filtered = all.filter(
      (s) => getContinentFromCountry(s.country) === filter.continent
    );
    heading.textContent = `Latest in ${filter.continent}`;
    showAllBtn.style.display = "inline-block";
    renderStoreCards(filtered);
    return;
  }

  if (searchTerm) {
    query = query.or(
      `name.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%,country.ilike.%${searchTerm}%`
    );
  }

  const { data: stores, error } = await query;
  if (error) {
    console.error(error);
    grid.innerHTML = `<p style="color:#c33;text-align:center;">Error loading stores.</p>`;
    return;
  }
  if (!stores || stores.length === 0) {
    grid.innerHTML = `<p style="color:#777;text-align:center;">No stores found.</p>`;
    return;
  }

  if (filter.city) {
    heading.textContent = `Latest in ${filter.city}`;
    showAllBtn.style.display = "inline-block";
  } else if (filter.country) {
    heading.textContent = `Latest in ${filter.country}`;
    showAllBtn.style.display = "inline-block";
  } else {
    heading.textContent = "Latest 20 worldwide";
    showAllBtn.style.display = "none";
  }

  renderStoreCards(stores);
}

/* ============================================================
   Render Store Cards
   ============================================================ */
function renderStoreCards(stores) {
  const grid = document.getElementById("storeGrid");
  grid.innerHTML = "";

  stores.forEach((s) => {
    const card = document.createElement("div");
    card.className = "store-card";

    // 🔹 Bild via proxy (eller fallback)
    const imgSrc = s.photo_reference
      ? buildPhotoProxyUrl(s.photo_reference, 800)
      : "images/store.jpg";

    // 🔹 Typ-badges (store/lounge)
    const typeList = (s.type || "")
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t === "store" || t === "lounge");
    const badgesHtml = typeList
      .map((t) => {
        const isStore = t === "store";
        return `<span class="type-badge-inline ${isStore ? "store" : "lounge"}">${isStore ? "STORE" : "LOUNGE"}</span>`;
      })
      .join(" ");

    // 🔹 Rating-stjärnor
    const rating = Math.round(Number(s.rating) || 0);
    const stars = Array.from({ length: 5 })
      .map((_, i) => (i < rating ? "★" : "☆"))
      .join("");

    // 🔹 Övrig info
    const addr = s.address || "Unknown";
    const phone = s.phone || "";
    const website = s.website
      ? `<a href="${esc(s.website)}" target="_blank" rel="noopener">${esc(s.website)}</a>`
      : "";

    // 🔹 Flagga (SVG)
    const flagSrc = flagURL(s.country);
    const flagImg = flagSrc
      ? `<img src="${flagSrc}" class="flag" alt="${esc(s.country)}" />`
      : "";
    const locationRow = `
      <div class="locrow">
        ${flagImg}
        <span class="loc-text">${esc(s.country || "")}${s.city ? ", " + esc(s.city) : ""}</span>
      </div>`;

    // 🔹 Bygg kortet
    card.innerHTML = `
      <div class="card-top">
        <img src="${imgSrc}" alt="${esc(s.name)}" class="store-img" />
      </div>

      <div class="card-body">
        <div class="badge-row">${badgesHtml}</div>
        <div class="title-wrap">
          <h3 class="card-title twoline">${esc(s.name)}</h3>
        </div>
        <div class="rating-stars">${stars}</div>

        ${locationRow}

        <p class="card-info"><strong>Address:</strong> <span class="truncate">${esc(addr)}</span></p>
        ${phone ? `<p class="card-info"><strong>Phone:</strong> ${esc(phone)}</p>` : ""}
        ${website ? `<p class="card-info"><strong>Website:</strong> ${website}</p>` : ""}
      </div>
    `;

    grid.appendChild(card);
  });
}


/* ============================================================
   Sidebar builder
   ============================================================ */
async function buildSidebar() {
  const menu = document.getElementById("sidebarMenu");
  if (!menu) return;
  menu.innerHTML = `<li style="color:#999">Loading…</li>`;
  const { data: stores, error } = await supabase
    .from("stores_public")
    .select("id,name,city,country");
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
      line.innerHTML = `<span class="arrow">▶</span><span class="label">${continent}</span><span class="pill">${
        Object.values(countries).reduce(
          (acc, c) =>
            acc +
            Object.values(c).reduce((a, b) => a + b.length, 0),
          0
        )
      }</span>`;
      const nested = el("div", "nested");
      line.addEventListener("click", () => {
        const isOpen = nested.classList.toggle("show");
        line.classList.toggle("open", isOpen);
        line.querySelector(".arrow").style.transform = isOpen
          ? "rotate(90deg)"
          : "rotate(0deg)";
        if (isOpen) loadStores({ continent });
      });
      Object.entries(countries)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([country, cities]) => {
          const lineCountry = el("button", "line country");
          lineCountry.innerHTML = `<span class="arrow">▶</span><span class="label">${country}</span><span class="pill">${
            Object.values(cities).reduce((a, b) => a + b.length, 0)
          }</span>`;
          const nestedCity = el("div", "nested");
          lineCountry.addEventListener("click", (e) => {
            e.stopPropagation();
            const isOpen = nestedCity.classList.toggle("show");
            lineCountry.classList.toggle("open", isOpen);
            lineCountry.querySelector(".arrow").style.transform = isOpen
              ? "rotate(90deg)"
              : "rotate(0deg)";
            if (isOpen) loadStores({ country });
          });
          Object.entries(cities)
            .sort(([, a], [, b]) => b.length - a.length)
            .forEach(([city, cityStores]) => {
              const btnCity = el("button", "line city");
              btnCity.innerHTML = `<span class="label">${city}</span><span class="pill">${cityStores.length}</span>`;
              btnCity.addEventListener("click", (e) => {
                e.stopPropagation();
                document
                  .querySelector(".main")
                  .scrollIntoView({ behavior: "smooth" });
                loadStores({ city });
              });
              nestedCity.appendChild(btnCity);
            });
          nested.append(lineCountry, nestedCity);
        });
      menu.append(line, nested);
    });
}

/* ============================================================
   Init
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Frontend v7 (proxy-enabled) loaded");
  buildSidebar();
  loadStores();

  const searchInput = document.getElementById("searchInput");
  const searchBtn = document.getElementById("searchBtn");
  const clearBtn = document.getElementById("clearBtn");
  const showAllBtn = document.getElementById("showAllBtn");

  searchBtn?.addEventListener("click", () =>
    loadStores({}, searchInput.value.trim())
  );
  clearBtn?.addEventListener("click", () => {
    searchInput.value = "";
    loadStores();
  });
  searchInput?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") loadStores({}, e.target.value.trim());
  });
  showAllBtn?.addEventListener("click", () => {
    loadStores();
    showAllBtn.style.display = "none";
  });
});
