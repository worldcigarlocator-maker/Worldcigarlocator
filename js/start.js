// Initiera Supabase
const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// ====== Ladda senaste butiker ======
document.addEventListener("DOMContentLoaded", async () => {
  const { data, error } = await supabaseClient
    .from("stores")
    .select("id, name, address, website, cities(name)")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    console.error("Error loading stores:", error);
    return;
  }

  const container = document.getElementById("recentStores");
  if (!container) return;

  container.innerHTML = "";
  data.forEach(store => {
    const div = document.createElement("div");
    div.className = "store-card";
    div.innerHTML = `
      <h3><a href="store.html?id=${store.id}">${store.name}</a></h3>
      <p>${store.address || ""}</p>
      <p>${store.cities?.name || ""}</p>
      ${store.website ? `<a href="${store.website}" target="_blank">Website</a>` : ""}
    `;
    container.appendChild(div);
  });
});
