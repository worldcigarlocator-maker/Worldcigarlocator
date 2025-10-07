// ===== Supabase Init =====
const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co"; 
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4"; 
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);


// =======================
// Variabler
// =======================
let currentRating = 0;
let lastPlaceId = null;
let lastPhotoReference = null;

// =======================
// Toast
// =======================
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// =======================
// Star rating
// =======================
document.querySelectorAll("#rating span").forEach((star, idx) => {
  star.addEventListener("click", () => {
    currentRating = idx + 1;
    document.querySelectorAll("#rating span").forEach((s, i) => {
      s.classList.toggle("active", i < currentRating);
    });
  });
});

// =======================
// Fallback photo preview
// =======================
function showPhotoPreview(photoReference) {
  const container = document.getElementById("photoPreview");
  container.innerHTML = "";

  let imgUrl;
  if (photoReference) {
    imgUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoReference}&key=DIN_GOOGLE_KEY`;
  } else {
    imgUrl = "img/placeholder.png"; // ✅ fallback
  }

  const img = document.createElement("img");
  img.src = imgUrl;
  img.style.maxWidth = "100%";
  img.style.borderRadius = "8px";
  container.appendChild(img);
}

// =======================
// Fyll formulär från Place
// =======================
function fillFormFromPlace(place) {
  if (!place) return;

  document.getElementById("name").value = place.name || "";
  document.getElementById("address").value = place.formatted_address || "";
  document.getElementById("city").value =
    place.address_components?.find(c => c.types.includes("locality"))?.long_name || "";
  document.getElementById("country").value =
    place.address_components?.find(c => c.types.includes("country"))?.long_name || "";

  lastPlaceId = place.place_id || null;
  lastPhotoReference = place.photos && place.photos.length > 0 ? place.photos[0].photo_reference : null;

  showPhotoPreview(lastPhotoReference);
}

// =======================
// Parse Maps link
// =======================
async function handleAddFromLink() {
  const link = document.getElementById("mapsLink").value.trim();
  const match = link.match(/place\/.*\/(.*?)\?/);
  if (!match) {
    showToast("Invalid Maps link", "error");
    return;
  }
  const placeId = match[1];
  const service = new google.maps.places.PlacesService(document.createElement("div"));
  service.getDetails({ placeId, fields: ["name", "formatted_address", "address_components", "place_id", "photos"] },
    (place, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK) {
        fillFormFromPlace(place);
      } else {
        showToast("Could not fetch place details", "error");
      }
    }
  );
}

// =======================
// Save till Supabase
// =======================
async function handleSave() {
  const name = document.getElementById("name").value.trim();
  const address = document.getElementById("address").value.trim();
  const city = document.getElementById("city").value.trim();
  const country = document.getElementById("country").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const website = document.getElementById("website").value.trim();
  const type = document.querySelector("input[name='type']:checked").value;

  if (!name || !address || !city || !country) {
    showToast("Please fill required fields", "error");
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
      rating: currentRating,
      place_id: lastPlaceId,
      photo_reference: lastPhotoReference,
      approved: false
    }
  ]);

  if (error) {
    showToast("Error saving store", "error");
    console.error(error);
  } else {
    showToast("Store saved for review", "success");
    document.querySelector("form")?.reset();
    document.getElementById("photoPreview").innerHTML = "";
    currentRating = 0;
    lastPlaceId = null;
    lastPhotoReference = null;
  }
}

// =======================
// Events
// =======================
document.getElementById("addBtn").addEventListener("click", handleAddFromLink);
document.getElementById("saveBtn").addEventListener("click", handleSave);

// =======================
// Autocomplete element
// =======================
document.getElementById("autocomplete").addEventListener("gmpx-placechange", (e) => {
  const place = e.target.value;
  if (!place) return;
  const service = new google.maps.places.PlacesService(document.createElement("div"));
  service.getDetails({ placeId: place.id, fields: ["name", "formatted_address", "address_components", "place_id", "photos"] },
    (placeDetails, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK) {
        fillFormFromPlace(placeDetails);
      }
    }
  );
});
