// ====================== SIDEBAR.JS ======================
document.addEventListener("DOMContentLoaded", async () => {
  const sidebar = document.getElementById("sidebarContent");
  const searchInput = document.getElementById("sidebarSearch");

  // Kontinenter (alltid synliga)
  const continents = ["Europe", "North America", "South America", "Asia", "Africa", "Oceania"];

  // Skapa struktur för kontinenter
  continents.forEach(continent => {
    const li = document.createElement("li");
    li.classList.add("continent");

    const button = document.createElement("button");
    button.classList.add("toggle");
    button.innerHTML = `<span>${continent}</span><span class="arrow">►</span>`;

    const ul = document.createElement("ul");
    ul.classList.add("nested");

    button.addEventListener("click", () => {
      ul.classList.toggle("active");
      button.querySelector(".arrow").textContent = ul.classList.contains("active") ? "▼" : "►";
    });

    li.appendChild(button);
    li.appendChild(ul);
    sidebar.appendChild(li);
  });

  // ===== Hämta städer med butiker från Supabase =====
  const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co";   // <-- byt till din
  const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";                     // <-- byt till din
  const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

  const { data: stores, error } = await supabase
    .from("stores")
    .select("id, name, city:cities (id, name, country, continent)");

  if (error) {
    console.error("Supabase error:", error.message);
    return;
  }

  // Gruppera städer per kontinent och land
  const grouped = {};
  stores.forEach(store => {
    const city = store.city;
    if (!city) return;

    if (!grouped[city.continent]) grouped[city.continent] = {};
    if (!grouped[city.continent][city.country]) grouped[city.continent][city.country] = {};
    grouped[city.continent][city.country][city.name] = city.id;
  });

  // Rendera länder och städer i rätt kontinent
  continents.forEach(continent => {
    const continentLi = [...sidebar.querySelectorAll(".continent")]
      .find(li => li.querySelector("span").textContent === continent);

    const ul = continentLi.querySelector("ul");

    if (grouped[continent]) {
      Object.keys(grouped[continent]).sort().forEach(country => {
        const countryLi = document.createElement("li");
        countryLi.classList.add("country");

        const countryBtn = document.createElement("button");
        countryBtn.classList.add("toggle");
        countryBtn.innerHTML = `<span>${country}</span><span class="arrow">►</span>`;

        const citiesUl = document.createElement("ul");
        citiesUl.classList.add("nested");

        countryBtn.addEventListener("click", () => {
          citiesUl.classList.toggle("active");
          countryBtn.querySelector(".arrow").textContent = citiesUl.classList.contains("active") ? "▼" : "►";
        });

        Object.keys(grouped[continent][country]).sort().forEach(city => {
          const cityId = grouped[continent][country][city];
          const cityLi = document.createElement("li");
          const cityLink = document.createElement("a");
          cityLink.href = `city.html?city=${encodeURIComponent(city)}`;
          cityLink.textContent = city;
          cityLi.appendChild(cityLink);
          citiesUl.appendChild(cityLi);
        });

        countryLi.appendChild(countryBtn);
        countryLi.appendChild(citiesUl);
        ul.appendChild(countryLi);
      });
    }
  });

  // ====== Sökfunktion ======
  searchInput.addEventListener("input", () => {
    const term = searchInput.value.toLowerCase();
    document.querySelectorAll("#sidebarContent a").forEach(a => {
      const match = a.textContent.toLowerCase().includes(term);
      a.style.display = match ? "block" : "none";
    });
  });
});
