// Initiera Supabase
const supabase = window.supabase.createClient(
  "https://gbxxoeplkzbhsvagnfsr.supabase.co", // byt ut till ditt projekt
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4" // byt ut till din anon key
);

async function loadSidebar() {
  const sidebar = document.getElementById("sidebarMenu");
  sidebar.innerHTML = "";

  // Hämta kontinenter
  const { data: continents, error: contErr } = await supabase
    .from("continents")
    .select("id, name")
    .order("name");

  if (contErr) {
    console.error("Fel vid hämtning av kontinenter:", contErr);
    return;
  }

  for (const continent of continents) {
    // Rubrik för världsdel
    const continentTitle = document.createElement("h3");
    continentTitle.textContent = continent.name;
    continentTitle.classList.add("continent-title");
    sidebar.appendChild(continentTitle);

    // UL för länder
    const countryList = document.createElement("ul");
    countryList.classList.add("country-list");
    sidebar.appendChild(countryList);

    // Hämta länder för denna världsdel
    const { data: countries, error: countryErr } = await supabase
      .from("countries")
      .select("id, name, flag, store_count")
      .eq("continent_id", continent.id)
      .order("name");

    if (countryErr) {
      console.error("Fel vid hämtning av länder:", countryErr);
      continue;
    }

    countries.forEach(country => {
      const row = document.createElement("li");
      row.classList.add("country-row");

      // Toggle ikon
      const toggle = document.createElement("span");
      toggle.textContent = "+";
      toggle.classList.add("toggle-icon");
      row.appendChild(toggle);

      // Flagga
      const flag = document.createElement("span");
      flag.textContent = country.flag || "🏳️";
      flag.classList.add("country-flag");
      row.appendChild(flag);

      // Landnamn
      const name = document.createElement("span");
      name.textContent = country.name;
      name.classList.add("country-name");
      row.appendChild(name);

      // Antal
      const count = document.createElement("span");
      count.textContent = `(${country.store_count || 0})`;
      count.classList.add("country-count");
      row.appendChild(count);

      // Lista för städer
      const cityList = document.createElement("ul");
      cityList.classList.add("city-list");

      row.addEventListener("click", async () => {
        if (cityList.childElementCount === 0) {
          const { data: cities, error: cityErr } = await supabase
            .from("cities")
            .select("name, store_count")
            .eq("country_id", country.id)
            .order("name");

          if (cityErr) {
            console.error("Fel vid hämtning av städer:", cityErr);
          } else {
            cities.forEach(city => {
              const li = document.createElement("li");
              li.textContent = `${city.name} (${city.store_count || 0})`;
              li.classList.add("city-item");
              cityList.appendChild(li);
            });
          }
        }

        const visible = cityList.style.display === "block";
        cityList.style.display = visible ? "none" : "block";
        toggle.textContent = visible ? "+" : "–";
      });

      countryList.appendChild(row);
      countryList.appendChild(cityList);
    });
  }
}

document.addEventListener("DOMContentLoaded", loadSidebar);
