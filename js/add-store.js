// === Supabase setup ===
const { createClient } = supabase;
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
      // Sometimes ?q=place_id:XYZ
      const q = params.get("q");
      if (q.startsWith("place_id:")) return q.replace("place_id:", "");
    }
    if (params.has("query_place_id")) {
      return params.get("query_place_id");
    }
    // Fallback: try to parse from /place/ or /maps/place/
    const match = url.match(/place\/.*\/(.*)\?/);
    if (match) return match[1];
  } catch (err) {
    console.error("Invalid URL", err);
  }
  return null;
}

// === Fetch place data from Google Places API ===
async function fetchPlaceData(placeId) {
  if (!placeId) {
    alert("Could not extract place_id from the URL.");
    return;
  }

  const service = new google.maps.places.PlacesService(
    document.createElement("div")
  );

  return new Promise((resolve, reject) => {
    service.getDetails(
      {
        placeId,
        fields: ["name", "formatted_address", "website", "formatted_phone_number", "address_components"],
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

// === Button click ===
fetchBtn.addEventListener("click", async () => {
  const url = mapsUrlInput.value.trim();
  if (!url) return alert("Paste a Google Maps URL first!");

  const placeId = extractPlaceId(url);
  if (!placeId) return alert("Could not find a place_id in this URL.");

  try {
    const place = await fetchPlaceData(placeId);

    // Fill in the form
    nameInput.value = place.name || "";
    addressInput.value = place.formatted_address || "";
    websiteInput.value = place.website || "";
    phoneInput.value = place.formatted_phone_number || "";

    // Extract country & city from address_components
    let country = "";
    let city = "";

    place.address_components.forEach((comp) => {
      if (comp.types.includes("country")) {
        country = comp.long_name;
      }
      if (comp.types.includes("locality")) {
        city = comp.long_name;
      }
    });

    countryInput.value = country;
    cityInput.value = city;

    // Guess continent (very simple map)
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

// === Save form to Supabase ===
document.getElementById("addStoreForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const store = {
    name: nameInput.value,
    address: addressInput.value,
    website: websiteInput.value,
    phone: phoneInput.value,
    continent: continentSelect.value,
    country: countryInput.value,
    city: cityInput.value
  };

  const { data, error } = await supabase.from("stores").insert([store]);

  if (error) {
    console.error(error);
    alert("Error saving store.");
  } else {
    alert("Store saved successfully!");
    e.target.reset();
  }
});
