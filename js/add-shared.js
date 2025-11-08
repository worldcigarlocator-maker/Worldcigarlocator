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
   🌍 Country → Continent (Full ISO2 coverage)
   ========================================================== */

// Complete UN/ISO mapping (~250)
const ISO2_TO_CONTINENT = {
  // Africa
  dz:"Africa", ao:"Africa", bj:"Africa", bw:"Africa", bf:"Africa", bi:"Africa", cm:"Africa",
  cv:"Africa", cf:"Africa", td:"Africa", km:"Africa", cg:"Africa", cd:"Africa", dj:"Africa",
  eg:"Africa", gq:"Africa", er:"Africa", et:"Africa", ga:"Africa", gm:"Africa", gh:"Africa",
  gn:"Africa", gw:"Africa", ke:"Africa", ls:"Africa", lr:"Africa", ly:"Africa", mg:"Africa",
  mw:"Africa", ml:"Africa", mr:"Africa", mu:"Africa", yt:"Africa", ma:"Africa", mz:"Africa",
  na:"Africa", ne:"Africa", ng:"Africa", re:"Africa", rw:"Africa", sh:"Africa", st:"Africa",
  sn:"Africa", sc:"Africa", sl:"Africa", so:"Africa", za:"Africa", ss:"Africa", sd:"Africa",
  sz:"Africa", tg:"Africa", tn:"Africa", ug:"Africa", tz:"Africa", eh:"Africa", zm:"Africa",
  zw:"Africa",

  // Asia
  af:"Asia", am:"Asia", az:"Asia", bh:"Asia", bd:"Asia", bt:"Asia", bn:"Asia", kh:"Asia",
  cn:"Asia", cx:"Asia", cc:"Asia", ge:"Asia", hk:"Asia", in:"Asia", id:"Asia", ir:"Asia",
  iq:"Asia", il:"Asia", jp:"Asia", jo:"Asia", kz:"Asia", kp:"Asia", kr:"Asia", kw:"Asia",
  kg:"Asia", la:"Asia", lb:"Asia", mo:"Asia", my:"Asia", mv:"Asia", mn:"Asia", mm:"Asia",
  np:"Asia", om:"Asia", pk:"Asia", ps:"Asia", ph:"Asia", qa:"Asia", sa:"Asia", sg:"Asia",
  lk:"Asia", sy:"Asia", tw:"Asia", tj:"Asia", th:"Asia", tl:"Asia", tr:"Asia", tm:"Asia",
  ae:"Asia", uz:"Asia", vn:"Asia", ye:"Asia",

  // Europe
  al:"Europe", ad:"Europe", at:"Europe", by:"Europe", be:"Europe", ba:"Europe", bg:"Europe",
  hr:"Europe", cy:"Europe", cz:"Europe", dk:"Europe", ee:"Europe", fo:"Europe", fi:"Europe",
  fr:"Europe", de:"Europe", gi:"Europe", gr:"Europe", va:"Europe", hu:"Europe", is:"Europe",
  ie:"Europe", it:"Europe", lv:"Europe", li:"Europe", lt:"Europe", lu:"Europe", mt:"Europe",
  md:"Europe", mc:"Europe", me:"Europe", nl:"Europe", mk:"Europe", no:"Europe", pl:"Europe",
  pt:"Europe", ro:"Europe", ru:"Europe", sm:"Europe", rs:"Europe", sk:"Europe", si:"Europe",
  es:"Europe", se:"Europe", ch:"Europe", ua:"Europe", gb:"Europe",

  // North America
  ag:"North America", ai:"North America", aw:"North America", bs:"North America",
  bb:"North America", bz:"North America", bm:"North America", ca:"North America",
  cr:"North America", cu:"North America", cw:"North America", dm:"North America",
  do:"North America", sv:"North America", gd:"North America", gt:"North America",
  ht:"North America", hn:"North America", jm:"North America", mx:"North America",
  ni:"North America", pa:"North America", pr:"North America", kn:"North America",
  lc:"North America", vc:"North America", tt:"North America", us:"North America",
  vg:"North America", vi:"North America",

  // South America
  ar:"South America", bo:"South America", br:"South America", cl:"South America",
  co:"South America", ec:"South America", fk:"South America", gf:"South America",
  gy:"South America", py:"South America", pe:"South America", sr:"South America",
  uy:"South America", ve:"South America",

  // Oceania
  as:"Oceania", au:"Oceania", ck:"Oceania", fj:"Oceania", pf:"Oceania", gu:"Oceania",
  ki:"Oceania", mh:"Oceania", fm:"Oceania", nr:"Oceania", nc:"Oceania", nz:"Oceania",
  nu:"Oceania", nf:"Oceania", mp:"Oceania", pw:"Oceania", pg:"Oceania", pn:"Oceania",
  ws:"Oceania", sb:"Oceania", tk:"Oceania", to:"Oceania", tv:"Oceania", vu:"Oceania",
  wf:"Oceania", ws:"Oceania",
};

/**
 * 🌍 Returnerar rätt kontinent för ett land.
 * Fungerar med både namn och ISO2-kod.
 */
function countryToContinent(countryName, iso2Opt = null) {
  const iso = (iso2Opt || "").trim().toLowerCase();
  const name = (countryName || "").trim().toLowerCase();

  // 1️⃣ ISO2-träff
  if (ISO2_TO_CONTINENT[iso]) return ISO2_TO_CONTINENT[iso];

  // 2️⃣ Fallback på vanliga namn
  const NAME_MAP = {
    "sweden":"Europe","sverige":"Europe",
    "norway":"Europe","norge":"Europe",
    "denmark":"Europe","danmark":"Europe",
    "finland":"Europe","germany":"Europe","tyskland":"Europe",
    "australia":"Oceania","australien":"Oceania",
    "united states":"North America","usa":"North America",
    "canada":"North America","brazil":"South America",
    "argentina":"South America","south africa":"Africa",
    "japan":"Asia","china":"Asia","india":"Asia"
  };

  if (NAME_MAP[name]) return NAME_MAP[name];

  return "Other"; // sista utväg, men ska i princip aldrig hända
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
