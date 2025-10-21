/* ============================================================
   start.js — World Cigar Locator (Frontend v5.2 Stable)
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
    .select("*")
    .order("id", { ascending: false }) // ✅ fungerar alltid
    .limit(20);

  const { data: stores, error } = await query;
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

    // 🏷️ Type badges (store = green, lounge = blue)
    const typeList = (s.type || "")
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t === "store" || t === "lounge"); // ignore "other"

    const badgesHtml = typeList
      .map((t) => {
        let color = "";
        let label = "";
        if (t === "store") {
          color = "#28a745"; // green
          label = "STORE";
        } else if (t === "lounge") {
          color = "#007bff"; // blue
          label = "LOUNGE";
        }
        return `<span class="type-badge-inline" style="background:${color}; color:#fff;">${label}</span>`;
      })
      .join(" ");

    // ⭐ Rating
    const rating = Math.round(Number(s.rating) || 0);
    const stars = Array.from({ length: 5 })
      .map((_, i) => (i < rating ? "★" : "☆"))
      .join("");

    card.innerHTML = `
      <div class="card-top">
        <img src="${imgSrc}" alt="${esc(s.name)}" class="store-img" />
      </div>
      <div class="card-body">
        <div class="badge-row">${badgesHtml}</div>
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
  if (["sweden","germany","france","italy","spain","norway","finland","denmark","netherlands","belgium","austria","switzerland","poland","czech republic","czechia"].includes(c)) return "Europe";
  if (["united states","usa","canada","mexico","cuba","dominican republic"].includes(c)) return "North America";
  if (["brazil","argentina","chile","peru","colombia","uruguay","paraguay"].includes(c)) return "South America";
  if (["china","japan","india","thailand","malaysia","singapore","israel","turkey","vietnam","indonesia"].includes(c)) return "Asia";
  if (["south africa","nigeria","kenya","morocco","egypt","ghana"].includes(c)) return "Africa";
  if (["australia","new zealand","fiji"].includes(c)) return "Oceania";
  return "Other";
}

async function buildSidebar() {
  const menu = document.getElementById("sidebarMenu");
  if (!menu) return;
  menu.innerHTML = `<li style="color:#999">Loading…</li>`;

  const { data: stores, error } = await supabase
    .from("stores_public")
    .select("id, name, city, country");

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
        if (isOpen) loadStores({ continent });
      });

      Object.entries(countries)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([country, cities]) => {
          const lineCountry = el("button", "line country");
          lineCountry.innerHTML = `<span class="arrow">▶</span><span class="label">${country}</span><span class="pill">${Object.values(cities).reduce((a, b) => a + b.length, 0)}</span>`;
          const nestedCity = el("div", "nested");

          lineCountry.addEventListener("click", (e) => {
            e.stopPropagation();
            const isOpen = nestedCity.classList.toggle("show");
            lineCountry.classList.toggle("open", isOpen);
            lineCountry.querySelector(".arrow").style.transform = isOpen ? "rotate(90deg)" : "rotate(0deg)";
            if (isOpen) loadStores({ country });
          });

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
    });
}

/* ============================================================
   Init
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Frontend v5.2 loaded");
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
