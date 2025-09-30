// === Supabase init ===
const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// === Build Sidebar ===
async function buildSidebar() {
  console.log("🔄 Loading continents...");

  const { data, error } = await supabase
    .from("continents")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("❌ Error loading continents:", error);
    return;
  }

  const menu = document.getElementById("sidebarMenu");
  menu.innerHTML = ""; // töm först

  data.forEach(continent => {
    const li = document.createElement("li");
    li.textContent = continent.name;
    li.addEventListener("click", () => {
      alert(`🌍 You clicked on ${continent.name}`);
      // Här kan vi lägga till länder senare
    });
    menu.appendChild(li);
  });
}

// === Search ===
document.getElementById("searchBtn").addEventListener("click", () => {
  const query = document.getElementById("searchBox").value.trim();
  if (!query) {
    alert("Please enter a search term.");
    return;
  }
  alert(`🔍 Searching for: ${query}`);
  // Här kan du anropa Supabase stores-tabellen istället för alert
});

// === Add Store ===
document.getElementById("addStoreBtn").addEventListener("click", () => {
  alert("➕ Add Store form coming soon!");
});

// === Init ===
document.addEventListener("DOMContentLoaded", buildSidebar);
