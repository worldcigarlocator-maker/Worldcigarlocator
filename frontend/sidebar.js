/* ============================================================
   sidebar.js — Frontend v8
   Build Continent → Country → City Browser
   Uses stores_public (lite, snabb, frontend-optimerad)
============================================================ */

import { getContinentFromCountry } from "./globals.js";

/* Quick helper */
function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

/* ------------------------------------------------------------
   MAIN EXPORT
------------------------------------------------------------ */
export async function buildFrontendSidebar(loadStoresFn) {
  const menu = document.getElementById("sidebarMenu");
  if (!menu) return;

  menu.innerHTML = `<li style="color:#888;padding:4px 8px;">Loading…</li>`;

  /* ============================================================
     1. Fetch only small dataset from stores_public
  ============================================================ */
  const { data, error } = await window.supabase
    .from("stores_public")
    .select("id, name, city, country");

  if (error || !data) {
    menu.innerHTML = `<li style="color:#f55">Failed to load</li>`;
    return;
  }

  /* ============================================================
     2. Group into continent → country → city
  ============================================================ */
  const grouped = {};

  data.forEach((s) => {
    const cont = getContinentFromCountry(s.country);
    if (!grouped[cont]) grouped[cont] = {};

    const country = s.country || "Unknown";
    if (!grouped[cont][country]) grouped[cont][country] = {};

    const city = s.city || "Unknown";
    if (!grouped[cont][country][city]) grouped[cont][country][city] = [];

    grouped[cont][country][city].push(s);
  });

  /* ============================================================
     3. Build sidebar DOM
  ============================================================ */
  menu.innerHTML = "";

  Object.entries(grouped)
    .sort(([a],[b]) => a.localeCompare(b))
    .forEach(([continent, countries]) => {

      /* --------- CONTINENT LINE --------- */
      const contBtn = el(
        "button",
        "line continent",
        `
          <span class="arrow">▶</span>
          <span class="label">${continent}</span>
          <span class="pill">${
            Object.values(countries).reduce(
              (acc, cities) => acc + Object.values(cities).reduce((a,b) => a + b.length, 0),
              0
            )
          }</span>
        `
      );

      const contWrap = el("div", "nested");

      contBtn.addEventListener("click", () => {
        const isOpen = contWrap.classList.toggle("show");
        contBtn.classList.toggle("open", isOpen);
        contBtn.querySelector(".arrow").style.transform = isOpen ? "rotate(90deg)" : "rotate(0deg)";

        if (isOpen) loadStoresFn({ continent });
      });

      /* --------- COUNTRIES --------- */
      Object.entries(countries)
        .sort(([a],[b]) => a.localeCompare(b))
        .forEach(([country, cities]) => {

          const countryBtn = el(
            "button",
            "line country",
            `
              <span class="arrow">▶</span>
              <span class="label">${country}</span>
              <span class="pill">${
                Object.values(cities).reduce((a,b) => a + b.length, 0)
              }</span>
            `
          );

          const cityWrap = el("div", "nested");

          countryBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const isOpen = cityWrap.classList.toggle("show");
            countryBtn.classList.toggle("open", isOpen);
            countryBtn.querySelector(".arrow").style.transform = isOpen ? "rotate(90deg)" : "rotate(0deg)";

            if (isOpen) loadStoresFn({ country });
          });

          /* --------- CITIES --------- */
          Object.entries(cities)
            .sort(([,a],[,b]) => b.length - a.length)
            .forEach(([city, arr]) => {

              const cityBtn = el(
                "button",
                "line city",
                `<span class="label">${city}</span><span class="pill">${arr.length}</span>`
              );

              cityBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                document.querySelector(".main").scrollIntoView({ behavior: "smooth" });
                loadStoresFn({ city });
              });

              cityWrap.appendChild(cityBtn);
            });

          contWrap.append(countryBtn, cityWrap);
        });

      menu.append(contBtn, contWrap);
    });
}
