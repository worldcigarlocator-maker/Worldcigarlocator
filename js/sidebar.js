alert("RÄTT sidebar.js laddas!");
console.log("Sidebar laddad från:", SUPABASE_URL);

// ===== Supabase init =====
const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const SUPABASE_ANON_KEY ="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== Bygg sidomenyn =====
async function buildSidebar() {
  const sidebar = document.getElementById("sidebarMenu");
  if (!sidebar) {
    console.error("Hittar inte #sidebarMenu i HTML.");
    return;
  }

  sidebar.innerHTML = "<li>Laddar...</li>";

  // Hämta kontinenter
  const { data: continents, error: errCont } = await supabase
    .from("continents")
    .select("id, name")
    .order("name");

  if (errCont) {
    console.error("Fel vid hämtning av kontinenter:", errCont);
    sidebar.innerHTML = "<li>Kunde inte hämta kontinenter</li>";
    return;
  }

  // Hämta länder
  const { data: countries, error: errCountries } = await supabase
    .from("countries")
    .select("id, name, flag, continent_id")
    .order("name");

  if (errCountries) {
    console.error("Fel vid hämtning av länder:", errCountries);
    sidebar.innerHTML = "<li>Kunde inte hämta länder</li>";
    return;
  }

  // Bygg upp menyn
  sidebar.innerHTML = "";

  continents.forEach((cont) => {
    const contLi = document.createElement("li");
    const contBtn = document.createElement("button");
    contBtn.textContent = cont.name;
    contBtn.classList.add("toggle");
    contBtn.addEventListener("click", () => {
      nested.classList.toggle("active");
    });

    contLi.appendChild(contBtn);

    const nested = document.createElement("ul");
    nested.classList.add("nested");

    countries
      .filter((c) => c.continent_id === cont.id)
      .forEach((c) => {
        const countryLi = document.createElement("li");
        countryLi.textContent = `${c.flag || ""} ${c.name}`;
        nested.appendChild(countryLi);
      });

    contLi.appendChild(nested);
    sidebar.appendChild(contLi);
  });
}

document.addEventListener("DOMContentLoaded", buildSidebar);
console.log("Sidebar.js laddad! Använder URL:", SUPABASE_URL);
