// === SUPABASE INIT ===
const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// === GOOGLE API KEY ===
const GOOGLE_API_KEY = "AIzaSyClP5xnMvYaHC1xjHzuTFj3K9tHw0g6O00";

// === DOM elements ===
const continentSelect = document.getElementById("continent");
const countrySelect = document.getElementById("country");
const citySelect = document.getElementById("city");
const manualCityInput = document.getElementById("manualCity");

// === STAR RATING ===
document.querySelectorAll('#rating span').forEach(star => {
  star.addEventListener('click', () => {
    const value = parseInt(star.dataset.value);
    document.querySelectorAll('#rating span').forEach(s => {
      s.classList.toggle('active', parseInt(s.dataset.value) <= value);
    });
    document.getElementById('rating').dataset.value = value;
  });
});

// === LOAD CONTINENTS ===
async function loadContinents() {
  let { data, error } = await supabase.from("continents").select("id, name");
  if (error) {
    console.error(error);
    return;
  }
  continentSelect.innerHTML = `<option value="">Select continent</option>`;
  data.forEach(c => {
    let opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    continentSelect.appendChild(opt);
  });
}

// === LOAD COUNTRIES BY CONTINENT ===
async function loadCountries(continentId) {
  let { data, error } = await supabase.from("countries")
    .select("id, name")
    .eq("continent_id", continentId);
  if (error) {
    console.error(error);
    return;
  }
  countrySelect.innerHTML = `<option value="">Select country</option>`;
  data.forEach(c => {
    let opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    countrySelect.appendChild(opt);
  });
  citySelect.innerHTML = `<option value="">Select city</option>`;
}

// === LOAD CITIES BY COUNTRY ===
async function loadCities(countryId) {
  let { data, error } = await supabase.from("cities")
    .select("id, name")
    .eq("country_id", countryId);
  if (error) {
    console.error(error);
    return;
  }
  citySelect.innerHTML = `<option value="">Select city</option>`;
  data.forEach(c => {
    let opt = document.createElement("option");
    opt.value = c.name; // vi sparar city-namn, inte id
    opt.textContent = c.name;
    citySelect.appendChild(opt);
  });
  // extra val för manuell stad
  let manualOpt = document.createElement("option");
  manualOpt.value = "manual";
  manualOpt.textContent = "✏️ Enter manually";
  citySelect.appendChild(manualOpt);
}

// === EVENTS ===
continentSelect.addEventListener("change", () => {
  if (continentSelect.value) {
    loadCountries(continentSelect.value);
  }
});

countrySelect.addEventListener("change", () => {
  if (countrySelect.value) {
    loadCities(countrySelect.value);
  }
});

citySelect.addEventListener("change", () => {
  if (citySelect.value === "manual") {
    manualCityInput.style.display = "block";
  } else {
    manualCityInput.style.display = "none";
  }
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

  let continent = continentSelect.value;
  let country = countrySelect.value;
  let city = (citySelect.value === "manual")
    ? manualCityInput.value.trim()
    : citySelect.value;

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
    continent,
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
    manualCityInput.style.display = "none";
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

// === INIT ===
loadContinents();

