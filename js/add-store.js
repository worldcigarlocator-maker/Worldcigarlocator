// ==== CONFIG ====
const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."; 
const GOOGLE_API_KEY = "AIzaSyClP5xnMvYaHC1xjHzuTFj3K9tHw0g6O00"
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==== RATING LOGIC ====
let selectedRating = null;
document.querySelectorAll("#rating span").forEach(star => {
  star.addEventListener("click", () => {
    selectedRating = parseInt(star.dataset.value);
    document.querySelectorAll("#rating span").forEach(s => s.classList.remove("active"));
    star.classList.add("active");
    let prev = star.previousElementSibling;
    while (prev) { prev.classList.add("active"); prev = prev.previousElementSibling; }
  });
});

// ==== HELPER: Extract coords from Maps URL ====
function extractLatLngFromUrl(url) {
  const match = url.match(/@([-0-9.]+),([-0-9.]+)/);
  if (match) return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  return null;
}

// ==== HELPER: Reverse geocode ====
async function reverseGeocode(lat, lng) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== "OK") return null;

  let city = null, country = null;
  data.results[0].address_components.forEach(c => {
    if (c.types.includes("locality")) city = c.long_name;
    if (c.types.includes("country")) country = c.long_name;
  });
  return { city, country, address: data.results[0].formatted_address };
}

// ==== SUBMIT HANDLER ====
document.getElementById("storeForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const mapsUrl = document.getElementById("mapsUrl").value;
  const name = document.getElementById("name").value;
  const website = document.getElementById("website").value;
  const phone = document.getElementById("phone").value;
  const type = document.getElementById("type").value;

  let address = document.getElementById("address").value;
  let lat = null, lng = null, city = null, country = null;

  // === Försök hämta från Google om Maps URL finns ===
  if (mapsUrl) {
    const coords = extractLatLngFromUrl(mapsUrl);
    if (coords) {
      lat = coords.lat;
      lng = coords.lng;
      const geo = await reverseGeocode(lat, lng);
      if (geo) {
        address = geo.address;
        city = geo.city;
        country = geo.country;
        document.getElementById("address").value = address; // autofyll
      }
    }
  }

  // === Om Google inte hittar stad/land → visa manuella fält ===
  if (!city || !country) {
    document.getElementById("manualFields").style.display = "block";
    city = document.getElementById("manualCity").value || null;
    country = document.getElementById("manualCountry").value || null;

    if (!city || !country) {
      alert("⚠️ Google hittade inte stad/land. Fyll i manuellt innan du sparar.");
      return;
    }
  }

  // === Spara i Supabase ===
  const { error } = await supabase.from("stores").insert([{
    name,
    address,
    website,
    phone,
    type,
    rating: selectedRating,
    lat,
    lng,
    city,
    country,
    status: "pending"
  }]);

  if (error) {
    alert("❌ Error: " + error.message);
  } else {
    alert("✅ Store saved (pending review)");
    document.getElementById("storeForm").reset();
    selectedRating = null;
    document.querySelectorAll("#rating span").forEach(s => s.classList.remove("active"));
    document.getElementById("manualFields").style.display = "none";
  }
});
