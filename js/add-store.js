// Initiera Supabase-klienten
const { createClient } = supabase;
const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);


// Hämta data från Google Places API
document.getElementById("fetchDataBtn").addEventListener("click", async () => {
  const url = document.getElementById("mapsUrl").value;
  const placeId = extractPlaceId(url);

  if (!placeId) {
    alert("Invalid Google Maps URL");
    return;
  }

  const service = new google.maps.places.PlacesService(document.createElement("div"));
  service.getDetails({ placeId }, (place, status) => {
    if (status === google.maps.places.PlacesServiceStatus.OK) {
      document.getElementById("storeName").value = place.name || "";
      document.getElementById("storeAddress").value = place.formatted_address || "";
      document.getElementById("storeWebsite").value = place.website || "";
      document.getElementById("storePhone").value = place.formatted_phone_number || "";

      // Förifyll land/stad om möjligt
      if (place.address_components) {
        const country = place.address_components.find(c => c.types.includes("country"));
        const city = place.address_components.find(c => c.types.includes("locality"));
        document.getElementById("country").value = country ? country.long_name : "";
        document.getElementById("city").value = city ? city.long_name : "";
      }
    } else {
      alert("Failed to fetch data from Google Places API");
    }
  });
});

// Extrahera place_id från Maps-URL
function extractPlaceId(url) {
  const match = url.match(/placeid=([^&]+)/);
  return match ? match[1] : null;
}

// Spara butik i Supabase
document.getElementById("addStoreForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const store = {
    name: document.getElementById("storeName").value,
    address: document.getElementById("storeAddress").value,
    website: document.getElementById("storeWebsite").value,
    phone: document.getElementById("storePhone").value,
    continent: document.getElementById("continent").value,
    country: document.getElementById("country").value,
    city: document.getElementById("city").value,
  };

  const { error } = await supabase.from("stores").insert(store);

  if (error) {
    console.error(error);
    alert("Error saving store.");
  } else {
    alert("Store saved successfully!");
    e.target.reset();
  }
});
