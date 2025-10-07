// ===== Supabase Init =====
const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co"; 
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4"; // din anon key här
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Ladda butiker
async function loadStores() {
  const { data, error } = await supabase.from("stores").select("*").order("created_at", { ascending: false });

  if (error) {
    console.error("Fel vid hämtning:", error);
    return;
  }

  renderCards(data);
}

// Rendera kort
function renderCards(stores) {
  const container = document.getElementById("store-list");
  container.innerHTML = "";

  stores.forEach((store) => {
    // Badge-logik
    let badgeHtml = "";
    if (store.flagged) {
      badgeHtml = `<span class="badge flagged">🚫 Flagged</span>`;
    } else if (store.approved) {
      badgeHtml = `<span class="badge approved">✅ Approved</span>`;
    } else {
      badgeHtml = `<span class="badge pending">⏳ Pending</span>`;
    }

    // Bildlogik
    let imageUrl;
    if (store.photo_reference) {
      imageUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${store.photo_reference}&key=DIN_GOOGLE_KEY`;
    } else {
      if (store.type === "store") {
        imageUrl = "images/Store.png";
      } else if (store.type === "lounge") {
        imageUrl = "images/lounge.jpeg";
      } else {
        imageUrl = "images/cafe.jpg";
      }
    }

    // Skapa kort
    const card = document.createElement("div");
    card.className = "store-card";
    card.innerHTML = `
      ${badgeHtml}
      <img src="${imageUrl}" alt="${store.name}" class="store-image"/>
      <h3>${store.name}</h3>
      <p>${store.city}, ${store.country}</p>
      <div class="stars">${renderStars(store.rating)}</div>
      <div class="actions">
        ${store.approved ? "" : `<button onclick="approveStore('${store.id}')">Approve</button>`}
        <button onclick="deleteStore('${store.id}')">Delete</button>
      </div>
    `;
    container.appendChild(card);
  });
}

// Rendera stjärnor
function renderStars(rating) {
  if (!rating) return "⭐️⭐️⭐️⭐️⭐️";
  const full = Math.round(rating);
  return "⭐️".repeat(full) + "☆".repeat(5 - full);
}

// Godkänn
async function approveStore(id) {
  const { error } = await supabase.from("stores").update({ approved: true }).eq("id", id);
  if (error) {
    console.error("Fel vid approve:", error);
  } else {
    loadStores();
  }
}

// Ta bort
async function deleteStore(id) {
  if (!confirm("Är du säker på att du vill ta bort?")) return;
  const { error } = await supabase.from("stores").delete().eq("id", id);
  if (error) {
    console.error("Fel vid delete:", error);
  } else {
    loadStores();
  }
}

// Start
loadStores();
