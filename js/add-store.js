// Initiera Supabase-klienten
const { createClient } = supabase;
const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

const form = document.getElementById("addStoreForm");
const citySelect = document.getElementById("city");
const newCityFields = document.getElementById("newCityFields");
const statusMsg = document.getElementById("status");

// ===== Load cities =====
async function loadCities() {
  const { data, error } = await supabase
    .from("cities")
    .select("id, name, country")
    .order("name");

  if (error) {
    console.error("Error loading cities:", error);
    return;
  }

  data.forEach(city => {
    const option = document.createElement("option");
    option.value = city.id;
    option.textContent = `${city.name}, ${city.country}`;
    citySelect.appendChild(option);
  });
}

// Show fields if user selects "new city"
citySelect.addEventListener("change", () => {
  if (citySelect.value === "new") {
    newCityFields.style.display = "block";
  } else {
    newCityFields.style.display = "none";
  }
});

// ===== Form submit =====
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const storeName = document.getElementById("storeName").value;
  const storeAddress = document.getElementById("storeAddress").value;
  const storeLink = document.getElementById("storeLink").value;
  const continent = document.getElementById("continent").value;

  let cityId = citySelect.value;

  // If user is adding a new city
  if (cityId === "new") {
    const newCityName = document.getElementById("newCity").value;
    const newCountryName = document.getElementById("newCountry").value;

    const { data: newCity, error: cityError } = await supabase
      .from("cities")
      .insert([{ name: newCityName, country: newCountryName, continent }])
      .select()
      .single();

    if (cityError) {
      statusMsg.textContent = "Error saving city: " + cityError.message;
      return;
    }

    cityId = newCity.id;
  }

  // Save store
  const { error: storeError } = await supabase
    .from("stores")
    .insert([{ 
      name: storeName,
      address: storeAddress,
      link: storeLink || null,
      city_id: cityId
    }]);

  if (storeError) {
    statusMsg.textContent = "Error saving store: " + storeError.message;
  } else {
    statusMsg.textContent = "✅ Store saved successfully!";
    form.reset();
    newCityFields.style.display = "none";
  }
});

// Load cities on page load
loadCities();
