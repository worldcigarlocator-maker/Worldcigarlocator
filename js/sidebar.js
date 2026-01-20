// ============================================================
// SIDEBAR.JS — WCL Sidebar (CANONICAL v1)
// DOM-first · Count-safe · Backend-neutral
// ============================================================

import { setLocationFilter, runSearch } from "./cards.js";

const menu = document.querySelector("#sidebarMenu");

/* ============================================================
   ACTIVE PATH (frontend only)
   ============================================================ */
let ACTIVE_PATH = {
  continent: null,
  country: null,
  state: null,
  city: null,
};

/* ============================================================
   FETCH — READ ONLY
   ============================================================ */
async function fetchSidebarData(supabase) {
  const { data, error } = await supabase
    .rpc("sidebar_hierarchy_v1"); // 🔒 canonical read

  if (error) throw error;
  return data;
}

/* ============================================================
   APPLY LOCATION
   ============================================================ */
function applyLocation(next) {
  ACTIVE_PATH = { ...ACTIVE_PATH, ...next };
  setLocationFilter(ACTIVE_PATH);
  runSearch();
  updateActiveClasses();
}

/* ============================================================
   BUILD SIDEBAR
   ============================================================ */
export async function buildFrontendSidebar(supabase) {
  if (!menu) return;

  menu.innerHTML = "Loading…";

  let rows;
  try {
    rows = await fetchSidebarData(supabase);
  } catch (e) {
    console.error("Sidebar RPC failed", e);
    menu.innerHTML = "Failed to load";
    return;
  }

  menu.innerHTML = "";

  let lastContinent = null;
  let lastCountry = null;
  let lastState = null;

  let continentChildren, countryChildren, stateChildren;

  rows.forEach(r => {
    const { continent, country, state, city, count, country_iso2 } = r;

    // -------- CONTINENT ----------
    if (continent !== lastContinent) {
      const cont = createLine("continent", continent, count);
      cont.classList.add("open");

      continentChildren = createChildren(true);

      cont.addEventListener("click", () =>
        applyLocation({ continent, country: null, state: null, city: null })
      );

      menu.append(cont, continentChildren);

      lastContinent = continent;
      lastCountry = null;
      lastState = null;
    }

    // -------- COUNTRY ----------
    if (country !== lastCountry) {
      const co = createLine("country", country, count, country_iso2);
      countryChildren = createChildren();

      co.querySelector(".arrow").addEventListener("click", e => {
        e.stopPropagation();
        toggle(co, countryChildren);
      });

      co.addEventListener("click", () =>
        applyLocation({ continent, country, state: null, city: null })
      );

      continentChildren.append(co, countryChildren);

      lastCountry = country;
      lastState = null;
    }

    // -------- STATE ----------
    if (state !== lastState) {
      const st = createLine("state", state, count);
      stateChildren = createChildren();

      st.querySelector(".arrow").addEventListener("click", e => {
        e.stopPropagation();
        toggle(st, stateChildren);
      });

      st.addEventListener("click", () =>
        applyLocation({ continent, country, state, city: null })
      );

      countryChildren.append(st, stateChildren);

      lastState = state;
    }

    // -------- CITY ----------
    const ct = createLine("city", city, count);
    ct.addEventListener("click", () =>
      applyLocation({ continent, country, state, city })
    );

    stateChildren.append(ct);
  });

  updateActiveClasses();
}

/* ============================================================
   LINE FACTORY — DOM 3.3 EXACT
   ============================================================ */
function createLine(type, label, count, iso2 = null) {
  const el = document.createElement("div");
  el.className = `line ${type}`;
  el.dataset.label = label;

  const flag =
    type === "country" && iso2
      ? `<img class="flag" src="assets/flags/${iso2.toLowerCase()}.svg"
              alt="" onerror="this.remove()">`
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

/* ============================================================
   CHILDREN CONTAINER
   ============================================================ */
function createChildren(show = false) {
  const el = document.createElement("div");
  el.className = "children" + (show ? " show" : "");
  return el;
}

/* ============================================================
   TOGGLE (arrow only)
   ============================================================ */
function toggle(line, children) {
  const open = line.classList.toggle("open");
  children.classList.toggle("show", open);
}

/* ============================================================
   ACTIVE PATH HIGHLIGHT
   ============================================================ */
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
