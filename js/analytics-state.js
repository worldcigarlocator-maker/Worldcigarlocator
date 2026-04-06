/* ============================================================
   WCL Analytics — State (Canonical Single Source of Truth)
   ============================================================ */

export const ANALYTICS_STATE = {
  CURRENT_KPI: "users",        // "users" | "views" | "clicks" | "ctr" | "stores"
  ACTIVE_DAY: null,            // "YYYY-MM-DD" | null
  LEVEL: "country",            // "country" | "city"
  ACTIVE_COUNTRY: null,        // string | null
  CONTEXT_LOCATION: null       // string | null
};

/* ============================================================
   GETTERS
   ============================================================ */

export function getState() {
  return ANALYTICS_STATE;
}

export function getKPI() {
  return ANALYTICS_STATE.CURRENT_KPI;
}

export function getLevel() {
  return ANALYTICS_STATE.LEVEL;
}

export function getActiveDay() {
  return ANALYTICS_STATE.ACTIVE_DAY;
}

export function getActiveCountry() {
  return ANALYTICS_STATE.ACTIVE_COUNTRY;
}

export function getContextLocation() {
  return ANALYTICS_STATE.CONTEXT_LOCATION;
}

/* ============================================================
   SETTERS (ALL STATE CHANGES GO THROUGH HERE)
   ============================================================ */

export function setKPI(kpi) {
  ANALYTICS_STATE.CURRENT_KPI = kpi;
}

export function setDay(day) {
  ANALYTICS_STATE.ACTIVE_DAY = day;
}

export function setLevel(level) {
  ANALYTICS_STATE.LEVEL = level;
}

export function setCountry(country) {
  ANALYTICS_STATE.ACTIVE_COUNTRY = country;
}

export function setContextLocation(loc) {
  ANALYTICS_STATE.CONTEXT_LOCATION = loc;
}

/* ============================================================
   STATE TRANSITIONS (SAFE FLOWS)
   ============================================================ */

// Reset everything
export function resetState() {
  ANALYTICS_STATE.CURRENT_KPI = "users";
  ANALYTICS_STATE.ACTIVE_DAY = null;
  ANALYTICS_STATE.LEVEL = "country";
  ANALYTICS_STATE.ACTIVE_COUNTRY = null;
  ANALYTICS_STATE.CONTEXT_LOCATION = null;
}

// When user clicks a day in chart
export function applyDay(day) {
  ANALYTICS_STATE.ACTIVE_DAY = day;
  ANALYTICS_STATE.LEVEL = "country";
  ANALYTICS_STATE.ACTIVE_COUNTRY = null;
  ANALYTICS_STATE.CONTEXT_LOCATION = null;
}

// When user clicks a country row
export function applyCountry(country) {
  ANALYTICS_STATE.ACTIVE_COUNTRY = country;
  ANALYTICS_STATE.LEVEL = "city";
}

// When search/context switch happens
export function applyContextCity(city, country) {
  ANALYTICS_STATE.CONTEXT_LOCATION = city;
  ANALYTICS_STATE.ACTIVE_COUNTRY = country;
  ANALYTICS_STATE.LEVEL = "city";
}
