/* ============================================================
   GLOBALS — Shared config + helpers for frontend
   ============================================================ */

export const WCL = {
  SUPABASE_URL: "https://gbxxoeplkzbhsvagnfsr.supabase.co",
  SUPABASE_ANON_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4",
  PHOTO_PROXY_URL:
    "https://gbxxoeplkzbhsvagnfsr.functions.supabase.co/photo-proxy",
  FALLBACK_IMG:
    "https://worldcigarlocator-maker.github.io/Worldcigarlocator/images/store.jpg",
  FLAGS_BASE:
    "https://worldcigarlocator-maker.github.io/Worldcigarlocator/assets/flags",
};

// Supabase client (delad)
export const supabase = window.supabase.createClient(
  WCL.SUPABASE_URL,
  WCL.SUPABASE_ANON_KEY
);

/* ---------------- PHOTO URL ---------------- */
export function photoURL(ref, w = 800) {
  if (!ref) return WCL.FALLBACK_IMG;
  return `${WCL.PHOTO_PROXY_URL}?photo_reference=${encodeURIComponent(
    ref
  )}&maxwidth=${w}`;
}

/* ---------------- ISO2 / flag engine ---------------- */

const ISO2_BASE = {
  us: "united states",
  gb: "united kingdom",
  se: "sweden",
  de: "germany",
  fr: "france",
  it: "italy",
  es: "spain",
  ca: "canada",
  mx: "mexico",
  br: "brazil",
  ar: "argentina",
  ch: "switzerland",
  no: "norway",
  fi: "finland",
  dk: "denmark",
  nl: "netherlands",
  be: "belgium",
  pt: "portugal",
  pl: "poland",
  jp: "japan",
  cn: "china",
  kr: "south korea",
  au: "australia",
  nz: "new zealand",
  za: "south africa",
  th: "thailand",
  sg: "singapore",
  ae: "united arab emirates",
  sa: "saudi arabia",
  gr: "greece",
  at: "austria",
  ie: "ireland",
  cz: "czechia",
  ro: "romania",
  bg: "bulgaria",
  hu: "hungary",
  hr: "croatia",
  rs: "serbia",
  ua: "ukraine",
};

const COUNTRY_TO_ISO2 = {};
for (const [iso, name] of Object.entries(ISO2_BASE)) {
  COUNTRY_TO_ISO2[name] = iso;
}

function norm(str) {
  return (str || "")
    .toLowerCase()
    .trim()
    .replace(/[’']/g, "'")
    .replace(/\./g, "")
    .replace(/,/g, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ");
}

export function flagURL(country, isoOverride = null) {
  if (!country && !isoOverride) return null;

  if (isoOverride && ISO2_BASE[isoOverride]) {
    return `${WCL.FLAGS_BASE}/${isoOverride}.svg`;
  }

  const key = norm(country);
  if (ISO2_BASE[key]) {
    return `${WCL.FLAGS_BASE}/${key}.svg`;
  }

  const iso = COUNTRY_TO_ISO2[key];
  return iso ? `${WCL.FLAGS_BASE}/${iso}.svg` : null;
}

/* --------- Country → Continent (fallback) ---------- */
export function getContinentFromCountry(country) {
  const c = (country || "").toLowerCase();
  if (
    [
      "sweden",
      "germany",
      "france",
      "italy",
      "spain",
      "norway",
      "finland",
      "denmark",
      "netherlands",
      "belgium",
      "austria",
      "switzerland",
      "poland",
      "czech republic",
      "czechia",
      "united kingdom",
      "england",
    ].includes(c)
  )
    return "Europe";

  if (["united states", "usa", "canada", "mexico", "cuba", "dominican republic"].includes(c))
    return "North America";

  if (["brazil", "argentina", "chile", "peru", "colombia", "uruguay", "paraguay"].includes(c))
    return "South America";

  if (
    [
      "china",
      "japan",
      "india",
      "thailand",
      "malaysia",
      "singapore",
      "israel",
      "turkey",
      "vietnam",
      "indonesia",
    ].includes(c)
  )
    return "Asia";

  if (["south africa", "nigeria", "kenya", "morocco", "egypt", "ghana"].includes(c))
    return "Africa";

  if (["australia", "new zealand", "fiji"].includes(c)) return "Oceania";

  return "Other";
}
