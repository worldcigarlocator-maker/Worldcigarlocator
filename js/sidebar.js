/* ============================================================
   sidebar.js — WCL Frontend Sidebar (NO MODULES)
   Exposes: window.buildFrontendSidebar
   Depends on: globals.js (WCL), cards.js (loadStores)
   ============================================================ */
(function () {
  "use strict";

  const WCL = window.WCL;
  if (!WCL || !WCL.supabase) {
    console.error("sidebar.js: WCL or supabase missing");
    return;
  }

  const menu = document.querySelector("#sidebarMenu");

  function countTotal(obj) {
    return Object.values(obj).reduce((sum, val) => {
      if (typeof val === "number") return sum + val;
      if (typeof val === "object" && val) return sum + countTotal(val);
      return sum;
    }, 0);
  }

  function createLine(type, label, count) {
    const el = document.createElement("li");
    el.className = `line ${type}`;
    el.innerHTML = `
      <span class="label">${label}</span>
      <span class="pill">${count}</span>
      ${type !== "city" ? `<span class="arrow">›</span>` : ""}
    `;
    return el;
  }

  function createNested() {
    const el = document.createElement("ul");
    el.className = "nested";
    return el;
  }

  function toggle(clickedItem, clickedNested, selector) {
    const allItems = document.querySelectorAll(selector);
    const allNesteds = Array.from(allItems).map((i) => i.nextElementSibling);

    allItems.forEach((item, i) => {
      const nest = allNesteds[i];
      if (!nest) return;

      if (item === clickedItem) {
        const isOpen = item.classList.contains("open");
        item.classList.toggle("open", !isOpen);
        nest.classList.toggle("show", !isOpen);
      } else {
        item.classList.remove("open");
        nest.classList.remove("show");
      }
    });
  }

  async function buildFrontendSidebar(supabaseClient, loadFunc) {
    if (!menu) return;

    menu.innerHTML = "<li class='muted'>Loading…</li>";

    const { data, error } = await supabaseClient
      .from("stores_frontend_public_v4")
      .select("id, continent, country, city")
      .order("continent")
      .order("country")
      .order("city");

    if (error) {
      console.error(error);
      menu.innerHTML = "<li class='error'>Failed to load menu.</li>";
      return;
    }

    // Dedup by id
    const uniqueStores = Array.from(new Map((data || []).map((s) => [s.id, s])).values());

    // Build tree
    const tree = {};
    uniqueStores.forEach((row) => {
      const { continent, country, city } = row;
      if (!continent || !country) return;

      if (!tree[continent]) tree[continent] = {};
      if (!tree[continent][country]) tree[continent][country] = {};

      if (city) {
        tree[continent][country][city] = (tree[continent][country][city] || 0) + 1;
      }
    });

    // Render
    menu.innerHTML = "";

    Object.entries(tree).forEach(([continent, countries]) => {
      const continentCount = countTotal(countries);
      const contItem = createLine("continent", continent, continentCount);
      const contNested = createNested();

      menu.append(contItem, contNested);

      contItem.addEventListener("click", () => {
        toggle(contItem, contNested, ".continent");
        loadFunc({ continent }, "");
      });

      Object.entries(countries).forEach(([country, cities]) => {
        const countryCount = countTotal(cities);
        const countryItem = createLine("country", country, countryCount);
        const countryNested = createNested();

        contNested.append(countryItem, countryNested);

        countryItem.addEventListener("click", (e) => {
          e.stopPropagation();
          toggle(countryItem, countryNested, ".country");
          loadFunc({ country }, "");
        });

        Object.entries(cities).forEach(([city, count]) => {
          const cityItem = createLine("city", city, count);

          cityItem.addEventListener("click", (e) => {
            e.stopPropagation();
            loadFunc({ city }, "");
          });

          countryNested.append(cityItem);
        });
      });
    });
  }

  window.buildFrontendSidebar = buildFrontendSidebar;
  console.log("✅ sidebar.js loaded");
})();
