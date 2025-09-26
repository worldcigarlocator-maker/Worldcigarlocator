const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";
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
