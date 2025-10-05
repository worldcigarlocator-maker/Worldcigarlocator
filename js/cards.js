// ==== CONFIG ====
const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==== HÄMTA STORES ====
async function loadStores() {
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("status", "pending"); // eller .eq("status", "approved") sen

  if (error) {
    console.error("❌ Error fetching stores:", error.message);
    return [];
  }
  return data;
}

// ==== RENDER CARDS ====
function renderCards(stores) {
  const grid = document.getElementById("cardGrid");
  grid.innerHTML = "";

  if (!stores || stores.length === 0) {
    grid.innerHTML = "<p style='color:white'>No stores found.</p>";
    return;
  }

  stores.forEach(store => {
    const card = document.createElement("div");
    card.classList.add("card");

    // Badge färg beroende på type
    let badgeClass = "other";
    if (store.type === "store") badgeClass = "store";
    if (store.type === "lounge") badgeClass = "lounge";

    card.innerHTML = `
      <div class="card-header">
        <h2>${store.name || "Unnamed"}</h2>
        <span class="card-type ${badgeClass}">${store.type}</span>
      </div>
      <p class="address">${store.address || ""}</p>
      <p class="location">${store.city || ""}${store.city && store.country ? ", " : ""}${store.country || ""}</p>
      ${store.phone ? `<p class="phone">📞 ${store.phone}</p>` : ""}
      ${store.website ? `<p class="website"><a href="${store.website}" target="_blank">🌐 Website</a></p>` : ""}
      <div class="stars">
        ${renderStars(store.rating)}
      </div>
    `;
    grid.appendChild(card);
  });
}

// ==== RENDER STARS ====
function renderStars(rating) {
  let html = "";
  for (let i = 1; i <= 5; i++) {
    html += `<span class="${i <= (rating || 0) ? "active" : ""}">★</span>`;
  }
  return html;
}

// ==== INIT ====
document.addEventListener("DOMContentLoaded", async () => {
  const stores = await loadStores();
  renderCards(stores);
});
