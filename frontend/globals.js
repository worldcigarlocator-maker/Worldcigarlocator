/* ============================================================
   GLOBALS — Shared config + helpers for Frontend (match Backoffice)
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

/* ---------------- PHOTO URL ---------------- */
export function photoURL(ref, w = 800) {
  if (!ref) return WCL.FALLBACK_IMG;
  return `${WCL.PHOTO_PROXY_URL}?photo_reference=${encodeURIComponent(
    ref
  )}&maxwidth=${w}`;
}

/* ============================================================
   ISO2 ENGINE (samma tänk som Backoffice)
   ============================================================ */

const ISO2_BASE = {
  al: "albania",
  ad: "andorra",
  am: "armenia",
  at: "austria",
  az: "azerbaijan",
  by: "belarus",
  be: "belgium",
  ba: "bosnia and herzegovina",
  bg: "bulgaria",
  hr: "croatia",
  cy: "cyprus",
  cz: "czechia",
  dk: "denmark",
  ee: "estonia",
  fi: "finland",
  fr: "france",
  ge: "georgia",
  de: "germany",
  gr: "greece",
  hu: "hungary",
  is: "iceland",
  ie: "ireland",
  it: "italy",
  kz: "kazakhstan",
  xk: "kosovo",
  lv: "latvia",
  lt: "lithuania",
  lu: "luxembourg",
  mt: "malta",
  md: "moldova",
  mc: "monaco",
  me: "montenegro",
  nl: "netherlands",
  mk: "north macedonia",
  no: "norway",
  pl: "poland",
  pt: "portugal",
  ro: "romania",
  rs: "serbia",
  sk: "slovakia",
  si: "slovenia",
  es: "spain",
  se: "sweden",
  ch: "switzerland",
  tr: "turkey",
  ua: "ukraine",
  gb: "united kingdom",

  ca: "canada",
  us: "united states",
  mx: "mexico",
  br: "brazil",
  ar: "argentina",

  jp: "japan",
  cn: "china",
  kr: "south korea",
  th: "thailand",
  sg: "singapore",
  ae: "united arab emirates",
  sa: "saudi arabia",

  au: "australia",
  nz: "new zealand",
  za: "south africa",
};

// Reverse: name → iso2
const COUNTRY_TO_ISO2 = {};
for (const [iso, name] of Object.entries(ISO2_BASE)) {
  COUNTRY_TO_ISO2[name] = iso;
  COUNTRY_TO_ISO2[name.replace(" and ", " & ")] = iso;
}

// Extra alias (svenska + vanliga varianter)
Object.assign(COUNTRY_TO_ISO2, {
  sverige: "se",
  norway: "no",
  norge: "no",
  danmark: "dk",
  finland: "fi",
  storbritannien: "gb",
  england: "gb",
  skottland: "gb",
  wales: "gb",
  "nordirland": "gb",
  usa: "us",
  "united states of america": "us",
  deutschland: "de",
  schweiz: "ch",
  espana: "es",
  "españa": "es",
});

/* Normalisering */
function normalizeKey(name) {
  return (name || "")
    .toLowerCase()
    .trim()
    .replace(/’/g, "'")
    .replace(/\./g, "")
    .replace(/,/g, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ");
}

/* Resolve flag URL */
export function flagURL(country, isoOverride = null) {
  if (!country && !isoOverride) return null;

  // A) iso override direkt från DB (framtidssäkert)
  if (isoOverride) {
    const key = isoOverride.toLowerCase();
    if (ISO2_BASE[key]) {
      return `${WCL.FLAGS_BASE}/${key}.svg`;
    }
  }

  const key = normalizeKey(country);

  // B) country är iso2
  if (ISO2_BASE[key]) {
    return `${WCL.FLAGS_BASE}/${key}.svg`;
  }

  // C) alias / namn
  const iso = COUNTRY_TO_ISO2[key];
  return iso ? `${WCL.FLAGS_BASE}/${iso}.svg` : null;
}

/* ============================================================
   CONTINENT HELPER — samma känsla som Backoffice
   ============================================================ */

const countryContinentMap = {
  germany: "Europe",
  sweden: "Europe",
  norway: "Europe",
  denmark: "Europe",
  france: "Europe",
  spain: "Europe",
  italy: "Europe",
  "united kingdom": "Europe",
  usa: "North America",
  "united states": "North America",
  canada: "North America",
  mexico: "North America",
  brazil: "South America",
  argentina: "South America",
  "south africa": "Africa",
  egypt: "Africa",
  morocco: "Africa",
  china: "Asia",
  japan: "Asia",
  thailand: "Asia",
  singapore: "Asia",
  australia: "Oceania",
  "new zealand": "Oceania",
};

export function getContinentFromCountry(country) {
  if (!country) return "Other";
  const key = normalizeKey(country);
  return countryContinentMap[key] || "Other";
}
