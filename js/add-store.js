// ==== CONFIG ====
const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4"; 
const GOOGLE_API_KEY = "AIzaSyClP5xnMvYaHC1xjHzuTFj3K9tHw0g6O00"
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);


// Google API key
const GOOGLE_API_KEY = "AIzaSyDdn7E6_dfwUjGQ1IUdJ2rQXUeEYIIzVtQ";

// === Stjärnbetyg ===
let selectedRating = 0;
document.querySelectorAll("#ratingStars span").forEach(star => {
  star.addEventListener("click", () => {
    selectedRating = parseInt(star.dataset.value);
    document.querySelectorAll("#ratingStars span").forEach(s => {
      s.classList.toggle("active", parseInt(s.dataset.value) <= selectedRating);
    });
  });
});

// === Globala variabler för koordinater ===
let lat = null;
let lng = null;

// === Paste-knapp ===
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
    lat = data.lat || null;
    lng = data.lng || null;
    alert("✅ Data hämtad – komplettera gärna där det saknas!");
  } else {
    alert("❌ Kunde inte hämta platsdata. Fyll i manuellt.");
  }
});

// === Spara formuläret ===
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
    lat: lat,   // sparas men visas inte
    lng: lng,   // sparas men visas inte
    status: "pending"
  };

  const { error } = await supabase.from("stores").insert([store]);
  if (error) {
    alert("❌ Fel vid sparande: " + error.message);
  } else {
    alert("✅ Sparad! Väntar på godkännande.");
    e.target.reset();
    selectedRating = 0;
    lat = null;
    lng = null;
    document.querySelectorAll("#ratingStars span").forEach(s => s.classList.remove("active"));
  }
});

// === Fyll i formuläret med Google-data ===
function fillForm(data) {
  document.getElementById("name").value = data.name || "";
  document.getElementById("address").value = data.address || "";
  document.getElementById("city").value = data.city || "";
  document.getElementById("country").value = data.country || "";
  document.getElementById("website").value = data.website || "";
  document.getElementById("phone").value = data.phone || "";

  // 🔎 Auto-guess type från namnet
  if (data.name) {
    const lowerName = data.name.toLowerCase();
    if (lowerName.includes("lounge")) {
      document.getElementById("type").value = "lounge";
    } else if (lowerName.includes("store") || lowerName.includes("cigar") || lowerName.includes("shop")) {
      document.getElementById("type").value = "store";
    } else {
      document.getElementById("type").value = "other";
    }
  }
}

// === Markera tomma fält (grön kant) ===
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

// === Google Places / Geocoding ===
async function fetchPlaceDetails(mapsUrl) {
  try {
    // 1. Leta efter koordinater i URL
    const coordsMatch = mapsUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);

    if (coordsMatch) {
      const latVal = coordsMatch[1];
      const lngVal = coordsMatch[2];

      const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latVal},${lngVal}&key=${GOOGLE_API_KEY}`;
      const geoRes = await fetch(geoUrl);
      const geoData = await geoRes.json();

      if (geoData.results && geoData.results.length > 0) {
        const result = geoData.results[0];
        const comps = result.address_components;

        return {
          name: result.formatted_address.split(",")[0] || "",
          address: result.formatted_address || "",
          city: (comps.find(c => c.types.includes("locality")) || {}).long_name || "",
          country: (comps.find(c => c.types.includes("country")) || {}).long_name || "",
          website: "",
          phone: "",
          lat: latVal,
          lng: lngVal
        };
      }
    }

    // 2. Om det finns place_id i URL
    const placeIdMatch = mapsUrl.match(/placeid=([^&]+)/);
    if (placeIdMatch) {
      const placeId = placeIdMatch[1];

      const placeUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,international_phone_number,website,address_component,geometry&key=${GOOGLE_API_KEY}`;
      const placeRes = await fetch(placeUrl);
      const placeData = await placeRes.json();

      if (placeData.result) {
        const r = placeData.result;
        const comps = r.address_components;

        return {
          name: r.name || "",
          address: r.formatted_address || "",
          city: (comps.find(c => c.types.includes("locality")) || {}).long_name || "",
          country: (comps.find(c => c.types.includes("country")) || {}).long_name || "",
          website: r.website || "",
          phone: r.international_phone_number || "",
          lat: r.geometry?.location?.lat || null,
          lng: r.geometry?.location?.lng || null
        };
      }
    }

  } catch (err) {
    console.error("Google fetch error", err);
  }
  return null;
}
