// ==== CONFIG ====
const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4"; 
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let selectedRating = 0;

// ========================
// STAR RATING
// ========================
document.querySelectorAll(".star").forEach(star => {
  star.addEventListener("click", () => {
    selectedRating = parseInt(star.dataset.value);
    document.querySelectorAll(".star").forEach(s => {
      s.classList.toggle("selected", parseInt(s.dataset.value) <= selectedRating);
    });
  });
});

// ========================
// PASTE BUTTON
// ========================
document.getElementById("pasteBtn").addEventListener("click", () => {
  const url = document.getElementById("mapsUrl").value.trim();
  if (!url) {
    alert("Please paste a Google Maps URL.");
    return;
  }

  // Extract Place ID from URL (!1s... or placeid=...)
  let placeIdMatch = url.match(/!1s([^!]+)!/) || url.match(/placeid=([^&]+)/);
  if (placeIdMatch) {
    const placeId = decodeURIComponent(placeIdMatch[1]);
    fetchPlaceDetails(placeId);
  } else {
    alert("Could not extract a Place ID from this URL.");
  }
});

// ========================
// FETCH PLACE DETAILS
// ========================
function fetchPlaceDetails(placeId) {
  const map = new google.maps.Map(document.createElement("div"));
  const service = new google.maps.places.PlacesService(map);

  service.getDetails(
    {
      placeId,
      fields: [
        "name",
        "formatted_address",
        "formatted_phone_number",
        "website",
        "geometry",
        "address_component"
      ]
    },
    (place, status) => {
      if (status !== google.maps.places.PlacesServiceStatus.OK) {
        alert("Failed to fetch details: " + status);
        return;
      }

      // Autofill fields
      document.getElementById("name").value = place.name || "";
      document.getElementById("address").value = place.formatted_address || "";
      document.getElementById("phone").value = place.formatted_phone_number || "";
      document.getElementById("website").value = place.website || "";

      // City + Country
      const cityComp = place.address_components.find(c => c.types.includes("locality"));
      const countryComp = place.address_components.find(c => c.types.includes("country"));
      document.getElementById("city").value = cityComp ? cityComp.long_name : "";
      document.getElementById("country").value = countryComp ? countryComp.long_name : "";

      console.log("✅ Autofilled from Places:", place);
    }
  );
}

// ========================
// SAVE TO SUPABASE
// ========================
document.getElementById("storeForm").addEventListener("submit", async e => {
  e.preventDefault();

  const data = {
    name: document.getElementById("name").value,
    address: document.getElementById("address").value,
    city: document.getElementById("city").value,
    country: document.getElementById("country").value,
    phone: document.getElementById("phone").value,
    website: document.getElementById("website").value,
    type: document.querySelector('input[name="type"]:checked')?.value || "other",
    rating: selectedRating,
    status: "pending"
  };

  const { error } = await sb.from("stores").insert([data]);

  if (error) {
    alert("❌ Error saving store: " + error.message);
  } else {
    alert("✅ Store saved (pending). Check Backoffice to approve.");
    e.target.reset();
    selectedRating = 0;
    document.querySelectorAll(".star").forEach(s => s.classList.remove("selected"));
  }
});
