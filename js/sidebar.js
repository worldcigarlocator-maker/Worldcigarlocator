// ============================================================
// SIDEBAR PREMIUM 2.0 — Continent → Country → City
// Smooth animations, arrow rotation, auto-scroll on open
// ============================================================

import { getContinent } from "./globals.js";

// ------------------------------------------------------------
// Smooth Toggle Helper
// ------------------------------------------------------------
function toggleNested(btn, wrapper, loadCallback) {
  const isOpen = wrapper.classList.toggle("show");
  btn.classList.toggle("open", isOpen);

  const arrow = btn.querySelector(".arrow");
  if (arrow) {
    arrow.style.transform = isOpen ? "rotate(90deg)" : "rotate(0deg)";
  }

  if (isOpen) {
    if (typeof loadCallback === "function") loadCallback();

    setTimeout(() => {
      btn.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 120);
  }
}

// ============================================================
// BUILD SIDEBAR
// ============================================================
export function buildFrontendSidebar(supabase, loadStores) {
  const menu = document.getElementById("sidebarMenu");
  if (!menu) return;

  menu.innerHTML = `<li style="color:#999">Loading…</li>`;

  supabase
    .from("stores_frontend_public_v4")
    .select("id,name,country,city")
    .then(({ data, error }) => {
      if (error || !data) {
        console.error("Sidebar error:", error);
        menu.innerHTML = `<li style="color:#f55">Failed to load.</li>`;
        return;
      }

      // ------------------------------------------
      // BUILD HIERARCHY
      // continent → country → city → stores
      // ------------------------------------------

      const grouped = {};

      data.forEach((s) => {
        const country = s.country || "Unknown";
        const continent = getContinent(country);

        if (!grouped[continent]) grouped[continent] = {};
        if (!grouped[continent][country]) grouped[continent][country] = {};

        const city = s.city || "Unknown";
        if (!grouped[continent][country][city])
          grouped[continent][country][city] = [];

        grouped[continent][country][city].push(s);
      });

      // ------------------------------------------
      // RENDER CONTINENTS
      // ------------------------------------------

      menu.innerHTML = "";

      Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([continent, countries]) => {
          const contBtn = document.createElement("button");
          contBtn.className = "line continent";

          // total stores in continent
          const total = Object.values(countries).reduce(
            (sum, cities) =>
              sum +
              Object.values(cities).reduce((acc, list) => acc + list.length, 0),
            0
          );

          contBtn.innerHTML = `
            <span class="arrow">▶</span>
            <span class="label">${continent}</span>
            <span class="pill">${total}</span>
          `;

          const nestedC = document.createElement("div");
          nestedC.className = "nested";

          contBtn.addEventListener("click", () =>
            toggleNested(contBtn, nestedC, () =>
              loadStores({ continent })
            )
          );

          // ------------------------------------------
          // RENDER COUNTRIES
          // ------------------------------------------

          Object.entries(countries)
            .sort(([a], [b]) => a.localeCompare(b))
            .forEach(([country, cities]) => {
              const cBtn = document.createElement("button");
              cBtn.className = "line country";

              const count = Object.values(cities).reduce(
                (n, list) => n + list.length,
                0
              );

              cBtn.innerHTML = `
                <span class="arrow">▶</span>
                <span class="label">${country}</span>
                <span class="pill">${count}</span>
              `;

              const nestedCity = document.createElement("div");
              nestedCity.className = "nested";

              cBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                toggleNested(cBtn, nestedCity, () =>
                  loadStores({ country })
                );
              });

              // ------------------------------------------
              // RENDER CITIES
              // ------------------------------------------
              Object.entries(cities)
                .sort(([, a], [, b]) => b.length - a.length)
                .forEach(([city, storeList]) => {
                  const cityBtn = document.createElement("button");
                  cityBtn.className = "line city";

                  cityBtn.innerHTML = `
                    <span class="label">${city}</span>
                    <span class="pill">${storeList.length}</span>
                  `;

                  cityBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    loadStores({ city });

                    setTimeout(
                      () =>
                        cityBtn.scrollIntoView({
                          behavior: "smooth",
                          block: "center",
                        }),
                      140
                    );
                  });

                  nestedCity.appendChild(cityBtn);
                });

              nestedC.appendChild(cBtn);
              nestedC.appendChild(nestedCity);
            });

          menu.appendChild(contBtn);
          menu.appendChild(nestedC);
        });
    });
}
