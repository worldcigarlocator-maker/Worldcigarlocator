// ============================================================
// SIDEBAR.JS — WCL Hierarchy Navigation (CANONICAL, FIXED)
// ============================================================

import { setLocationFilter, runSearch } from "./cards.js";

const menu = document.querySelector("#sidebarMenu");

/* ============================================================
   INTERNAL STATE
   ============================================================ */
let ACTIVE = {
  continent: null,
  country: null,
  state: null,
  city: null,
};

/* ============================================================
   FETCH ALL ROWS
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
    if (!data || !data.length) break;

    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  return all;
}

/* ============================================================
   BUILD SIDEBAR
   ============================================================ */
export async function buildFrontendSidebar(supabase) {
  if (!menu) return;
  menu.innerHTML = "";

  const rows = await fetchAllSidebarRows(supabase);

  const tree = {};
  for (const r of rows) {
    const c = r.continent;
    const co = r.country;
    const s = r.state;
    const city = r.city;
    const n = Number(r.count || 0);

    tree[c] ??= { count: 0, countries: {} };
    tree[c].count += n;

    tree[c].countries[co] ??= { count: 0, states: {} };
    tree[c].countries[co].count += n;

    tree[c].countries[co].states[s] ??= { count: 0, cities: {} };
    tree[c].countries[co].states[s].count += n;

    tree[c].countries[co].states[s].cities[city] =
      (tree[c].countries[co].states[s].cities[city] || 0) + n;
  }

  Object.entries(tree).forEach(([continent, cData]) => {
    const cont = line("continent", continent, cData.count);
    const contBox = nested(true); // OPEN BY DEFAULT

    menu.append(cont, contBox);

    cont.onclick = () => activate({ continent });

    Object.entries(cData.countries).forEach(([country, coData]) => {
      const co = line("country", country, coData.count, country);
      const coBox = nested(false);

      contBox.append(co, coBox);

      co.onclick = (e) => {
        e.stopPropagation();
        toggle(coBox);
        activate({ continent, country });
      };

      Object.entries(coData.states).forEach(([state, sData]) => {
        const st = line("state", state, sData.count);
        const stBox = nested(false);

        coBox.append(st, stBox);

        st.onclick = (e) => {
          e.stopPropagation();
          toggle(stBox);
          activate({ continent, country, state });
        };

        Object.entries(sData.cities).forEach(([city, count]) => {
          const ci = line("city", city, count);

          ci.onclick = (e) => {
            e.stopPropagation();
            activate({ continent, country, state, city });
          };

          stBox.append(ci);
        });
      });
    });
  });
}

/* ============================================================
   LINE BUILDER — THIS IS THE KEY FIX
   ============================================================ */
function line(type, label, count, countryCode = null) {
  const el = document.createElement("div");
  el.className = `line ${type}`;

  el.innerHTML = `
    <div class="left">
      ${type !== "city" ? `<span class="arrow">▸</span>` : `<span class="dot">•</span>`}
      ${countryCode ? `<img class="flag" src="assets/flags/${countryCode.toLowerCase()}.svg">` : ``}
      <span class="label">${label}</span>
    </div>
    <span class="pill">${count}</span>
  `;

  return el;
}

/* ============================================================
   NESTED CONTAINER (NO X-INDENT)
   ============================================================ */
function nested(open) {
  const el = document.createElement("div");
  el.className = "nested";
  if (open) el.classList.add("show");
  return el;
}

/* ============================================================
   TOGGLE (VISUAL ONLY)
   ============================================================ */
function toggle(box) {
  box.classList.toggle("show");
}

/* ============================================================
   ACTIVATE (GOLD CHAIN)
   ============================================================ */
function activate(next) {
  ACTIVE = { continent: null, country: null, state: null, city: null, ...next };

  document.querySelectorAll("#sidebarMenu .line").forEach((l) =>
    l.classList.remove("active")
  );

  Object.entries(ACTIVE).forEach(([k, v]) => {
    if (!v) return;
    document
      .querySelectorAll(`#sidebarMenu .${k} .label`)
      .forEach((el) => {
        if (el.textContent === v) el.closest(".line").classList.add("active");
      });
  });

  setLocationFilter(ACTIVE);
  runSearch();
}
