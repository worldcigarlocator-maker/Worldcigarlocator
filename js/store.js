// Initiera Supabase
const { createClient } = supabase;
const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";
const supabaseClient = createClient(supabaseUrl, supabaseKey);

// Hämta store ID från URL (?store=xxx)
const params = new URLSearchParams(window.location.search);
const storeId = params.get("store");

// Element
const storeNameEl = document.getElementById("store-name");
const storeAddressEl = document.getElementById("store-address");
const storeLinkEl = document.getElementById("store-link");
const ratingSummaryEl = document.getElementById("rating-summary");
const reviewsListEl = document.getElementById("reviews-list");
const statusEl = document.getElementById("status");
const starRatingEl = document.getElementById("star-rating");

let selectedRating = 0;

// Funktion: bygg stjärnor (inkl halvor)
function buildStars(avg) {
  const fullStars = Math.floor(avg);
  const halfStar = avg % 1 >= 0.5 ? 1 : 0;
  const emptyStars = 5 - fullStars - halfStar;

  let starsHTML = "";

  for (let i = 0; i < fullStars; i++) {
    starsHTML += `<span class="star full">★</span>`;
  }
  if (halfStar) {
    starsHTML += `<span class="star half">★</span>`;
  }
  for (let i = 0; i < emptyStars; i++) {
    starsHTML += `<span class="star empty">★</span>`;
  }

  return starsHTML;
}

// Ladda butiksinfo
async function loadStore() {
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("id", storeId)
    .single();

  if (error || !data) {
    storeNameEl.textContent = "Store not found";
    return;
  }

  storeNameEl.textContent = data.name;
  storeAddressEl.textContent = data.address;
  storeLinkEl.textContent = data.link || "";
  if (data.link) {
    storeLinkEl.href = data.link;
    storeLinkEl.textContent = "Website";
  }
}

// Ladda rating-sammanfattning
async function loadRatingSummary() {
  const { data, error } = await supabase
    .from("store_ratings_summary")
    .select("*")
    .eq("store_id", storeId)
    .single();

  if (error || !data) {
    ratingSummaryEl.textContent = "No ratings yet";
    return;
  }

  ratingSummaryEl.innerHTML = `
    <div class="stars">${buildStars(data.avg_rating || 0)}</div>
    <p>${(data.avg_rating || 0).toFixed(1)} / 5 (${data.total_ratings} ratings, ${data.total_reviews} reviews)</p>
  `;
}

// Ladda recensioner
async function loadReviews() {
  const { data, error } = await supabase
    .from("ratings")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (error) {
    reviewsListEl.textContent = "Could not load reviews";
    return;
  }

  if (data.length === 0) {
    reviewsListEl.textContent = "No reviews yet";
    return;
  }

  reviewsListEl.innerHTML = data
    .map(
      (r) => `
      <div class="review">
        <div class="stars">${buildStars(r.rating)}</div>
        <p>${r.review || ""}</p>
      </div>`
    )
    .join("");
}

// Rendera interaktiva stjärnor för recension
function renderInteractiveStars() {
  starRatingEl.innerHTML = "";
  for (let i = 1; i <= 5; i++) {
    const span = document.createElement("span");
    span.textContent = "★";
    span.classList.add("star", "empty");
    span.addEventListener("click", () => {
      selectedRating = i;
      updateStarDisplay();
    });
    starRatingEl.appendChild(span);
  }
}

function updateStarDisplay() {
  [...starRatingEl.children].forEach((span, idx) => {
    span.className = "star";
    if (idx < selectedRating) {
      span.classList.add("full");
    } else {
      span.classList.add("empty");
    }
  });
}

// Skicka in recension
async function submitReview() {
  if (!selectedRating) {
    statusEl.textContent = "Please select a rating";
    return;
  }

  const reviewText = document.getElementById("review-text").value;

  const { error } = await supabase.from("ratings").insert({
    store_id: storeId,
    rating: selectedRating,
    review: reviewText,
  });

  if (error) {
    statusEl.textContent = "Error saving review";
    return;
  }

  statusEl.textContent = "Review saved!";
  document.getElementById("review-text").value = "";
  selectedRating = 0;
  updateStarDisplay();

  loadRatingSummary();
  loadReviews();
}

// Init
document.getElementById("submit-review").addEventListener("click", submitReview);

loadStore();
loadRatingSummary();
loadReviews();
renderInteractiveStars();
