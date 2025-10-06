// ==========================
// Config
// ==========================
const sb = supabase.createClient(
  "https://gbxxoeplkzbhsvagnfsr.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4"
);

const GOOGLE_FIELDS = [
  "name",
  "formatted_address",
  "geometry",
  "international_phone_number",
  "website"
];

// ==========================
// Rating system
// ==========================
let selectedRating = 0;
document.querySelectorAll(".star").forEach((star, index) => {
  star.addEventListener("click", () => {
    selectedRating = index + 1;
    document.querySelectorAll(".star").forEach((s, i) => {
      s.classList.toggle("selected", i < selectedRating);
    });
  });
});

// ==========================
// Paste button → getDetails via PlacesService
// ==========================
document.getElementById("pasteBtn").addEventListener("click", () => {
  const url = document.getElementById("mapsUrl").value.trim();
  if (!url) {
    alert("Please paste a Google Maps URL first.");
    return;
  }

  const placeId = extractPlaceId(url);
  if (!placeId) {
    alert("❌ Could not find Place ID in this URL.");
    return;
  }

  console.log("ℹ️ Extracted Place ID:", placeId);

  // Init PlacesService
  const service = new google.maps.places.PlacesService(
    document.createElement("div")
  );

  service.getDetails({ placeId, fields: GOOGLE_FIELDS }, (place, status) => {
    if (status === google.maps.places.PlacesServiceStatus.OK) {
      autofillForm(place, placeId);
    } else {
      console.error("❌ getDetails error:", status);
      alert("Google PlacesService failed: " + status);
    }
  });
});

// ==========================
// Helper: Extract Place ID
// ==========================
function extractPlaceId(url) {
  // Matcha !1sXXXX
  const regex = /!1s([^!]+)/;
  const match = url.match(regex);
  if (match) return match[1];

  // Matcha placeid=XXXX
  const regex2 = /placeid=([^&]+)/;
  const match2 = url.match(regex2);
  if (match2) return match2[1];

  return null;
}

// ==========================
// Autofill form
// ==========================
function autofillForm(place, placeId) {
  document.getElementById("name").value = place.name || "";
  document.getElementById("address").value = place.formatted_address || "";
  document.getElementById("city").value = extractCity(place.formatted_address);
  document.getElementById("country").value = extractCountry(place.formatted_address);
  document.getElementById("phone").value = place.international_phone_number || "";
  document.getElementById("website").value = place.website || "";

  // hidden values i dataset
  const wrapper = document.getElementById("form-wrapper");
  wrapper.dataset.placeId = placeId;
  if (place.geometry?.location) {
    wrapper.dataset.lat = place.geometry.location.lat();
    wrapper.dataset.lng = place.geometry.location.lng();
  }

  console.log("✅ Form filled with:", place);
}

// ==========================
// Extract city / country
// ==========================
function extractCity(address) {
  if (!address) return "";
  const parts = address.split(",");
  return parts.length >= 2 ? parts[parts.length - 2].trim() : "";
}
function extractCountry(address) {
  if (!address) return "";
  const parts = address.split(",");
  return parts.length >= 1 ? parts[parts.length - 1].trim() : "";
}

// ==========================
// Save to Supabase
// ==========================
document.getElementById("storeForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const wrapper = document.getElementById("form-wrapper");
  const placeId = wrapper.dataset.placeId || null;
  const lat = wrapper.dataset.lat || null;
  const lng = wrapper.dataset.lng || null;

  const store = {
    name: document.getElementById("name").value,
    address: document.getElementById("address").value,
    city: document.getElementById("city").value,
    country: document.getElementById("country").value,
    phone: document.getElementById("phone").value,
    website: document.getElementById("website").value,
    type: document.querySelector("input[name='type']:checked")?.value || "other",
    rating: selectedRating,
    status: "pending",
    place_id: placeId,
    lat: lat,
    lng: lng
  };

  const { error } = await sb.from("stores").insert([store]);

  if (error) {
    console.error("❌ Supabase insert error:", error);
    alert("Failed to save store: " + error.message);
  } else {
    alert("✅ Store saved successfully!");
    document.getElementById("storeForm").reset();
    selectedRating = 0;
    document.querySelectorAll(".star").forEach((s) => s.classList.remove("selected"));
  }
});
