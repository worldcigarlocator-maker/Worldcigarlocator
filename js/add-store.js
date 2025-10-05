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
    alert("✅ Data hämtad – komplettera gärna där det saknas!");
  } else {
    alert("Kunde inte hämta platsdata. Fyll i manuellt.");
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

// === Fyll i formuläret med Google-data ===
function fillForm(data) {
  document.getElementById("name").value = data.name || "";
  document.getElementById("address").value = data.address || "";
  document.getElementById("city").value = data.city || "";
  document.getElementById("country").value = data.country || "";
  document.getElementById("website").value = data.website || "";
  document.getElementById("phone").value = data.phone || "";
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
    // 1. Försök hitta koordinater
    const coordsMatch = mapsUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);

    if (coordsMatch) {
      const lat = coordsMatch[1];
      const lng = coordsMatch[2];

      const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}`;
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
          phone: ""
        };
      }
    }

    // 2. Om URL istället innehåller place_id
    const placeIdMatch = mapsUrl.match(/placeid=([^&]+)/);
    if (placeIdMatch) {
      const placeId = placeIdMatch[1];

      const placeUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,international_phone_number,website,address_component&key=${GOOGLE_API_KEY}`;
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
          phone: r.international_phone_number || ""
        };
      }
    }

  } catch (err) {
    console.error("Google fetch error", err);
  }
  return null;
}
