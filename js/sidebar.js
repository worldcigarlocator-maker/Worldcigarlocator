// ============================================================
// SIDEBAR.JS — WCL Sidebar (CANONICAL, DETERMINISTIC) — FINAL
// ------------------------------------------------------------
// STRATEGI (LÅST):
// - Backend är korrekt (nodes + counts)
// - Frontend ansvarar för korrekt matchning
// - En (1) canonical key-funktion
// - Inga cities visas om count = 0
// - USA: Continent → Country → State → City
// - Övriga: Continent → Country → City
// - Sidebar sätter LOCATION som master (LAW)
// ============================================================

import { activateLocation } from "./cards.js";

// ============================================================
// DOM
// ============================================================
const menu = document.querySelector("#sidebarMenu");

// ============================================================
// HELPERS — CANONICAL NORMALIZATION
// ============================================================
const norm = (v) => (v ?? "").toString().trim();

const makeKey = ({ continent = "", country = "", state = "", city = "", level = "" }) =>
  [norm(continent), norm(country), norm(state), norm(city), norm(level)].join("|");

// USA check (ISO2 canonical)
const IS_US = (iso2) => (iso2 ?? "").toString().toLowerCase() === "us";

// Sort A–Z (UI only)
const sortAZ = (a, b) =>
  String(a).localeCompare(String(b), undefined, { sensitivity: "base" });

// ============================================================
// FETCH — canonical backend (nodes + counts)
// ============================================================
async function fetchNodesAndCounts(supabase) {
  const [nodesRes, countsRes] = await Promise.all([
    supabase.rpc("sidebar_nodes_v1"),
    supabase.rpc("sidebar_counts_v1"),
  ]);

  if (nodesRes.error) throw nodesRes.error;
  if (countsRes.error) throw countsRes.error;

  return {
    nodes: nodesRes.data || [],
    counts: countsRes.data || [],
  };
}

// ============================================================
// BUILD TREE (STRUCTURE FROM NODES, COUNTS FROM COUNTS)
// ------------------------------------------------------------
// KEY INSIGHT:
// counts(city) may include state even for non-US (UK/FR/etc).
// Non-US sidebar is Country→City, so we must SUM city counts across states.
// ============================================================
function buildTree(nodes, counts) {
  const tree = {};

  // ---- count lookup (strict + relaxed city non-US) ----
  const countMap = {};

  counts.forEach((r) => {
    const level = norm(r.level).toLowerCase();

    // strict key (includes state)
    const strictKey = makeKey({
      continent: r.continent,
      country: r.country,
      state: r.state,
      city: r.city,
      level,
    });

    countMap[strictKey] = Number(r.count || 0);

    // relaxed city key (ignore state) — SUM across states
    if (level === "city") {
      const relaxedKey = makeKey({
        continent: r.continent,
        country: r.country,
        state: "", // 🔒 ignore state
        city: r.city,
        level: "city",
      });

      countMap[relaxedKey] = (countMap[relaxedKey] || 0) + Number(r.count || 0);
    }
  });

  const getCountStrict = ({ continent, country, state, city, level }) =>
    countMap[
      makeKey({
        continent,
        country,
        state,
        city,
        level: norm(level).toLowerCase(),
      })
    ] || 0;

  const getCountCityNonUS = ({ continent, country, city }) =>
    countMap[
      makeKey({
        continent,
        country,
        state: "",
        city,
        level: "city",
      })
    ] || 0;

  // ---- build structure from nodes ----
  nodes.forEach((n) => {
    const continent = norm(n.continent);
    const country = norm(n.country);
    const state = norm(n.state);
    const city = norm(n.city);
    const iso2 = (n.country_iso2 ?? "").toString();

    if (!continent || !country || !city) return;

    tree[continent] ??= {
      count: getCountStrict({ continent, country: "", state: "", city: "", level: "continent" }),
      countries: {},
    };

    tree[continent].countries[country] ??= {
      iso2: iso2 || null,
      count: getCountStrict({ continent, country, state: "", city: "", level: "country" }),
      states: {},
      cities: {},
    };

    const isUS = IS_US(iso2);

    if (isUS) {
      // USA requires state
      if (!state) return;

      tree[continent].countries[country].states[state] ??= {
        count: getCountStrict({ continent, country, state, city: "", level: "state" }),
        cities: {},
      };

      const cityCount = getCountStrict({ continent, country, state, city, level: "city" });
      if (cityCount <= 0) return;

      tree[continent].countries[country].states[state].cities[city] = cityCount;
      return;
    }

    // NON-US: Country → City (ignore state)
    const cityCount = getCountCityNonUS({ continent, country, city });
    if (cityCount <= 0) return;

    tree[continent].countries[country].cities[city] = cityCount;
  });

  return tree;
}

// ============================================================
// APPLY LOCATION (LAW)
// ============================================================
let ACTIVE_PATH = {
  continent: null,
  country: null,
  state: null,
  city: null,
};

function applyLocation(next) {
  ACTIVE_PATH = { ...ACTIVE_PATH, ...next };
  activateLocation(ACTIVE_PATH);
  updateActiveClasses();
}

// ============================================================
// BUILD SIDEBAR (PUBLIC)
// - Continents open default, toggleable
// - Countries/States closed default
// - Arrow = toggle
// - Label click = applyLocation
// ============================================================
export async function buildFrontendSidebar(supabase) {
  if (!menu) return;

  menu.innerHTML = "Loading…";

  let payload;
  try {
    payload = await fetchNodesAndCounts(supabase);
  } catch (e) {
    console.error("❌ Sidebar fetch failed", e);
    menu.innerHTML = "Failed to load";
    return;
  }

  const tree = buildTree(payload.nodes, payload.counts);
  menu.innerHTML = "";

  Object.entries(tree)
    .sort(([a], [b]) => sortAZ(a, b))
    .forEach(([continent, cData]) => {
      // ---------- CONTINENT ----------
      const cont = createLine({
        type: "continent",
        label: continent,
        count: cData.count,
      });

      const contChildren = createChildren(true); // open default
      cont.classList.add("open");

      // arrow toggle
      cont.querySelector(".arrow")?.addEventListener("click", (e) => {
        e.stopPropagation();
        toggle(cont, contChildren);
      });

      // label click → location
      cont.addEventListener("click", () => {
        applyLocation({ continent, country: null, state: null, city: null });
      });

      menu.append(cont, contChildren);

      // ---------- COUNTRIES ----------
      Object.entries(cData.countries)
        .sort(([a], [b]) => sortAZ(a, b))
        .forEach(([country, coData]) => {
          const co = createLine({
            type: "country",
            label: country,
            count: coData.count,
            iso2: coData.iso2,
          });

          const coChildren = createChildren(false); // closed default

          // arrow toggle
          co.querySelector(".arrow")?.addEventListener("click", (e) => {
            e.stopPropagation();
            toggle(co, coChildren);
          });

          // label click → location
          co.addEventListener("click", () => {
            applyLocation({ continent, country, state: null, city: null });
          });

          contChildren.append(co, coChildren);

          const isUS = IS_US(coData.iso2);

          // ---------- USA ----------
          if (isUS) {
            Object.entries(coData.states)
              .sort(([a], [b]) => sortAZ(a, b))
              .forEach(([state, sData]) => {
                const st = createLine({
                  type: "state",
                  label: state,
                  count: sData.count,
                });

                const stChildren = createChildren(false);

                st.querySelector(".arrow")?.addEventListener("click", (e) => {
                  e.stopPropagation();
                  toggle(st, stChildren);
                });

                st.addEventListener("click", () => {
                  applyLocation({ continent, country, state, city: null });
                });

                coChildren.append(st, stChildren);

                Object.entries(sData.cities)
                  .sort(([a], [b]) => sortAZ(a, b))
                  .forEach(([city, count]) => {
                    const ct = createLine({
                      type: "city",
                      label: city,
                      count,
                    });

                    ct.addEventListener("click", () => {
                      applyLocation({ continent, country, state, city });
                    });

                    stChildren.append(ct);
                  });
              });

            return;
          }

          // ---------- NON-USA: cities ----------
          Object.entries(coData.cities)
            .sort(([a], [b]) => sortAZ(a, b))
            .forEach(([city, count]) => {
              const ct = createLine({
                type: "city",
                label: city,
                count,
              });

              ct.addEventListener("click", () => {
                applyLocation({ continent, country, state: null, city });
              });

              coChildren.append(ct);
            });
        });
    });

  updateActiveClasses();
}

// ============================================================
// UI HELPERS
// ============================================================
function createLine({ type, label, count, iso2 = null }) {
  const el = document.createElement("div");
  el.className = `line ${type}`;
  el.dataset.label = label;

  const flag =
    type === "country" && iso2
      ? `<img class="flag"
              src="assets/flags/${iso2.toLowerCase()}.svg"
              alt=""
              onerror="this.style.display='none'">`
      : "";

  el.innerHTML = `
    <span class="arrow">${type === "city" ? "•" : "▸"}</span>
    <span class="label-wrap">
      ${flag}
      <span class="label">${label}</span>
    </span>
    <span class="pill">${count}</span>
  `;

  return el;
}

function createChildren(show = false) {
  const el = document.createElement("div");
  el.className = "children" + (show ? " show" : "");
  return el;
}

function toggle(line, children) {
  const open = line.classList.toggle("open");
  children.classList.toggle("show", open);
}

function updateActiveClasses() {
  document.querySelectorAll("#sidebarMenu .line").forEach((el) => {
    const label = el.dataset.label;
    el.classList.toggle(
      "active",
      label === ACTIVE_PATH.continent ||
        label === ACTIVE_PATH.country ||
        label === ACTIVE_PATH.state ||
        label === ACTIVE_PATH.city
    );
  });
}
