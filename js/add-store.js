// === Supabase setup ===
const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);


// === Elements ===
const fetchBtn = document.getElementById("fetchDataBtn");
const mapsUrlInput = document.getElementById("mapsUrl");

const nameInput = document.getElementById("name");
const addressInput = document.getElementById("address");
const websiteInput = document.getElementById("website");
const phoneInput = document.getElementById("phone");
const continentSelect = document.getElementById("continent");
const countryInput = document.getElementById("country");
const cityInput = document.getElementById("city");

// === Extract place_id from Google Maps URL ===
function extractPlaceId(url) {
  try {
    const u = new URL(url);
    const params = u.searchParams;
    if (params.has("q")) {
      const q = params.get("q");
      if (q.startsWith("place_id:")) return q.replace("place_id:", "");
    }
    if (params.has("query_place_id")) {
      return params.get("query_place_id");
    }
    const match = url.match(/place\/.*\/(.*)\?/);
    if (match) return match[1];
  } catch (err) {
    console.error("Invalid URL", err);
  }
  return null;
}

// === Fetch place data from Google Places API ===
async function fetchPlaceData(placeId) {
  const service = new google.maps.places.PlacesService(
    document.createElement("div")
  );

  return new Promise((resolve, reject) => {
    service.getDetails(
      {
        placeId,
        fields: [
          "name",
          "formatted_address",
          "website",
          "formatted_phone_number",
          "address_components",
        ],
      },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
          resolve(place);
        } else {
          reject("Place details request failed: " + status);
        }
      }
    );
  });
}

// === Fetch button click ===
fetchBtn.addEventListener("click", async () => {
  const url = mapsUrlInput.value.trim();
  if (!url) return alert("Paste a Google Maps URL first!");

  const placeId = extractPlaceId(url);
  if (!placeId) return alert("Could not find a place_id in this URL.");

  try {
    const place = await fetchPlaceData(placeId);

    // Fill form
    nameInput.value = place.name || "";
    addressInput.value = place.formatted_address || "";
    websiteInput.value = place.website || "";
    phoneInput.value = place.formatted_phone_number || "";

    let country = "";
    let city = "";
    place.address_components.forEach((comp) => {
      if (comp.types.includes("country")) country = comp.long_name;
      if (comp.types.includes("locality")) city = comp.long_name;
    });

    countryInput.value = country;
    cityInput.value = city;

    // Simple continent guess
    const continentMap = {
      "Sweden": "Europe",
      "Germany": "Europe",
      "France": "Europe",
      "United States": "North America",
      "Canada": "North America",
      "Brazil": "South America",
      "Argentina": "South America",
      "China": "Asia",
      "Japan": "Asia",
      "Australia": "Oceania",
      "South Africa": "Africa"
    };
    continentSelect.value = continentMap[country] || "";
  } catch (err) {
    console.error(err);
    alert("Failed to fetch place data.");
  }
});

// === Helpers for Supabase ===
async function getOrCreateCountry(countryName, continentName) {
  // Hitta land
  let { data: countries } = await supabase
    .from("countries")
    .select("id, name")
    .eq("name", countryName);

  if (countries && countries.length > 0) return countries[0].id;

  // Hämta continent_id
  let { data: continent } = await supabase
    .from("continents")
    .select("id")
    .eq("name", continentName)
    .single();

  // Skapa nytt land
  let { data, error } = await supabase
    .from("countries")
    .insert([{ name: countryName, continent_id: continent.id }])
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

async function getOrCreateCity(cityName, countryId) {
  let { data: cities } = await supabase
    .from("cities")
    .select("id, name")
    .eq("name", cityName)
    .eq("country_id", countryId);

  if (cities && cities.length > 0) return cities[0].id;

  // Skapa ny stad
  let { data, error } = await supabase
    .from("cities")
    .insert([{ name: cityName, country_id: countryId }])
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

// === Save form ===
document.getElementById("addStoreForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  try {
    const continent = continentSelect.value;
    const countryName = countryInput.value.trim();
    const cityName = cityInput.value.trim();

    // Hitta eller skapa land & stad
    const countryId = await getOrCreateCountry(countryName, continent);
    const cityId = await getOrCreateCity(cityName, countryId);

    // Spara store
    const { data, error } = await supabase.from("stores").insert([
      {
        name: nameInput.value,
        address: addressInput.value,
        website: websiteInput.value,
        phone: phoneInput.value,
        city_id: cityId,
      },
    ]);

    if (error) {
      console.error(error);
      alert("Error saving store.");
    } else {
      alert("Store saved successfully!");
      e.target.reset();
    }
  } catch (err) {
    console.error(err);
    alert("Failed to save store.");
  }
});
