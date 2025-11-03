/* ================================================
   add-shared.js — Shared logic for Add Store pages
   Version: 2025-11-02 (full + proxy-compatible)
   ================================================ */

// 🧩 Supabase setup
// 🚀 Proxy-enabled URL
const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co/functions/v1/data-proxy";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 🔑 Google browser key (frontend-safe)
const GOOGLE_BROWSER_KEY = "AIzaSyDdn7E6_dfwUjGQ1IUdJ2rQXUeEYIIzVtQ";

// 🖼️ Supabase Edge Function (server-protected proxy)
const PHOTO_PROXY_URL =
  "https://gbxxoeplkzbhsvagnfsr.functions.supabase.co/photo-proxy";

// 🏞️ Fallback images hosted on GitHub Pages
const GITHUB_STORE_FALLBACK =
  "https://worldcigarlocator-maker.github.io/Worldcigarlocator/images/store.jpg";
const GITHUB_LOUNGE_FALLBACK =
  "https://worldcigarlocator-maker.github.io/Worldcigarlocator/images/lounge.jpg";

/* ==========================================================
   🌍 Country → Continent Mapping
   ========================================================== */
function countryToContinent(country) {
  if (!country) return "Other";
  const c = country.trim().toLowerCase();
  const map = {
    // Europe
    "sweden":"Europe","norway":"Europe","denmark":"Europe","finland":"Europe","germany":"Europe","france":"Europe","italy":"Europe","spain":"Europe","united kingdom":"Europe","ireland":"Europe","austria":"Europe","portugal":"Europe","poland":"Europe","czech republic":"Europe","slovakia":"Europe","hungary":"Europe","greece":"Europe","switzerland":"Europe","belgium":"Europe","netherlands":"Europe",
    // North America
    "usa":"North America","united states":"North America","canada":"North America","mexico":"North America","jamaica":"North America","dominican republic":"North America",
    // South America
    "brazil":"South America","argentina":"South America","chile":"South America","colombia":"South America","peru":"South America","venezuela":"South America",
    // Asia
    "china":"Asia","japan":"Asia","india":"Asia","thailand":"Asia","philippines":"Asia","singapore":"Asia","vietnam":"Asia","indonesia":"Asia","malaysia":"Asia","south korea":"Asia","united arab emirates":"Asia","turkey":"Asia",
    // Africa
    "south africa":"Africa","egypt":"Africa","morocco":"Africa","kenya":"Africa","nigeria":"Africa","tunisia":"Africa",
    // Oceania
    "australia":"Oceania","new zealand":"Oceania","fiji":"Oceania","samoa":"Oceania","tonga":"Oceania"
  };
  return map[c] || "Other";
}

/* ==========================================================
   📸 Photo Helpers — v2 (Proxy-first, full-feature)
   ========================================================== */

/**
 * Build proxy URL for a given Google photo_reference.
 * Always uses Supabase edge function (handles both AWn... and v1 refs).
 */
function buildProxyUrl(ref, w = 800) {
  if (!ref) return null;
  return `${PHOTO_PROXY_URL}?photo_reference=${encodeURIComponent(ref)}&maxwidth=${encodeURIComponent(String(w))}`;
}

/**
 * Get fallback image based on type.
 */
function fallbackForType(type) {
  const t = String(type || "").toLowerCase();
  if (t.includes("lounge")) return GITHUB_LOUNGE_FALLBACK;
  return GITHUB_STORE_FALLBACK;
}

/**
 * Resolve a Google photo reference to an actual image URL.
 * Tries CDN first if the ref looks like a public hash, otherwise uses proxy.
 * Now fully compatible with Supabase proxy for all refs.
 */
async function resolveGooglePhotoUrl(ref, w = 800, h = 600, variant = 0) {
  if (!ref) return null;

  // Already a URL?
  if (/^https?:\/\//i.test(ref)) return ref;

  // If it's a v1 photo name (starts with "places/")
  if (ref.startsWith("places/")) {
    return buildProxyUrl(ref, w);
  }

  // If it's an AWn reference → proxy required
  if (/^AWn/i.test(ref)) {
    return buildProxyUrl(ref, w);
  }

  // Try Google CDN fallback for simple "p/..." references
  let clean = String(ref).trim();
  if (clean.includes("/photos/")) clean = clean.split("/").pop();
  if (clean.startsWith("p/")) clean = clean.slice(2);
  clean = clean.split("?")[0];

  const tails = [
    `=w${w}-h${h}`,
    `=w${w}-h${h}-k-no`,
    `=w${w}-h${h}-no`
  ];
  const idx = Math.max(0, Math.min(variant, tails.length - 1));
  const cdnUrl = `https://lh3.googleusercontent.com/p/${encodeURIComponent(clean)}${tails[idx]}`;

const ok = await new Promise((resolve) => {
  const img = new Image();
  img.onload = () => resolve(true);
  img.onerror = () => resolve(false);
  img.src = cdnUrl;
});

// ✅ ALWAYS fallback to proxy for AWn5SU... refs
if (!ok || /^AWn/i.test(ref)) {
  return buildProxyUrl(ref, w);
}

return cdnUrl;

/**
 * Load photo into <img> via proxy, fallback on error.
 */
async function loadProxyPhotoInto(imgEl, ref, type = "store") {
  if (!imgEl) return;
  const fallback = fallbackForType(type);

  if (!ref) {
    imgEl.src = fallback;
    return;
  }

  const proxyUrl = buildProxyUrl(ref);

  try {
    const res = await fetch(proxyUrl);
    if (!res.ok) {
      console.warn("Proxy returned", res.status, "→ fallback");
      imgEl.src = fallback;
      return;
    }

    const blob = await res.blob();
    imgEl.src = URL.createObjectURL(blob);
  } catch (err) {
    console.error("Error loading proxy image:", err);
    imgEl.src = fallback;
  }
}

/**
 * Fetch Google photo references for a given Place ID.
 * Uses new Places API v1 exclusively, fallback to v0 if needed.
 */
async function fetchPhotoRefs(placeId) {
  if (!placeId) return [];

  try {
    // Try Places v1
    const v1 = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?fields=photos&key=${GOOGLE_BROWSER_KEY}`;
    let res = await fetch(v1);
    if (res.ok) {
      const j = await res.json();
      const refs = (j.photos || []).map(p => p.name).filter(Boolean);
      if (refs.length) return refs;
    }

    // Fallback → legacy Places Details API
    const legacy = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=photos&key=${GOOGLE_BROWSER_KEY}`;
    res = await fetch(legacy);
    if (res.ok) {
      const j = await res.json();
      const refs = (j.result?.photos || []).map(p => p.photo_reference).filter(Boolean);
      return refs;
    }
  } catch (e) {
    console.warn("fetchPhotoRefs error:", e);
  }
  return [];
}

/* ==========================================================
   ⚙️ General utilities (optional shared helpers)
   ========================================================== */

/**
 * Converts rating (1–5) to star emoji string for quick debug.
 */
function ratingToStars(rating) {
  if (!rating) return "";
  const full = "★".repeat(Math.round(rating));
  const empty = "☆".repeat(5 - Math.round(rating));
  return full + empty;
}

/**
 * Simple toast helper (if not defined in the page)
 */
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
  t.style.background = type === "error" ? "#dc3545" : (type === "success" ? "#28a745" : "#333");
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
  resolveGooglePhotoUrl,
  loadProxyPhotoInto,
  countryToContinent,
  ratingToStars,
  toastShared
};
