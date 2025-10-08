// ===== Supabase Init =====
const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co"; 
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4"; 
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);


// ============================
// Globals
// ============================
let currentRating = 0;
let lastPlaceId = null;
let lastPhotoReference = null;
let service; // Google PlacesService

// ============================
// Toast helper
// ============================
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ============================
// Rating stars
// ============================
document.querySelectorAll(".star").forEach((star, i) => {
  star.addEventListener("click", () => {
    currentRating = i + 1;
    updateStars();
  });
});

function updateStars() {
  document.querySelectorAll(".star").forEach((star, i) => {
    star.classList.toggle("selected", i < currentRating);
  });
}

// ============================
// Init Google PlacesService
// ============================
function initPlacesService() {
  let hiddenDiv = document.getElementById("places-service-div");
  if (!hiddenDiv) {
    hiddenDiv = document.createElement("div");
    hiddenDiv.id = "places-service-div";
    hiddenDiv.style.display = "none";
    document.body.appendChild(hiddenDiv);
  }
  service = new google.maps.places.PlacesService(hiddenDiv);
}

// ============================
// Autocomplete (ny API)
// ============================
function initAutocomplete() {
  console.log("✅ Google Maps API loaded");
  initPlacesService();

  const autocompleteEl = document.querySelector("gmpx-place-autocomplete");
  if (autocompleteEl) {
    autocompleteEl.addEventListener("gmpx-placechange", async () => {
      const place = autocompleteEl.value;
      if (!place) return;
      console.log("Place selected:", place);

      // Hämta detaljer
      if (place.placeId) {
        fillFormFromPlaceId(place.placeId);
      }
    });
  }
}

// ============================
// Fyll formuläret från Place ID
// ============================
function fillFormFromPlaceId(placeId) {
  lastPlaceId = placeId;

  service.getDetails(
    {
      placeId,
      fields: [
        "name",
        "formatted_address",
        "address_component",
        "formatted_phone_number",
        "website",
        "photos",
      ],
    },
    (place, status) => {
      if (status !== google.maps.places.PlacesServiceStatus.OK || !place) {
        showToast("Kunde inte hämta platsdetaljer", "error");
        return;
      }

      document.getElementById("store-name").value = place.name || "";
      document.getElementById("address").value = place.formatted_address || "";

      const cityComponent = place.address_components?.find(c =>
        c.types.includes("locality")
      );
      const countryComponent = place.address_components?.find(c =>
        c.types.includes("country")
      );

      document.getElementById("city").value = cityComponent?.long_name || "";
      document.getElementById("country").value = countryComponent?.long_name || "";
      document.getElementById("phone").value = place.formatted_phone_number || "";
      document.getElementById("website").value = place.website || "";

      // Bild
      if (place.photos && place.photos.length > 0) {
        lastPhotoReference = place.photos[0].getUrl();
        document.getElementById("preview-image").src = lastPhotoReference;
      } else {
        lastPhotoReference = null;
        document.getElementById("preview-image").src = "";
      }
    }
  );
}

// ============================
// Parse Maps link manuellt
// ============================
document.getElementById("add-btn").addEventListener("click", () => {
  const link = document.getElementById("maps-link").value;
  if (!link.includes("placeid=")) {
    showToast("Ogiltig Google Maps-länk", "error");
    return;
  }
  const placeId = new URL(link).searchParams.get("placeid");
  if (placeId) {
    fillFormFromPlaceId(placeId);
  } else {
    showToast("Kunde inte hitta Place ID i länken", "error");
  }
});

// ============================
// Spara till Supabase
// ============================
document.getElementById("save-btn").addEventListener("click", async () => {
  const name = document.getElementById("store-name").value;
  const address = document.getElementById("address").value;
  const city = document.getElementById("city").value;
  const country = document.getElementById("country").value;
  const phone = document.getElementById("phone").value;
  const website = document.getElementById("website").value;
  const type = document.querySelector('input[name="type"]:checked')?.value;

  if (!name || !address || !city || !country) {
    showToast("Fyll i alla obligatoriska fält", "error");
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
      approved: false,
    },
  ]);

  if (error) {
    console.error(error);
    showToast("Fel vid sparande", "error");
  } else {
    showToast("Butik sparad (väntar på granskning)", "success");
    document.getElementById("store-form").reset();
    document.getElementById("preview-image").src = "";
    updateStars();
  }
});
