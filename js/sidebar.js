// ============================================================
// SIDEBAR.JS — WCL Sidebar (CANONICAL, NODE-DRIVEN)
// ------------------------------------------------------------
// DATA:
// - Structure: sidebar_nodes_v1 (flat, ALL cities)
// - Counts: sidebar_hierarchy_v1 (aggregated, trusted)
//
// RULES:
// - USA: Country → State → City
// - Rest: Country → City
// - Sidebar sets LOCATION as master (LAW)
// ============================================================

console.log("✅ SIDEBAR.JS LOADED (nodes_v1)");

import { activateLocation } from "./cards.js";

const menu = document.querySelector("#sidebarMenu");

// ============================================================
// UI STATE (only for highlighting)
// ============================================================
let ACTIVE_PATH = {
  continent: null,
  country: null,
  state: null,
  city: null,
};

// ============================================================
// HELPERS
// ============================================================
const sortAZ = (a, b) =>
  String(a).localeCompare(String(b), undefined, { sensitivity: "base" });

const IS_US = (iso2) => String(iso2 || "").toUpperCase() === "US";

// ============================================================
// FETCH DATA
// ============================================================
async function fetchNodes(supabase) {
  const { data, error } = await supabase
    .from("sidebar_nodes_v1")
    .select("*");

  if (error) throw error;
  return data || [];
}

async function fetchCounts(supabase) {
  const { data, error } = await supabase.rpc("sidebar_hierarchy_v1");
  if (error) throw error;
  return data || [];
}

// ============================================================
// BUILD TREE (NO AGGREGATION, PURE STRUCTURE)
// ============================================================
function buildTree(nodes, counts) {
  const tree = {};

  // ---- preload counts lookup ----
  const countMap = {};
  counts.forEach(r => {
 const norm = (v) => v ?? "";

const key = [
  norm(r.continent),
  norm(r.country),
  norm(r.state),
  norm(r.city),
  r.level
].join("|");

    countMap[key] = Number(r.count || 0);
  });

 const getCount = (continent, country, state, city, level) =>
  countMap[
    [
      continent ?? "",
      country ?? "",
      state ?? "",
      city ?? "",
      level
    ].join("|")
  ] || 0;


  // ---- build nodes ----
  nodes.forEach(n => {
    const { continent, country, country_iso2, state, city } = n;
    if (!continent || !country || !city) return;

    tree[continent] ??= {
      count: getCount(continent, null, null, null, "continent"),
      countries: {}
    };

    tree[continent].countries[country] ??= {
      iso2: country_iso2 || null,
      count: getCount(continent, country, null, null, "country"),
      states: {},
      cities: {}
    };

    const isUS = IS_US(country_iso2);

    if (isUS && state) {
      tree[continent].countries[country].states[state] ??= {
        count: getCount(continent, country, state, null, "state"),
        cities: {}
      };

      tree[continent].countries[country].states[state].cities[city] =
        getCount(continent, country, state, city, "city");
    } else {
      tree[continent].countries[country].cities[city] =
        getCount(continent, country, null, city, "city");
    }
  });

  return tree;
}

// ============================================================
// APPLY LOCATION (LAW)
// ============================================================
function applyLocation(next) {
  ACTIVE_PATH = { ...ACTIVE_PATH, ...next };
  activateLocation(ACTIVE_PATH);
  updateActiveClasses();
}

// ============================================================
// BUILD SIDEBAR
// ============================================================
export async function buildFrontendSidebar(supabase) {
  if (!menu) return;

  console.log("🧱 SIDEBAR BUILD START");
  menu.innerHTML = "Loading…";

  let nodes, counts;
  try {
    [nodes, counts] = await Promise.all([
      fetchNodes(supabase),
      fetchCounts(supabase)
    ]);
  } catch (e) {
    console.error("Sidebar load failed", e);
    menu.innerHTML = "Failed to load";
    return;
  }

  const tree = buildTree(nodes, counts);
  menu.innerHTML = "";

  Object.entries(tree)
    .sort(([a], [b]) => sortAZ(a, b))
    .forEach(([continent, cData]) => {
      const cont = createLine({
        type: "continent",
        label: continent,
        count: cData.count
      });

      const contChildren = createChildren(true);
      cont.classList.add("open");

      cont.onclick = () =>
        applyLocation({ continent, country: null, state: null, city: null });

      menu.append(cont, contChildren);

      Object.entries(cData.countries)
        .sort(([a], [b]) => sortAZ(a, b))
        .forEach(([country, coData]) => {
          const co = createLine({
            type: "country",
            label: country,
            count: coData.count,
            iso2: coData.iso2
          });

          const coChildren = createChildren();

          co.querySelector(".arrow")?.addEventListener("click", e => {
            e.stopPropagation();
            toggle(co, coChildren);
          });

          co.onclick = () =>
            applyLocation({ continent, country, state: null, city: null });

          contChildren.append(co, coChildren);

          // 🇺🇸 USA
          if (IS_US(coData.iso2)) {
            Object.entries(coData.states)
              .sort(([a], [b]) => sortAZ(a, b))
              .forEach(([state, sData]) => {
                const st = createLine({
                  type: "state",
                  label: state,
                  count: sData.count
                });

                const stChildren = createChildren();

                st.querySelector(".arrow")?.addEventListener("click", e => {
                  e.stopPropagation();
                  toggle(st, stChildren);
                });

                st.onclick = () =>
                  applyLocation({ continent, country, state, city: null });

                coChildren.append(st, stChildren);

                Object.entries(sData.cities)
                  .sort(([a], [b]) => sortAZ(a, b))
                  .forEach(([city, count]) => {
                    const ct = createLine({
                      type: "city",
                      label: city,
                      count
                    });

                    ct.onclick = () =>
                      applyLocation({ continent, country, state, city });

                    stChildren.append(ct);
                  });
              });
            return;
          }

          // 🌍 Rest of world
          Object.entries(coData.cities)
            .sort(([a], [b]) => sortAZ(a, b))
            .forEach(([city, count]) => {
              const ct = createLine({
                type: "city",
                label: city,
                count
              });

              ct.onclick = () =>
                applyLocation({ continent, country, state: null, city });

              coChildren.append(ct);
            });
        });
    });

  updateActiveClasses();
  console.log("✅ SIDEBAR BUILD DONE");
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
      ? `<img class="flag" src="assets/flags/${iso2.toLowerCase()}.svg"
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
  document
    .querySelectorAll("#sidebarMenu .line")
    .forEach(el => {
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

