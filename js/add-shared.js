/* ==========================================================
   add-shared.js — Shared logic for Add Store pages
   ========================================================== */

const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ✅ fix för undefined
const GOOGLE_BROWSER_KEY = "AIzaSyDdn7E6_dfwUjGQ1IUdJ2rQXUeEYIIzVtQ";

const PHOTO_PROXY_URL = "https://gbxxoeplkzbhsvagnfsr.functions.supabase.co/photo-proxy";
const GITHUB_STORE_FALLBACK =
  "https://worldcigarlocator-maker.github.io/Worldcigarlocator/images/store.jpg";
const GITHUB_LOUNGE_FALLBACK =
  "https://worldcigarlocator-maker.github.io/Worldcigarlocator/images/lounge.jpg";

window.WCL = window.WCL || {};

// 🌍 Country → Continent
WCL.countryToContinent = function (countryName = null, iso2 = null) {
  const c = (countryName || "").toLowerCase().trim();
  const i = (iso2 || "").toLowerCase().trim();

  const MAP = {
    gb:"Europe", uk:"Europe", se:"Europe", no:"Europe", fi:"Europe", dk:"Europe",
    fr:"Europe", de:"Europe", es:"Europe", it:"Europe", nl:"Europe", be:"Europe",
    pt:"Europe", pl:"Europe", cz:"Europe", ch:"Europe", at:"Europe",
    us:"North America", ca:"North America", mx:"North America",
    br:"South America", ar:"South America",
    cn:"Asia", jp:"Asia", in:"Asia", tr:"Asia", ae:"Asia", sg:"Asia",
    za:"Africa", ng:"Africa", eg:"Africa",
    au:"Oceania", nz:"Oceania"
  };

  if (MAP[i]) return MAP[i];

  const n = c.replace(/’/g,"'").replace(/\./g,"").replace(/-/g," ");
  if (["united kingdom","england","wales","scotland","northern ireland"].includes(n))
    return "Europe";

  return "Other";
};

// 📸 Photo helpers (kortat)
function buildProxyUrl(ref, w = 800) {
  return `${PHOTO_PROXY_URL}?photo_reference=${encodeURIComponent(ref)}&maxwidth=${w}`;
}
function fallbackForType(t) {
  return t.includes("lounge") ? GITHUB_LOUNGE_FALLBACK : GITHUB_STORE_FALLBACK;
}
async function fetchPhotoRefs(placeId) {
  try {
    const url = `https://places.googleapis.com/v1/places/${placeId}?fields=photos&key=${GOOGLE_BROWSER_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const j = await res.json();
    return (j.photos || []).map(p => p.name);
  } catch { return []; }
}

function toastShared(msg, type = "success") {
  const c = document.getElementById("toast-container") || (() => {
    const d = document.createElement("div");
    d.id = "toast-container";
    d.style.position = "fixed"; d.style.bottom = "1rem"; d.style.right = "1rem";
    d.style.zIndex = 9999; document.body.appendChild(d); return d;
  })();
  const t = document.createElement("div");
  t.className = `toast ${type}`; t.textContent = msg;
  c.appendChild(t); setTimeout(() => t.remove(), 3000);
}

// ✅ Merge exports utan dubblett av countryToContinent
Object.assign(window.WCL, {
  supabase,
  GOOGLE_BROWSER_KEY,
  PHOTO_PROXY_URL,
  GITHUB_STORE_FALLBACK,
  GITHUB_LOUNGE_FALLBACK,
  buildProxyUrl,
  fallbackForType,
  fetchPhotoRefs,
  // ❌ ta bort "countryToContinent" här
  ratingToStars,
  toastShared
});
