// ============================================================
// SIDEBAR.JS — WCL Sidebar (CANONICAL · ROBUST TOGGLES)
// ============================================================
// - Built once after auth
// - Backend: sidebar_nodes_v2 (single source of truth)
// - Toggle ONLY via arrow click (never label)
// - Label click = activateLocation (never toggles)
// - Robust: no overwrite of cities/states + no nextElementSibling dependency
// ============================================================

import { activateLocation } from "./cards.js";
import { supabase } from "./globals.js";

// ============================================================
// DOM
// ============================================================
const menu = document.querySelector("#sidebarMenu");

// ============================================================
// HELPERS
// ============================================================
const sortAZ = (a, b) =>
  String(a).localeCompare(String(b), undefined, { sensitivity: "base" });

const IS_US = (iso2) => String(iso2 || "").toLowerCase() === "us";

// ============================================================
// FETCH — CANONICAL RPC
// ============================================================
async function fetchSidebarRows() {
  const { data, error } = await supabase.rpc("sidebar_nodes_v2");
  if (error) throw error;
  return data || [];
}

// ============================================================
// MODEL BUILD (NO OVERWRITES)
// ============================================================
function buildModel(rows) {
  const continents = {};

  const ensureContinent = (continent) => {
    continents[continent] ??= { count: 0, countries: {} };
    return continents[continent];
  };

  const ensureCountry = (continent, country, iso2) => {
    const c = ensureContinent(continent);
    c.countries[country] ??= { iso2: iso2 || null, count: 0, states: {}, cities: {} };

    // keep iso2 if later row has it
    if (!c.countries[country].iso2 && iso2) c.countries[country].iso2 = iso2;
    return c.countries[country];
  };

  const ensureState = (continent, country, iso2, state) => {
    const co = ensureCountry(continent, country, iso2);
    co.states[state] ??= { count: 0, cities: {} };
    return co.states[state];
  };

  rows.forEach((r) => {
    const continent = r.continent || null;
    const country = r.country || null;
    const iso2 = r.country_iso2 || null;
    const state = r.state || null;
    const city = r.city || null;
    const level = r.level || null;
    const n = Number(r.count) || 0;

    if (!continent || !level) return;

    if (level === "continent") {
      const c = ensureContinent(continent);
      c.count = n;
      return;
    }

    if (!country) return;

    if (level === "country") {
      const co = ensureCountry(continent, country, iso2);
      co.count = n; // update count without destroying cities/states
      return;
    }

    // city/state need country node
    const isUS = IS_US(iso2);

    if (level === "state" && isUS && state) {
      const st = ensureState(continent, country, iso2, state);
      st.count = n;
      return;
    }

    if (level === "city" && city) {
      if (isUS && state) {
        const st = ensureState(continent, country, iso2, state);
        st.cities[city] = n;
      } else {
        const co = ensureCountry(continent, country, iso2);
        co.cities[city] = n;
      }
    }
  });

  return continents;
}

// ============================================================
// UI BUILDERS
// ============================================================
function createLine(type, label, count, iso2 = null, path = {}) {
  const el = document.createElement("div");
  el.className = `line ${type}`;

  // dataset path for activateLocation
  el.dataset.level = type;
  el.dataset.continent = path.continent ?? "";
  el.dataset.country = path.country ?? "";
  el.dataset.state = path.state ?? "";
  el.dataset.city = path.city ?? "";

  const flag =
    type === "country" && iso2
      ? `<img class="flag" src="assets/flags/${String(iso2).toLowerCase()}.svg" />`
      : "";

  el.innerHTML = `
    <span class="arrow" role="button" aria-label="Toggle">
      ${type === "city" ? "•" : "▸"}
    </span>
    <span class="label-wrap">
      ${flag}<span class="label">${label}</span>
    </span>
    <span class="pill">${count}</span>
  `;

  return el;
}

function createChildren() {
  const el = document.createElement("div");
  el.className = "children";
  return el;
}

// ============================================================
// RENDER (ROBUST PAIRING VIA WEAKMAP)
// ============================================================
const CHILDREN_FOR_LINE = new WeakMap();

function pair(line, children) {
  CHILDREN_FOR_LINE.set(line, children);
}

function renderSidebar(continents) {
  menu.innerHTML = "";

  Object.entries(continents)
    .sort(([a], [b]) => sortAZ(a, b))
    .forEach(([continent, cData]) => {
      // CONTINENT
      const cont = createLine("continent", continent, cData.count, null, {
        continent,
        country: null,
        state: null,
        city: null,
      });
      const contChildren = createChildren();
      pair(cont, contChildren);
      menu.append(cont, contChildren);

      Object.entries(cData.countries)
        .sort(([a], [b]) => sortAZ(a, b))
        .forEach(([country, coData]) => {
          // COUNTRY
          const co = createLine("country", country, coData.count, coData.iso2, {
            continent,
            country,
            state: null,
            city: null,
          });
          const coChildren = createChildren();
          pair(co, coChildren);
          contChildren.append(co, coChildren);

          // USA -> STATES -> CITIES
          if (IS_US(coData.iso2)) {
            Object.entries(coData.states)
              .sort(([a], [b]) => sortAZ(a, b))
              .forEach(([state, sData]) => {
                const st = createLine("state", state, sData.count, null, {
                  continent,
                  country,
                  state,
                  city: null,
                });
                const stChildren = createChildren();
                pair(st, stChildren);
                coChildren.append(st, stChildren);

                Object.entries(sData.cities)
                  .sort(([a], [b]) => sortAZ(a, b))
                  .forEach(([city, n]) => {
                    const ct = createLine("city", city, n, null, {
                      continent,
                      country,
                      state,
                      city,
                    });
                    stChildren.append(ct);
                  });
              });

            return;
          }

          // NON-US -> CITIES
          Object.entries(coData.cities)
            .sort(([a], [b]) => sortAZ(a, b))
            .forEach(([city, n]) => {
              const ct = createLine("city", city, n, null, {
                continent,
                country,
                state: null,
                city,
              });
              coChildren.append(ct);
            });
        });
    });
}

// ============================================================
// EVENTS — ONE DELEGATED LISTENER
// ============================================================
let EVENTS_BOUND = false;

function bindSidebarEvents() {
  if (EVENTS_BOUND) return;
  EVENTS_BOUND = true;

  menu.addEventListener("click", (e) => {
    const line = e.target.closest(".line");
    if (!line) return;

    const isCity = line.classList.contains("city");
    const clickedArrow = Boolean(e.target.closest(".arrow"));
    const clickedLabel = Boolean(e.target.closest(".label-wrap"));

    // LABEL CLICK -> activateLocation ONLY
    if (clickedLabel) {
      setActivePath(line);

      activateLocation({
        continent: line.dataset.continent || null,
        country: line.dataset.country || null,
        state: line.dataset.state || null,
        city: line.dataset.city || null,
      });
      return;
    }

    // TOGGLE -> arrow only (never city)
    if (clickedArrow && !isCity) {
      const children = CHILDREN_FOR_LINE.get(line);
      if (!children) return;

      const open = line.classList.toggle("open");
      children.classList.toggle("show", open);
    }
  });
}

// ============================================================
// ACTIVE PATH — HIGHLIGHT + AUTO-EXPAND (NO TOGGLE)
// ============================================================
function setActivePath(lineEl) {
  document
    .querySelectorAll("#sidebarMenu .line.active")
    .forEach((el) => el.classList.remove("active"));

  let el = lineEl;

  while (el && el !== document) {
    if (el.classList?.contains("line")) el.classList.add("active");
    if (el.classList?.contains("children")) el.classList.add("show");
    // also open parents visually
    if (el.classList?.contains("line") && !el.classList.contains("city")) {
      el.classList.add("open");
    }
    el = el.parentElement;
  }
}

// ============================================================
// ENTRY POINT
// ============================================================
export async function buildFrontendSidebar() {
  if (!menu) return;

  menu.innerHTML = "Loading…";

  let rows;
  try {
    rows = await fetchSidebarRows();
  } catch (e) {
    console.error("❌ Sidebar load failed", e);
    menu.innerHTML = "Failed to load";
    return;
  }

  const continents = buildModel(rows);
  renderSidebar(continents);
  bindSidebarEvents();
}
