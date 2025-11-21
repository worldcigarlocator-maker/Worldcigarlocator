/* ============================================================
   SIDEBAR — Step 1
   ============================================================ */

export function buildFrontendSidebar(supabase, loadStores) {
  const menu = document.getElementById("sidebarMenu");
  if (!menu) return;

  menu.innerHTML = `<li style="color:#666;">Loading…</li>`;

  supabase
    .from("stores_public")
    .select("country, city, continent")
    .then(({ data, error }) => {
      if (error || !data) {
        menu.innerHTML = `<li style="color:red">Error loading</li>`;
        return;
      }

      // group continent → country → city
      const grouped = {};
      for (const s of data) {
        const cont = s.continent || "Unknown";
        if (!grouped[cont]) grouped[cont] = {};

        const ctry = s.country || "Unknown";
        if (!grouped[cont][ctry]) grouped[cont][ctry] = {};

        const city = s.city || "Unknown";
        if (!grouped[cont][ctry][city]) grouped[cont][ctry][city] = 0;

        grouped[cont][ctry][city]++;
      }

      menu.innerHTML = "";

      /* build sidebar */
      Object.entries(grouped).forEach(([continent, countries]) => {
        const contBtn = document.createElement("div");
        contBtn.className = "line continent";
        contBtn.innerHTML = `
          <span class="label">${continent}</span>
        `;
        contBtn.onclick = () => loadStores({ continent });
        menu.appendChild(contBtn);

        Object.entries(countries).forEach(([country, cities]) => {
          const cBtn = document.createElement("div");
          cBtn.className = "line country";
          cBtn.innerHTML = `<span class="label">${country}</span>`;
          cBtn.onclick = (e) => {
            e.stopPropagation();
            loadStores({ country });
          };
          menu.appendChild(cBtn);

          Object.entries(cities).forEach(([city]) => {
            const cityBtn = document.createElement("div");
            cityBtn.className = "line city";
            cityBtn.innerHTML = `<span class="label">${city}</span>`;
            cityBtn.onclick = (e) => {
              e.stopPropagation();
              loadStores({ city });
            };
            menu.appendChild(cityBtn);
          });
        });
      });
    });
}
