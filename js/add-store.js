// ===== Supabase Init =====
const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co"; 
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4"; 
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);


let selectedRating = 0;
let lastPlaceId = null;
let lastPhotoReference = null;

// Toast helper
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerText = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Fill form from PlaceResult
function fillFormFromPlace(place) {
  if (!place) return;
  document.getElementById("name").value = place.name || "";
  document.getElementById("address").value = place.formatted_address || "";
  document.getElementById("phone").value = place.formatted_phone_number || "";
  document.getElementById("website").value = place.website || "";

  let city = "";
  let country = "";
  if (place.address_components) {
    place.address_components.forEach(c => {
      if (c.types.includes("locality")) city = c.long_name;
      if (c.types.includes("country")) country = c.long_name;
    });
  }
  document.getElementById("city").value = city;
  document.getElementById("country").value = country;

  lastPlaceId = place.place_id || null;
  lastPhotoReference = (place.photos && place.photos.length > 0) 
    ? place.photos[0].photo_reference 
    : null;

  const img = document.getElementById("preview-image");
  if (lastPhotoReference) {
    img.src = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${lastPhotoReference}&key=DIN_GOOGLE_KEY`;
    img.style.display = "block";
  } else {
    img.style.display = "none";
  }
}

// Handle Add button → parse Maps link manually
document.getElementById("add-btn").addEventListener("click", () => {
  const input = document.getElementById("place-autocomplete");
  const val = input.value.trim();
  if (!val) return showToast("Please enter a Google Maps link or search", "error");

  // Extract place ID from link
  const match = val.match(/place\/.*?\/(.*?)\?/) || val.match(/placeid=(.*)/);
  if (!match) return showToast("Invalid Google Maps link", "error");

  const placeId = match[1];
  const service = new google.maps.places.PlacesService(document.createElement("div"));
  service.getDetails({ placeId, fields: ["name","formatted_address","address_components","formatted_phone_number","website","place_id","photos"] }, (place, status) => {
    if (status === google.maps.places.PlacesServiceStatus.OK) {
      fillFormFromPlace(place);
    } else {
      showToast("Failed to fetch place details", "error");
    }
  });
});

// Handle autocomplete (new API element)
window.addEventListener("DOMContentLoaded", () => {
  const el = document.getElementById("place-autocomplete");
  el.addEventListener("gmpx-placechange", () => {
    const place = el.value;
    // Get details via PlacesService
    const service = new google.maps.places.PlacesService(document.createElement("div"));
    service.getDetails({ placeId: place.id, fields: ["name","formatted_address","address_components","formatted_phone_number","website","place_id","photos"] }, (res, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK) {
        fillFormFromPlace(res);
      }
    });
  });
});

// Save button
document.getElementById("save-btn").addEventListener("click", async () => {
  const name = document.getElementById("name").value.trim();
  const address = document.getElementById("address").value.trim();
  const city = document.getElementById("city").value.trim();
  const country = document.getElementById("country").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const website = document.getElementById("website").value.trim();
  const type = document.querySelector('input[name="type"]:checked').value;

  if (!name || !address || !city || !country) {
    return showToast("Please fill in all required fields", "error");
  }

  const { error } = await supabase.from("stores").insert([{
    name, address, city, country, phone, website, type,
    rating: selectedRating,
    place_id: lastPlaceId,
    photo_reference: lastPhotoReference,
    approved: false,
    flagged: false
  }]);

  if (error) {
    showToast("Error saving store", "error");
    console.error(error);
  } else {
    showToast("Store saved for review!", "success");
    document.querySelector("form")?.reset();
    document.getElementById("preview-image").style.display = "none";
  }
});

// Rating stars
document.querySelectorAll("#star-rating span").forEach(star => {
  star.addEventListener("click", () => {
    selectedRating = parseInt(star.dataset.value);
    document.querySelectorAll("#star-rating span").forEach(s => {
      s.classList.toggle("active", parseInt(s.dataset.value) <= selectedRating);
    });
  });
});
