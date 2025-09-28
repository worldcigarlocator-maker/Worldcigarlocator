const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

let grouped = {}; // globalt cache: {continent:{country:[cities...] }}

// Hämta cities som har minst en store
async function fetchCitiesWithStores() {
  const { data: stores, error: storeErr } = await supabase
    .from("stores")
    .select("city_id");

  if (storeErr) { console.error(storeErr); return []; }
  const cityIds = [...new Set((stores || []).map(s => s.city_id))];
  if (cityIds.length === 0) return [];

  const { data: cities, error: cityErr } = await supabase
    .from("cities")
    .select("id, name, country, continent")
    .in("id", cityIds);

  if (cityErr) { console.error(cityErr); return []; }
  return (cities || []).filter(c => c.continent !== "Antarctica");
}

function groupData(cities) {
  const g = {};
  cities.forEach(c => {
    if (!g[c.continent]) g[c.continent] = {};
    if (!g[c.continent][c.country]) g[c.continent][c.country] = [];
    g[c.continent][c.country].push(c);
  });
  return g;
}

function renderSidebar(group, filter = "") {
  const menu = document.getElementById("sidebarMenu");
  const q = filter.trim().toLowerCase();
  menu.innerHTML = "";

  // Bygg kontinent → land → stad
  Object.keys(group).sort().forEach(continent => {
    const continentMatches = continent.toLowerCase().includes(q);
    const contRow = document.createElement("div");
    contRow.className = "sidebar-row";

    const contBtn = document.createElement("button");
    contBtn.className = "sidebar-toggle";
    contBtn.innerHTML = `<span class="arrow">►</span>${continent}`;

    const countryUl = document.createElement("ul");

    let continentHasAny = false;
    Object.keys(group[continent]).sort().forEach(country => {
      const countryMatches = country.toLowerCase().includes(q);
      const countryLi = document.createElement("li");

      const countryBtn = document.createElement("button");
      countryBtn.className = "country-toggle";
      countryBtn.innerHTML = `<span class="arrow">►</span>${country}`;

      const cityUl = document.createElement("ul");
      let countryHasAny = false;

      group[continent][country]
        .sort((a,b) => a.name.localeCompare(b.name))
        .forEach(city => {
          const cityMatch = city.name.toLowerCase().includes(q);
          if (q === "" || cityMatch || countryMatches || continentMatches) {
            const li = document.createElement("li");
            li.innerHTML = `<a href="city.html?city=${encodeURIComponent(city.name)}">${city.name}</a>`;
            cityUl.appendChild(li);
            countryHasAny = true;
          }
        });

      if (countryHasAny || countryMatches || continentMatches) {
        // Auto-open vid sökning
        if (q !== "") {
          cityUl.classList.add("open");
          countryBtn.querySelector(".arrow").textContent = "▼";
        }

        countryBtn.addEventListener("click", () => {
          cityUl.classList.toggle("open");
          countryBtn.querySelector(".arrow").textContent = cityUl.classList.contains("open") ? "▼" : "►";
        });

        countryLi.appendChild(countryBtn);
        countryLi.appendChild(cityUl);
        countryUl.appendChild(countryLi);
        continentHasAny = true;
      }
    });

    if (continentHasAny || continentMatches) {
      if (q !== "") {
        countryUl.classList.add("open");
        contBtn.querySelector(".arrow").textContent = "▼";
      }

      contBtn.addEventListener("click", () => {
        countryUl.classList.toggle("open");
        contBtn.querySelector(".arrow").textContent = countryUl.classList.contains("open") ? "▼" : "►";
      });

      contRow.appendChild(contBtn);
      contRow.appendChild(countryUl);
      menu.appendChild(contRow);
    }
  });
}

async function initSidebar() {
  const search = document.getElementById("sidebarSearch");
  const hamburger = document.querySelector(".hamburger");
  const sidebar = document.querySelector(".sidebar");

  // Data
  const cities = await fetchCitiesWithStores();
  grouped = groupData(cities);
  renderSidebar(grouped);

  // Sök
  search?.addEventListener("input", () => {
    const q = search.value || "";
    renderSidebar(grouped, q);
  });

  // Mobil toggle
  hamburger?.addEventListener("click", () => {
    sidebar.classList.toggle("active");
  });
}

// Kör när DOM är klar
document.addEventListener("DOMContentLoaded", initSidebar);
