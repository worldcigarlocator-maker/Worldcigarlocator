// ============================================================
// PREMIUM SIDEBAR — Smooth toggle, arrow animation, auto-scroll
// ============================================================
function toggleNested(btn, container, onOpenLoad) {
  const isOpen = container.classList.toggle("show");
  btn.classList.toggle("open", isOpen);

  const arrow = btn.querySelector(".arrow");
  if (arrow) {
    arrow.style.transform = isOpen ? "rotate(90deg)" : "rotate(0deg)";
  }

  if (isOpen) {
    if (typeof onOpenLoad === "function") onOpenLoad();
    setTimeout(() => {
      btn.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }, 140);
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
        console.error("Sidebar fetch error:", error);
        menu.innerHTML = `<li style="color:#f55">Failed to load.</li>`;
        return;
      }

      // ------------------------------------------
      // BUILD HIERARCHY: Continent → Country → City
      // ------------------------------------------

      const grouped = {};

      data.forEach((s) => {
        const cont = (s.country || "Unknown").trim();
        const continent = getContinent(cont); // global mapping
        if (!grouped[continent]) grouped[continent] = {};

        const ctry = s.country || "Unknown";
        if (!grouped[continent][ctry]) grouped[continent][ctry] = {};

        const city = s.city || "Unknown";
        if (!grouped[continent][ctry][city]) grouped[continent][ctry][city] = [];

        grouped[continent][ctry][city].push(s);
      });

      menu.innerHTML = "";

      // ------------------------------------------
      // RENDER CONTINENTS
      // ------------------------------------------
      Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([continent, countries]) => {
          const contBtn = document.createElement("button");
          contBtn.className = "line continent";

          const total = Object.values(countries).reduce(
            (sum, cities) =>
              sum +
              Object.values(cities).reduce((n, list) => n + list.length, 0),
            0
          );

          contBtn.innerHTML = `
            <span class="arrow">▶</span>
            <span class="label">${continent}</span>
            <span class="pill">${total}</span>
          `;

          const nestedCountries = document.createElement("div");
          nestedCountries.className = "nested";

          // AUTO-LOAD stores when opening
          contBtn.addEventListener("click", () =>
            toggleNested(contBtn, nestedCountries, () =>
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

              // Open country + load stores
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
                .sort(([a], [b]) => b.length - a.length)
                .forEach(([city, list]) => {
                  const cityBtn = document.createElement("button");
                  cityBtn.className = "line city";

                  cityBtn.innerHTML = `
                    <span class="label">${city}</span>
                    <span class="pill">${list.length}</span>
                  `;

                  // Scroll + load results only
                  cityBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    loadStores({ city });
                    setTimeout(() =>
                      cityBtn.scrollIntoView({ behavior: "smooth", block: "center" }), 150
                    );
                  });

                  nestedCity.appendChild(cityBtn);
                });

              nestedCountries.appendChild(cBtn);
              nestedCountries.appendChild(nestedCity);
            });

          menu.appendChild(contBtn);
          menu.appendChild(nestedCountries);
        });
    });
}

// ============================================================
// SIMPLE CONTINENT DETECTOR (same as frontend/backoffice)
// ============================================================
function getContinent(country) {
  if (!country) return "Other";
  const c = country.toLowerCase();

  if (
    c.includes("usa") ||
    c.includes("united states") ||
    c.includes("canada") ||
    c.includes("mexico")
  )
    return "North America";

  if (
    c.includes("sweden") ||
    c.includes("germany") ||
    c.includes("france") ||
    c.includes("uk") ||
    c.includes("spain") ||
    c.includes("italy") ||
    c.includes("norway") ||
    c.includes("denmark") ||
    c.includes("poland")
  )
    return "Europe";

  if (
    c.includes("china") ||
    c.includes("japan") ||
    c.includes("korea") ||
    c.includes("india") ||
    c.includes("thailand") ||
    c.includes("vietnam")
  )
    return "Asia";

  if (
    c.includes("south africa") ||
    c.includes("nigeria") ||
    c.includes("egypt")
  )
    return "Africa";

  if (
    c.includes("australia") ||
    c.includes("new zealand")
  )
    return "Oceania";

  if (
    c.includes("brazil") ||
    c.includes("argentina") ||
    c.includes("chile")
  )
    return "South America";

  return "Other";
}
