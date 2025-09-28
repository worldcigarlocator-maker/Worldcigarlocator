const supabaseUrl = "https://YOUR_PROJECT.supabase.co";
const supabaseKey = "YOUR_ANON_KEY";
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

async function loadSidebar() {
  // Hämta alla stores
  const { data: stores } = await supabase.from("stores").select("city_id");
  const cityIds = [...new Set(stores.map(s => s.city_id))];

  const { data: cities } = await supabase
    .from("cities")
    .select("id, name, country, continent")
    .in("id", cityIds);

  // Gruppera
  const grouped = {};
  cities.forEach(c => {
    if (!grouped[c.continent]) grouped[c.continent] = {};
    if (!grouped[c.continent][c.country]) grouped[c.continent][c.country] = [];
    grouped[c.continent][c.country].push(c);
  });

  const container = document.getElementById("menu-structure");
  container.innerHTML = "";

  Object.keys(grouped).sort().forEach(cont => {
    // Kontinent-knapp
    const contDiv = document.createElement("div");
    contDiv.classList.add("toggle");
    contDiv.innerHTML = `<span>►</span>${cont}`;
    const countryList = document.createElement("ul");

    // Länder
    Object.keys(grouped[cont]).sort().forEach(country => {
      const countryLi = document.createElement("li");
      const countryToggle = document.createElement("div");
      countryToggle.classList.add("toggle");
      countryToggle.innerHTML = `<span>►</span>${country}`;

      const cityUl = document.createElement("ul");
      grouped[cont][country]
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach(city => {
          const cityLi = document.createElement("li");
          cityLi.innerHTML = `<a href="city.html?city=${encodeURIComponent(city.name)}">${city.name}</a>`;
          cityUl.appendChild(cityLi);
        });

      countryToggle.addEventListener("click", () => {
        cityUl.classList.toggle("open");
        const arrow = countryToggle.querySelector("span");
        arrow.textContent = cityUl.classList.contains("open") ? "▼" : "►";
      });

      countryLi.appendChild(countryToggle);
      countryLi.appendChild(cityUl);
      countryList.appendChild(countryLi);
    });

    // Klick för kontinent
    contDiv.addEventListener("click", () => {
      countryList.classList.toggle("open");
      const arrow = contDiv.querySelector("span");
      arrow.textContent = countryList.classList.contains("open") ? "▼" : "►";
    });

    container.appendChild(contDiv);
    container.appendChild(countryList);
  });
}

document.addEventListener("DOMContentLoaded", loadSidebar);
