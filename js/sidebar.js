// Initiera Supabase
const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Statiska världsdelar
const continents = ["Europe", "North America", "South America", "Asia", "Africa", "Oceania"];

// Bygg sidebaren när sidan laddats
document.addEventListener("DOMContentLoaded", async () => {
  const sidebar = document.getElementById("sidebarContent");
  const searchInput = document.getElementById("sidebarSearch");

  if (!sidebar) {
    console.error("❌ Sidebar-element saknas i HTML!");
    return;
  }

  // Hämta alla städer som har butiker
  const { data: stores, error } = await supabase
    .from("stores")
    .select("id, name, city:cities(name, country, continent)")
    .order("name");

  if (error) {
    console.error("❌ Supabase error:", error);
    sidebar.innerHTML = "<p>Error loading sidebar</p>";
    return;
  }

  // Grupp: kontinent → land → stad
  const grouped = {};
  stores.forEach(store => {
    const city = store.city;
    if (!city) return;
    const cont = city.continent || "Other";
    const country = city.country || "Unknown";
    const cityName = city.name;

    if (!grouped[cont]) grouped[cont] = {};
    if (!grouped[cont][country]) grouped[cont][country] = new Set();
    grouped[cont][country].add(cityName);
  });

  // Bygg HTML
  let html = "<ul class='continent-list'>";
  continents.forEach(cont => {
    if (!grouped[cont]) return; // hoppa över tomma världsdelar
    html += `<li class="continent">
      <button class="toggle">${cont}</button>
      <ul class="country-list">`;

    Object.keys(grouped[cont]).sort().forEach(country => {
      html += `<li class="country">
        <button class="toggle">${country}</button>
        <ul class="city-list">`;

      Array.from(grouped[cont][country]).sort().forEach(city => {
        html += `<li><a href="city.html?city=${encodeURIComponent(city)}">${city}</a></li>`;
      });

      html += `</ul></li>`;
    });

    html += `</ul></li>`;
  });
  html += "</ul>";

  sidebar.innerHTML = html;

  // Event: expand/collapse
  sidebar.querySelectorAll(".toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      btn.classList.toggle("open");
      const next = btn.nextElementSibling;
      if (next) next.classList.toggle("open");
    });
  });

  // Event: sökning
  searchInput.addEventListener("input", () => {
    const term = searchInput.value.toLowerCase();
    sidebar.querySelectorAll("a").forEach(link => {
      const match = link.textContent.toLowerCase().includes(term);
      link.parentElement.style.display = match ? "" : "none";
    });
  });
});

// Bara världsdelar hårdkodade
const continents = ["Europe", "North America", "South America", "Asia", "Africa", "Oceania"];

async function loadSidebar() {
  const sidebar = document.getElementById("continentList");
  sidebar.innerHTML = "";

  // Hämta alla städer som har butiker
  const { data: cities } = await supabase
    .from("cities")
    .select("id, name, country, continent, stores(id)")
    .not("stores", "is", null);

  if (!cities) return;

  // Gruppera: kontinent → land → städer
  const grouped = {};
  continents.forEach(c => grouped[c] = {});

  cities.forEach(city => {
    if (!grouped[city.continent]) return; // hoppa över om continent inte matchar
    if (!grouped[city.continent][city.country]) {
      grouped[city.continent][city.country] = [];
    }
    grouped[city.continent][city.country].push(city);
  });

  // Bygg sidebar
  for (const cont of continents) {
    const contLi = document.createElement("li");
    contLi.className = "continent";

    const contBtn = document.createElement("button");
    contBtn.textContent = cont;
    contBtn.addEventListener("click", () => contLi.classList.toggle("open"));
    contLi.appendChild(contBtn);

    const countryUl = document.createElement("ul");
    for (const country in grouped[cont]) {
      const countryLi = document.createElement("li");
      countryLi.className = "country";

      const countryBtn = document.createElement("button");
      countryBtn.textContent = country;
      countryBtn.addEventListener("click", () => countryLi.classList.toggle("open"));
      countryLi.appendChild(countryBtn);

      const cityUl = document.createElement("ul");
      grouped[cont][country]
        .sort((a, b) => a.name.localeCompare(b.name)) // sortera städer
        .forEach(city => {
          const cityLi = document.createElement("li");
          cityLi.innerHTML = `<a href="city.html?city=${encodeURIComponent(city.name)}">${city.name}</a>`;
          cityUl.appendChild(cityLi);
        });

      countryLi.appendChild(cityUl);
      countryUl.appendChild(countryLi);
    }

    contLi.appendChild(countryUl);
    sidebar.appendChild(contLi);
  }
}

// Enkel sökfunktion
document.getElementById("sidebarSearch")?.addEventListener("input", e => {
  const q = e.target.value.toLowerCase();
  document.querySelectorAll("#continentList li").forEach(li => {
    const text = li.textContent.toLowerCase();
    li.style.display = text.includes(q) ? "" : "none";
  });
});

// Kör
loadSidebar();

// === Struktur för kontinenter och länder (bokstavsordnat) ===
const structure = {
  Africa: ["Egypt", "Morocco", "South Africa"],
  Asia: ["China", "India", "Japan"],
  Europe: ["Denmark", "France", "Germany", "Norway", "Sweden"],
  "North America": ["Canada", "Mexico", "USA"],
  Oceania: ["Australia", "New Zealand"],
  "South America": ["Argentina", "Brazil", "Chile"]
};

// === Bygg sidebar ===
async function buildSidebar() {
  const container = document.getElementById("continentList");
  container.innerHTML = "";

  for (const [continent, countries] of Object.entries(structure).sort()) {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.textContent = `▶ ${continent}`;
    btn.onclick = () => ul.classList.toggle("hidden");
    li.appendChild(btn);

    const ul = document.createElement("ul");
    ul.classList.add("hidden");

    countries.sort().forEach(country => {
      const subLi = document.createElement("li");
      const subBtn = document.createElement("button");
      subBtn.textContent = `▶ ${country}`;
      subBtn.onclick = () => subUl.classList.toggle("hidden");
      subLi.appendChild(subBtn);

      const subUl = document.createElement("ul");
      subUl.classList.add("hidden");

      // Hämta städer från Supabase som hör till landet
      loadCities(country, subUl);

      subLi.appendChild(subUl);
      ul.appendChild(subLi);
    });

    li.appendChild(ul);
    container.appendChild(li);
  }
}

async function loadCities(country, ul) {
  const { data: cities } = await supabase
    .from("cities")
    .select("id, name, country")
    .eq("country", country);

  if (cities) {
    cities.sort((a, b) => a.name.localeCompare(b.name));
    cities.forEach(city => {
      const cityLi = document.createElement("li");
      const cityLink = document.createElement("a");
      cityLink.href = `city.html?city=${encodeURIComponent(city.name)}`;
      cityLink.textContent = city.name;
      cityLi.appendChild(cityLink);
      ul.appendChild(cityLi);
    });
  }
}

// === Sökfunktion ===
document.getElementById("sidebarSearch").addEventListener("input", e => {
  const term = e.target.value.toLowerCase();
  document.querySelectorAll("#continentList a").forEach(a => {
    a.style.display = a.textContent.toLowerCase().includes(term) ? "" : "none";
  });
});

// Kör vid start
buildSidebar();

document.addEventListener("DOMContentLoaded", async () => {
  const menu = document.getElementById("sidebarMenu");
  const search = document.getElementById("sidebarSearch");

  // Statisk struktur (utan Antarctica)
  const structure = {
    "Africa": [],
    "Asia": [],
    "Europe": [],
    "North America": [],
    "South America": [],
    "Oceania": []
  };

  // === Hämta städer med butiker från Supabase ===
  const { data: cities, error } = await supabaseClient
    .from("cities")
    .select("id, name, country, continent, stores (id)")
    .not("stores", "is", null);

  if (error) {
    console.error("Error fetching cities:", error);
    return;
  }

  // Sortera städer alfabetiskt
  cities.sort((a, b) => a.name.localeCompare(b.name));

  // Grupp → continent > country > cities
  const grouped = {};
  for (const c of cities) {
    if (!grouped[c.continent]) grouped[c.continent] = {};
    if (!grouped[c.continent][c.country]) grouped[c.continent][c.country] = [];
    grouped[c.continent][c.country].push(c);
  }

  // === Rendera menyer ===
  Object.keys(structure).forEach(continent => {
    const liContinent = document.createElement("li");
    const btnContinent = document.createElement("button");
    btnContinent.textContent = `► ${continent}`;
    liContinent.appendChild(btnContinent);

    const ulCountries = document.createElement("ul");

    // Lägg till länder (sorterade)
    const countries = grouped[continent]
      ? Object.keys(grouped[continent]).sort()
      : [];
    countries.forEach(country => {
      const liCountry = document.createElement("li");
      const btnCountry = document.createElement("button");
      btnCountry.textContent = `► ${country}`;
      liCountry.appendChild(btnCountry);

      const ulCities = document.createElement("ul");
      grouped[continent][country]
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach(city => {
          const liCity = document.createElement("li");
          const aCity = document.createElement("a");
          aCity.href = `city.html?city=${encodeURIComponent(city.name)}`;
          aCity.textContent = city.name;
          liCity.appendChild(aCity);
          ulCities.appendChild(liCity);
        });

      liCountry.appendChild(ulCities);

      // Toggle för country
      btnCountry.addEventListener("click", () => {
        ulCities.classList.toggle("open");
        btnCountry.textContent =
          (ulCities.classList.contains("open") ? "▼ " : "► ") + country;
      });

      ulCountries.appendChild(liCountry);
    });

    liContinent.appendChild(ulCountries);

    // Toggle för continent
    btnContinent.addEventListener("click", () => {
      ulCountries.classList.toggle("open");
      btnContinent.textContent =
        (ulCountries.classList.contains("open") ? "▼ " : "► ") + continent;
    });

    menu.appendChild(liContinent);
  });

  // === Search-filter ===
  search.addEventListener("input", () => {
    const query = search.value.toLowerCase();
    document.querySelectorAll("#sidebarMenu li").forEach(li => {
      if (!query) {
        li.style.display = "";
      } else {
        const text = li.textContent.toLowerCase();
        li.style.display = text.includes(query) ? "" : "none";
      }
    });
  });
});
