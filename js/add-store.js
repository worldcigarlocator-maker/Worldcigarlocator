// add-store.js
import { loadCountries, loadCities } from "./locationService.js";

const supabaseUrl = "https:// https://gbxxoeplkzbhsvagnfsr.supabase.co";
const supabaseKey = " eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4"; 
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Google API key
const GOOGLE_KEY = "AIzaSyDdn7E6_dfwUjGQ1IUdJ2rQXUeEYIIzVtQ";

// Elements
const form = document.getElementById("storeForm");
const typeSelect = document.getElementById("type");
const ratingStars = document.querySelectorAll("#rating span");
const continentSelect = document.getElementById("continent");
const countrySelect = document.getElementById("country");
const citySelect = document.getElementById("city");
const manualCityWrapper = document.getElementById("manualCityWrapper");
const manualCityInput = document.getElementById("manualCity");

// Rating state
let selectedRating = null;
ratingStars.forEach(star => {
  star.addEventListener("click", () => {
    selectedRating = parseInt(star.dataset.value);
    ratingStars.forEach(s => s.classList.remove("active"));
    star.classList.add("active");
  });
});

// Load countries when continent changes
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

// Load cities when country changes
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

// Manual city toggle
citySelect.addEventListener("change", () => {
  manualCityWrapper.classList.toggle("hidden", citySelect.value !== "__manual__");
});

// Form submit
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  let cityId = citySelect.value;
  let cityName = null;

  if (cityId === "__manual__") {
    cityName = manualCityInput.value;
    if (!cityName) return alert("Enter city name");

    // Fetch from Google API
    const geoRes = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(cityName)}&key=${GOOGLE_KEY}`
    );
    const geoData = await geoRes.json();
    if (!geoData.results.length) return alert("City not found");

    const loc = geoData.results[0].geometry.location;
    const countryName = geoData.results[0].address_components.find(c => c.types.includes("country")).long_name;

    // Find country in DB
    const { data: countries } = await supabase
      .from("countries")
      .select("id")
      .eq("name", countryName)
      .single();

    if (!countries) return alert("Country not in database");

    // Insert city
    const { data: newCity, error: cityError } = await supabase
      .from("cities")
      .insert([{
        name: cityName,
        country_id: countries.id,
        latitude: loc.lat,
        longitude: loc.lng
      }])
      .select()
      .single();

    if (cityError) return alert(cityError.message);
    cityId = newCity.id;
  }

  // Insert store
  const { error } = await supabase.from("stores").insert([{
    name: document.getElementById("name").value,
    address: document.getElementById("address").value,
    website: document.getElementById("website").value,
    phone: document.getElementById("phone").value,
    type: typeSelect.value,
    city_id: cityId,
    city: cityName || null,
    country: countrySelect.options[countrySelect.selectedIndex].text,
    rating: selectedRating,
    status: "pending"
  }]);

  if (error) {
    alert("Error: " + error.message);
  } else {
    alert("✅ Store saved!");
    form.reset();
    selectedRating = null;
  }
});

 
