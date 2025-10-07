// ===== Supabase Init =====
const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co"; 
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4"; 
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);


let selectedRating = 0;
let lastPlaceId = null;
let lastPhotoReference = null;

// =========================
// Toast helper
// =========================
function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerText = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// =========================
// Star rating
// =========================
document.querySelectorAll("#starRating span").forEach(star => {
  star.addEventListener("click", () => {
    selectedRating = parseInt(star.getAttribute("data-value"));
    document.querySelectorAll("#starRating span").forEach(s => {
      s.classList.toggle("selected", parseInt(s.getAttribute("data-value")) <= selectedRating);
    });
  });
});

// =========================
// Fill form with place data
// =========================
function fillFormFromPlace(place) {
  if (!place) return;

  document.getElementById("name").value = place.name || "";
  document.getElementById("address").value = place.formatted_address || "";

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

  // spara placeId
  lastPlaceId = place.place_id || null;

  // visa + spara photo_reference om den finns
  lastPhotoReference = null;
  const photoPreview = document.getElementById("photoPreview");
  photoPreview.innerHTML = "";
  if (place.photos && place.photos.length > 0) {
    lastPhotoReference = place.photos[0].photo_reference;
    const img = document.createElement("img");
    img.src = place.photos[0].getUrl({ maxWidth: 400, maxHeight: 300 });
    photoPreview.appendChild(img);
  }
}

// =========================
// Parse Google Maps link
// =========================
async function handleAdd() {
  const link = document.getElementById("mapsLink").value.trim();
  if (!link) {
    showToast("Please paste a Google Maps link", "error");
    return;
  }

  const placeIdMatch = link.match(/!1s([^!]+)!/);
  let placeId = placeIdMatch ? decodeURIComponent(placeIdMatch[1]) : null;

  if (!placeId) {
    showToast("Could not extract Place ID from link", "error");
    return;
  }

  console.log("Extracted placeId:", placeId);

  const service = new google.maps.places.PlacesService(document.createElement('div'));
  service.getDetails(
    {
      placeId: placeId,
      fields: ["place_id", "name", "formatted_address", "address_components", "geometry", "photos"]
    },
    (place, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK) {
        fillFormFromPlace(place);
      } else {
        console.error("PlacesService failed:", status);
        showToast("Google Maps lookup failed", "error");
      }
    }
  );
}

document.getElementById("addBtn").addEventListener("click", handleAdd);

// =========================
// Save to Supabase
// =========================
async function saveStore() {
  const name = document.getElementById("name").value.trim();
  const address = document.getElementById("address").value.trim();
  const city = document.getElementById("city").value.trim();
  const country = document.getElementById("country").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const website = document.getElementById("website").value.trim();
  const type = document.querySelector("input[name='type']:checked")?.value || null;

  if (!name || !address || !city || !country) {
    showToast("Please fill in required fields", "error");
    return;
  }

  const { error } = await supabase.from("stores").insert([
    {
      name,
      address,
      city,
      country,
      phone,
      website,
      type,
      rating: selectedRating,
      place_id: lastPlaceId,
      photo_reference: lastPhotoReference,
      approved: false,
      flagged: false
    }
  ]);

  if (error) {
    console.error(error);
    showToast("Error saving store", "error");
  } else {
    showToast("Store submitted for review", "success");
    document.querySelector("form")?.reset?.();
    document.getElementById("photoPreview").innerHTML = "";
    selectedRating = 0;
    lastPlaceId = null;
    lastPhotoReference = null;
  }
}

document.getElementById("saveBtn").addEventListener("click", saveStore);

// =========================
// Init for Autocomplete
// =========================
function initAutocomplete() {
  console.log("Google Maps API loaded");
  const input = document.getElementById("address");
  const autocomplete = new google.maps.places.Autocomplete(input);
  autocomplete.addListener("place_changed", () => {
    const place = autocomplete.getPlace();
    fillFormFromPlace(place);
  });
}

window.initAutocomplete = initAutocomplete;
