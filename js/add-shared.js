/* ================================================
   add-shared.js — Shared logic for Add Store pages
   Version: 2025-11-08 (full + proxy + autofill)
   ================================================ */

// 🧩 Supabase setup
const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 🔑 Google browser key (frontend-safe)
const GOOGLE_BROWSER_KEY = "AIzaSyDdn7E6_dfwUjGQ1IUdJ2rQXUeEYIIzVtQ";

// 🖼️ Supabase Edge Function (server-protected proxy)
const PHOTO_PROXY_URL = "https://gbxxoeplkzbhsvagnfsr.functions.supabase.co/photo-proxy";

// 🏞️ Fallback images hosted on GitHub Pages
const GITHUB_STORE_FALLBACK =
  "https://worldcigarlocator-maker.github.io/Worldcigarlocator/images/store.jpg";
const GITHUB_LOUNGE_FALLBACK =
  "https://worldcigarlocator-maker.github.io/Worldcigarlocator/images/lounge.jpg";

/* ==========================================================
   🌍 Country → Continent Mapping (ISO2 + Name, robust)
   ========================================================== */
const ISO2_TO_CONTINENT = {
  // Europe
  se: "Europe", no: "Europe", dk: "Europe", fi: "Europe",
  de: "Europe", fr: "Europe", it: "Europe", es: "Europe",
  gb: "Europe", ie: "Europe", at: "Europe", pt: "Europe",
  pl: "Europe", cz: "Europe", sk: "Europe", hu: "Europe",
  gr: "Europe", ch: "Europe", be: "Europe", nl: "Europe",
  is: "Europe", lt: "Europe", lv: "Europe", ee: "Europe",
  ro: "Europe", bg: "Europe", hr: "Europe", si: "Europe",
  ua: "Europe", rs: "Europe", ba: "Europe",

  // North America
  us: "North America", ca: "North America", mx: "North America",

  // South America
  br: "South America", ar: "South America", cl: "South America",
  co: "South America", pe: "South America", ve: "South America",
  ec: "South America", uy: "South America", py: "South America",
  bo: "South America",

  // Asia
  cn: "Asia", jp: "Asia", in: "Asia", th: "Asia", ph: "Asia",
  sg: "Asia", vn: "Asia", id: "Asia", my: "Asia", kr: "Asia",
  ae: "Asia", tr: "Asia", hk: "Asia", qa: "Asia", sa: "Asia",
  jo: "Asia", il: "Asia", lb: "Asia",

  // Africa
  za: "Africa", eg: "Africa", ma: "Africa", ke: "Africa",
  ng: "Africa", tn: "Africa", gh: "Africa", et: "Africa",
  dz: "Africa", sn: "Africa",

  // Oceania
  au: "Oceania", nz: "Oceania", fj: "Oceania", ws: "Oceania",
  pg: "Oceania",
};

/**
 * Get continent by country name or ISO2 code.
 */
function countryToContinent(countryName, iso2Opt = null) {
  if (!countryName && !iso2Opt) return "Other";

  // --- Normalize ---
  const iso = (iso2Opt || "").trim().toLowerCase();
  const name = (countryName || "").trim().toLowerCase();

  // --- 1️⃣ ISO2 lookup ---
  if (iso && ISO2_TO_CONTINENT[iso]) {
    return ISO2_TO_CONTINENT[iso];
  }

  // --- 2️⃣ Name fallback ---
  const NAME_MAP = {
    // Europe
    "sweden": "Europe", "sverige": "Europe",
    "norway": "Europe", "norge": "Europe",
    "denmark": "Europe", "danmark": "Europe",
    "finland": "Europe", "germany": "Europe", "tyskland": "Europe",
    "france": "Europe", "frankrike": "Europe",
    "italy": "Europe", "italien": "Europe",
    "spain": "Europe", "spanien": "Europe",
    "united kingdom": "Europe", "england": "Europe",
    "netherlands": "Europe", "holland": "Europe",
    "austria": "Europe", "poland": "Europe", "portugal": "Europe",

    // North America
    "united states": "North America", "usa": "North America",
    "canada": "North America", "mexico": "North America",

    // South America
    "brazil": "South America", "brasilien": "South America",
    "argentina": "South America", "chile": "South America",
    "peru": "South America", "colombia": "South America",

    // Asia
    "china": "Asia", "japan": "Asia", "india": "Asia",
    "thailand": "Asia", "vietnam": "Asia", "philippines": "Asia",
    "indonesia": "Asia", "malaysia": "Asia", "south korea": "Asia",

    // Oceania
    "australia": "Oceania", "new zealand": "Oceania",
    "australien": "Oceania", "nya zeeland": "Oceania",

    // Africa
    "south africa": "Africa", "kenya": "Africa", "nigeria": "Africa",
    "egypt": "Africa", "marocco": "Africa", "ghana": "Africa",
  };

  if (NAME_MAP[name]) return NAME_MAP[name];

  // --- 3️⃣ Default ---
  return "Other";
}


/* ==========================================================
   📸 Photo Helpers — v2 (Proxy-first, full-feature)
   ========================================================== */

function buildProxyUrl(ref, w = 800) {
  if (!ref) return null;
  return `${PHOTO_PROXY_URL}?photo_reference=${encodeURIComponent(ref)}&maxwidth=${encodeURIComponent(String(w))}`;
}

function fallbackForType(type) {
  const t = String(type || "").toLowerCase();
  return t.includes("lounge") ? GITHUB_LOUNGE_FALLBACK : GITHUB_STORE_FALLBACK;
}

async function resolveGooglePhotoUrl(ref, w = 800, h = 600, variant = 0) {
  if (!ref) return null;
  if (/^https?:\/\//i.test(ref)) return ref;
  if (ref.startsWith("places/") || /^AWn/i.test(ref)) return buildProxyUrl(ref, w);

  let clean = String(ref).trim();
  if (clean.includes("/photos/")) clean = clean.split("/").pop();
  if (clean.startsWith("p/")) clean = clean.slice(2);
  clean = clean.split("?")[0];

  const tails = [`=w${w}-h${h}`, `=w${w}-h${h}-k-no`, `=w${w}-h${h}-no`];
  const idx = Math.max(0, Math.min(variant, tails.length - 1));
  const cdnUrl = `https://lh3.googleusercontent.com/p/${encodeURIComponent(clean)}${tails[idx]}`;

  const ok = await new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = cdnUrl;
  });

  return ok ? cdnUrl : buildProxyUrl(ref, w);
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

async function fetchPhotoRefs(placeId) {
  if (!placeId) return [];
  try {
    const v1 = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?fields=photos&key=${GOOGLE_BROWSER_KEY}`;
    let res = await fetch(v1);
    if (res.ok) {
      const j = await res.json();
      const refs = (j.photos || []).map(p => p.name).filter(Boolean);
      if (refs.length) return refs;
    }
    const legacy = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=photos&key=${GOOGLE_BROWSER_KEY}`;
    res = await fetch(legacy);
    if (res.ok) {
      const j = await res.json();
      return (j.result?.photos || []).map(p => p.photo_reference).filter(Boolean);
    }
  } catch (e) {
    console.warn("fetchPhotoRefs error:", e);
  }
  return [];
}

/* ==========================================================
   📞 fetchPlaceDetails — full info (phone, website, country)
   ========================================================== */
async function fetchPlaceDetails(placeId) {
  if (!placeId) return null;
  try {
    const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?fields=name,formatted_address,international_phone_number,website,photos,address_components&key=${GOOGLE_BROWSER_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const j = await res.json();
    const out = {
      name: j.displayName?.text || j.name || "",
      phone: j.internationalPhoneNumber || "",
      website: j.websiteUri || "",
      photos: (j.photos || []).map(p => p.name),
      country: "",
    };

    const comps = j.addressComponents || [];
    const countryComp = comps.find(c => (c.types || []).includes("country"));
    if (countryComp) out.country = countryComp.longText || countryComp.name || "";

    return out;
  } catch (e) {
    console.error("fetchPlaceDetails error", e);
    return null;
  }
}

/* ==========================================================
   ⚙️ Utilities
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
  t.style.background = type === "error" ? "#dc3545" : type === "success" ? "#28a745" : "#333";
  t.style.color = "#fff";
  t.style.padding = ".6rem 1rem";
  t.style.borderRadius = "6px";
  t.style.fontSize = ".9rem";
  c.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

/* ==========================================================
   🧾 Exports (for script tag inclusion)
   ========================================================== */
window.WCL = {
  supabase,
  GOOGLE_BROWSER_KEY,
  PHOTO_PROXY_URL,
  GITHUB_STORE_FALLBACK,
  GITHUB_LOUNGE_FALLBACK,
  buildProxyUrl,
  fallbackForType,
  fetchPhotoRefs,
  fetchPlaceDetails,   // ✅ NY
  resolveGooglePhotoUrl,
  loadProxyPhotoInto,
  countryToContinent,
  ratingToStars,
  toastShared
};
