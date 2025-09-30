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
    // wrapper för världsdel
    const contWrapper = document.createElement("div");
    contWrapper.classList.add("continent-section");

    // rubrik-rad (klickbar)
    const contHeader = document.createElement("div");
    contHeader.classList.add("continent-header");
    contHeader.textContent = continent.name;
    contWrapper.appendChild(contHeader);

    // lista för länder
    const countryList = document.createElement("ul");
    countryList.classList.add("country-list");
    countryList.style.display = "none";
    contWrapper.appendChild(countryList);

    // klick på världsdel → toggle lista
    contHeader.addEventListener("click", async () => {
      const visible = countryList.style.display === "block";
      countryList.style.display = visible ? "none" : "block";

      // ladda länder bara första gången
      if (!visible && countryList.childElementCount === 0) {
        const { data: countries, error: countryErr } = await supabase
          .from("countries")
          .select("id, name, flag_url, store_count")
          .eq("continent_id", continent.id)
          .order("name");

        if (countryErr) {
          console.error("Fel vid hämtning av länder:", countryErr);
          return;
        }

        countries.forEach(country => {
          const row = document.createElement("li");
          row.classList.add("country-row");

          // toggle-ikon
          const toggle = document.createElement("span");
          toggle.textContent = "+";
          toggle.classList.add("toggle-icon");
          row.appendChild(toggle);

          // flagga som bild
          const flag = document.createElement("img");
          flag.src = country.flag_url || "images/flag-placeholder.png";
          flag.alt = country.name;
          flag.classList.add("country-flag");
          row.appendChild(flag);

          // landnamn
          const name = document.createElement("span");
          name.textContent = country.name;
          name.classList.add("country-name");
          row.appendChild(name);

          // antal
          const count = document.createElement("span");
          count.textContent = `(${country.store_count || 0})`;
          count.classList.add("country-count");
          row.appendChild(count);

          // lista för städer
          const cityList = document.createElement("ul");
          cityList.classList.add("city-list");
          cityList.style.display = "none";

          // klick på land → hämta städer
          row.addEventListener("click", async (e) => {
            e.stopPropagation(); // förhindra att världsdelen också togglar

            const visibleCities = cityList.style.display === "block";
            cityList.style.display = visibleCities ? "none" : "block";
            toggle.textContent = visibleCities ? "+" : "–";

            if (!visibleCities && cityList.childElementCount === 0) {
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
          });

          countryList.appendChild(row);
          countryList.appendChild(cityList);
        });
      }
    });

    sidebar.appendChild(contWrapper);
  }
}

document.addEventListener("DOMContentLoaded", loadSidebar);
