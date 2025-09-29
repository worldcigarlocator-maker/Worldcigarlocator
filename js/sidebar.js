// ==========================
// Sidebar.js – alltid visa kontinenter
// ==========================

const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4"; // byt till din egen
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

const flags = {
  "Sweden": "🇸🇪", "Spain": "🇪🇸", "Germany": "🇩🇪", "France": "🇫🇷",
  "Norway": "🇳🇴", "Denmark": "🇩🇰", "Finland": "🇫🇮", "Italy": "🇮🇹",
  "USA": "🇺🇸", "Canada": "🇨🇦", "Mexico": "🇲🇽",
  "Brazil": "🇧🇷", "Argentina": "🇦🇷", "Chile": "🇨🇱",
  "Japan": "🇯🇵", "China": "🇨🇳", "India": "🇮🇳",
  "South Africa": "🇿🇦", "Egypt": "🇪🇬", "Morocco": "🇲🇦",
  "Australia": "🇦🇺", "New Zealand": "🇳🇿"
};

async function buildSidebar() {
  const sidebar = document.getElementById("sidebarContent");
  if (!sidebar) return;

  // Hämta kontinenter (bas)
  const { data: continents, error: errCont } = await supabase
    .from("continents")
    .select("id, name")
    .order("name");

  if (errCont) {
    console.error("Error fetching continents:", errCont);
    return;
  }

  // Hämta städer (för länder/städer under kontinenter)
  const { data: cities, error: errCities } = await supabase
    .from("cities")
    .select("id, name, country, continent_id");

  // Hämta butiker (för counts)
  const { data: stores, error: errStores } = await supabase
    .from("stores")
    .select("id, city_id");

  // Räkna butiker per stad
  const storeCountByCity = {};
  (stores || []).forEach(s => {
    storeCountByCity[s.city_id] = (storeCountByCity[s.city_id] || 0) + 1;
  });

  // Bygg struktur: continent -> country -> cities[]
  const structure = {};
  (cities || []).forEach(c => {
    if (!structure[c.continent_id]) {
      structure[c.continent_id] = {};
    }
    if (!structure[c.continent_id][c.country]) {
      structure[c.continent_id][c.country] = [];
    }
    structure[c.continent_id][c.country].push(c);
  });

  // Rendera alla kontinenter även om de saknar data
  continents.forEach(cont => {
    const contLi = document.createElement("li");
    contLi.classList.add("continent");

    // räkna butiker i världsdel
    let continentCount = 0;
    if (structure[cont.id]) {
      Object.values(structure[cont.id]).forEach(countries => {
        countries.forEach(city => {
          continentCount += storeCountByCity[city.id] || 0;
        });
      });
    }

    const contBtn = document.createElement("button");
    contBtn.classList.add("toggle");
    contBtn.innerHTML = `<span>${cont.name}</span> <span class="count">(${continentCount})</span> <span class="arrow">►</span>`;

    const countriesUl = document.createElement("ul");
    countriesUl.classList.add("nested");

    contBtn.addEventListener("click", () => {
      countriesUl.classList.toggle("active");
      contBtn.querySelector(".arrow").textContent =
        countriesUl.classList.contains("active") ? "▼" : "►";
    });

    // Rendera länder (om några finns i den världsdelens cities)
    if (structure[cont.id]) {
      Object.keys(structure[cont.id]).sort().forEach(country => {
        const countryLi = document.createElement("li");
        countryLi.classList.add("country");

        const citiesList = structure[cont.id][country];

        // räkna butiker i landet
        let countryCount = 0;
        citiesList.forEach(city => {
          countryCount += storeCountByCity[city.id] || 0;
        });

        const countryBtn = document.createElement("button");
        countryBtn.classList.add("toggle");
        countryBtn.innerHTML = `
          <span class="flag">${flags[country] || ""}</span>
          <span>${country}</span>
          <span class="count">(${countryCount})</span>
          <span class="arrow">►</span>
        `;

        const citiesUl = document.createElement("ul");
        citiesUl.classList.add("nested");

        countryBtn.addEventListener("click", () => {
          citiesUl.classList.toggle("active");
          countryBtn.querySelector(".arrow").textContent =
            citiesUl.classList.contains("active") ? "▼" : "►";
        });

        // Rendera städer
        citiesList.sort((a, b) => a.name.localeCompare(b.name)).forEach(city => {
          const count = storeCountByCity[city.id] || 0;
          const cityLi = document.createElement("li");
          const cityLink = document.createElement("a");
          cityLink.href = `city.html?city=${encodeURIComponent(city.name)}`;
          cityLink.textContent = `${city.name} (${count})`;
          cityLi.appendChild(cityLink);
          citiesUl.appendChild(cityLi);
        });

        countryLi.appendChild(countryBtn);
        countryLi.appendChild(citiesUl);
        countriesUl.appendChild(countryLi);
      });
    }

    contLi.appendChild(contBtn);
    contLi.appendChild(countriesUl);
    sidebar.appendChild(contLi);
  });
}

document.addEventListener("DOMContentLoaded", buildSidebar);
