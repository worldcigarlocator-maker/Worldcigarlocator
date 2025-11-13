/* ============================================================
   start.js — World Cigar Locator (Frontend v7.1 – fixed cards + modal)
   ============================================================ */

// ✅ Supabase setup via proxy
const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ====== Global flag resolver (full auto + emoji fallback) ======
const FLAGS_BASE = "https://worldcigarlocator-maker.github.io/Worldcigarlocator/assets/flags";

function flagURL(country) {
  if (!country) return null;
  const name = country.trim().toLowerCase();
  const map = {
    "united states": "us", "usa": "us", "united kingdom": "gb", "england": "gb", "scotland": "gb",
    "wales": "gb", "northern ireland": "gb", "czech republic": "cz", "czechia": "cz",
    "south korea": "kr", "north korea": "kp", "dominican republic": "do", "puerto rico": "pr",
    "hong kong": "hk", "taiwan": "tw", "vietnam": "vn", "venezuela": "ve", "laos": "la",
    "ivory coast": "ci", "côte d’ivoire": "ci", "congo": "cd", "dr congo": "cd",
    "democratic republic of the congo": "cd", "republic of the congo": "cg",
    "united arab emirates": "ae", "uae": "ae", "palestine": "ps", "vatican city": "va",
    "syria": "sy", "iran": "ir", "iraq": "iq", "bolivia": "bo", "tanzania": "tz",
    "cape verde": "cv", "eswatini": "sz", "north macedonia": "mk",
  };
  const isoGuess = name.replace(/[^a-z]/g, "").slice(0, 2).toLowerCase();
  const iso = map[name] || isoGuess;
  const svgUrl = `${FLAGS_BASE}/${iso}.svg`;
  const flagEmoji = iso
    .toUpperCase()
    .replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt(0)));
  return { svgUrl, flagEmoji };
}

// ✅ Proxy for photo loading
const PHOTO_PROXY_URL = "https://gbxxoeplkzbhsvagnfsr.functions.supabase.co/photo-proxy";
const GOOGLE_KEY = "AIzaSyDdn7E6_dfwUjGQ1IUdJ2rQXUeEYIIzVtQ";

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}
function esc(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
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
  if (["sweden","germany","france","italy","spain","norway","finland","denmark","netherlands","belgium","austria","switzerland","poland","czech republic","czechia"].includes(c)) return "Europe";
  if (["united states","usa","canada","mexico","cuba","dominican republic"].includes(c)) return "North America";
  if (["brazil","argentina","chile","peru","colombia","uruguay","paraguay"].includes(c)) return "South America";
  if (["china","japan","india","thailand","malaysia","singapore","israel","turkey","vietnam","indonesia"].includes(c)) return "Asia";
  if (["south africa","nigeria","kenya","morocco","egypt","ghana"].includes(c)) return "Africa";
  if (["australia","new zealand","fiji"].includes(c)) return "Oceania";
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

  let query = supabase.from("stores_public").select("*").order("id", { ascending: false });

  if (filter.city) query = query.eq("city", filter.city);
  else if (filter.country) query = query.eq("country", filter.country);
  else if (filter.continent) {
    const { data: all, error } = await query;
    if (error) { grid.innerHTML = `<p style="color:#c33;text-align:center;">Error loading stores.</p>`; return; }
    const filtered = all.filter((s) => getContinentFromCountry(s.country) === filter.continent);
    heading.textContent = `Latest in ${filter.continent}`;
    showAllBtn.style.display = "inline-block";
    renderStoreCards(filtered);
    return;
  }

  if (searchTerm) {
    query = query.or(`name.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%,country.ilike.%${searchTerm}%`);
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

  if (filter.city) { heading.textContent = `Latest in ${filter.city}`; showAllBtn.style.display = "inline-block"; }
  else if (filter.country) { heading.textContent = `Latest in ${filter.country}`; showAllBtn.style.display = "inline-block"; }
  else { heading.textContent = "Latest 20 worldwide"; showAllBtn.style.display = "none"; }

  renderStoreCards(stores);
}

/* ============================================================
   Render Store Cards (v7.1)
   ============================================================ */
function renderStoreCards(stores) {
  const grid = document.getElementById("storeGrid");
  grid.innerHTML = "";

  stores.forEach((s) => {
    const card = document.createElement("div");
    card.className = "store-card";

    const imgSrc = s.photo_reference ? buildPhotoProxyUrl(s.photo_reference, 800) : "images/store.jpg";

    const typeList = (s.type || "")
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t === "store" || t === "lounge");
    const badgesHtml = typeList
      .map((t) => `<span class="type-badge-inline ${t}">${t.toUpperCase()}</span>`)
      .join(" ");

    const rating = Math.round(Number(s.rating) || 0);
    const stars = Array.from({ length: 5 }).map((_, i) => (i < rating ? "★" : "☆")).join("");

    const flagData = flagURL(s.country);
    let flagImg = "";
    if (flagData) {
      flagImg = `<img src="${flagData.svgUrl}" class="flag" alt="${esc(s.country)}"
        onerror="this.style.display='none';const span=document.createElement('span');span.className='flag-fallback';span.textContent='${flagData.flagEmoji}';this.parentNode.insertBefore(span,this.nextSibling);">`;
    }
    const locationRow = `<div class="locrow">${flagImg}<span class="loc-text">${esc(s.country || "")}${s.city ? ", " + esc(s.city) : ""}</span></div>`;

    const hasWebsite = !!s.website;
    const visitBtnHtml = hasWebsite
      ? `<button class="visit-btn" data-url="${esc(s.website)}" type="button">Visit</button>`
      : "";

    card.innerHTML = `
      <div class="card-top">
        <img src="${imgSrc}" alt="${esc(s.name)}" class="store-img" />
      </div>
      <div class="card-body">
        <div class="badge-row">${badgesHtml}</div>
        <div class="title-wrap"><h3 class="card-title">${esc(s.name)}</h3></div>
        <div class="rating-stars">${stars}</div>
        ${locationRow}
        <p class="card-info"><strong>Address:</strong> <span class="truncate">${esc(s.address || `${s.city || "Unknown"}, ${s.country || ""}`)}</span></p>
        ${s.phone ? `<p class="card-info"><strong>Phone:</strong> ${esc(s.phone)}</p>` : ""}
        <div class="card-actions">${visitBtnHtml}</div>
      </div>`;

    card.dataset.name = s.name || "";
    card.dataset.address = s.address || "";
    card.dataset.city = s.city || "";
    card.dataset.country = s.country || "";
    card.dataset.img = imgSrc;
    if (hasWebsite) card.dataset.website = s.website;

    grid.appendChild(card);
  });

  // Visit-knapp separat klick
  grid.querySelectorAll(".visit-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const url = e.currentTarget.getAttribute("data-url");
      if (url) window.open(url, "_blank", "noopener");
    });
  });

  // Klick på kort öppnar modal
  grid.querySelectorAll(".store-card").forEach(card => {
    card.addEventListener("click", () => openStoreModal(card));
  });
}

/* ============================================================
   Modal logic
   ============================================================ */
function qs(id){ return document.getElementById(id); }

function openStoreModal(card){
  const modal = qs("storeModal");
  const mPhoto = qs("mPhoto");
  const mTitle = qs("mTitle");
  const mAddress = qs("mAddress");
  const mLocation = qs("mLocation");
  const mVisit = qs("mVisit");

  mPhoto.src = card.dataset.img || "";
  mTitle.textContent = card.dataset.name || "";
  mAddress.textContent = `Address: ${card.dataset.address || ""}`.trim();
  mLocation.textContent = [card.dataset.city, card.dataset.country].filter(Boolean).join(", ");
  mVisit.onclick = null;

  if (card.dataset.website){
    mVisit.style.display = "";
    mVisit.addEventListener("click", () => window.open(card.dataset.website, "_blank", "noopener"));
  } else {
    mVisit.style.display = "none";
  }

  modal.classList.add("show");
  modal.setAttribute("aria-hidden","false");
}

(function initModal(){
  const modal = document.getElementById("storeModal");
  const closeBtn = modal.querySelector(".modal-close");

  function close(){
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden","true");
  }

  closeBtn.addEventListener("click", close);
  modal.addEventListener("click", (e) => { if(e.target === modal) close(); });

  const stars = modal.querySelectorAll(".star");
  const note = document.getElementById("mRatingNote");
  stars.forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const v = btn.getAttribute("data-v");
      note.textContent = `You selected ${v}/5 (mock)`;
      stars.forEach(s=> s.style.opacity = Number(s.getAttribute("data-v")) <= v ? "1" : ".35");
    });
  });

  document.getElementById("mSave").addEventListener("click", ()=>{
    const txt = (document.getElementById("mComment").value||"").trim();
    if(!txt){ alert("Write a comment first."); return; }
    alert("Saved locally (mock). Hook to Supabase later.");
  });
})();

/* ============================================================
   Sidebar builder + Init
   ============================================================ */
async function buildSidebar() {
  const menu = document.getElementById("sidebarMenu");
  if (!menu) return;
  menu.innerHTML = `<li style="color:#999">Loading…</li>`;
  const { data: stores, error } = await supabase.from("stores_public").select("id,name,city,country");
  if (error || !stores) { menu.innerHTML = `<li style="color:#f56">Failed to load data</li>`; return; }

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
          (acc, c) => acc + Object.values(c).reduce((a, b) => a + b.length, 0),
          0
        )
      }</span>`;
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
          lineCountry.innerHTML = `<span class="arrow">▶</span><span class="label">${country}</span><span class="pill">${
            Object.values(cities).reduce((a, b) => a + b.length, 0)
          }</span>`;
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
          nested.append(lineCountry, nestedCity);
        });
      menu.append(line, nested);
    });
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Frontend v7.1 loaded");
  buildSidebar();
  loadStores();

  const searchInput = document.getElementById("searchInput");
  const searchBtn = document.getElementById("searchBtn");
  const clearBtn = document.getElementById("clearBtn");
  const showAllBtn = document.getElementById("showAllBtn");

  searchBtn?.addEventListener("click", () => loadStores({}, searchInput.value.trim()));
  clearBtn?.addEventListener("click", () => { searchInput.value = ""; loadStores(); });
  searchInput?.addEventListener("keypress", (e) => { if (e.key === "Enter") loadStores({}, e.target.value.trim()); });
  showAllBtn?.addEventListener("click", () => { loadStores(); showAllBtn.style.display = "none"; });
});
