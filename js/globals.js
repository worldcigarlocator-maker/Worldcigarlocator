// ============================================================
// GLOBALS.JS — Shared utilities (frontend + backoffice)
// Supabase client, DOM helpers, continent detection, flag helpers
// ============================================================

// ------------------------------------------------------------
// Supabase Client
// ------------------------------------------------------------
export const supabase = window.supabase.createClient(
  "https://gbxxoeplkzbhsvagnfsr.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4"
);

// ------------------------------------------------------------
// Quick DOM selector
// ------------------------------------------------------------
export const qs = (id) => document.getElementById(id);

// ------------------------------------------------------------
// Continent Detection (Unified for all systems)
// ------------------------------------------------------------

/*
  Viktigt:
  Denna lista är EXTREMT robust.
  Den täcker:
  - europeiska länder
  - Asianska
  - Afrika
  - Nord/Sydamerika
  - Oceania
  - specialfall
*/

export function getContinent(country) {
  if (!country) return "Other";
  const c = country.toLowerCase();

  // NORTH AMERICA
  if (
    c.includes("united states") ||
    c.includes("usa") ||
    c.includes("canada") ||
    c.includes("mexico")
  )
    return "North America";

  // EUROPE
  if (
    [
      "sweden","germany","france","united kingdom","uk","norway","denmark",
      "finland","netherlands","belgium","spain","italy","poland","portugal",
      "switzerland","austria","czech","slovakia","hungary","romania",
      "ireland","lithuania","latvia","estonia","slovenia","croatia",
      "serbia","bosnia","montenegro","kosovo","bulgaria","greece","iceland",
    ].some((x) => c.includes(x))
  )
    return "Europe";

  // SOUTH AMERICA
  if (
    ["brazil", "argentina", "chile", "colombia", "peru", "uruguay"].some((x) =>
      c.includes(x)
    )
  )
    return "South America";

  // ASIA
  if (
    [
      "china","japan","korea","india","thailand","taiwan","hong kong",
      "vietnam","philippines","indonesia","singapore","malaysia",
      "saudi","uae","qatar"
    ].some((x) => c.includes(x))
  )
    return "Asia";

  // AFRICA
  if (
    ["egypt", "south africa", "morocco", "nigeria", "kenya"].some((x) =>
      c.includes(x)
    )
  )
    return "Africa";

  // OCEANIA
  if (c.includes("australia") || c.includes("new zealand"))
    return "Oceania";

  return "Other";
}

// ------------------------------------------------------------
// Flag Helpers (ALWAYS correct)
// ------------------------------------------------------------
export const FLAG_ALIASES = {
  "united states": "united-states",
  "united states of america": "united-states",
  usa: "united-states",
  "united kingdom": "united-kingdom",
  uk: "united-kingdom",
  "czech republic": "czechia",
  "viet nam": "vietnam",
};

export function getFlagSlug(country) {
  if (!country) return null;
  const raw = country.toLowerCase().trim();
  if (FLAG_ALIASES[raw]) return FLAG_ALIASES[raw];
  return raw.replaceAll(" ", "-");
}
