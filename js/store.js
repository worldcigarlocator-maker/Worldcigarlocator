// Initiera Supabase
const { createClient } = supabase;
const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";
const supabaseClient = createClient(supabaseUrl, supabaseKey);

// Hämta store-id från URL
const params = new URLSearchParams(window.location.search);
const storeId = params.get("store");

// Element
const nameEl = document.getElementById("storeName");
const addressEl = document.getElementById("storeAddress");
const linkEl = document.getElementById("storeLink");
const ratingSummaryEl = document.getElementById("ratingSummary");
const reviewsList = document.getElementById("reviewsList");
const statusEl = document.getElementById("status");

let selectedRating = 0;

// Ladda butik
async function loadStore() {
  if (!storeId) {
    statusEl.innerText = "❌ No store selected.";
    return;
  }

  const { data: store, error } = await supabaseClient
    .from("stores")
    .select("id, name, address, link")
    .eq("id", storeId)
    .single();

  if (error || !store) {
    statusEl.innerText = "❌ Store not found.";
    return;
  }

  nameEl.innerText = store.name;
  addressEl.innerText = store.address;
  if (store.link) {
    linkEl.href = store.link;
    linkEl.innerText = store.link;
  } else {
    linkEl.style.display = "none";
  }

  loadRatings();
  loadReviews();
}

// Ladda betyg
async function loadRatings() {
  const { data, error } = await supabaseClient
    .from("ratings")
    .select("rating")
    .eq("store_id", storeId);

  if (error) {
    console.error(error);
    ratingSummaryEl.innerText = "❌ Error loading ratings.";
    return;
  }

  if (data.length === 0) {
    ratingSummaryEl.innerText = "No ratings yet.";
    return;
  }

  const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
  ratingSummaryEl.innerText = `⭐ ${avg.toFixed(1)} / 5 (${data.length} votes)`;
}

// Ladda recensioner
async function loadReviews() {
  const { data, error } = await supabaseClient
    .from("ratings")
    .select("rating, review, created_at")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    reviewsList.innerText = "❌ Error loading reviews.";
    return;
  }

  reviewsList.innerHTML = "";
  if (data.length === 0) {
    reviewsList.innerText = "No reviews yet.";
    return;
  }

  data.forEach((rev) => {
    const div = document.createElement("div");
    div.className = "review-card";
    div.innerHTML = `
      <p>⭐ ${rev.rating}</p>
      <p>${rev.review || ""}</p>
      <small>${new Date(rev.created_at).toLocaleString()}</small>
    `;
    reviewsList.appendChild(div);
  });
}

// Hantera stjärnor
const starsEl = document.getElementById("stars");
starsEl.addEventListener("click", (e) => {
  if (e.target.textContent === "★") {
    selectedRating = [...starsEl.children].indexOf(e.target) + 1;
    highlightStars(selectedRating);
  }
});

function highlightStars(n) {
  [...starsEl.children].forEach((star, i) => {
    star.style.color = i < n ? "#b8860b" : "#ccc";
  });
}

// Skicka recension
document.getElementById("submitReview").addEventListener("click", async () => {
  const text = document.getElementById("reviewText").value.trim();
  if (selectedRating === 0) {
    alert("Please select a rating.");
    return;
  }

  const { error } = await supabaseClient.from("ratings").insert([
    { store_id: storeId, rating: selectedRating, review: text },
  ]);

  if (error) {
    console.error(error);
    statusEl.innerText = "❌ Error saving review.";
    return;
  }

  statusEl.innerText = "✅ Review submitted!";
  document.getElementById("reviewText").value = "";
  selectedRating = 0;
  highlightStars(0);

  loadRatings();
  loadReviews();
});

loadStore();
