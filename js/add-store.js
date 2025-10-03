// === SUPABASE INIT ===
const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// === GOOGLE API KEY ===
const GOOGLE_API_KEY = "AIzaSyClP5xnMvYaHC1xjHzuTFj3K9tHw0g6O00";

// === STAR RATING INTERACTION ===
document.querySelectorAll('#rating span').forEach(star => {
  star.addEventListener('click', () => {
    const value = parseInt(star.dataset.value);
    document.querySelectorAll('#rating span').forEach(s => {
      s.classList.toggle('active', parseInt(s.dataset.value) <= value);
    });
    document.getElementById('rating').dataset.value = value;
  });
});

// === FORM SUBMIT ===
document.getElementById('addStoreForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const mapsUrl = document.getElementById('mapsUrl').value.trim();
  let name = document.getElementById('name').value.trim();
  let address = document.getElementById('address').value.trim();
  const website = document.getElementById('website').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const type = document.getElementById('type').value;
  const rating = parseInt(document.getElementById('rating').dataset.value || 0);

  let city = document.getElementById('city').value || document.getElementById('manualCity').value.trim();
  let country = document.getElementById('country').value;
  let continent = document.getElementById('continent').value;
  let lat = null, lng = null;

  // === If Maps URL is provided, fetch from Google ===
  if (mapsUrl) {
    try {
      const coords = extractCoordsFromUrl(mapsUrl);
      if (coords) {
        const geoData = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.lat},${coords.lng}&key=${GOOGLE_API_KEY}`);
        const data = await geoData.json();
        if (data.results && data.results.length > 0) {
          const result = data.results[0];
          address = result.formatted_address;
          lat = coords.lat;
          lng = coords.lng;

          result.address_components.forEach(c => {
            if (c.types.includes("locality")) city = c.long_name;
            if (c.types.includes("country")) country = c.long_name;
          });
        }
      }
    } catch (err) {
      console.error("Google API error:", err);
      alert("Failed to fetch data from Google Maps");
      return;
    }
  }

  // === Insert into Supabase ===
  const { error } = await supabase.from("stores").insert([{
    name,
    address,
    website,
    phone,
    type,
    rating,
    city,
    country,
    latitude: lat,
    longitude: lng,
    status: "pending"
  }]);

  if (error) {
    console.error(error);
    alert("Error saving store");
  } else {
    alert("Store saved (pending approval)!");
    e.target.reset();
    document.querySelectorAll('#rating span').forEach(s => s.classList.remove('active'));
  }
});

// === Helper to extract coordinates from Google Maps URL ===
function extractCoordsFromUrl(url) {
  const regex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
  const match = url.match(regex);
  if (match) {
    return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  }
  return null;
}
