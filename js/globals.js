/* ============================================================
   SUPABASE (ESM-safe)
   ============================================================ */

// Importera ESM-modulen direkt
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

export const supabase = createClient(
  "https://gbxxoeplkzbhsvagnfsr.supabase.co",
  "YOUR_PUBLIC_ANON_KEY"
);

/* ------------------------------------------------------------
   Snabb query selector
------------------------------------------------------------ */
export const qs = (id) => document.getElementById(id);


/* ============================================================
   FULL GLOBAL CONTINENT MAP
   ============================================================ */

const CONTINENT_MAP = {
  Europe: [
    "sweden","norway","finland","denmark","germany","spain","france","italy",
    "uk","england","scotland","ireland","portugal","netherlands","belgium",
    "austria","switzerland","czechia","slovakia","hungary","poland","estonia",
    "latvia","lithuania","slovenia","croatia","serbia","greece","iceland"
  ],

  "North America": [
    "usa","united states","canada","mexico","puerto rico","cuba","bahamas"
  ],

  "South America": [
    "brazil","argentina","chile","colombia","uruguay","paraguay","ecuador","peru"
  ],

  Asia: [
    "japan","china","hong kong","taiwan","vietnam","thailand","south korea","india",
    "indonesia","malaysia","philippines","singapore","uae","dubai","qatar","saudi arabia"
  ],

  Africa: [
    "south africa","nigeria","morocco","egypt","kenya","ghana","tanzania","angola"
  ],

  Oceania: ["australia","new zealand","fiji","papua new guinea"]
};

/* ------------------------------------------------------------
   getContinent(country)
------------------------------------------------------------ */
export function getContinent(country = "") {
  if (!country) return "Unknown";
  const c = country.toLowerCase().trim();

  for (const [continent, list] of Object.entries(CONTINENT_MAP)) {
    if (list.includes(c)) return continent;
  }

  return "Other";
}
