// ==== CONFIG ====
const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// === Ladda approved stores ===
async function loadStores() {
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Fel vid hämtning:", error.message);
    return;
  }

  renderCards(data);
}

// === Rendera cards ===
function renderCards(stores) {
  const container = document.getElementById("cardGrid");
  container.innerHTML = "";

  stores.forEach(store => {
    // 🖼️ fallback-bild beroende på typ
    let image = store.image;
    if (!image) {
      if (store.type === "store") {
        image = "images/Store.png";
      } else if (store.type === "lounge") {
        image = "images/Lounge.jpeg";
      } else {
        image = "images/Cafe.jpg";
      }
    }

    // ⭐ rating
    const stars = store.rating
      ? "★".repeat(store.rating) + "☆".repeat(5 - store.rating)
      : "Ej betygsatt";

    // 🏷️ badge färg
    let badgeClass = "";
    if (store.type === "store") badgeClass = "store";
    if (store.type === "lounge") badgeClass = "lounge";
    if (store.type === "other") badgeClass = "other";

    // ✨ Gör första bokstaven stor
    const typeLabel =
      store.type.charAt(0).toUpperCase() + store.type.slice(1).toLowerCase();

    // ✂️ Trunkera namn om för långt
    let displayName = store.name || "";
    if (displayName.length > 30) {
      displayName = displayName.substring(0, 30) + "...";
    }

    // 📦 card HTML
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <img src="${image}" alt="${store.name}">
      <div class="card-content">
        <span class="card-type ${badgeClass}">${typeLabel}</span>
        <h2 title="${store.name}">${displayName}</h2>
        <p>${store.address || ""}</p>
        <p>${store.city || ""}${store.city && store.country ? ", " : ""}${store.country || ""}</p>
        <p>${stars}</p>
        ${store.phone ? `<p>📞 ${store.phone}</p>` : ""}
        ${store.website ? `<p><a href="${store.website}" target="_blank">🌐 Webbplats</a></p>` : ""}
      </div>
    `;

    container.appendChild(card);
  });
}

// === Init ===
document.addEventListener("DOMContentLoaded", loadStores);
