// === Supabase init ===
const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);


// Bygg sidomenyn
async function buildSidebar() {
  console.log("🔄 Hämtar kontinenter...");

  const { data: continents, error: cError } = await supabase
    .from("continents")
    .select("id, name")
    .order("name", { ascending: true });

  if (cError) {
    console.error("❌ Fel vid laddning av kontinenter:", cError);
    return;
  }

  const menu = document.getElementById("sidebarMenu");
  menu.innerHTML = "";

  for (const continent of continents) {
    // Kontinent-knapp
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.textContent = continent.name;
    btn.classList.add("continent-btn"); // matchar din CSS
    li.appendChild(btn);

    // UL för länder
    const countryList = document.createElement("ul");
    countryList.classList.add("country-list"); // egen klass
    countryList.style.display = "none";
    li.appendChild(countryList);

    // Klicka på kontinent → hämta länder
    btn.addEventListener("click", async () => {
      if (countryList.childElementCount === 0) {
        console.log(`🔄 Hämtar länder i ${continent.name}...`);

        const { data: countries, error: coError } = await supabase
          .from("countries")
          .select("id, name")
          .eq("continent_id", continent.id)
          .order("name", { ascending: true });

        if (coError) {
          console.error("❌ Fel vid laddning av länder:", coError);
          return;
        }

        countries.forEach(country => {
          const cli = document.createElement("li");
          cli.textContent = country.name;
          cli.classList.add("country-item"); // för styling
          countryList.appendChild(cli);
        });
      }

      // Toggle expand/collapse
      countryList.style.display =
        countryList.style.display === "none" ? "block" : "none";
    });

    menu.appendChild(li);
  }
}

// ✅ Kör när sidan är laddad
document.addEventListener("DOMContentLoaded", buildSidebar);
