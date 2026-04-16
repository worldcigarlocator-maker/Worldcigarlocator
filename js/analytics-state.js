/* ============================================================
   WCL Analytics — Reactive State (Single Source of Truth)
   ============================================================ */

const STATE = {
  kpi: "users",            // "users" | "views" | "clicks" | "ctr" | "stores"
  level: "country",        // "country" | "city"
  day: null,               // "YYYY-MM-DD" | null
  country: null,           // string | null
  contextLocation: null    // string | null
};

/* ============================================================
   SUBSCRIBE SYSTEM (REACTIVE CORE)
   ============================================================ */

let listeners = [];

export function subscribe(fn) {
  listeners.push(fn);
}

function notify() {
  for (const fn of listeners) {
    fn({ ...STATE }); // skicka copy (säkerhet)
  }
}

/* ============================================================
   GETTERS
   ============================================================ */

export function getState() {
  return { ...STATE };
}

export function getKPI() {
  return STATE.kpi;
}

export function getLevel() {

  // 🔥 SINGLE SOURCE OF TRUTH
  if (STATE.country) return "city";

  return "country";
}

export function getActiveDay() {
  return STATE.day;
}

export function setActiveDay(day) {
  STATE.day = day;
}

export function getActiveCountry() {
  return STATE.country;
}

export function getContextLocation() {
  return STATE.contextLocation;
}

/* ============================================================
   SAFE STATE TRANSITIONS (ONLY WAY TO CHANGE STATE)
   ============================================================ */

// 🔥 KPI change
export function setKPI(kpi) {
  STATE.kpi = kpi;
  notify();
}

// 🔥 Reset ALL
export function resetState() {
  STATE.kpi = "users";
  STATE.level = "country";
  STATE.day = null;
  STATE.country = null;
  STATE.contextLocation = null;
  notify();
}

// 🔥 Click day (chart → country level)
export function applyDay(day) {
  STATE.day = day;
  STATE.level = "country";
  STATE.country = null;
  STATE.contextLocation = null;
  notify();
}

// 🔥 Click country (→ city level)
export function applyCountry(country) {

  STATE.country = country;

  // 🔥 KRITISKT
  notify();

}

// 🔥 External context (search etc)
export function applyContextCity(city, country) {
  STATE.contextLocation = city;
  STATE.country = country;
  STATE.level = "city";
  notify();
}
