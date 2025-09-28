const supabaseUrl = "https://YOUR_PROJECT.supabase.co";
const supabaseKey = "YOUR_ANON_KEY";
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

async function loadSidebar() {
  // 1. Hämta alla stores
  const { data: stores, error: storeError } = await supabase
    .from("stores")
    .select("city_id");
  if (storeError) {
    console.error("Error loading stores:", storeError);
    return;
  }
  const cityIds = [...new Set(stores.map(s => s.city_id))];

  // 2. Hämta bara de cities som har stores
  const { data: cities, error: cityError } = await supabase
    .from("cities")
    .select("id, name, country, continent")
    .in("id", cityIds);
  if (cityError) {
    console.error("Error loading cities:", cityError);
    return;
  }

  // 3. Gruppera data
  const grouped = {};
  cities.forEach(c => {
    if (!grouped[c.continent]) grouped[c.continent] = {};
    if (!grouped[c.continent][c.country]) grouped[c.continent][c.country] = [];
    grouped[c.continent][c.country].push(c);
  });

  // 4. Bygg HTML
  const container = document.getElementById("menu-structure");
  container.innerHTML = "";

  Object.keys(grouped).sort().forEach(cont => {
    const contDiv = document.createElement("div");
    contDiv.innerHTML = `<strong>${cont}</strong>`;
    const countryList = document.createElement("ul");

    Object.keys(grouped[cont]).sort().forEach(country => {
      const countryLi = document.createElement("li");
      countryLi.innerHTML = `<em>${country}</em>`;
      const cityUl = document.createElement("ul");

      grouped[cont][country]
        .sort((a,b)=>a.name.localeCompare(b.name))
        .forEach(city => {
          const cityLi = document.createElement("li");
          cityLi.innerHTML = `<a href="city.html?city=${encodeURIComponent(city.name)}">${city.name}</a>`;
          cityUl.appendChild(cityLi);
        });

      countryLi.appendChild(cityUl);
      countryList.appendChild(countryLi);
    });

    contDiv.appendChild(countryList);
    container.appendChild(contDiv);
  });
}

// Init
document.addEventListener("DOMContentLoaded", loadSidebar);
