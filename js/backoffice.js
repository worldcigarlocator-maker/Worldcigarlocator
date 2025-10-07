// ===== Supabase Init =====
const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co"; 
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4"; // din anon key här
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

async function loadStores() {
  const { data, error } = await supabaseClient
    .from("stores")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading stores:", error);
    return;
  }

  renderStores(data);
}

function renderStores(stores) {
  const container = document.getElementById("store-container");
  container.innerHTML = "";

  stores.forEach((store) => {
    const card = renderStoreCard(store);
    container.appendChild(card);
  });
}

function renderStoreCard(store) {
  // Bild med fallback
  let imgUrl;
  if (store.photo_reference) {
    imgUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${store.photo_reference}&key=DIN_GOOGLE_KEY`;
  } else {
    if (store.type === "store") {
      imgUrl = "images/Store.png";   // stort S
    } else if (store.type === "lounge") {
      imgUrl = "images/lounge.jpeg";
    } else {
      imgUrl = "images/cafe.jpg";
    }
  }

  const card = document.createElement("div");
  card.className = "store-card";

  card.innerHTML = `
    <div class="store-image">
      <img src="${imgUrl}" alt="${store.name}">
    </div>
    <div class="store-details">
      <h3>${store.name}</h3>
      <p>${store.address}, ${store.city}, ${store.country}</p>
      <div class="stars">${renderStars(store.rating)}</div>
      <div class="badges">
        ${store.flagged ? `<span class="badge flagged">🚫 Flagged</span>` : ""}
        ${store.approved ? `<span class="badge approved">✅ Approved</span>` : `<span class="badge pending">⏳ Pending</span>`}
      </div>
    </div>
    <div class="store-actions">
      ${!store.approved ? `<button class="approve-btn" data-id="${store.id}">Approve</button>` : ""}
      <button class="delete-btn" data-id="${store.id}">Delete</button>
    </div>
  `;

  // Event listeners
  const approveBtn = card.querySelector(".approve-btn");
  if (approveBtn) {
    approveBtn.addEventListener("click", () => approveStore(store.id));
  }

  const deleteBtn = card.querySelector(".delete-btn");
  deleteBtn.addEventListener("click", () => deleteStore(store.id));

  return card;
}

function renderStars(rating) {
  if (!rating) return "";
  let stars = "";
  for (let i = 1; i <= 5; i++) {
    stars += `<span class="star ${i <= rating ? "filled" : ""}">★</span>`;
  }
  return stars;
}

async function approveStore(id) {
  const { error } = await supabaseClient
    .from("stores")
    .update({ approved: true })
    .eq("id", id);

  if (error) {
    console.error("Error approving store:", error);
    return;
  }
  loadStores();
}

async function deleteStore(id) {
  const { error } = await supabaseClient
    .from("stores")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting store:", error);
    return;
  }
  loadStores();
}

// Init
loadStores();
