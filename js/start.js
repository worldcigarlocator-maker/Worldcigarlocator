// start.js — World Cigar Locator (Dark Front Cards + Sidebar Navigation)
const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let allStores = [];
let navHistory = [];
const main = document.querySelector(".main");
const nav = document.querySelector(".nav");

// --- Save original start screen ---
const startContent = main.innerHTML;

// --- Helpers ---
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function getContinent(country) {
  const c = String(country || "").toLowerCase();
  if (["sweden","germany","france","italy","spain","norway","denmark","finland","netherlands","belgium"].includes(c)) return "Europe";
  if (["united states","usa","canada","mexico"].includes(c)) return "North America";
  if (["brazil","argentina","chile","colombia","peru"].includes(c)) return "South America";
  if (["china","japan","india","thailand","malaysia","israel","turkey"].includes(c)) return "Asia";
  if (["south africa","nigeria","kenya","morocco"].includes(c)) return "Africa";
  if (["australia","new zealand","fiji"].includes(c)) return "Oceania";
  return "Other";
}

// --- Load stores ---
async function loadStores() {
  main.innerHTML = `<p class="loading">Loading approved stores...</p>`;
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("approved", true)
    .eq("deleted", false);

  if (error) {
    console.error(error);
    main.innerHTML = `<p style="color:red;">Error loading stores</p>`;
    return;
  }

  allStores = (data || []).map(s => ({
    ...s,
    types: Array.isArray(s.types) ? s.types : (s.type ? [s.type] : []),
    state: s.state || s.region || s.admin_area || null,
  }));

  buildSidebar();
  main.innerHTML = startContent;
}

// --- Group data ---
function groupData(rows) {
  const byContinent = new Map();
  for (const s of rows) {
    const cont = getContinent(s.country);
    if (!byContinent.has(cont)) byContinent.set(cont, new Map());
    const byCountry = byContinent.get(cont);
    const cc = (s.country || "Unknown").trim();
    if (!byCountry.has(cc)) byCountry.set(cc, new Map());
    const byState = byCountry.get(cc);
    const st = (s.state || "–").trim();
    if (!byState.has(st)) byState.set(st, []);
    byState.get(st).push(s);
  }
  return byContinent;
}

// --- Sidebar build ---
function buildSidebar() {
  nav.innerHTML = "";
  const grouped = groupData(allStores);
  for (const [continent, countries] of grouped) {
    const contBtn = document.createElement("button");
    contBtn.className = "continent-btn";
    contBtn.innerHTML = `<span class="arrow">▸</span> ${esc(continent)}`;
    nav.appendChild(contBtn);

    const contWrap = document.createElement("div");
    contWrap.className = "nested";
    nav.appendChild(contWrap);

    contBtn.addEventListener("click", () => {
      const open = contWrap.classList.toggle("show");
      contBtn.querySelector(".arrow").style.transform = open ? "rotate(90deg)" : "rotate(0deg)";
      if (open) renderCountries(contWrap, countries);
      else contWrap.innerHTML = "";
    });
  }
}

// --- Countries / States ---
function renderCountries(container, countries) {
  container.innerHTML = "";
  for (const [country, states] of countries) {
    const btn = document.createElement("button");
    btn.className = "nav-item sub";
    btn.innerHTML = `<span class="arrow">▸</span> ${esc(country)}`;
    container.appendChild(btn);

    const nested = document.createElement("div");
    nested.className = "nested";
    container.appendChild(nested);

    btn.addEventListener("click", () => {
      const open = nested.classList.toggle("show");
      btn.querySelector(".arrow").style.transform = open ? "rotate(90deg)" : "rotate(0deg)";
      if (open) renderStates(nested, country, states);
      else nested.innerHTML = "";
    });
  }
}

function renderStates(container, country, states) {
  container.innerHTML = "";
  for (const [state, stores] of states) {
    const btn = document.createElement("button");
    btn.className = "nav-item sub2";
    btn.textContent = state === "–" ? "(No state)" : state;
    container.appendChild(btn);
    btn.addEventListener("click", () => {
      navHistory.push(() => renderStates(container, country, states));
      renderStores(country, state, stores);
    });
  }
}

// --- Render stores ---
function renderStores(country, state, stores) {
  main.innerHTML = `
    <button class="back-btn">← Back</button>
    <h2 style="color:#b8860b;">${esc(country)} ${state && state !== "–" ? "— " + esc(state) : ""}</h2>
    <p>${stores.length} cigar location${stores.length === 1 ? "" : "s"} found</p>
    <div class="store-grid"></div>
  `;

  const backBtn = main.querySelector(".back-btn");
  backBtn.addEventListener("click", () => {
    if (navHistory.length > 0) {
      const prev = navHistory.pop();
      prev();
    } else main.innerHTML = startContent;
  });

  const grid = main.querySelector(".store-grid");
  stores.forEach(s => {
    const card = document.createElement("div");
    card.className = "store-card dark";
    const img = s.photo_url || "images/store.jpg";
    const rating = renderStars(s.rating);

    const typeColor = s.types.includes("lounge")
      ? "#28a745"
      : s.types.includes("store")
      ? "#007bff"
      : "#ff8c00";

    const typeLabel = (s.types && s.types.length ? s.types.join(" & ") : s.type || "Other");

    card.innerHTML = `
      <img src="${esc(img)}" alt="${esc(s.name)}" onerror="this.src='images/store.jpg'">
      <div class="store-card-content">
        <div class="badges">
          <span class="badge" style="background:${typeColor};">${esc(typeLabel)}</span>
        </div>
        <h3>${esc(s.name || "Unnamed")}</h3>
        <div class="store-rating">${rating}</div>
        <p>📍 ${esc(s.city || "")}${s.state ? ", " + esc(s.state) : ""}</p>
        ${s.phone ? `<p>📞 ${esc(s.phone)}</p>` : ""}
        ${s.website ? `<p><a href="${esc(s.website)}" target="_blank">🌐 Visit website</a></p>` : ""}
      </div>
    `;
    grid.appendChild(card);
  });
}

// --- Render stars ---
function renderStars(rating) {
  const r = Math.round(rating || 0);
  return `<span style="color:#b8860b;">${"★".repeat(r)}${"☆".repeat(5 - r)}</span>`;
}

// --- Start ---
document.addEventListener("DOMContentLoaded", loadStores);
