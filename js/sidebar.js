// ============================================================
// SIDEBAR.JS — FLAT HIERARCHY (CANONICAL)
// Active path = gold (country → state → city)
// ============================================================

import { setLocationFilter, runSearch } from "./cards.js";

const menu = document.querySelector("#sidebarMenu");

let LAST_LOCATION = {
  continent: null,
  country: null,
  state: null,
  city: null
};

function applyLocation(next) {
  LAST_LOCATION = { ...LAST_LOCATION, ...next };
  setLocationFilter(LAST_LOCATION);
  runSearch();
  updateActivePath();
}

/* ============================================================
   FETCH DATA
   ============================================================ */
async function fetchAllSidebarRows(supabase) {
  const PAGE = 1000;
  let from = 0;
  let all = [];

  while (true) {
    const { data, error } = await supabase
      .rpc("sidebar_counts_frontend_v1")
      .range(from, from + PAGE - 1);

    if (error) throw error;
    all = all.concat(data || []);
    if (!data || data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

/* ============================================================
   BUILD SIDEBAR
   ============================================================ */
export async function buildFrontendSidebar(supabase) {
  if (!menu) return;
  menu.innerHTML = "Loading…";

  const data = await fetchAllSidebarRows(supabase);
  menu.innerHTML = "";

  const tree = {};

  for (const r of data) {
    const c = r.continent;
    const co = r.country;
    const s = r.state;
    const ci = r.city;
    const n = Number(r.count || 0);

    tree[c] ??= { count: 0, countries: {} };
    tree[c].count += n;

    tree[c].countries[co] ??= { count: 0, states: {} };
    tree[c].countries[co].count += n;

    tree[c].countries[co].states[s] ??= { count: 0, cities: {} };
    tree[c].countries[co].states[s].count += n;

    tree[c].countries[co].states[s].cities[ci] =
      (tree[c].countries[co].states[s].cities[ci] || 0) + n;
  }

  Object.entries(tree).forEach(([continent, cData]) => {
    const contLine = createLine("continent", continent, cData.count);
    const contNested = createNested();
    menu.append(contLine, contNested);

    Object.entries(cData.countries).forEach(([country, coData]) => {
      const countryLine = createLine("country", country, coData.count);
      const countryNested = createNested();
      contNested.append(countryLine, countryNested);

      countryLine.onclick = () => {
        toggle(countryLine, countryNested, ".country");
        applyLocation({ continent, country, state: null, city: null });
        countryNested.classList.add("group-active");
      };

      Object.entries(coData.states).forEach(([state, sData]) => {
        const stateLine = createLine("state", state, sData.count);
        const stateNested = createNested();
        countryNested.append(stateLine, stateNested);

        stateLine.onclick = (e) => {
          e.stopPropagation();
          toggle(stateLine, stateNested, ".state");
          applyLocation({ continent, country, state, city: null });
        };

        Object.entries(sData.cities).forEach(([city, count]) => {
          const cityLine = createLine("city", city, count);
          stateNested.append(cityLine);

          cityLine.onclick = (e) => {
            e.stopPropagation();
            applyLocation({ continent, country, state, city });
          };
        });
      });
    });
  });
}

/* ============================================================
   HELPERS
   ============================================================ */
function createLine(type, label, count) {
  const el = document.createElement("div");
  el.className = `line ${type}`;
  el.dataset.type = type;
  el.dataset.label = label;
  el.innerHTML = `
    <span class="arrow">${type === "city" ? "•" : "▸"}</span>
    <span class="label">${label}</span>
    <span class="pill">${count}</span>
  `;
  return el;
}

function createNested() {
  const el = document.createElement("div");
  el.className = "nested";
  return el;
}

function toggle(item, nested, selector) {
  document.querySelectorAll(selector).forEach((i) => {
    const n = i.nextElementSibling;
    if (i !== item) {
      i.classList.remove("open");
      n?.classList.remove("show", "group-active");
    }
  });

  item.classList.toggle("open");
  nested.classList.toggle("show");
}

/* ============================================================
   ACTIVE PATH HIGHLIGHT
   ============================================================ */
function updateActivePath() {
  document.querySelectorAll("#sidebarMenu .line").forEach((el) => {
    const t = el.dataset.type;
    const v = el.dataset.label;

    let active = false;
    if (t === "country" && v === LAST_LOCATION.country) active = true;
    if (t === "state" && v === LAST_LOCATION.state) active = true;
    if (t === "city" && v === LAST_LOCATION.city) active = true;

    el.classList.toggle("active", active);
  });
}
