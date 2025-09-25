const supabaseUrl = "DIN_SUPABASE_URL";
const supabaseKey = "DIN_SUPABASE_ANON_KEY";
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

async function loadMenu() {
  const { data, error } = await supabaseClient
    .from("cities")
    .select("*")
    .order("continent, country, name");

  if (error) {
    console.error(error);
    return;
  }

  // Gruppera
  const continents = {};
  data.forEach(city => {
    if (!continents[city.continent]) continents[city.continent] = {};
    if (!continents[city.continent][city.country]) continents[city.continent][city.country] = [];
    continents[city.continent][city.country].push(city);
  });

  // Bygg HTML
  const menu = document.getElementById("sidebarMenu");
  for (const [continent, countries] of Object.entries(continents)) {
    const continentLi = document.createElement("li");
    continentLi.innerHTML = `<strong>${continent}</strong><ul></ul>`;

    for (const [country, cities] of Object.entries(countries)) {
      const countryLi = document.createElement("li");
      countryLi.innerHTML = `<em>${country}</em><ul></ul>`;

      cities.forEach(c => {
        const cityLi = document.createElement("li");
        cityLi.innerHTML = `<a href="city.html?city=${encodeURIComponent(c.name)}">${c.name}</a>`;
        countryLi.querySelector("ul").appendChild(cityLi);
      });

      continentLi.querySelector("ul").appendChild(countryLi);
    }
    menu.appendChild(continentLi);
  }
}

loadMenu();
