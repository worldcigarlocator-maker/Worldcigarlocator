/* ==========================================================
   add-shared.js — Shared logic for Add/Edit Store pages
   Version: Fixed 2025-11-11
   ========================================================== */

// 🧩 Supabase setup
const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);


// 🔑 Google browser key
const GOOGLE_BROWSER_KEY = "AIzaSyDdn7E6_dfwUjGQ1IUdJ2rQXUeEYIIzVtQ";

// 🖼️ Supabase Functions
const PHOTO_PROXY_URL = "https://gbxxoeplkzbhsvagnfsr.functions.supabase.co/photo-proxy";
const PHOTO_REFS_URL  = "https://gbxxoeplkzbhsvagnfsr.functions.supabase.co/photo-refs";

// 🏞️ Fallback images
const GITHUB_STORE_FALLBACK =
  "https://worldcigarlocator-maker.github.io/Worldcigarlocator/images/store.jpg";
const GITHUB_LOUNGE_FALLBACK =
  "https://worldcigarlocator-maker.github.io/Worldcigarlocator/images/lounge.jpg";

// Init WCL
window.WCL = window.WCL || {};

/* ==========================================================
   🌍 Country → Continent
   ========================================================== */
function countryToContinent(countryName = null, iso2 = null) {
  const c = (countryName || "").toLowerCase().trim();
  const i = (iso2 || "").toLowerCase().trim();

  const MAP = {
    gb: "Europe", uk: "Europe", se: "Europe", no: "Europe", fi: "Europe", dk: "Europe",
    fr: "Europe", de: "Europe", es: "Europe", it: "Europe", nl: "Europe", be: "Europe",
    pt: "Europe", pl: "Europe", cz: "Europe", ch: "Europe", at: "Europe",
    us: "North America", ca: "North America", mx: "North America",
    br: "South America", ar: "South America", cl: "South America",
    cn: "Asia", jp: "Asia", in: "Asia", tr: "Asia", ae: "Asia", sg: "Asia",
    za: "Africa", ng: "Africa", eg: "Africa",
    au: "Oceania", nz: "Oceania"
  };

  if (MAP[i]) return MAP[i];

  const n = c.replace(/’/g, "'").replace(/\./g, "").replace(/-/g, " ");
  if ([
    "united kingdom","england","wales","scotland","northern ireland",
    "sweden","germany","france","italy","spain","norway","finland",
    "denmark","netherlands","belgium","austria","switzerland",
    "poland","czech republic","czechia","portugal","ireland","iceland"
  ].includes(n)) return "Europe";

  if (["united states","usa","canada","mexico"].includes(n))
    return "North America";

  if (["brazil","argentina","chile","peru","colombia"].includes(n))
    return "South America";

  if (["china","japan","india","thailand","singapore","israel","turkey","uae"].includes(n))
    return "Asia";

  if (["south africa","nigeria","kenya","egypt","morocco"].includes(n))
    return "Africa";

  if (["australia","new zealand","fiji"].includes(n))
    return "Oceania";

  return "Other";
}

/* ==========================================================
   📸 Photo Helpers
   ========================================================== */
function buildProxyUrl(ref, w = 800) {
  if (!ref) return null;
  return `${PHOTO_PROXY_URL}?photo_reference=${encodeURIComponent(ref)}&maxwidth=${w}`;
}

function fallbackForType(type = "store") {
  const t = String(type || "").toLowerCase();
  return t.includes("lounge") ? GITHUB_LOUNGE_FALLBACK : GITHUB_STORE_FALLBACK;
}

async function fetchPhotoRefs(placeId) {
  if (!placeId) return [];
  try {
    const res = await fetch(`${PHOTO_REFS_URL}?place_id=${encodeURIComponent(placeId)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.refs) ? data.refs : [];
  } catch (err) {
    console.warn("fetchPhotoRefs failed:", err);
    return [];
  }
}

async function loadProxyPhotoInto(imgEl, ref, type = "store") {
  if (!imgEl) return;
  const fallback = fallbackForType(type);
  if (!ref) return (imgEl.src = fallback);
  const proxyUrl = buildProxyUrl(ref);
  try {
    const res = await fetch(proxyUrl);
    if (!res.ok) return (imgEl.src = fallback);
    const blob = await res.blob();
    imgEl.src = URL.createObjectURL(blob);
  } catch {
    imgEl.src = fallback;
  }
}

/* ==========================================================
   ⭐ Rating + Toast
   ========================================================== */
function ratingToStars(rating) {
  if (!rating) return "";
  const full = "★".repeat(Math.round(rating));
  const empty = "☆".repeat(5 - Math.round(rating));
  return full + empty;
}

function toastShared(msg, type = "info") {
  let c = document.getElementById("toast-container");
  if (!c) {
    c = document.createElement("div");
    c.id = "toast-container";
    c.style.position = "fixed";
    c.style.bottom = "1rem";
    c.style.right = "1rem";
    c.style.display = "flex";
    c.style.flexDirection = "column";
    c.style.gap = ".4rem";
    c.style.zIndex = "9999";
    document.body.appendChild(c);
  }
  const t = document.createElement("div");
  t.className = "toast " + type;
  t.textContent = msg;
  t.style.background =
    type === "error" ? "#dc3545" : type === "success" ? "#28a745" : "#333";
  t.style.color = "#fff";
  t.style.padding = ".6rem 1rem";
  t.style.borderRadius = "6px";
  t.style.fontSize = ".9rem";
  c.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

/* ==========================================================
   ✅ EXPORTS (alla funktioner till WCL)
   ========================================================== */
Object.assign(window.WCL, {
  supabase: supabaseClient,

  GOOGLE_BROWSER_KEY,
  PHOTO_PROXY_URL,
  PHOTO_REFS_URL,

  GITHUB_STORE_FALLBACK,
  GITHUB_LOUNGE_FALLBACK,

  buildProxyUrl,
  fallbackForType,
  fetchPhotoRefs,
  loadProxyPhotoInto,

  countryToContinent,
  ratingToStars,
  toastShared
});

