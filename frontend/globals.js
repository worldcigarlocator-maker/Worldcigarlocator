/* ============================================================
   GLOBALS.js — Shared logic for Frontend v8
   Matches Backoffice V5.2.1 (ISO2 engine, flags, continents)
   ============================================================ */

/* ------------------------------------------------------------
   WCL CONFIG
------------------------------------------------------------ */
export const WCL = {
  SUPABASE_URL: "https://gbxxoeplkzbhsvagnfsr.supabase.co",
  SUPABASE_ANON_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4",

  PHOTO_PROXY_URL:
    "https://gbxxoeplkzbhsvagnfsr.functions.supabase.co/photo-proxy",

  FALLBACK_IMG:
    "https://worldcigarlocator-maker.github.io/Worldcigarlocator/images/store.jpg",

  FLAGS_BASE:
    "https://worldcigarlocator-maker.github.io/Worldcigarlocator/assets/flags"
};


/* ------------------------------------------------------------
   PHOTO URL BUILDER
------------------------------------------------------------ */
export function photoURL(ref, w = 800) {
  if (!ref) return WCL.FALLBACK_IMG;
  return `${WCL.PHOTO_PROXY_URL}?photo_reference=${encodeURIComponent(ref)}&maxwidth=${w}`;
}


/* ------------------------------------------------------------
   ISO2 ENGINE (SAME AS BACKOFFICE)
------------------------------------------------------------ */
const ISO2_BASE = {
  us:"united states", gb:"united kingdom", se:"sweden", de:"germany",
  fr:"france", it:"italy", es:"spain", ca:"canada", mx:"mexico",
  br:"brazil", ar:"argentina", ch:"switzerland", no:"norway", fi:"finland",
  dk:"denmark", nl:"netherlands", be:"belgium", pt:"portugal", pl:"poland",
  jp:"japan", cn:"china", kr:"south korea", au:"australia", nz:"new zealand",
  za:"south africa", th:"thailand", sg:"singapore", ae:"united arab emirates",
  sa:"saudi arabia", gr:"greece", at:"austria", ie:"ireland",
  cz:"czech republic", ro:"romania", bg:"bulgaria", hu:"hungary",
  hr:"croatia", rs:"serbia", ua:"ukraine"
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

/* ------------------------------------------------------------
   FLAG URL
------------------------------------------------------------ */
export function flagURL(country, isoOverride = null) {
  if (isoOverride) {
    return `${WCL.FLAGS_BASE}/${isoOverride.toLowerCase()}.svg`;
  }

  const normalized = norm(country);
  const iso = COUNTRY_TO_ISO2[normalized];

  return iso ? `${WCL.FLAGS_BASE}/${iso}.svg` : null;
}


/* ------------------------------------------------------------
   CONTINENT MAP (matches backoffice autocomplete)
------------------------------------------------------------ */
export function getContinentFromCountry(country) {
  if (!country) return "Other";
  const c = norm(country);

  const EU = [
    "sweden","germany","france","italy","spain","norway","finland",
    "denmark","netherlands","belgium","austria","switzerland","poland",
    "czech republic","czechia","greece","portugal","croatia","ireland",
    "hungary","romania","bulgaria","serbia","ukraine"
  ];
  const NA = ["united states","usa","canada","mexico","cuba","dominican republic"];
  const SA = ["brazil","argentina","chile","peru","colombia","uruguay","paraguay"];
  const AS = ["china","japan","india","thailand","malaysia","singapore","israel",
              "turkey","vietnam","indonesia","south korea"];
  const AF = ["south africa","nigeria","kenya","morocco","egypt","ghana"];
  const OC = ["australia","new zealand","fiji"];

  if (EU.includes(c)) return "Europe";
  if (NA.includes(c)) return "North America";
  if (SA.includes(c)) return "South America";
  if (AS.includes(c)) return "Asia";
  if (AF.includes(c)) return "Africa";
  if (OC.includes(c)) return "Oceania";

  return "Other";
}
