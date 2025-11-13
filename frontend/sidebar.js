/* ============================================================
   FRONTEND SIDEBAR (v8)
   Hierarki: CONTINENT → COUNTRY → CITY
   ============================================================ */

import { getContinentFromCountry } from "./globals.js";
import { loadStores } from "./start.js";

/* Helper */
function el(tag, cls, html){
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

/* ============================================================
   Build hierarchical sidebar
   ============================================================ */
export async function buildFrontendSidebar() {

  const menu = document.getElementById("sidebarMenu");
  if (!menu) return;

  // loading placeholder
  menu.innerHTML = `<li style="color:#888;padding:6px 12px;">Loading…</li>`;

  // Load all stores (id, name, city, country)
  const { data, error } = await window.supabase
    .from("stores_public")
    .select("id, name, city, country, continent");

  if (error || !data) {
    menu.innerHTML = `<li style="color:#f55;padding:6px 12px;">Failed to load</li>`;
    return;
  }

  /* ============================================================
     Group stores → continent → country → city
     ============================================================ */
  const grouped = {};

  data.forEach((s) => {
    const cont = getContinentFromCountry(s.country);
    const country = s.country || "Unknown";
    const city = s.city || "Unknown";

    if (!grouped[cont]) grouped[cont] = {};
    if (!grouped[cont][country]) grouped[cont][country] = {};
    if (!grouped[cont][country][city]) grouped[cont][country][city] = [];

    grouped[cont][country][city].push(s);
  });

  /* ============================================================
     Render hierarchy
     ============================================================ */
  menu.innerHTML = "";

  Object.entries(grouped)
    .sort(([a],[b]) => a.localeCompare(b))
    .forEach(([continent, countries]) => {

      /* --- CONTINENT BUTTON --- */
      const countCont = Object.values(countries)
        .reduce((acc, ctry) => acc + Object.values(ctry).reduce((a,b)=>a+b.length,0), 0);

      const contBtn = el(
        "button",
        "line continent",
        `<span class="arrow">▶</span>
         <span class="label">${continent}</span>
         <span class="pill">${countCont}</span>`
      );

      const contNested = el("div", "nested");

      contBtn.addEventListener("click", () => {
        const opened = contNested.classList.toggle("show");
        contBtn.classList.toggle("open", opened);
        contBtn.querySelector(".arrow").style.transform =
          opened ? "rotate(90deg)" : "rotate(0deg)";

        if (opened) loadStores({ continent });
      });

      /* --- COUNTRIES --- */
      Object.entries(countries)
        .sort(([a],[b]) => a.localeCompare(b))
        .forEach(([country, cities]) => {

          const countCountry = Object.values(cities)
            .reduce((a,b) => a + b.length, 0);

          const cBtn = el(
            "button",
            "line country",
            `<span class="arrow">▶</span>
             <span class="label">${country}</span>
             <span class="pill">${countCountry}</span>`
          );

          const cityNested = el("div", "nested");

          cBtn.addEventListener("click", (ev) => {
            ev.stopPropagation();
            const opened = cityNested.classList.toggle("show");
            cBtn.classList.toggle("open", opened);
            cBtn.querySelector(".arrow").style.transform =
              opened ? "rotate(90deg)" : "rotate(0deg)";

            if (opened) loadStores({ country });
          });

          /* --- CITIES --- */
          Object.entries(cities)
            .sort(([,a],[,b]) => b.length - a.length)
            .forEach(([city, items]) => {

              const cityBtn = el(
                "button",
                "line city",
                `<span class="label">${city}</span>
                 <span class="pill">${items.length}</span>`
              );

              cityBtn.addEventListener("click", (ev) => {
                ev.stopPropagation();
                document.querySelector(".main").scrollIntoView({ behavior:"smooth" });
                loadStores({ city });
              });

              cityNested.appendChild(cityBtn);
            });

          contNested.appendChild(cBtn);
          contNested.appendChild(cityNested);
        });

      menu.appendChild(contBtn);
      menu.appendChild(contNested);
    });
}
