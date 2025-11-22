// ============================================================
// SUPABASE CLIENT
// ============================================================
export const supabase = window.supabase.createClient(
  "https://gbxxoeplkzbhsvagnfsr.supabase.co",
  "YOUR_PUBLIC_ANON_KEY"
);

// Snabb query selector
export const qs = (id) => document.getElementById(id);


// ============================================================
// CONTINENT MAP  <-- DET ÄR HÄR DEN SKA LIGGA
// ============================================================
export function getContinent(country = "") {
  if (!country) return "Unknown";

  const c = country.toLowerCase();

  // Europa
  if ([
    "sweden","norway","finland","denmark","germany","spain","france",
    "italy","uk","england","poland","netherlands","belgium","switzerland",
    "austria","portugal","ireland","czechia","slovakia","hungary"
  ].includes(c)) return "Europe";

  // Nordamerika
  if (["usa","united states","canada","mexico"].includes(c))
    return "North America";

  // Sydamerika
  if (["brazil","argentina","chile","colombia","peru"].includes(c))
    return "South America";

  // Asien
  if ([
    "japan","china","vietnam","thailand","south korea","india",
    "indonesia","malaysia"
  ].includes(c)) return "Asia";

  // Afrika
  if ([
    "south africa","nigeria","morocco","egypt","kenya","tanzania"
  ].includes(c))
    return "Africa";

  // Oceanien
  if (["australia","new zealand"].includes(c))
    return "Oceania";

  return "Other";
}
