/* ================================================
   add-shared.js — Gemensam logik för Add Store & Backoffice
   Version 1.0 — 2025-10-30
   ================================================ */

const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";
const GOOGLE_BROWSER_KEY = "AIzaSyDdn7E6_dfwUjGQ1IUdJ2rQXUeEYIIzVtQ";
const PHOTO_PROXY_URL = "https://gbxxoeplkzbhsvagnfsr.functions.supabase.co/photo-proxy";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ============ IMAGE HELPERS — Level 3 (Proxy-first for AWn refs) ============ */
function buildProxyUrl(ref, w = 800) {
  return `${PHOTO_PROXY_URL}?photo_reference=${encodeURIComponent(ref)}&maxwidth=${encodeURIComponent(String(w))}`;
}

async function resolveGooglePhotoUrl(ref, w = 800, h = 600, variant = 0) {
  if (!ref) return null;
  if (/^https?:\/\//i.test(ref)) return ref;
  if (/^AWn/i.test(ref)) return buildProxyUrl(ref, w);

  let clean = String(ref).trim();
  if (clean.includes("/photos/")) clean = clean.split("/").pop();
  if (clean.startsWith("p/")) clean = clean.slice(2);
  clean = clean.split("?")[0];

  const tails = [`=w${w}-h${h}`, `=w${w}-h${h}-k-no`, `=w${w}-h${h}-no`];
  const cdnUrl = `https://lh3.googleusercontent.com/p/${encodeURIComponent(clean)}${tails[variant]}`;

  const ok = await new Promise(res => {
    const img = new Image();
    img.onload = () => res(true);
    img.onerror = () => res(false);
    img.src = cdnUrl;
  });

  return ok ? cdnUrl : buildProxyUrl(ref, w);
}

/* ============ GOOGLE PLACES (new v1 API) ============ */
async function fetchPlaceDetails(placeId) {
  if (!placeId) return null;
  try {
    const endpoint = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?fields=id,displayName,formattedAddress,location,photos,internationalPhoneNumber,websiteUri,addressComponents&key=${GOOGLE_BROWSER_KEY}`;
    const res = await fetch(endpoint);
    if (!res.ok) return null;
    const data = await res.json();
    return data;
  } catch (e) {
    console.warn("fetchPlaceDetails error:", e);
    return null;
  }
}

/* ============ PHOTO REFERENCES ============ */
async function fetchPhotoRefs(placeId) {
  const d = await fetchPlaceDetails(placeId);
  if (!d?.photos) return [];
  return d.photos.map(p => (p.name || "").split("/").pop()).filter(Boolean);
}

/* ============ UTILITIES ============ */
function countryToContinent(country) {
  if (!country) return "Other";
  const c = country.trim().toLowerCase();
  const m = {
    "sweden": "Europe", "norway": "Europe", "denmark": "Europe", "finland": "Europe", "iceland": "Europe",
    "usa": "North America", "united states": "North America", "canada": "North America", "mexico": "North America",
    "france": "Europe", "germany": "Europe", "italy": "Europe", "spain": "Europe", "portugal": "Europe",
    "netherlands": "Europe", "belgium": "Europe", "poland": "Europe", "austria": "Europe",
    "switzerland": "Europe", "united kingdom": "Europe", "ireland": "Europe",
    "brazil": "South America", "argentina": "South America", "chile": "South America",
    "australia": "Oceania", "new zealand": "Oceania",
    "japan": "Asia", "china": "Asia", "india": "Asia", "south korea": "Asia", "singapore": "Asia",
    "thailand": "Asia", "vietnam": "Asia", "taiwan": "Asia",
    "south africa": "Africa", "morocco": "Africa", "egypt": "Africa", "kenya": "Africa"
  };
  return m[c] || "Other";
}
