
// Initiera Supabase-klient
const supabaseUrl = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4"; // byt ut
const supabaseKey = "YOUR_ANON_KEY"; // byt ut
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function buildSidebar() {
  const sidebar = document.getElementById("sidebarMenu");
  sidebar.innerHTML = "";

  // Hämta kontinenter
  const { data: continents, error: err1 } = await supabase
    .from("continents")
    .select("id, name")
    .order("name");

  if (err1) {
    console.error("Fel vid hämtning av kontinenter:", err1);
    return;
  }

  // Hämta länder
  const { data: countries, error: err2 } = await supabase
    .from("countries")
    .select("id, name, flag, continent_id")
    .order("name");

  if (err2) {
    console.error("Fel vid hämtning av länder:", err2);
    return;
  }

  // Bygg sidomenyn
  continents.forEach(cont => {
    const contLi = document.createElement("li");

    const arrow = document.createElement("span");
    arrow.textContent = "▶";
    arrow.classList.add("arrow");

    const contName = document.createElement("span");
    contName.textContent = cont.name;

    contLi.appendChild(arrow);
    contLi.appendChild(contName);

    const countryUl = document.createElement("ul");
    countryUl.classList.add("collapsed");

    countries
      .filter(c => c.continent_id === cont.id)
      .forEach(c => {
        const countryLi = document.createElement("li");
        countryLi.textContent = `${c.flag || ""} ${c.name}`;
        countryLi.addEventListener("click", (e) => {
          e.stopPropagation();
          loadCities(c.id, c.name, c.flag);
        });
        countryUl.appendChild(countryLi);
      });

    contLi.appendChild(countryUl);

    contLi.addEventListener("click", () => {
      countryUl.classList.toggle("collapsed");
      arrow.textContent = countryUl.classList.contains("collapsed") ? "▶" : "▼";
    });

    sidebar.appendChild(contLi);
  });
}

async function loadCities(countryId, countryName, flag) {
  const main = document.getElementById("main");
  main.innerHTML = `<h2>${flag || ""} ${countryName}</h2><p>Laddar städer...</p>`;

  const { data: cities, error } = await supabase
    .from("cities")
    .select("id, name")
    .eq("country_id", countryId)
    .order("name");

  if (error) {
    main.innerHTML = `<h2>${flag || ""} ${countryName}</h2><p style="color:red;">Fel: ${error.message}</p>`;
    return;
  }

  if (!cities || cities.length === 0) {
    main.innerHTML = `<h2>${flag || ""} ${countryName}</h2><p>Inga städer hittades.</p>`;
    return;
  }

  const list = document.createElement("ul");
  cities.forEach(city => {
    const li = document.createElement("li");
    li.textContent = city.name;
    list.appendChild(li);
  });

  main.innerHTML = `<h2>${flag || ""} ${countryName}</h2>`;
  main.appendChild(list);
}

document.addEventListener("DOMContentLoaded", buildSidebar);
