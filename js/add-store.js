// ===== Supabase Init =====
const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co"; 
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4"; 
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

let selectedRating = 0;
let lastPlaceId = null;
let lastPhotoReference = null;

// ============================
// Star rating logic
// ============================
document.querySelectorAll("#starRating span").forEach(star => {
  star.addEventListener("click", () => {
    selectedRating = parseInt(star.dataset.value);
    updateStars();
  });
});

function updateStars() {
  document.querySelectorAll("#starRating span").forEach(star => {
    star.style.color = parseInt(star.dataset.value) <= selectedRating ? "gold" : "#ccc";
  });
}

// ============================
// Toast helper
// ============================
function showToast(msg, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerText = msg;
  document.getElementById("toast-container").appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ============================
// Fill form from Google Place
// ============================
function fillFormFromPlace(place) {
  console.log("ℹ️ Fyller form med place:", place);

  if (!place) {
    showToast("No place found from link", "error");
    return;
  }

  document.getElementById("name").value = place.name || "";
  document.getElementById("address").value = place.formatted_address || "";

  const cityComp = place.address_components?.find(c => c.types.includes("locality"));
  const countryComp = place.address_components?.find(c => c.types.includes("country"));

  document.getElementById("city").value = cityComp ? cityComp.long_name : "";
  document.getElementById("country").value = countryComp ? countryComp.long_name : "";
  document.getElementById("phone").value = place.formatted_phone_number || "";
  document.getElementById("website").value = place.website || "";

  lastPlaceId = place.place_id || null;

  if (place.photos && place.photos.length > 0) {
    lastPhotoReference = place.photos[0].getUrl({ maxWidth: 400 });
    document.getElementById("photoPreview").innerHTML = `<img src="${lastPhotoReference}" style="max-width:200px;border-radius:8px"/>`;
  } else {
    lastPhotoReference = null;
    document.getElementById("photoPreview").innerHTML = "";
  }
}

// ============================
// Parse Google Maps link
// ============================
document.getElementById("addBtn").addEventListener("click", async () => {
  const link = document.getElementById("mapsLink").value.trim();
  if (!link) {
    showToast("Please paste a Google Maps link first", "error");
    return;
  }

  // Extract placeId from link
  const placeIdMatch = link.match(/placeid=([^&]+)/) || link.match(/\/place\/.*\/([^/?]+)/);
  const placeId = placeIdMatch ? placeIdMatch[1] : null;

  if (!placeId) {
    showToast("Could not extract Place ID from link", "error");
    return;
  }

  console.log("🔑 Extracted Place ID:", placeId);

  // ✅ FIX: Always pass a dummy element
  const service = new google.maps.places.PlacesService(document.createElement("div"));

  service.getDetails({ placeId, fields: ["name","formatted_address","address_components","formatted_phone_number","website","photos","place_id"] }, (place, status) => {
    if (status === google.maps.places.PlacesServiceStatus.OK) {
      fillFormFromPlace(place);
    } else {
      console.error("❌ PlacesService error:", status);
      showToast("Google Places lookup failed: " + status, "error");
    }
  });
});

// ============================
// Save to Supabase
// ============================
document.getElementById("saveBtn").addEventListener("click", async () => {
  const name = document.getElementById("name").value.trim();
  const address = document.getElementById("address").value.trim();
  const city = document.getElementById("city").value.trim();
  const country = document.getElementById("country").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const website = document.getElementById("website").value.trim();
  const type = document.querySelector("input[name='type']:checked")?.value || "store";

  if (!name || !address || !city || !country) {
    showToast("Please fill in required fields", "error");
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
    console.error("❌ Supabase insert error:", error);
    showToast("Error saving store", "error");
  } else {
    showToast("✅ Store submitted for review", "success");
    document.querySelector("form")?.reset?.(); // if you later wrap in <form>
    selectedRating = 0;
    updateStars();
  }
});

// ============================
// Google Autocomplete callback
// ============================
window.initAutocomplete = function() {
  console.log("✅ Google Maps API loaded");
  const input = document.getElementById("address");
  if (!input) return;
  const autocomplete = new google.maps.places.Autocomplete(input);
  autocomplete.addListener("place_changed", () => {
    const place = autocomplete.getPlace();
    fillFormFromPlace(place);
  });
};
