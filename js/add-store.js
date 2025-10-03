// add-store.js
import { loadCountries, loadCities } from "./locationService.js";

// === Supabase setup ===
const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co"; 
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4"; 
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// === Google API key ===
const GOOGLE_KEY = "AIzaSyDdn7E6_dfwUjGQ1IUdJ2rQXUeEYIIzVtQ";

// === Elements ===
const form = document.getElementById("storeForm");
const typeSelect = document.getElementById("type");
const ratingStars = document.querySelectorAll("#rating span");
const continentSelect = document.getElementById("continent");
const countrySelect = document.getElementById("country");
const citySelect = document.getElementById("city");
const manualCityWrapper = document.getElementById("manualCityWrapper");
const manualCityInput = document.getElementById("manualCity");
const mapsUrlInput = document.getElementById("mapsUrl");

// === Rating state ===
let selectedRating = null;
ratingStars.forEach(star => {
  star.addEventListener("click", () => {
    selectedRating = parseInt(star.dataset.value);
    ratingStars.forEach(s => s.classList.remove("active"));
    star.classList.add("active");
  });
});

// === Load countries when continent changes ===
continentSelect.addEventListener("change", async () => {
  const { data, error } = await supabase
    .from("countries")
    .select("*")
    .eq("continent", continentSelect.value)
    .order("name");

  countrySelect.innerHTML = `<option value="">-- Select --</option>`;
  if (data) {
    data.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = `${c.flag} ${c.name}`;
      countrySelect.appendChild(opt);
    });
  }
});

// === Load cities when country changes ===
countrySelect.addEventListener("change", async () => {
  const { data, error } = await supabase
    .from("cities")
    .select("*")
    .eq("country_id", countrySelect.value)
    .order("name");

  citySelect.innerHTML = `<option value="">-- Select --</option>
                          <option value="__manual__">✏️ Write city manually…</option>`;

  if (data) {
    data.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      citySelect.appendChild(opt);
    });
  }
});

// === Manual city toggle ===
citySelect.addEventListener("change", () => {
  manualCityWrapper.classList.toggle("hidden", citySelect.value !== "__manual__");
});

// === Helper: Parse Google Maps URL ===
function parseCoordsFromUrl(url) {
  const match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (match) {
    return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  }
  return null;
}

// === Lookup Google place info ===
async function lookupGoogle(mapsUrl) {
  const coords = parseCoordsFromUrl(mapsUrl);
  if (!coords) throw new Error("Could not find coordinates in URL");

  const geoRes = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.lat},${coords.lng}&key=${GOOGLE_KEY}`
  );
  const geoData = await geoRes.json();

  if (geoData.status !== "OK") throw new Error("Google API error: " + geoData.status);

  const result = geoData.results[0];
  const components = result.address_components;

  const country = components.find(c => c.types.includes("country"));
  const city = components.find(c => c.types.includes("locality") || c.types.includes("postal_town"));

  return {
    name: result.formatted_address.split(",")[0], // snabb namn-gissning
    address: result.formatted_address,
    city: city ? city.long_name : null,
    country: country ? country.long_name : null,
    lat: coords.lat,
    lng: coords.lng,
  };
}

// === Save to Supabase ===
async function saveToSupabase(store) {
  const { error } = await supabase.from("stores").insert([store]);
  if (error) {
    alert("❌ Error: " + error.message);
    console.error(error);
  } else {
    alert("✅ Store saved!");
    form.reset();
    selectedRating = null;
  }
}

// === Form submit ===
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  try {
    let storeData = {};

    if (mapsUrlInput.value) {
      // === Använd Google Maps URL ===
      const g = await lookupGoogle(mapsUrlInput.value);
      storeData = {
        name: g.name,
        address: g.address,
        type: typeSelect.value,
        city: g.city,
        country: g.country,
        latitude: g.lat,
        longitude: g.lng,
        rating: selectedRating,
        status: "pending",
      };
    } else {
      // === Använd manuella fält ===
      storeData = {
        name: document.getElementById("name").value,
        address: document.getElementById("address").value,
        website: document.getElementById("website").value,
        phone: document.getElementById("phone").value,
        type: typeSelect.value,
        city: manualCityInput.value || citySelect.value,
        country: countrySelect.options[countrySelect.selectedIndex]?.text,
        latitude: null,
        longitude: null,
        rating: selectedRating,
        status: "pending",
      };
    }

    await saveToSupabase(storeData);

  } catch (err) {
    alert("❌ " + err.message);
    console.error(err);
  }
});
