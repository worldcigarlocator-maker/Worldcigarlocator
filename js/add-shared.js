/* ==========================================================
   add-shared.js — Shared logic for Add Store pages
   ========================================================== */

// ✅ Lägg denna allra högst upp, direkt efter kommentaren:
const GOOGLE_BROWSER_KEY = "AIzaSyDdn7E6_dfwUjGQ1IUdJ2rQXUeEYIIzVtQ";

// 🧩 Supabase setup
const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 🧩 Global WCL init om den inte redan finns
window.WCL = window.WCL || {};

// 🌍 Konvertera land till kontinent via ISO2 eller namn
WCL.countryToContinent = function (countryName = null, iso2 = null) {
  const c = (countryName || "").toLowerCase().trim();
  const i = (iso2 || "").toLowerCase().trim();

  // ----------------------------
  // 1️⃣ Direkt-match på ISO2-kod
  // ----------------------------
  const MAP = {
    // 🌍 Europe
    al:"Europe", ad:"Europe", am:"Europe", at:"Europe", az:"Europe", by:"Europe",
    be:"Europe", ba:"Europe", bg:"Europe", hr:"Europe", cy:"Europe", cz:"Europe",
    dk:"Europe", ee:"Europe", fi:"Europe", fr:"Europe", ge:"Europe", de:"Europe",
    gr:"Europe", hu:"Europe", is:"Europe", ie:"Europe", it:"Europe", lv:"Europe",
    li:"Europe", lt:"Europe", lu:"Europe", mt:"Europe", md:"Europe", mc:"Europe",
    me:"Europe", nl:"Europe", mk:"Europe", no:"Europe", pl:"Europe", pt:"Europe",
    ro:"Europe", rs:"Europe", sk:"Europe", si:"Europe", es:"Europe", se:"Europe",
    ch:"Europe", ua:"Europe", gb:"Europe", va:"Europe", im:"Europe",

    // 🌎 North America
    ca:"North America", us:"North America", mx:"North America", bz:"North America",
    cr:"North America", pa:"North America", cu:"North America", do:"North America",
    jm:"North America", gt:"North America", ni:"North America", hn:"North America",
    sv:"North America", tt:"North America", pr:"North America", bs:"North America",

    // 🌎 South America
    ar:"South America", bo:"South America", br:"South America", cl:"South America",
    co:"South America", ec:"South America", gy:"South America", py:"South America",
    pe:"South America", sr:"South America", uy:"South America", ve:"South America",

    // 🌏 Asia
    ae:"Asia", af:"Asia", bd:"Asia", bh:"Asia", bn:"Asia", bt:"Asia", cn:"Asia",
    hk:"Asia", id:"Asia", il:"Asia", in:"Asia", iq:"Asia", ir:"Asia", jo:"Asia",
    jp:"Asia", kg:"Asia", kh:"Asia", kp:"Asia", kr:"Asia", kw:"Asia", kz:"Asia",
    la:"Asia", lb:"Asia", lk:"Asia", mm:"Asia", mn:"Asia", my:"Asia", np:"Asia",
    om:"Asia", ph:"Asia", pk:"Asia", ps:"Asia", qa:"Asia", sa:"Asia", sg:"Asia",
    sy:"Asia", th:"Asia", tj:"Asia", tm:"Asia", tr:"Asia", tw:"Asia", uz:"Asia",
    vn:"Asia", ye:"Asia",

    // 🌍 Africa
    dz:"Africa", ao:"Africa", bj:"Africa", bw:"Africa", bf:"Africa", bi:"Africa",
    cm:"Africa", cv:"Africa", cf:"Africa", td:"Africa", km:"Africa", cg:"Africa",
    cd:"Africa", dj:"Africa", eg:"Africa", gq:"Africa", er:"Africa", et:"Africa",
    ga:"Africa", gm:"Africa", gh:"Africa", gn:"Africa", gw:"Africa", ci:"Africa",
    ke:"Africa", ls:"Africa", lr:"Africa", ly:"Africa", mg:"Africa", mw:"Africa",
    ml:"Africa", mr:"Africa", mu:"Africa", ma:"Africa", mz:"Africa", na:"Africa",
    ne:"Africa", ng:"Africa", rw:"Africa", sn:"Africa", sc:"Africa", sl:"Africa",
    so:"Africa", za:"Africa", sd:"Africa", tz:"Africa", tg:"Africa", tn:"Africa",
    ug:"Africa", zm:"Africa", zw:"Africa",

    // 🌊 Oceania
    au:"Oceania", fj:"Oceania", nz:"Oceania", pg:"Oceania",
    ws:"Oceania", to:"Oceania", vu:"Oceania"
  };

  // 🔸 ISO2 direktträff
  if (MAP[i]) return MAP[i];
  if (i === "uk") return "Europe"; // 🇬🇧 extra säkerhet

  // ----------------------------
  // 2️⃣ Text-match på landnamn
  // ----------------------------
  const n = c
    .replace(/’/g, "'")
    .replace(/\./g, "")
    .replace(/-/g, " ");

  if ([
    "sweden","germany","france","italy","spain","norway","finland","denmark",
    "netherlands","belgium","austria","switzerland","poland","czech republic",
    "czechia","portugal","ireland","iceland","estonia","latvia","lithuania",
    "hungary","greece","romania","bulgaria","slovenia","slovakia","croatia",
    "ukraine","united kingdom","england","wales","scotland","northern ireland"
  ].includes(n)) return "Europe";

  if (["united states","usa","canada","mexico","cuba","dominican republic"].includes(n))
    return "North America";

  if (["brazil","argentina","chile","peru","colombia","uruguay","paraguay"].includes(n))
    return "South America";

  if ([
    "china","japan","india","thailand","malaysia","singapore","israel","turkey",
    "vietnam","indonesia","philippines","south korea","taiwan","united arab emirates",
    "uae","qatar","saudi arabia"
  ].includes(n)) return "Asia";

  if (["south africa","nigeria","kenya","morocco","egypt","ghana"].includes(n))
    return "Africa";

  if (["australia","new zealand","fiji"].includes(n))
    return "Oceania";

  return "Other";
};


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
// 🧾 Merge exports med befintlig WCL (ersätter inte hela objektet)
Object.assign(window.WCL, {
  supabase,
  GOOGLE_BROWSER_KEY,
  PHOTO_PROXY_URL,
  GITHUB_STORE_FALLBACK,
  GITHUB_LOUNGE_FALLBACK,
  buildProxyUrl,
  fallbackForType,
  fetchPhotoRefs,
  fetchPlaceDetails,
  resolveGooglePhotoUrl,
  loadProxyPhotoInto,
  ratingToStars,
  toastShared
  // ✅ countryToContinent ligger redan på WCL via WCL.countryToContinent ovan
});

