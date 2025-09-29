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

  // Hämta kontinenter
  const { data: continents, error: errCont } = await supabase
    .from("continents")
    .select("id, name")
    .order("name");
  if (errCont) {
    console.error("Error fetching continents:", errCont);
    return;
  }

  // Hämta länder
  const { data: countries, error: errCountries } = await supabase
    .from("countries")
    .select("id, name, continent_id")
    .order("name");
  if (errCountries) {
    console.error("Error fetching countries:", errCountries);
    return;
  }

  // Hämta städer
  const { data: cities, error: errCities } = await supabase
    .from("cities")
    .select("id, name, country_id");
  if (errCities) {
    console.error("Error fetching cities:", errCities);
    return;
  }

  // Hämta butiker
  const { data: stores, error: errStores } = await supabase
    .from("stores")
    .select("id, city_id");
  if (errStores) {
    console.error("Error fetching stores:", errStores);
    return;
  }

  // Räkna butiker per stad
  const storeCountByCity = {};
  (stores || []).forEach(s => {
    storeCountByCity[s.city_id] = (storeCountByCity[s.city_id] || 0) + 1;
  });

  // Bygg struktur: continent -> countries[] -> cities[]
  const structure = {};
  (continents || []).forEach(cont => {
    structure[cont.id] = {
      name: cont.name,
      countries: {}
    };
  });

  (countries || []).forEach(co => {
    if (!structure[co.continent_id]) return;
    structure[co.continent_id].countries[co.id] = {
      name: co.name,
      cities: []
    };
  });

  (cities || []).forEach(ci => {
    const co = countries.find(c => c.id === ci.country_id);
    if (co && structure[co.continent_id]) {
      structure[co.continent_id].countries[co.id].cities.push(ci);
    }
  });

  // Rendera kontinenter
  Object.values(structure).forEach(cont => {
    const contLi = document.createElement("li");
    contLi.classList.add("continent");

    const contBtn = document.createElement("button");
    contBtn.classList.add("toggle");
    contBtn.innerHTML = `<span>${cont.name}</span> <span class="arrow">►</span>`;

    const countriesUl = document.createElement("ul");
    countriesUl.classList.add("nested");

    contBtn.addEventListener("click", () => {
      countriesUl.classList.toggle("active");
      contBtn.querySelector(".arrow").textContent =
        countriesUl.classList.contains("active") ? "▼" : "►";
    });

    // Rendera länder
    Object.entries(cont.countries).forEach(([coId, co]) => {
      const countryLi = document.createElement("li");
      countryLi.classList.add("country");

      // Räkna alla butiker i landets städer
      let countryCount = 0;
      co.cities.forEach(city => {
        countryCount += storeCountByCity[city.id] || 0;
      });

      const countryBtn = document.createElement("button");
      countryBtn.classList.add("toggle");
      countryBtn.innerHTML = `
        <span class="flag">${flags[co.name] || ""}</span>
        <span>${co.name}</span>
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
      co.cities.sort((a, b) => a.name.localeCompare(b.name)).forEach(city => {
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

    contLi.appendChild(contBtn);
    contLi.appendChild(countriesUl);
    sidebar.appendChild(contLi);
  });
}

document.addEventListener("DOMContentLoaded", buildSidebar);
