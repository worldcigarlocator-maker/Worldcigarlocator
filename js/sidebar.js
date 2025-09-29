// sidebar.js
const supabaseUrl = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4"; // byt ut
const supabaseKey = "YOUR_ANON_KEY"; // byt ut
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


async function buildSidebar() {
  const sidebar = document.getElementById("sidebarMenu");
  if (!sidebar) {
    console.error("Hittar inte #sidebarMenu i HTML!");
    return;
  }
  sidebar.innerHTML = "<li>Laddar…</li>";

  // Hämta kontinenter
  const { data: continents, error: e1 } = await db
    .from("continents")
    .select("id, name")
    .order("name");

  // Hämta länder
  const { data: countries, error: e2 } = await db
    .from("countries")
    .select("id, name, flag, continent_id")
    .order("name");

  if (e1 || e2) {
    sidebar.innerHTML = `<li style="color:red">Fel: ${(e1 || e2).message}</li>`;
    return;
  }

  // Gruppera länder per kontinent
  const grouped = {};
  countries.forEach(c => {
    (grouped[c.continent_id] ||= []).push(c);
  });

  sidebar.innerHTML = "";

  continents.forEach(cont => {
    const li = document.createElement("li");

    // Knapp för kontinent
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "toggle";
    btn.innerHTML = `<span class="arrow">►</span> ${cont.name}`;

    const ul = document.createElement("ul");
    ul.className = "nested";

    (grouped[cont.id] || []).forEach(c => {
      const cli = document.createElement("li");
      cli.textContent = `${c.flag || ""} ${c.name}`;
      cli.addEventListener("click", ev => {
        ev.stopPropagation();
        loadCities(c.id, c.name, c.flag);
      });
      ul.appendChild(cli);
    });

    btn.addEventListener("click", () => {
      ul.classList.toggle("active");
      btn.querySelector(".arrow").textContent = ul.classList.contains("active") ? "▼" : "►";
    });

    li.appendChild(btn);
    li.appendChild(ul);
    sidebar.appendChild(li);
  });
}

async function loadCities(countryId, countryName, flag) {
  const main = document.getElementById("main");
  if (!main) return;

  main.innerHTML = `<h2>${flag || ""} ${countryName}</h2><p>Laddar städer…</p>`;

  const { data: cities, error } = await db
    .from("cities")
    .select("id, name")
    .eq("country_id", countryId)
    .order("name");

  if (error) {
    main.innerHTML = `<h2>${flag || ""} ${countryName}</h2><p style="color:red">${error.message}</p>`;
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
