// ===== Supabase Init =====
const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co"; 
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4"; 
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);


// Variables
let lastPlaceId = null;
let lastPhotoReference = null;
let currentRating = 0;

// Toast
function showToast(msg, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  document.getElementById("toast-container").appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Fill form from Google Place
function fillFormFromPlace(place) {
  document.getElementById("store-name").value = place.name || "";
  document.getElementById("address").value = place.formatted_address || "";
  document.getElementById("city").value = (place.address_components?.find(c => c.types.includes("locality"))?.long_name) || "";
  document.getElementById("country").value = (place.address_components?.find(c => c.types.includes("country"))?.long_name) || "";
  document.getElementById("phone").value = place.formatted_phone_number || "";
  document.getElementById("website").value = place.website || "";

  lastPlaceId = place.place_id || null;
  lastPhotoReference = place.photos?.[0]?.getUrl({maxWidth: 400}) || null;

  const img = document.getElementById("preview-image");
  if (lastPhotoReference) {
    img.src = lastPhotoReference;
    img.style.display = "block";
  } else {
    img.style.display = "none";
  }
}

// Parse Google Maps link manually
function parseMapsLink(link) {
  const match = link.match(/place\/.*?\/(@|data=|placeid=)([^/&]+)/);
  if (link.includes("placeid=")) {
    return link.split("placeid=")[1].split("&")[0];
  }
  return null;
}

// Handle Add button
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("add-btn").addEventListener("click", () => {
    const link = document.getElementById("maps-link").value;
    const placeId = parseMapsLink(link);
    if (placeId) {
      const service = new google.maps.places.PlacesService(document.createElement("div"));
      service.getDetails({ placeId, fields: ["place_id", "name", "formatted_address", "address_components", "photos", "formatted_phone_number", "website"] }, (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
          fillFormFromPlace(place);
        } else {
          showToast("Could not fetch details", "error");
        }
      });
    } else {
      showToast("Please paste a valid Google Maps link", "error");
    }
  });
});

// Save button
document.getElementById("save-btn").addEventListener("click", async () => {
  const name = document.getElementById("store-name").value;
  const address = document.getElementById("address").value;
  const city = document.getElementById("city").value;
  const country = document.getElementById("country").value;
  const phone = document.getElementById("phone").value;
  const website = document.getElementById("website").value;
  const type = document.querySelector("input[name='type']:checked").value;

  if (!name || !address || !city || !country) {
    showToast("Please fill required fields", "error");
    return;
  }

  const { error } = await supabase.from("stores").insert([{
    name, address, city, country, phone, website, type,
    rating: currentRating,
    place_id: lastPlaceId,
    photo_reference: lastPhotoReference,
    approved: false,
    flagged: false
  }]);

  if (error) {
    console.error(error);
    showToast("Error saving store", "error");
  } else {
    showToast("Store saved!", "success");
    document.querySelector("form")?.reset();
    document.getElementById("preview-image").style.display = "none";
    currentRating = 0;
    document.querySelectorAll("#star-rating span").forEach(s => s.classList.remove("active"));
  }
});

// Star rating
document.getElementById("star-rating").innerHTML = "★★★★★".split("").map((s, i) => `<span data-val="${i+1}">★</span>`).join("");
document.querySelectorAll("#star-rating span").forEach(star => {
  star.addEventListener("click", () => {
    currentRating = parseInt(star.dataset.val);
    document.querySelectorAll("#star-rating span").forEach((s, idx) => {
      s.classList.toggle("active", idx < currentRating);
    });
  });
});

// Init autocomplete (for typing directly in maps-link)
function initAutocomplete() {
  const input = document.getElementById("maps-link");
  const autocomplete = new google.maps.places.Autocomplete(input, {
    fields: ["place_id", "name", "formatted_address", "address_components", "photos", "formatted_phone_number", "website"]
  });
  autocomplete.addListener("place_changed", () => {
    const place = autocomplete.getPlace();
    if (place && place.place_id) fillFormFromPlace(place);
  });
}
