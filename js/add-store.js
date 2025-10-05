// ==== CONFIG ====
const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4"; 
const GOOGLE_API_KEY = "AIzaSyClP5xnMvYaHC1xjHzuTFj3K9tHw0g6O00"
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);


// Google API key
const GOOGLE_API_KEY = "AIzaSyDdn7E6_dfwUjGQ1IUdJ2rQXUeEYIIzVtQ";

// Star rating
let selectedRating = 0;
document.querySelectorAll("#ratingStars span").forEach(star => {
  star.addEventListener("click", () => {
    selectedRating = parseInt(star.dataset.value);
    document.querySelectorAll("#ratingStars span").forEach(s => {
      s.classList.toggle("active", parseInt(s.dataset.value) <= selectedRating);
    });
  });
});

// Paste button
document.getElementById("pasteBtn").addEventListener("click", async () => {
  const mapsUrl = document.getElementById("mapsUrl").value.trim();
  if (!mapsUrl) {
    alert("Klistra in en Google Maps-länk först!");
    return;
  }

  const data = await fetchPlaceDetails(mapsUrl);

  if (data) {
    fillForm(data);
    markEmptyFields();
    alert("✅ Data hämtad – komplettera gärna där det saknas!");
  } else {
    alert("Kunde inte hämta data. Fyll i manuellt.");
  }
});

// Save form
document.getElementById("addStoreForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const store = {
    name: document.getElementById("name").value,
    address: document.getElementById("address").value,
    website: document.getElementById("website").value,
    phone: document.getElementById("phone").value,
    type: document.getElementById("type").value,
    rating: selectedRating,
    city: document.getElementById("city").value,
    country: document.getElementById("country").value,
    status: "pending"
  };

  const { error } = await supabase.from("stores").insert([store]);
  if (error) {
    alert("❌ Fel vid sparande: " + error.message);
  } else {
    alert("✅ Sparad! Väntar på godkännande.");
    e.target.reset();
    selectedRating = 0;
    document.querySelectorAll("#ratingStars span").forEach(s => s.classList.remove("active"));
  }
});

// Fill form with Google data
function fillForm(data) {
  document.getElementById("name").value = data.name || "";
  document.getElementById("address").value = data.address || "";
  document.getElementById("city").value = data.city || "";
  document.getElementById("country").value = data.country || "";
  document.getElementById("website").value = data.website || "";
  document.getElementById("phone").value = data.phone || "";
}

// Mark empty fields in green
function markEmptyFields() {
  ["name","address","city","country","website","phone"].forEach(id => {
    const el = document.getElementById(id);
    if (!el.value) {
      el.classList.add("highlight");
    } else {
      el.classList.remove("highlight");
    }
  });
}

// Google helper
async function fetchPlaceDetails(mapsUrl) {
  try {
    const coordsMatch = mapsUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    let lat, lng;

    if (coordsMatch) {
      lat = coordsMatch[1];
      lng = coordsMatch[2];
    }

    const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}`;
    const res = await fetch(geoUrl);
    const data = await res.json();

    if (data.results && data.results[0]) {
      const result = data.results[0];
      const comps = result.address_components;

      return {
        name: result.formatted_address.split(",")[0],
        address: result.formatted_address,
        city: (comps.find(c => c.types.includes("locality")) || {}).long_name,
        country: (comps.find(c => c.types.includes("country")) || {}).long_name
      };
    }
  } catch (err) {
    console.error(err);
  }
  return null;
}
