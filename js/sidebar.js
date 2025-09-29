// === Supabase init ===
const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const SUPABASE_KEY = "YOUR_PUBLIC_KEY";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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
