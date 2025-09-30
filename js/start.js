// js/start.js
console.log("✅ start.js laddat");

// Din Supabase-konfiguration
const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4"; // byt till din riktiga nyckel
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function loadContinents() {
  console.log("🔎 Hämtar kontinenter...");
  const { data: continents, error } = await supabase
    .from("continents")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("❌ Fel vid hämtning av kontinenter:", error);
    return;
  }

  const sidebarMenu = document.getElementById("sidebarMenu");
  sidebarMenu.innerHTML = "";

  continents.forEach(continent => {
    const continentItem = document.createElement("li");
    continentItem.classList.add("continent-item");

    const header = document.createElement("div");
    header.classList.add("continent-header");
    header.textContent = continent.name;

    const toggle = document.createElement("span");
    toggle.classList.add("toggle-icon");
    toggle.textContent = "+";
    header.prepend(toggle);

    const countryList = document.createElement("ul");
    countryList.classList.add("country-list");
    countryList.style.display = "none";

    header.addEventListener("click", async () => {
      if (countryList.style.display === "none") {
        const { data: countries, error: countryError } = await supabase
          .from("countries")
          .select("id, name, flag, stores(count)")
          .eq("continent_id", continent.id)
          .order("name", { ascending: true });

        if (countryError) {
          console.error("❌ Fel vid hämtning av länder:", countryError);
          return;
        }

        countryList.innerHTML = "";
        countries.forEach(country => {
          const li = document.createElement("li");
          li.classList.add("country-item");

          const count = country.stores?.[0]?.count || 0;

          li.innerHTML = `
            <span class="toggle-placeholder"></span>
            <span class="flag">${country.flag || ""}</span>
            <span class="name">${country.name}</span>
            <span class="count">${count}</span>
          `;

          countryList.appendChild(li);
        });

        countryList.style.display = "block";
        toggle.textContent = "–";
      } else {
        countryList.style.display = "none";
        toggle.textContent = "+";
      }
    });

    continentItem.appendChild(header);
    continentItem.appendChild(countryList);
    sidebarMenu.appendChild(continentItem);
  });
}

document.addEventListener("DOMContentLoaded", loadContinents);
