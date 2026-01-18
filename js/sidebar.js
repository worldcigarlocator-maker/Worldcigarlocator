// ============================================================
// SIDEBAR.JS — WCL Hierarchy Navigation (CANONICAL v2)
// One-column hierarchy: chevron + flag + label | count right
// ============================================================

import { setLocationFilter, runSearch } from "./cards.js";

const menu = document.querySelector("#sidebarMenu");

let ACTIVE_PATH = {
  continent: null,
  country: null,
  state: null,
  city: null,
};

// ------------------------------------------------------------
// FETCH ALL ROWS
// ------------------------------------------------------------
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

// ------------------------------------------------------------
// BUILD SIDEBAR
// ------------------------------------------------------------
export async function buildFrontendSidebar(supabase) {
  if (!menu) return;
  menu.innerHTML = "Loading…";

  const rows = await fetchAllSidebarRows(supabase);

  const tree = {};

  for (const r of rows) {
    const c = r.continent ?? "Unknown";
    const co = r.country ?? "Unknown";
    const s = r.state ?? "Unknown";
    const ci = r.city ?? "Unknown";
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

  menu.innerHTML = "";

  Object.entries(tree).forEach(([continent, cData]) => {
    const cont = line("continent", continent, cData.count);
    const contNest = nest();
    menu.append(cont, contNest);

    cont.onclick = () => {
      ACTIVE_PATH = { continent, country: null, state: null, city: null };
      setLocationFilter({ continent });
      runSearch();
      cont.classList.toggle("open");
      contNest.classList.toggle("show");
      renderActive();
    };

    Object.entries(cData.countries).forEach(([country, coData]) => {
      const co = line("country", country, coData.count, country);
      const coNest = nest();
      contNest.append(co, coNest);

      co.onclick = (e) => {
        e.stopPropagation();
        ACTIVE_PATH = { continent, country, state: null, city: null };
        setLocationFilter({ continent, country });
        runSearch();
        co.classList.toggle("open");
        coNest.classList.toggle("show");
        renderActive();
      };

      Object.entries(coData.states).forEach(([state, sData]) => {
        const st = line("state", state, sData.count);
        const stNest = nest();
        coNest.append(st, stNest);

        st.onclick = (e) => {
          e.stopPropagation();
          ACTIVE_PATH = { continent, country, state, city: null };
          setLocationFilter({ continent, country, state });
          runSearch();
          st.classList.toggle("open");
          stNest.classList.toggle("show");
          renderActive();
        };

        Object.entries(sData.cities).forEach(([city, count]) => {
          const ci = line("city", city, count);
          stNest.append(ci);

          ci.onclick = (e) => {
            e.stopPropagation();
            ACTIVE_PATH = { continent, country, state, city };
            setLocationFilter({ continent, country, state, city });
            runSearch();
            renderActive();
          };
        });
      });
    });
  });

  renderActive();
}

// ------------------------------------------------------------
// UI HELPERS
// ------------------------------------------------------------
function line(type, label, count, countryForFlag) {
  const el = document.createElement("div");
  el.className = `line ${type}`;
  el.innerHTML = `
    <span class="chevron">${type !== "city" ? "▸" : "•"}</span>
    ${countryForFlag ? `<img class="flag" src="assets/flags/${countryForFlag.toLowerCase().slice(0,2)}.svg" />` : ""}
    <span class="label">${label}</span>
    <span class="count">${count}</span>
  `;
  return el;
}

function nest() {
  const d = document.createElement("div");
  d.className = "nested";
  return d;
}

// ------------------------------------------------------------
// ACTIVE PATH COLORING
// ------------------------------------------------------------
function renderActive() {
  document.querySelectorAll("#sidebarMenu .line").forEach((l) => {
    l.classList.remove("active");
    if (
      l.textContent.includes(ACTIVE_PATH.city) ||
      l.textContent.includes(ACTIVE_PATH.state) ||
      l.textContent.includes(ACTIVE_PATH.country) ||
      l.textContent.includes(ACTIVE_PATH.continent)
    ) {
      l.classList.add("active");
    }
  });
}
