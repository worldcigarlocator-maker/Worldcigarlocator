// add-store.js
import { loadCountries, loadCities } from "./locationService.js";

const supabaseUrl = "https:// https://gbxxoeplkzbhsvagnfsr.supabase.co";
const supabaseKey = " eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4"; 
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("storeForm");
  const continentSelect = document.getElementById("continent");
  const countrySelect = document.getElementById("country");
  const citySelect = document.getElementById("city");
  const manualCityWrapper = document.getElementById("manualCityWrapper");
  const manualCityInput = document.getElementById("manualCity");

  // Dropdowns
  continentSelect.addEventListener("change", e => {
    const continent = e.target.value;
    if (continent) loadCountries(continent);
  });

  countrySelect.addEventListener("change", e => {
    const countryId = e.target.value;
    if (countryId) loadCities(countryId);
  });

  citySelect.addEventListener("change", e => {
    if (e.target.value === "manual") {
      manualCityWrapper.style.display = "block";
    } else {
      manualCityWrapper.style.display = "none";
    }
  });

  // Rating stars (enkelt exempel)
  const ratingStars = document.getElementById("ratingStars");
  const ratingInput = document.getElementById("rating");
  for (let i = 1; i <= 5; i++) {
    const star = document.createElement("span");
    star.textContent = "⭐";
    star.style.cursor = "pointer";
    star.addEventListener("click", () => {
      ratingInput.value = i;
      [...ratingStars.children].forEach((s, idx) => {
        s.style.opacity = idx < i ? "1" : "0.3";
      });
    });
    ratingStars.appendChild(star);
  }

  // Submit
  form.addEventListener("submit", async e => {
    e.preventDefault();

    const formData = new FormData(form);
    const type = formData.get("type");
    const name = formData.get("name");
    const mapsUrl = formData.get("mapsUrl");
    const rating = formData.get("rating");
    const continent = formData.get("continent");
    const countryId = formData.get("country");
    let cityId = formData.get("city");

    // Om manuell stad
    if (cityId === "manual") {
      const manualCity = manualCityInput.value;
      if (!manualCity) {
        alert("Skriv in stadens namn");
        return;
      }
      // Lägg till staden i DB
      const { data: newCity, error } = await supabase
        .from("cities")
        .insert([{ name: manualCity, country_id: countryId }])
        .select()
        .single();
      if (error) {
        alert("Fel vid skapande av stad");
        console.error(error);
        return;
      }
      cityId = newCity.id;
    }

    // Spara store
    const { data, error } = await supabase.from("stores").insert([{
      type,
      name,
      address: mapsUrl || null,
      rating: rating ? parseInt(rating) : null,
      city_id: cityId
    }]);

    if (error) {
      alert("Fel vid sparande av store");
      console.error(error);
    } else {
      alert("✅ Store sparad!");
      form.reset();
      manualCityWrapper.style.display = "none";
      [...ratingStars.children].forEach(s => s.style.opacity = "1");
    }
  });
});
