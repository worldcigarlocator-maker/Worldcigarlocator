// ==========================
// Sidebar.js – Komplett version
// ==========================

// Initiera Supabase
const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
// ==========================
// Sidebar.js – version med stores_with_city
// ==========================

// Statisk struktur (världsdelar + länder som alltid syns)
const structure = {
  "Europe": ["Sweden", "Spain", "Germany", "France", "Norway", "Denmark", "Finland", "Italy"],
  "North America": ["USA", "Canada", "Mexico"],
  "South America": ["Brazil", "Argentina", "Chile"],
  "Asia": ["Japan", "China", "India"],
  "Africa": ["South Africa", "Egypt", "Morocco"],
  "Oceania": ["Australia", "New Zealand"]
};

// Flag-emoji (kan ersättas med bilder)
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

  // Hämta butiker + stad + land + kontinent från vyn
  const { data: stores, error } = await supabase
    .from("stores_with_city")
    .select("store_id, store_name, city_name, country, continent");

  if (error) {
    console.error("Supabase error:", error);
    return;
  }

  // Räkna städer och länder
  const cityCounts = {};
  const countryCounts = {};

  stores.forEach(s => {
    if (!s.city_name || !s.country || !s.continent) return;

    // Stad
    const cityKey = `${s.continent}-${s.country}-${s.city_name}`;
    cityCounts[cityKey] = (cityCounts[cityKey] || 0) + 1;

    // Land
    const countryKey = `${s.continent}-${s.country}`;
    countryCounts[countryKey] = (countryCounts[countryKey] || 0) + 1;
  });

  // Rendera kontinenter
  Object.keys(structure).forEach(continent => {
    const contLi = document.createElement("li");
    contLi.classList.add("continent");

    const contBtn = document.createElement("button");
    contBtn.classList.add("toggle");
    contBtn.innerHTML = `<span>${continent}</span><span class="arrow">►</span>`;

    const countriesUl = document.createElement("ul");
    countriesUl.classList.add("nested");

    contBtn.addEventListener("click", () => {
      countriesUl.classList.toggle("active");
      contBtn.querySelector(".arrow").textContent =
        countriesUl.classList.contains("active") ? "▼" : "►";
    });

    // Rendera länder under kontinenten
    structure[continent].forEach(country => {
      const countryLi = document.createElement("li");
      countryLi.classList.add("country");

      const countryKey = `${continent}-${country}`;
      const count = countryCounts[countryKey] || 0;

      const countryBtn = document.createElement("button");
      countryBtn.classList.add("toggle");
      countryBtn.innerHTML = `
        <span class="flag">${flags[country] || ""}</span>
        <span>${country}</span>
        <span class="count">(${count})</span>
        <span class="arrow">►</span>
      `;

      const citiesUl = document.createElement("ul");
      citiesUl.classList.add("nested");

      countryBtn.addEventListener("click", () => {
        citiesUl.classList.toggle("active");
        countryBtn.querySelector(".arrow").textContent =
          citiesUl.classList.contains("active") ? "▼" : "►";
      });

      // Lägg till städer dynamiskt från stores_with_city
      const cityMap = {};
      stores.forEach(s => {
        if (s.country === country && s.continent === continent) {
          cityMap[s.city_name] = (cityMap[s.city_name] || 0) + 1;
        }
      });

      Object.keys(cityMap).sort().forEach(city => {
        const cityLi = document.createElement("li");
        const cityLink = document.createElement("a");
        cityLink.href = `city.html?city=${encodeURIComponent(city)}`;
        cityLink.textContent = `${city} (${cityMap[city]})`;
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

// Initiera när sidan laddats
document.addEventListener("DOMContentLoaded", buildSidebar);
