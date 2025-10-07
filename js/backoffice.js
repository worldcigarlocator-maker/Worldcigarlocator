// ===== Supabase Init =====
const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co"; 
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4"; // din anon key här
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);


// =======================
// Hämta stores
// =======================
async function loadStores(view = "pending") {
  let query = supabase.from("stores").select("*").order("created_at", { ascending: false });

  if (view === "pending") {
    query = query.eq("approved", false);
  } else if (view === "approved") {
    query = query.eq("approved", true);
  }

  const { data, error } = await query;
  if (error) {
    console.error(error);
    return;
  }

  renderStores(data, view);
}

// =======================
// Rendera stores
// =======================
function renderStores(stores, view) {
  const container = document.getElementById(`${view}-stores`);
  container.innerHTML = "";

  if (!stores || stores.length === 0) {
    container.innerHTML = `<p class="empty">No stores in this view</p>`;
    return;
  }

  stores.forEach(store => {
    container.appendChild(renderStoreCard(store, view));
  });
}

// =======================
// Rendera kort
// =======================
function renderStoreCard(store, view) {
  const card = document.createElement("div");
  card.className = "store-card";

  // Bild med fallback
  let imgUrl;
  if (store.photo_reference) {
    imgUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${store.photo_reference}&key=DIN_GOOGLE_KEY`;
  } else {
    imgUrl = "img/placeholder.png"; // ✅ fallback
  }

  // Rating stjärnor
  let stars = "";
  for (let i = 0; i < 5; i++) {
    stars += `<span class="star ${i < (store.rating || 0) ? "active" : ""}">★</span>`;
  }

  card.innerHTML = `
    <img src="${imgUrl}" alt="Store image" class="store-image">
    <div class="store-info">
      <h3>${store.name || "Unnamed"}</h3>
      <p>${store.address || ""}</p>
      <p>${store.city || ""}, ${store.country || ""}</p>
      <div class="stars">${stars}</div>
      <div class="badges">
        ${store.approved ? `<span class="badge approved">Approved ✅</span>` : `<span class="badge pending">Pending ⏳</span>`}
        ${store.flagged ? `<span class="badge flagged">🚫 Flagged</span>` : ""}
      </div>
    </div>
    <div class="store-actions">
      ${view === "pending" ? `<button class="approve-btn">Approve</button>` : ""}
      <button class="delete-btn">Delete</button>
    </div>
  `;

  // Event listeners
  if (view === "pending") {
    card.querySelector(".approve-btn").addEventListener("click", () => approveStore(store.id));
  }
  card.querySelector(".delete-btn").addEventListener("click", () => deleteStore(store.id));

  return card;
}

// =======================
// Approve
// =======================
async function approveStore(id) {
  const { error } = await supabase.from("stores").update({ approved: true }).eq("id", id);
  if (error) {
    console.error(error);
  } else {
    loadStores("pending");
    loadStores("approved");
  }
}

// =======================
// Delete
// =======================
async function deleteStore(id) {
  const { error } = await supabase.from("stores").delete().eq("id", id);
  if (error) {
    console.error(error);
  } else {
    loadStores("pending");
    loadStores("approved");
  }
}

// =======================
// Init
// =======================
document.addEventListener("DOMContentLoaded", () => {
  loadStores("pending");
  loadStores("approved");
});
