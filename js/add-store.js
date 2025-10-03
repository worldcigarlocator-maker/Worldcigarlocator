import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// === Supabase setup ===
const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co"; // din url
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."; // din anon key
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// === Google API setup ===
const GOOGLE_API_KEY = "AIzaSyDdn7E6_dfwUjGQ1IUdJ2rQXUeEYIIzVtQ"; // <-- lägg in din nyckel

// === Form & elements ===
const form = document.getElementById("storeForm");
const ratingStars = document.querySelectorAll("#rating span");
const manualCityWrapper = document.getElementById("manualCityWrapper");
let selectedRating = null;

// === Rating logic ===
ratingStars.forEach(star => {
  star.addEventListener("click", () => {
    selectedRating = parseInt(star.dataset.value);
    ratingStars.forEach(s => s.classList.remove("selected"));
    star.classList.add("selected");
    star.previousAll?.forEach(p => p.classList.add("selected"));
  });
});

// === Helper: parse Maps URL to lat/lon ===
function extractCoordsFromUrl(url) {
  const match = url.match(/@([-.\d]+),([-.\d]+)/);
  if (match) {
    return { lat: parseFloat(match[1]), lon: parseFloat(match[2]) };
  }
  return null;
}

// === Google Lookup ===
async function lookupGoogle(url) {
  const coords = extractCoordsFromUrl(url);
  if (!coords) {
    alert("Could not find coordinates in this URL.");
    return null;
  }

  const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.lat},${coords.lon}&key=${GOOGLE_API_KEY}`;
  const res = await fetch(geoUrl);
  const data = await res.json();

  if (!data.results || !data.results.length) return null;

  const place = data.results[0];
  const components = place.address_components;

  let city = "";
  let country = "";
  let name = place.formatted_address;

  for (const c of components) {
    if (c.types.includes("locality")) city = c.long_name;
    if (c.types.includes("country")) country = c.long_name;
  }

  return {
    name,
    address: place.formatted_address,
    city,
    country,
    lat: coords.lat,
    lon: coords.lon
  };
}

// === Save to Supabase ===
async function saveToSupabase(store) {
  const { error } = await supabase.from("stores").insert([{
    name: store.name,
    address: store.address,
    website: store.website || null,
    phone: store.phone || null,
    type: store.type,
    rating: store.rating || null,
    continent: store.continent || null,
    country: store.country,
    city: store.city,
    latitude: store.lat,
    longitude: store.lon,
    status: "pending"
  }]);

  if (error) {
    console.error("Supabase error:", error);
    alert("Error saving store.");
  } else {
    alert("✅ Store saved (pending review).");
    form.reset();
  }
}

// === Submit handler ===
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const mapsUrl = document.getElementById("mapsUrl").value.trim();

  let storeData = {};

  if (mapsUrl) {
    // === Use Google ===
    const data = await lookupGoogle(mapsUrl);
    if (!data) return alert("Could not fetch from Google.");
    storeData = {
      ...data,
      website: document.getElementById("website").value,
      phone: document.getElementById("phone").value,
      type: document.getElementById("type").value,
      rating: selectedRating,
      continent: document.getElementById("continent").value
    };
  } else {
    // === Use manual ===
    const cityValue = document.getElementById("city").value;
    const manualCity = document.getElementById("manualCity").value;
    storeData = {
      name: document.getElementById("name").value,
      address: document.getElementById("address").value,
      website: document.getElementById("website").value,
      phone: document.getElementById("phone").value,
      type: document.getElementById("type").value,
      rating: selectedRating,
      continent: document.getElementById("continent").value,
      country: document.getElementById("country").value,
      city: cityValue === "__manual__" ? manualCity : cityValue,
      lat: null,
      lon: null
    };
  }

  await saveToSupabase(storeData);
});
