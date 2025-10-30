/* ================================================
   add-shared.js — Shared logic for Add Store pages
   Version: 2025-10-30
   ================================================ */

const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 🔑 Google browser key (only used client-side for Places)
const GOOGLE_BROWSER_KEY = "AIzaSyDdn7E6_dfwUjGQ1IUdJ2rQXUeEYIIzVtQ";

// 📸 Supabase Edge Function photo proxy (server-key protected)
const PHOTO_PROXY_URL =
  "https://gbxxoeplkzbhsvagnfsr.functions.supabase.co/photo-proxy";

// 🖼️ Static GitHub fallback images
const GITHUB_STORE_FALLBACK =
  "https://worldcigarlocator-maker.github.io/Worldcigarlocator/images/store.jpg";
const GITHUB_LOUNGE_FALLBACK =
  "https://worldcigarlocator-maker.github.io/Worldcigarlocator/images/lounge.jpg";

/* ==========================================================
   🌍 Country → Continent Mapping (matches Google Places)
   ========================================================== */
function countryToContinent(country) {
  if (!country) return "Other";
  const c = country.trim().toLowerCase();

  const map = {
    // 🌍 Europe
    "albania":"Europe","andorra":"Europe","austria":"Europe","belarus":"Europe",
    "belgium":"Europe","bosnia and herzegovina":"Europe","bulgaria":"Europe",
    "croatia":"Europe","cyprus":"Europe","czech republic":"Europe","czechia":"Europe",
    "denmark":"Europe","estonia":"Europe","finland":"Europe","france":"Europe",
    "germany":"Europe","greece":"Europe","hungary":"Europe","iceland":"Europe",
    "ireland":"Europe","italy":"Europe","kosovo":"Europe","latvia":"Europe",
    "lithuania":"Europe","luxembourg":"Europe","malta":"Europe","moldova":"Europe",
    "monaco":"Europe","montenegro":"Europe","netherlands":"Europe","north macedonia":"Europe",
    "norway":"Europe","poland":"Europe","portugal":"Europe","romania":"Europe",
    "serbia":"Europe","slovakia":"Europe","slovenia":"Europe","spain":"Europe",
    "sweden":"Europe","switzerland":"Europe","ukraine":"Europe","united kingdom":"Europe",
    "england":"Europe","scotland":"Europe","wales":"Europe",

    // 🌎 North America
    "antigua and barbuda":"North America","bahamas":"North America","barbados":"North America",
    "belize":"North America","canada":"North America","costa rica":"North America",
    "cuba":"North America","dominican republic":"North America","el salvador":"North America",
    "grenada":"North America","guatemala":"North America","haiti":"North America",
    "honduras":"North America","jamaica":"North America","mexico":"North America",
    "nicaragua":"North America","panama":"North America","puerto rico":"North America",
    "trinidad and tobago":"North America","united states":"North America","usa":"North America",

    // 🌎 South America
    "argentina":"South America","bolivia":"South America","brazil":"South America",
    "chile":"South America","colombia":"South America","ecuador":"South America",
    "guyana":"South America","paraguay":"South America","peru":"South America",
    "suriname":"South America","uruguay":"South America","venezuela":"South America",

    // 🌏 Asia
    "armenia":"Asia","azerbaijan":"Asia","bahrain":"Asia","bangladesh":"Asia","brunei":"Asia",
    "cambodia":"Asia","china":"Asia","georgia":"Asia","hong kong":"Asia","india":"Asia",
    "indonesia":"Asia","iran":"Asia","iraq":"Asia","israel":"Asia","japan":"Asia",
    "jordan":"Asia","kazakhstan":"Asia","kuwait":"Asia","kyrgyzstan":"Asia","laos":"Asia",
    "lebanon":"Asia","malaysia":"Asia","maldives":"Asia","mongolia":"Asia","myanmar":"Asia",
    "nepal":"Asia","oman":"Asia","pakistan":"Asia","palestine":"Asia","philippines":"Asia",
    "qatar":"Asia","saudi arabia":"Asia","singapore":"Asia","south korea":"Asia",
    "sri lanka":"Asia","taiwan":"Asia","tajikistan":"Asia","thailand":"Asia",
    "turkey":"Asia","turkmenistan":"Asia","united arab emirates":"Asia","uae":"Asia",
    "uzbekistan":"Asia","vietnam":"Asia",

    // 🌍 Africa
    "algeria":"Africa","angola":"Africa","benin":"Africa","botswana":"Africa",
    "burkina faso":"Africa","burundi":"Africa","cameroon":"Africa","cape verde":"Africa",
    "central african republic":"Africa","chad":"Africa","congo":"Africa",
    "democratic republic of the congo":"Africa","djibouti":"Africa","egypt":"Africa",
    "equatorial guinea":"Africa","eritrea":"Africa","eswatini":"Africa","ethiopia":"Africa",
    "gabon":"Africa","gambia":"Africa","ghana":"Africa","guinea":"Africa",
    "guinea-bissau":"Africa","ivory coast":"Africa","kenya":"Africa","lesotho":"Africa",
    "liberia":"Africa","libya":"Africa","madagascar":"Africa","malawi":"Africa",
    "mali":"Africa","mauritania":"Africa","mauritius":"Africa","morocco":"Africa",
    "mozambique":"Africa","namibia":"Africa","niger":"Africa","nigeria":"Africa",
    "rwanda":"Africa","senegal":"Africa","seychelles":"Africa","sierra leone":"Africa",
    "somalia":"Africa","south africa":"Africa","sudan":"Africa","tanzania":"Africa",
    "togo":"Africa","tunisia":"Africa","uganda":"Africa","zambia":"Africa","zimbabwe":"Africa",

    // 🌊 Oceania
    "australia":"Oceania","fiji":"Oceania","kiribati":"Oceania","micronesia":"Oceania",
    "new zealand":"Oceania","papua new guinea":"Oceania","samoa":"Oceania",
    "solomon islands":"Oceania","tonga":"Oceania","vanuatu":"Oceania",
  };

  return map[c] || "Other";
}

/* ==========================================================
   📸 Photo Helpers (Level 3 — Proxy-first for AWn refs)
   ========================================================== */

/** Build proxy URL (server-key protected) */
function buildProxyUrl(ref, w = 800) {
  return `${PHOTO_PROXY_URL}?photo_reference=${encodeURIComponent(ref)}&maxwidth=${encodeURIComponent(String(w))}`;
}

/** Try CDN for “p/..”-refs, else fall back to proxy */
async function resolveGooglePhotoUrl(ref, w = 800, h = 600, variant = 0) {
  if (!ref) return null;

  if (/^https?:\/\//i.test(ref)) return ref; // Already full URL

  if (/^AWn/i.test(ref)) return buildProxyUrl(ref, w); // Needs proxy (server-key)

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

  const ok = await new Promise(res => {
    const img = new Image();
    img.onload = () => res(true);
    img.onerror = () => res(false);
    img.src = cdnUrl;
  });

  return ok ? cdnUrl : buildProxyUrl(ref, w);
}

/** GitHub fallback if no Google photo available */
function fallbackForType(type) {
  const t = String(type || "").toLowerCase();
  if (t.includes("lounge")) return GITHUB_LOUNGE_FALLBACK;
  return GITHUB_STORE_FALLBACK;
}

/** Fetch Google photo references for a Place ID */
async function fetchPhotoRefs(placeId) {
  if (!placeId) return [];
  try {
    const v1 = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?fields=photos&key=${GOOGLE_BROWSER_KEY}`;
    let res = await fetch(v1);
    if (res.ok) {
      const j = await res.json();
      const refs = (j.photos || []).map(p => (p?.name || "").split("/").pop()).filter(Boolean);
      if (refs.length) return refs;
    }
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
