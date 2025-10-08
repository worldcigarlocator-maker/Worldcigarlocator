// ===== Supabase Init =====
const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co"; 
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4"; 
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

let selectedRating = 0;
let lastPlaceId = null;
let lastPhotoReference = null;

// Toast helper
function showToast(msg, type = "success") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerText = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// Fill form from PlaceResult
function fillFormFromPlace(place) {
  console.log("PlaceResult:", place);

  document.getElementById("name").value = place.name || "";
  document.getElementById("address").value = place.formatted_address || "";
  document.getElementById("city").value = place.address_components?.find(c => c.types.includes("locality"))?.long_name || "";
  document.getElementById("country").value = place.address_components?.find(c => c.types.includes("country"))?.long_name || "";
  document.getElementById("phone").value = place.formatted_phone_number || "";
  document.getElementById("website").value = place.website || "";

  lastPlaceId = place.place_id || null;
  lastPhotoReference = place.photos?.[0]?.photo_reference || null;

  const preview = document.getElementById("preview-image");
  if (lastPhotoReference) {
    preview.src = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${lastPhotoReference}&key=YOUR_GOOGLE_KEY`;
    preview.style.display = "block";
  } else {
    preview.style.display = "none";
  }
}

// Rating stars
document.querySelectorAll(".star").forEach(star => {
  star.addEventListener("click", () => {
    selectedRating = parseInt(star.dataset.value);
    document.querySelectorAll(".star").forEach(s => s.classList.remove("selected"));
    for (let i = 0; i < selectedRating; i++) {
      document.querySelectorAll(".star")[i].classList.add("selected");
    }
  });
});

// Save store
document.getElementById("save-btn").addEventListener("click", async () => {
  const name = document.getElementById("name").value.trim();
  const address = document.getElementById("address").value.trim();
  const city = document.getElementById("city").value.trim();
  const country = document.getElementById("country").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const website = document.getElementById("website").value.trim();
  const type = document.querySelector("input[name='type']:checked")?.value || null;

  if (!name || !address || !city || !country) {
    showToast("Please fill in all required fields.", "error");
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
    rating: selectedRating || null,
    approved: false,
    flagged: false,
    place_id: lastPlaceId,
    photo_reference: lastPhotoReference
  }]);

  if (error) {
    console.error(error);
    showToast("Error while saving!", "error");
  } else {
    showToast("Store saved for review ✅");
  }
});

// Autocomplete integration
window.addEventListener("DOMContentLoaded", () => {
  const autocompleteEl = document.getElementById("autocomplete");
  autocompleteEl.addEventListener("gmpx-placechange", () => {
    const place = autocompleteEl.getPlace();
    if (place) fillFormFromPlace(place);
  });
});
