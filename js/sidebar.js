import { supabase, qs } from "./globals.js";

/* ============================================================
   TOGGLE HELPERS
============================================================ */
function toggleNested(btn, box, onOpen) {
  const isOpen = box.classList.toggle("show");
  btn.classList.toggle("open", isOpen);

  const arrow = btn.querySelector(".arrow");
  if (arrow) arrow.style.transform = isOpen ? "rotate(90deg)" : "rotate(0deg)";

  if (isOpen && typeof onOpen === "function") onOpen();
}

/* ============================================================
   CONTINENT DETECTOR
============================================================ */
function getContinent(country) {
  if (!country) return "Other";
  const c = country.toLowerCase();

  if (["usa", "united states", "canada", "mexico"].some(x => c.includes(x)))
    return "North America";

  if (
    ["sweden","germany","france","uk","spain","italy","norway","poland","denmark"]
      .some(x => c.includes(x))
  )
    return "Europe";

  if (["china","japan","korea","india","thailand","vietnam"].some(x=>c.includes(x)))
    return "Asia";

  if (["south africa","nigeria","egypt"].some(x=>c.includes(x)))
    return "Africa";

  if (["australia","new zealand"].some(x=>c.includes(x)))
    return "Oceania";

  if (["brazil","argentina","chile"].some(x=>c.includes(x)))
    return "South America";

  return "Other";
}

/* ============================================================
   BUILD SIDEBAR
============================================================ */
export function buildFrontendSidebar(supabaseClient, loadStores) {

  const menu = qs("sidebarMenu");
  if (!menu) return;

  menu.innerHTML = `<li style="color:#888">Loading…</li>`;

  supabaseClient
    .from("stores_frontend_public_v4")
    .select("id,name,country,city")
    .then(({ data, error }) => {
      if (error || !data) {
        console.error("Sidebar load error:", error);
        menu.innerHTML = `<li style="color:#f33">Failed to load</li>`;
        return;
      }

      const tree = {};

      // Build tree structure
      data.forEach(s => {
        const cont = getContinent(s.country);
        tree[cont] ??= {};
        tree[cont][s.country] ??= {};
        tree[cont][s.country][s.city] ??= [];
        tree[cont][s.country][s.city].push(s);
      });

      menu.innerHTML = "";

      // Render
      Object.entries(tree).forEach(([continent, countries]) => {

        /* ------- CONTINENT ROW ------- */
        const contBtn = document.createElement("button");
        contBtn.className = "line continent";

        const total = Object.values(countries)
          .reduce((sum, cityMap) =>
            sum +
            Object.values(cityMap).reduce((n, arr) => n + arr.length, 0),
          0);

        contBtn.innerHTML = `
          <span class="arrow">▶</span>
          <span class="label">${continent}</span>
          <span class="pill">${total}</span>
        `;

        const contBox = document.createElement("div");
        contBox.className = "nested";

        contBtn.onclick = (e) => {
          e.stopPropagation();
          toggleNested(contBtn, contBox, () => loadStores({ continent }));
        };

        /* ------- COUNTRIES ------- */
        Object.entries(countries).forEach(([country, cities]) => {
          const cBtn = document.createElement("button");
          cBtn.className = "line country";

          const count = Object.values(cities)
            .reduce((n, arr) => n + arr.length, 0);

          cBtn.innerHTML = `
            <span class="arrow">▶</span>
            <span class="label">${country}</span>
            <span class="pill">${count}</span>
          `;

          const cBox = document.createElement("div");
          cBox.className = "nested";

          cBtn.onclick = (e) => {
            e.stopPropagation();
            toggleNested(cBtn, cBox, () => loadStores({ country }));
          };

          /* ------- CITIES ------- */
          Object.entries(cities).forEach(([city, list]) => {
            const cityBtn = document.createElement("button");
            cityBtn.className = "line city";
            cityBtn.innerHTML = `
              <span class="label">${city}</span>
              <span class="pill">${list.length}</span>
            `;

            cityBtn.onclick = (e) => {
              e.stopPropagation();
              loadStores({ city });
            };

            cBox.appendChild(cityBtn);
          });

          contBox.appendChild(cBtn);
          contBox.appendChild(cBox);
        });

        menu.appendChild(contBtn);
        menu.appendChild(contBox);
      });
    });
}
