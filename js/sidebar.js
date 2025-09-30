// ====== Konfigurera Supabase ======
const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co"; // byt till ditt eget om annorlunda
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4"; // byt till din riktiga anon key

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ====== Bygg sidomenyn ======
async function buildSidebar() {
  console.log("🔄 Hämtar kontinenter...");

  const sidebarMenu = document.getElementById("sidebarMenu");
  sidebarMenu.innerHTML = ""; // rensa om något redan finns

  // Hämta kontinenter
  const { data: continents, error } = await supabase
    .from("continents")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("⚠️ Fel vid hämtning av kontinenter:", error);
    sidebarMenu.innerHTML = "<li>Fel vid hämtning av data</li>";
    return;
  }

  console.log("✅ Kontinenter hämtade:", continents);

  // Bygg listan
  continents.forEach(continent => {
    const li = document.createElement("li");
    li.textContent = continent.name;
    sidebarMenu.appendChild(li);
  });
}

// Kör när sidan är laddad
document.addEventListener("DOMContentLoaded", buildSidebar);
