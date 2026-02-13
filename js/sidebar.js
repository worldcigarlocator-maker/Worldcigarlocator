// ============================================================
// SIDEBAR.JS — WCL Sidebar (CANONICAL · CLEAN REBUILD)
// ============================================================
// - Built once after auth
// - Backend: sidebar_nodes_v2 (single source of truth)
// - Fully wrapper-based DOM (no sibling dependency)
// - Deterministic toggle
// ============================================================

import { activateLocation } from "./cards.js";
import { supabase } from "./globals.js";

const menu = document.querySelector("#sidebarMenu");

const sortAZ = (a, b) =>
  String(a).localeCompare(String(b), undefined, { sensitivity: "base" });

const IS_US = (iso2) => String(iso2 || "").toLowerCase() === "us";

// ============================================================
// FETCH
// ============================================================
async function fetchSidebarRows() {
  const PAGE_SIZE = 1000;
  let from = 0;
  let all = [];

  while (true) {
    const { data, error } = await supabase
      .from("sidebar_nodes_v3")
      .select("*")
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    all = all.concat(data || []);

    if (!data || data.length < PAGE_SIZE) break;

    from += PAGE_SIZE;
  }

  return all;
}

// ============================================================
// MODEL BUILD — DETERMINISTIC (ORDER-SAFE)
// ============================================================
function buildModel(rows) {
  const continents = {};

  const ensureContinent = (continent) => {
    continents[continent] ??= { count: 0, countries: {} };
    return continents[continent];
  };

  const ensureCountry = (continent, country, iso2) => {
    const c = ensureContinent(continent);
    c.countries[country] ??= {
      iso2: iso2 || null,
      count: 0,
      states: {},
      cities: {},
    };
    if (!c.countries[country].iso2 && iso2) {
      c.countries[country].iso2 = iso2;
    }
    return c.countries[country];
  };

  const ensureState = (continent, country, iso2, state) => {
    const co = ensureCountry(continent, country, iso2);
    co.states[state] ??= { count: 0, cities: {} };
    return co.states[state];
  };

  const clean = (v) =>
    typeof v === "string" ? v.trim() : v ?? null;

  const safeRows = rows || [];

  // ============================================================
  // PASS 1 — CONTINENTS
  // ============================================================
  safeRows
    .filter((r) => r.level === "continent")
    .forEach((r) => {
      const continent = clean(r.continent);
      if (!continent) return;
      ensureContinent(continent).count = Number(r.count) || 0;
    });

  // ============================================================
  // PASS 2 — COUNTRIES
  // ============================================================
  safeRows
    .filter((r) => r.level === "country")
    .forEach((r) => {
      const continent = clean(r.continent);
      const country = clean(r.country);
      if (!continent || !country) return;

      ensureCountry(
        continent,
        country,
        clean(r.country_iso2)
      ).count = Number(r.count) || 0;
    });

  // ============================================================
  // PASS 3 — STATES (US ONLY)
  // ============================================================
  safeRows
    .filter((r) => r.level === "state")
    .forEach((r) => {
      const continent = clean(r.continent);
      const country = clean(r.country);
      const iso2 = clean(r.country_iso2);
      const state = clean(r.state);

      if (!continent || !country || !state) return;
      if (String(iso2).toLowerCase() !== "us") return;

      ensureState(continent, country, iso2, state).count =
        Number(r.count) || 0;
    });

  // ============================================================
  // PASS 4 — CITIES
  // ============================================================
  safeRows
    .filter((r) => r.level === "city")
    .forEach((r) => {
      const continent = clean(r.continent);
      const country = clean(r.country);
      const iso2 = clean(r.country_iso2);
      const state = clean(r.state);
      const city = clean(r.city);

      if (!continent || !country || !city) return;

      if (String(iso2).toLowerCase() === "us" && state) {
        const st = ensureState(continent, country, iso2, state);
        st.cities[city] = Number(r.count) || 0;
      } else {
        const co = ensureCountry(continent, country, iso2);
        co.cities[city] = Number(r.count) || 0;
      }
    });

  return continents;
}


// ============================================================
// ENTRY
// ============================================================
export async function buildFrontendSidebar() {
  if (!menu) return;

  menu.innerHTML = "Loading…";

  let rows;
  try {
    rows = await fetchSidebarRows();
  } catch (e) {
    console.error("Sidebar load failed", e);
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
      const continentNode = createNode("continent", continent, cData.count, null, {
        continent,
      });

      Object.entries(cData.countries)
        .sort(([a], [b]) => sortAZ(a, b))
        .forEach(([country, coData]) => {
          const countryNode = createNode(
            "country",
            country,
            coData.count,
            coData.iso2,
            { continent, country }
          );

          continentNode.childrenContainer.append(countryNode.wrapper);

          if (IS_US(coData.iso2)) {
            Object.entries(coData.states)
              .sort(([a], [b]) => sortAZ(a, b))
              .forEach(([state, sData]) => {
                const stateNode = createNode(
                  "state",
                  state,
                  sData.count,
                  null,
                  { continent, country, state }
                );

                countryNode.childrenContainer.append(stateNode.wrapper);

                Object.entries(sData.cities)
                  .sort(([a], [b]) => sortAZ(a, b))
                  .forEach(([city, n]) => {
                    const cityNode = createNode(
                      "city",
                      city,
                      n,
                      null,
                      { continent, country, state, city }
                    );
                    stateNode.childrenContainer.append(cityNode.wrapper);
                  });
              });
          } else {
            Object.entries(coData.cities)
              .sort(([a], [b]) => sortAZ(a, b))
              .forEach(([city, n]) => {
                const cityNode = createNode(
                  "city",
                  city,
                  n,
                  null,
                  { continent, country, city }
                );
                countryNode.childrenContainer.append(cityNode.wrapper);
              });
          }
        });

      menu.append(continentNode.wrapper);
    });
}

// ============================================================
// NODE FACTORY (WRAPPER-BASED)
// ============================================================
function createNode(type, label, count, iso2, path) {
  const wrapper = document.createElement("div");
  wrapper.className = "node";

  const line = document.createElement("div");
  line.className = `line ${type}`;
  line.dataset.level = type;
  line.dataset.continent = path.continent || "";
  line.dataset.country = path.country || "";
  line.dataset.state = path.state || "";
  line.dataset.city = path.city || "";

  const flag =
    type === "country" && iso2
      ? `<img class="flag" src="assets/flags/${String(iso2).toLowerCase()}.svg" />`
      : "";

  line.innerHTML = `
    <span class="arrow">${type === "city" ? "•" : "▸"}</span>
    <span class="label-wrap">${flag}<span class="label">${label}</span></span>
    <span class="pill">${Number(count) || 0}</span>
  `;

  const childrenContainer = document.createElement("div");
  childrenContainer.className = "children";

  wrapper.append(line, childrenContainer);

  return { wrapper, line, childrenContainer };
}

// ============================================================
// EVENTS (DELEGATION)
// ============================================================
let EVENTS_BOUND = false;

function bindSidebarEvents() {
  if (EVENTS_BOUND) return;
  EVENTS_BOUND = true;

  menu.addEventListener("click", (e) => {
    const line = e.target.closest(".line");
    if (!line) return;

    const wrapper = line.parentElement;
    const children = wrapper.querySelector(":scope > .children");

    const isCity = line.classList.contains("city");
    const clickedLabel = Boolean(e.target.closest(".label-wrap"));

    if (clickedLabel) {
      activateLocation({
        continent: line.dataset.continent || null,
        country: line.dataset.country || null,
        state: line.dataset.state || null,
        city: line.dataset.city || null,
      });
      return;
    }

    if (!isCity && children) {
      const open = line.classList.toggle("open");
      children.classList.toggle("show", open);
    }
  });
}
