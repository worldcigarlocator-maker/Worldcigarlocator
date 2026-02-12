// ============================================================
// SIDEBAR.JS — WCL Sidebar (CANONICAL · NO OVERWRITES · FIXED)
// ============================================================
// - Built once after auth
// - Backend: sidebar_nodes_v2 (single source of truth)
// - Model build NEVER overwrites cities/states
// - Toggle only on arrow / row (label activates location)
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

/// ============================================================
// MODEL BUILD (NO OVERWRITES)  ✅ fixes "countries after N break"
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

  for (const r of rows || []) {
    const continent = r.continent || null;
    const country   = r.country || null;
    const iso2      = r.country_iso2 || null;
    const state     = r.state || null;
    const city      = r.city || null;
    const level     = r.level || null;
    const n         = Number(r.count) || 0;

    if (!continent || !level) continue;

    // continent row
    if (level === "continent") {
      const c = ensureContinent(continent);
      c.count = n;
      continue;
    }

    if (!country) continue;

    // ✅ country row MUST NOT overwrite existing country node
    if (level === "country") {
      const co = ensureCountry(continent, country, iso2);
      co.count = n;
      continue;
    }

    const isUS = IS_US(iso2);

    // state row (US only)
    if (level === "state" && isUS && state) {
      const st = ensureState(continent, country, iso2, state);
      st.count = n;
      continue;
    }

    // city row
    if (level === "city" && city) {
      if (isUS && state) {
        const st = ensureState(continent, country, iso2, state);
        st.cities[city] = n;
      } else {
        const co = ensureCountry(continent, country, iso2);
        co.cities[city] = n;
      }
    }
  }

  return continents;
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

  const model = buildModel(rows);

  menu.innerHTML = "";
  renderSidebar(model);
  bindSidebarEvents();
}

// ============================================================
// RENDER
// ============================================================
function renderSidebar(continents) {
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

          contChildren.append(co, coChildren);

          // US WITH STATES
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
          } else {
            // NON-US CITIES
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
          }
        });
    });
}

// ============================================================
// UI BUILDERS
// ============================================================
function createLine(type, label, count, iso2 = null, path = {}) {
  const el = document.createElement("div");
  el.className = `line ${type}`;

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
    <span class="pill">${Number(count) || 0}</span>
  `;

  return el;
}

function createChildren() {
  const el = document.createElement("div");
  el.className = "children";
  return el;
}

// ============================================================
// EVENTS — ONE LISTENER (DELEGATION)
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

    // LABEL => activateLocation only
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

    // TOGGLE => arrow click OR row whitespace (not city)
    if (!isCity && (clickedArrow || !clickedLabel)) {
    const children = line.parentElement?.querySelector(":scope > .children");
      if (!children || !children.classList.contains("children")) return;

      const open = line.classList.toggle("open");
      children.classList.toggle("show", open);
    }
  });
}

// ============================================================
// ACTIVE PATH — HIGHLIGHT + AUTO-EXPAND
// ============================================================
function setActivePath(lineEl) {
  document
    .querySelectorAll("#sidebarMenu .line.active")
    .forEach((el) => el.classList.remove("active"));

  let el = lineEl;
  while (el && el !== document) {
    if (el.classList?.contains("line")) el.classList.add("active");
    if (el.classList?.contains("children")) el.classList.add("show");
    el = el.parentElement;
  }
}
