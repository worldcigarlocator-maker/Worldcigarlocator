// ===== Supabase Init =====
const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co"; 
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4"; 
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// ======================
// Globals
// ======================
let currentRating = 0;
let lastPlaceId = null;
let lastPhotoReference = null;

// ======================
// Toast function
// ======================
function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerText = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// ======================
// Fill form from place
// ======================
function fillFormFromPlace(place) {
  console.log("📍 Fyller formulär från:", place);

  document.getElementById("name").value = place.name || "";
  document.getElementById("address").value = place.formatted_address || "";

  const comps = place.address_components || [];
  const cityComp = comps.find(c => c.types.includes("locality"));
  const countryComp = comps.find(c => c.types.includes("country"));
  document.getElementById("city").value = cityComp ? cityComp.long_name : "";
  document.getElementById("country").value = countryComp ? countryComp.long_name : "";

  document.getElementById("phone").value = place.formatted_phone_number || "";
  document.getElementById("website").value = place.website || "";

  lastPlaceId = place.place_id || null;

  // Photo preview
  const preview = document.getElementById("photoPreview");
  preview.innerHTML = "";
  if (place.photos && place.photos.length > 0) {
    lastPhotoReference = place.photos[0].getUrl({ maxWidth: 300 });
    const img = document.createElement("img");
    img.src = lastPhotoReference;
    img.style.maxWidth = "300px";
    img.style.borderRadius = "8px";
    preview.appendChild(img);
  }
}

// ======================
// Handle autocomplete event
// ======================
const autocompleteEl = document.getElementById("autocomplete");
autocompleteEl.addEventListener("gmpx-placechange", () => {
  const place = autocompleteEl.getPlace();
  if (place) {
    fillFormFromPlace(place);
  }
});

// ======================
// Add button (paste Maps link)
// ======================
document.getElementById("addBtn").addEventListener("click", () => {
  const link = document.getElementById("mapsLink").value.trim();
  if (!link) {
    showToast("Paste a Google Maps link first", "error");
    return;
  }
  // För enkelhet: bara visa länken i console, kan byggas ut med parsing av placeId
  console.log("ℹ️ Maps link:", link);
  showToast("Maps link parsed (demo)", "info");
});

// ======================
// Save button
// ======================
document.getElementById("saveBtn").addEventListener("click", async () => {
  const name = document.getElementById("name").value.trim();
  const address = document.getElementById("address").value.trim();
  const city = document.getElementById("city").value.trim();
  const country = document.getElementById("country").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const website = document.getElementById("website").value.trim();
  const type = document.querySelector("input[name='type']:checked").value;

  if (!name || !address || !city || !country) {
    showToast("Name, address, city, and country are required", "error");
    return;
  }

  const { error } = await supabase.from("stores").insert([{
    name,
    address,
    city,
    country,
    phone,
    website,
    type,
    rating: currentRating,
    place_id: lastPlaceId,
    photo_reference: lastPhotoReference,
    approved: false
  }]);

  if (error) {
    console.error(error);
    showToast("Failed to save store", "error");
  } else {
    showToast("Store saved! ✅", "success");
    document.querySelector("form")?.reset();
  }
});

// ======================
// Star rating
// ======================
const stars = document.querySelectorAll("#rating span");
if (stars.length === 0) {
  // skapa stjärnor
  const ratingEl = document.getElementById("rating");
  ratingEl.innerHTML = "";
  for (let i = 1; i <= 5; i++) {
    const span = document.createElement("span");
    span.textContent = "★";
    span.dataset.value = i;
    span.style.cursor = "pointer";
    ratingEl.appendChild(span);
  }
  ratingEl.addEventListener("click", e => {
    if (e.target.dataset.value) {
      currentRating = parseInt(e.target.dataset.value);
      [...ratingEl.children].forEach(star => {
        star.style.color = star.dataset.value <= currentRating ? "gold" : "#ccc";
      });
    }
  });
}
