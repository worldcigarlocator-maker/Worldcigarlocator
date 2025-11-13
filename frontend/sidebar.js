/* ============================================================
   sidebar.js — Frontend Sidebar (Continent → Country → City)
   For World Cigar Locator frontend
   ============================================================ */

// Egen Supabase-klient (frontendpublic)
const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/**
 * Bygger vänster meny:
 *  - Continents (med total count)
 *  - Countries (med count)
 *  - Cities (med count)
 *
 * @param {Function} loadStoresFn - callback från start.js (filter → ladda kort)
 * @param {Function} getContinentFromCountryFn - callback som mappar country → continent
 */
export async function buildFrontendSidebar(loadStoresFn, getContinentFromCountryFn) {
  const menu = document.getElementById("sidebarMenu");
  if (!menu) return;

  menu.innerHTML = `<li style="color:#999">Loading…</li>`;

  const { data: stores, error } = await supabase
    .from("stores_public")
    .select("id,name,city,country");

  if (error || !stores) {
    console.error("Sidebar load error:", error);
    menu.innerHTML = `<li style="color:#f56">Failed to load data</li>`;
    return;
  }

  // ======= GROUPING: Continent → Country → City =======
  const grouped = {};
  for (const s of stores) {
    const continent = getContinentFromCountryFn(s.country);
    const country = s.country || "Unknown";
    const city = s.city || "Unknown";

    if (!grouped[continent]) grouped[continent] = {};
    if (!grouped[continent][country]) grouped[continent][country] = {};
    if (!grouped[continent][country][city]) grouped[continent][country][city] = [];

    grouped[continent][country][city].push(s);
  }

  // ======= RENDER SIDEBAR TREE =======
  menu.innerHTML = "";

  Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([continent, countries]) => {
      // ---- Continent line ----
      const totalCount = Object.values(countries).reduce(
        (acc, c) => acc + Object.values(c).reduce((a, b) => a + b.length, 0),
        0
      );

      const contBtn = el("button", "line continent");
      contBtn.innerHTML = `
        <span class="arrow">▶</span>
        <span class="label">${continent}</span>
        <span class="pill">${totalCount}</span>
      `;

      const nestedCountries = el("div", "nested");

      // Klick på kontinent → expandera + ladda stores
      contBtn.addEventListener("click", () => {
        const isOpen = nestedCountries.classList.toggle("show");
        contBtn.classList.toggle("open", isOpen);
        const arrow = contBtn.querySelector(".arrow");
        if (arrow) arrow.style.transform = isOpen ? "rotate(90deg)" : "rotate(0deg)";

        if (isOpen && typeof loadStoresFn === "function") {
          loadStoresFn({ continent });
          document.querySelector(".main")?.scrollIntoView({ behavior: "smooth" });
        }
      });

      // ---- Countries under this continent ----
      Object.entries(countries)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([country, cities]) => {
          const countryCount = Object.values(cities).reduce(
            (a, b) => a + b.length,
            0
          );

          const cBtn = el("button", "line country");
          cBtn.innerHTML = `
            <span class="arrow">▶</span>
            <span class="label">${country}</span>
            <span class="pill">${countryCount}</span>
          `;

          const nestedCities = el("div", "nested");

          cBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const isOpen = nestedCities.classList.toggle("show");
            cBtn.classList.toggle("open", isOpen);
            const arrow = cBtn.querySelector(".arrow");
            if (arrow) arrow.style.transform = isOpen ? "rotate(90deg)" : "rotate(0deg)";

            if (isOpen && typeof loadStoresFn === "function") {
              loadStoresFn({ country });
              document.querySelector(".main")?.scrollIntoView({ behavior: "smooth" });
            }
          });

          // ---- Cities under this country ----
          Object.entries(cities)
            .sort(([, arrA], [, arrB]) => arrB.length - arrA.length) // störst först
            .forEach(([city, list]) => {
              const cityBtn = el("button", "line city");
              cityBtn.innerHTML = `
                <span class="label">${city}</span>
                <span class="pill">${list.length}</span>
              `;

              cityBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                if (typeof loadStoresFn === "function") {
                  loadStoresFn({ city });
                  document.querySelector(".main")?.scrollIntoView({ behavior: "smooth" });
                }
              });

              nestedCities.appendChild(cityBtn);
            });

          nestedCountries.appendChild(cBtn);
          nestedCountries.appendChild(nestedCities);
        });

      menu.appendChild(contBtn);
      menu.appendChild(nestedCountries);
    });
}
