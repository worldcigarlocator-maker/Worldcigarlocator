/* ==========================================================
   add-shared.js — Shared logic for Add/Edit Store (PUBLIC + BO)
   Canonical / Safe / Explicit
   ========================================================== */

/* ===================== SUPABASE ===================== */
const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

/* ===================== GLOBAL WCL ===================== */
window.WCL = window.WCL || {};
WCL.supabase = supabase;

/* ===================== GOOGLE ===================== */
WCL.GOOGLE_BROWSER_KEY =
  "AIzaSyDdn7E6_dfwUjGQ1IUdJ2rQXUeEYIIzVtQ";

/* ===================== MEDIA ===================== */
WCL.PHOTO_PROXY_URL =
  "https://gbxxoeplkzbhsvagnfsr.functions.supabase.co/photo-proxy";
WCL.PHOTO_REFS_URL =
  "https://gbxxoeplkzbhsvagnfsr.functions.supabase.co/photo-refs";

WCL.GITHUB_STORE_FALLBACK =
  "https://worldcigarlocator-maker.github.io/Worldcigarlocator/images/store.jpg";
WCL.GITHUB_LOUNGE_FALLBACK =
  "https://worldcigarlocator-maker.github.io/Worldcigarlocator/images/lounge.jpg";

/* ==========================================================
   🌍 COUNTRY → CONTINENT
   ========================================================== */
function countryToContinent(countryName = null, iso2 = null) {
  const c = (countryName || "").toLowerCase().trim();
  const i = (iso2 || "").toLowerCase().trim();

  const MAP = {
    gb: "Europe", se: "Europe", no: "Europe", fi: "Europe", dk: "Europe",
    fr: "Europe", de: "Europe", es: "Europe", it: "Europe",
    us: "North America", ca: "North America", mx: "North America",
    br: "South America", ar: "South America",
    cn: "Asia", jp: "Asia", in: "Asia",
    za: "Africa",
    au: "Oceania", nz: "Oceania",
  };

  if (MAP[i]) return MAP[i];

  if (c.includes("united states") || c === "usa") return "North America";
  if (c.includes("united kingdom") || c === "uk") return "Europe";

  return "Other";
}

/* ==========================================================
   🏴 UK STATE NORMALIZATION
   ========================================================== */
function normalizeUKState(state, country, city) {
  if (!country) return state || null;
  if (!country.toLowerCase().includes("united kingdom")) return state || null;

  const c = (city || "").toLowerCase();
  const s = (state || "").toLowerCase();

  if (s.includes("scotland") || c.includes("edinburgh")) return "Scotland";
  if (s.includes("wales") || c.includes("cardiff")) return "Wales";
  if (s.includes("northern")) return "Northern Ireland";

  return "England";
}

/* ==========================================================
   📸 PHOTO HELPERS
   ========================================================== */
function fallbackForType(type = "store") {
  return String(type).includes("lounge")
    ? WCL.GITHUB_LOUNGE_FALLBACK
    : WCL.GITHUB_STORE_FALLBACK;
}

function buildProxyUrl(ref, w = 800) {
  if (!ref) return null;
  return `${WCL.PHOTO_PROXY_URL}?photo_reference=${encodeURIComponent(ref)}&maxwidth=${w}`;
}

async function fetchPhotoRefs(placeId) {
  if (!placeId) return [];
  try {
    const res = await fetch(
      `${WCL.PHOTO_REFS_URL}?place_id=${encodeURIComponent(placeId)}`
    );
    const json = await res.json();
    return Array.isArray(json?.refs) ? json.refs : [];
  } catch {
    return [];
  }
}

async function loadProxyPhotoInto(img, ref, type = "store") {
  if (!img) return;
  if (!ref) {
    img.src = fallbackForType(type);
    return;
  }
  try {
    const res = await fetch(buildProxyUrl(ref));
    const blob = await res.blob();
    img.src = URL.createObjectURL(blob);
  } catch {
    img.src = fallbackForType(type);
  }
}

/* ==========================================================
   🔍 DUPLICATE CHECK — CANONICAL (A-MODEL)
   ========================================================== */
/*
  return:
  {
    exact:    [stores with same name + address + city + country],
    possible: [stores with same street + city + country]
  }
*/
async function checkDuplicates(place) {
  if (!place?.address || !place?.city || !place?.country) {
    return { exact: [], possible: [] };
  }

  const street = place.address.split(",")[0].trim();

  const { data, error } = await supabase
    .from("stores")
    .select("id,name,address,city,country,types,approved,deleted")
    .eq("deleted", false)
    .ilike("city", place.city)
    .ilike("country", place.country)
    .ilike("address", `%${street}%`);

  if (error || !data) return { exact: [], possible: [] };

  const exact = [];
  const possible = [];

  data.forEach((s) => {
    const sameName =
      s.name?.toLowerCase() === place.name?.toLowerCase();
    const sameAddress =
      s.address?.toLowerCase() === place.address?.toLowerCase();

    if (sameName && sameAddress) exact.push(s);
    else possible.push(s);
  });

  return { exact, possible };
}

/* ==========================================================
   🔔 TOAST (SHARED)
   ========================================================== */
function toastShared(msg, type = "info") {
  let c = document.getElementById("toast-container");
  if (!c) {
    c = document.createElement("div");
    c.id = "toast-container";
    c.style.position = "fixed";
    c.style.bottom = "1rem";
    c.style.right = "1rem";
    c.style.zIndex = "9999";
    document.body.appendChild(c);
  }
  const t = document.createElement("div");
  t.textContent = msg;
  t.style.background =
    type === "error" ? "#dc3545" :
    type === "success" ? "#28a745" : "#333";
  t.style.color = "#fff";
  t.style.padding = ".6rem 1rem";
  t.style.borderRadius = "6px";
  t.style.marginTop = ".4rem";
  c.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

/* ==========================================================
   EXPORTS
   ========================================================== */
Object.assign(window.WCL, {
  countryToContinent,
  normalizeUKState,

  fallbackForType,
  buildProxyUrl,
  fetchPhotoRefs,
  loadProxyPhotoInto,

  checkDuplicates,
  toastShared,
});
