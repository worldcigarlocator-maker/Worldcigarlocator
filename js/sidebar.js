// ============================================================
// SIDEBAR.JS — WCL Canonical Hierarchy Navigation (V2)
// - 2-column grid rows (left: icon/flag/label, right: count)
// - NO indentation at deeper levels (vertical-only hierarchy)
// - Continents OPEN by default (but collapsible)
// - Active chain: continent + country + state + city all gold
// - Backend RPC is single source of truth
// ============================================================

console.log("🚨 sidebar.js loaded (CANONICAL V2)");

import { setLocationFilter, runSearch } from "./cards.js";

const dom  = (sel) => document.querySelector(sel);
const menu = dom("#sidebarMenu");

let LAST_LOCATION = { continent: null, country: null, state: null, city: null };

function sameLocation(a, b) {
  return a.continent === b.continent &&
         a.country   === b.country &&
         a.state     === b.state &&
         a.city      === b.city;
}

function applyLocation(next) {
  const normalized = {
    continent: next.continent ?? null,
    country:   next.country   ?? null,
    state:     next.state     ?? null,
    city:      next.city      ?? null,
  };

  if (sameLocation(LAST_LOCATION, normalized)) return;

  LAST_LOCATION = normalized;
  setLocationFilter(normalized);
  runSearch();
}

// ------------------------------------------------------------
// Fetch ALL sidebar rows (bypass 1000 cap)
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
// Build tree (continent -> country -> state -> city)
// and keep iso2 per country if available from rows
// ------------------------------------------------------------
function buildTree(rows) {
  const tree = {};

  for (const r of rows) {
    const continent = r.continent ?? "Unknown";
    const country   = r.country   ?? "Unknown";
    const state     = r.state     ?? "Unknown";
    const city      = r.city      ?? "Unknown";
    const count     = Number(r.count || 0);

    // Optional: if your RPC returns iso2, use it. Otherwise we just render without flag.
    const iso2 = (r.country_iso2 || r.iso2 || null);

    if (!tree[continent]) tree[continent] = { count: 0, countries: {} };
    tree[continent].count += count;

    if (!tree[continent].countries[country]) {
      tree[continent].countries[country] = { count: 0, iso2, states: {} };
    }
    tree[continent].countries[country].count += count;

    // Keep first non-null iso2
    if (!tree[continent].countries[country].iso2 && iso2) {
      tree[continent].countries[country].iso2 = iso2;
    }

    if (!tree[continent].countries[country].states[state]) {
      tree[continent].countries[country].states[state] = { count: 0, cities: {} };
    }
    tree[continent].countries[country].states[state].count += count;

    tree[continent].countries[country].states[state].cities[city] =
      (tree[continent].countries[country].states[state].cities[city] || 0) + count;
  }

  return tree;
}

// ------------------------------------------------------------
// Render helpers
// ------------------------------------------------------------
function flagUrlFromIso2(iso2) {
  if (!iso2) return null;
  return `assets/flags/${String(iso2).toLowerCase()}.svg`;
}

function createRow({ level, id, parentId, label, count, hasChildren, iso2 }) {
  const row = document.createElement("div");
  row.className = `line ${level}`;
  row.dataset.id = id;
  if (parentId) row.dataset.parent = parentId;

  const left = document.createElement("div");
  left.className = "cell-left";

  const icon = document.createElement("span");
  icon.className = "icon";

  // icon choice
  if (level === "city") icon.textContent = "•";
  else icon.textContent = hasChildren ? "▸" : "•";

  left.appendChild(icon);

  // country flag
  if (level === "country") {
    const url = flagUrlFromIso2(iso2);
    if (url) {
      const img = document.createElement("img");
      img.className = "flag";
      img.src = url;
      img.alt = "";
      img.onerror = () => { img.remove(); };
      left.appendChild(img);
    }
  }

  const name = document.createElement("span");
  name.className = "label";
  name.textContent = label;

  left.appendChild(name);

  const right = document.createElement("div");
  right.className = "count";
  right.textContent = String(count);

  row.appendChild(left);
  row.appendChild(right);

  return row;
}

function createChildrenContainer() {
  const box = document.createElement("div");
  box.className = "children";
  return box;
}

// ------------------------------------------------------------
// Active chain (gold up the parents)
// ------------------------------------------------------------
function clearActive(root) {
  root.querySelectorAll(".line.active").forEach((el) => el.classList.remove("active"));
}

function setActiveChain(root, lineEl) {
  clearActive(root);

  let cur = lineEl;
  while (cur) {
    cur.classList.add("active");
    const pid = cur.dataset.parent;
    cur = pid ? root.querySelector(`.line[data-id="${CSS.escape(pid)}"]`) : null;
  }
}

// ------------------------------------------------------------
// Toggle open/close (ONLY for elements with children container)
// Continents OPEN by default after render
// ------------------------------------------------------------
function setOpen(lineEl, childrenEl, isOpen) {
  lineEl.classList.toggle("open", isOpen);

  // chevron arrow state
  const icon = lineEl.querySelector(".icon");
  if (icon && !lineEl.classList.contains("city")) {
    icon.textContent = isOpen ? "▾" : "▸";
  }

  childrenEl.classList.toggle("show", isOpen);
}

// ------------------------------------------------------------
// Build sidebar (public)
// ------------------------------------------------------------
export async function buildFrontendSidebar(supabase) {
  if (!menu) return;

  menu.innerHTML = "Loading…";

  let rows = [];
  try {
    rows = await fetchAllSidebarRows(supabase);
  } catch (e) {
    console.error("❌ Sidebar RPC error:", e);
    menu.innerHTML = "Failed to load sidebar.";
    return;
  }

  const tree = buildTree(rows);

  // Clear
  menu.innerHTML = "";

  // Render continents
  for (const [continent, cData] of Object.entries(tree)) {
    const contId = `continent:${continent}`;

    const contRow = createRow({
      level: "continent",
      id: contId,
      parentId: null,
      label: continent,
      count: cData.count,
      hasChildren: true,
      iso2: null
    });

    const contChildren = createChildrenContainer();

    menu.appendChild(contRow);
    menu.appendChild(contChildren);

    // Countries
    for (const [country, coData] of Object.entries(cData.countries)) {
      const countryId = `country:${continent}:${country}`;

      const countryRow = createRow({
        level: "country",
        id: countryId,
        parentId: contId,
        label: country,
        count: coData.count,
        hasChildren: true,
        iso2: coData.iso2
      });

      const countryChildren = createChildrenContainer();

      contChildren.appendChild(countryRow);
      contChildren.appendChild(countryChildren);

      // States
      for (const [state, sData] of Object.entries(coData.states)) {
        const stateId = `state:${continent}:${country}:${state}`;

        const stateRow = createRow({
          level: "state",
          id: stateId,
          parentId: countryId,
          label: state,
          count: sData.count,
          hasChildren: true,
          iso2: null
        });

        const stateChildren = createChildrenContainer();

        countryChildren.appendChild(stateRow);
        countryChildren.appendChild(stateChildren);

        // Cities
        for (const [city, cityCount] of Object.entries(sData.cities)) {
          const cityId = `city:${continent}:${country}:${state}:${city}`;

          const cityRow = createRow({
            level: "city",
            id: cityId,
            parentId: stateId,
            label: city,
            count: cityCount,
            hasChildren: false,
            iso2: null
          });

          stateChildren.appendChild(cityRow);

          cityRow.addEventListener("click", (e) => {
            e.stopPropagation();
            setActiveChain(menu, cityRow);
            applyLocation({ continent, country, state, city });
          });
        }

        stateRow.addEventListener("click", (e) => {
          e.stopPropagation();
          const isOpen = !stateRow.classList.contains("open");
          setOpen(stateRow, stateChildren, isOpen);

          setActiveChain(menu, stateRow);
          applyLocation({ continent, country, state, city: null });
        });
      }

      countryRow.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = !countryRow.classList.contains("open");
        setOpen(countryRow, countryChildren, isOpen);

        setActiveChain(menu, countryRow);
        applyLocation({ continent, country, state: null, city: null });
      });
    }

    contRow.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = !contRow.classList.contains("open");
      setOpen(contRow, contChildren, isOpen);

      setActiveChain(menu, contRow);
      applyLocation({ continent, country: null, state: null, city: null });
    });

    // ✅ Continents OPEN by default
    setOpen(contRow, contChildren, true);
  }

  // Default: no active selection initially (keeps hero behavior untouched)
  // If you WANT a default active continent, say so.
}
