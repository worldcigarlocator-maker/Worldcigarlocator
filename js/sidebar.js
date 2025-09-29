// ==========================
// Sidebar.js – helt dynamisk version
// ==========================

// Initiera Supabase
const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Flag-emoji (kan ersättas med egna ikoner/bilder)
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

  // Bygg en struktur: continent -> country -> cities[]
  const structure = {};

  stores.forEach(s => {
    if (!s.continent || !s.country || !s.city_name) return;

    if (!structure[s.continent]) {
      structure[s.continent] = {};
    }
    if (!structure[s.continent][s.country]) {
      structure[s.continent][s.country] = {};
    }
    if (!structure[s.continent][s.country][s.city_name]) {
      structure[s.continent][s.country][s.city_name] = 0;
    }
    structure[s.continent][s.country][s.city_name] += 1;
  });

  // Rendera kontinenter
  Object.keys(structure).sort().forEach(continent => {
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

    // Rendera länder
    Object.keys(structure[continent]).sort().forEach(country => {
      const countryLi = document.createElement("li");
      countryLi.classList.add("country");

      const cityMap = structure[continent][country];
      const count = Object.values(cityMap).reduce((a, b) => a + b, 0);

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

      // Rendera städer
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
