// ===== Supabase Init =====
const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co"; 
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4"; 
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);


// === State ===
let selectedRating = 0;
let lastPlaceId = null;
let lastPhotoReference = null;

// === Toast helper ===
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerText = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// === Star rating ===
document.querySelectorAll(".star").forEach(star => {
  star.addEventListener("click", () => {
    selectedRating = parseInt(star.getAttribute("data-value"));
    document.querySelectorAll(".star").forEach(s => {
      s.classList.toggle("selected", parseInt(s.getAttribute("data-value")) <= selectedRating);
    });
  });
});

// === Fyll formulär från Google Place ===
function fillFormFromPlace(place) {
  if (!place) return;

  document.getElementById("name").value = place.name || "";
  document.getElementById("address").value = place.formatted_address || "";

  // City & country från address_components
  if (place.address_components) {
    const cityComp = place.address_components.find(c => c.types.includes("locality"));
    const countryComp = place.address_components.find(c => c.types.includes("country"));
    document.getElementById("city").value = cityComp ? cityComp.long_name : "";
    document.getElementById("country").value = countryComp ? countryComp.long_name : "";
  }

  // Phone / website
  document.getElementById("phone").value = place.formatted_phone_number || "";
  document.getElementById("website").value = place.website || "";

  // Photo
  const img = document.getElementById("preview-image");
  if (place.photos && place.photos.length > 0) {
    const photoUrl = place.photos[0].getUrl({ maxWidth: 400 });
    img.src = photoUrl;
    img.style.display = "block";   // 👉 visa
    lastPhotoReference = place.photos[0].photo_reference;
  } else {
    img.src = "";
    img.style.display = "none";    // 👉 dölj helt
    lastPhotoReference = null;
  }

  lastPlaceId = place.place_id || null;
}

// === Parse Maps-länk (Add-knappen) ===
document.getElementById("addBtn").addEventListener("click", async () => {
  const link = document.getElementById("mapsLink").value.trim();
  if (!link) return showToast("Please paste a Google Maps link", "error");

  let placeId = null;
  const match = link.match(/!1s([^!]+)/);
  if (match) placeId = match[1];
  if (!placeId) {
    showToast("Could not extract place ID from link", "error");
    return;
  }

  const service = new google.maps.places.PlacesService(document.createElement("div"));
  service.getDetails({ placeId, fields: ["place_id","name","formatted_address","address_components","formatted_phone_number","website","photos"] },
    (place, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK) {
        fillFormFromPlace(place);
      } else {
        console.error("PlacesService error:", status);
        showToast("Failed to fetch place details", "error");
      }
    });
});

// === Save store ===
document.getElementById("saveBtn").addEventListener("click", async () => {
  // Kontrollfråga
  if (!confirm("Have you checked that everything is correct?")) return;

  const store = {
    name: document.getElementById("name").value.trim(),
    address: document.getElementById("address").value.trim(),
    city: document.getElementById("city").value.trim(),
    country: document.getElementById("country").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    website: document.getElementById("website").value.trim(),
    type: document.querySelector('input[name="type"]:checked')?.value || "other",
    rating: selectedRating || null,
    approved: false,
    flagged: false,
    flag_reason: null,
    place_id: lastPlaceId,
    photo_reference: lastPhotoReference
  };

  const { error } = await supabase.from("stores").insert([store]);
  if (error) {
    console.error(error);
    showToast("Error saving store", "error");
  } else {
    showToast("Store submitted for review ✅", "success");
    resetForm();
  }
});

// === Reset form ===
function resetForm() {
  document.getElementById("mapsLink").value = "";
  ["name","address","city","country","phone","website"].forEach(id => {
    document.getElementById(id).value = "";
  });

  document.querySelectorAll(".star").forEach(s => s.classList.remove("selected"));
  selectedRating = 0;

  const img = document.getElementById("preview-image");
  img.src = "";
  img.style.display = "none";

  lastPlaceId = null;
  lastPhotoReference = null;
}

// === Autocomplete ===
function initAutocomplete() {
  const autocompleteInput = document.querySelector("gmpx-place-autocomplete");
  if (!autocompleteInput) return;

  autocompleteInput.addEventListener("gmpx-placechange", () => {
    const place = autocompleteInput.value;
    if (autocompleteInput.getPlace) {
      const p = autocompleteInput.getPlace();
      fillFormFromPlace(p);
    }
  });
}
window.initAutocomplete = initAutocomplete;
