/* ============================================================
   GLOBALS — URLs, flags, photo helpers
   ============================================================ */

export const WCL = {
SUPABASE_URL: "https://gbxxoeplkzbhsvagnfsr.supabase.co",
  SUPABASE_ANON_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4",

  FALLBACK_IMG: "images/fallback.jpg",

  FLAGS_BASE: "https://flagcdn.com/24x18/", // ISO2 lowercase + .png
};

/* ============================================================
   Google Photo URL builder
   ============================================================ */
export function photoURL(ref, maxwidth = 800) {
  if (!ref) return WCL.FALLBACK_IMG;

  return (
    `${WCL.SUPABASE_URL}/functions/v1/photo-proxy?ref=` +
    encodeURIComponent(ref) +
    `&maxwidth=${maxwidth}`
  );
}

/* ============================================================
   Flag URL builder (ISO2 recommended)
   ============================================================ */
export function flagURL(countryName, iso2) {
  if (!iso2) return null;
  return `${WCL.FLAGS_BASE}${iso2.toLowerCase()}.png`;
}

/* ============================================================
   Simple continent mapping
   ============================================================ */
export function getContinentFromCountry(country) {
  if (!country) return "Unknown";

  const name = country.toLowerCase();

  const EU = ["sweden","germany","france","italy","spain","netherlands","norway","denmark","finland","poland","portugal","austria","belgium","czechia","greece","ireland","iceland"];
  const NA = ["united states","canada","mexico"];
  const SA = ["brazil","argentina","chile","colombia","peru"];
  const AS = ["japan","china","india","thailand","south korea","vietnam"];
  const AF = ["south africa","egypt","morocco","kenya"];
  const OC = ["australia","new zealand"];

  if (EU.includes(name)) return "Europe";
  if (NA.includes(name)) return "North America";
  if (SA.includes(name)) return "South America";
  if (AS.includes(name)) return "Asia";
  if (AF.includes(name)) return "Africa";
  if (OC.includes(name)) return "Oceania";

  return "Other";
}
