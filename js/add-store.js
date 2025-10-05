// ==== CONFIG ====
const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4"; 
const GOOGLE_API_KEY = "AIzaSyClP5xnMvYaHC1xjHzuTFj3K9tHw0g6O00"
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);


// Google API key
const GOOGLE_API_KEY = "AIzaSyDdn7E6_dfwUjGQ1IUdJ2rQXUeEYIIzVtQ";


// === Stjärnbetyg ===
let selectedRating = 0;
document.querySelectorAll("#ratingStars span").forEach(star => {
  star.addEventListener("click", () => {
    selectedRating = parseInt(star.dataset.value);
    document.querySelectorAll("#ratingStars span").forEach(s => {
      s.classList.toggle("active", parseInt(s.dataset.value) <= selectedRating);
    });
  });
});

// === Paste-knapp ===
document.getElementById("pasteBtn").addEventListener("click", async () => {
  const mapsUrl = document.getElementById("mapsUrl").value.trim();
  if (!mapsUrl) {
    alert("Klistra in en Google Maps-länk först!");
    return;
  }

  const data = await fetchPlaceDetails(mapsUrl);

  if (data) {
    fillForm(data);
    markEmptyFields();
    alert("✅ Data hämtad – komplettera gärna där det saknas!");
  } else {
    alert("❌ Kunde inte hämta platsdata. Fyll i manuellt.");
  }
});

// === Spara formuläret ===
document.getElementById("addStoreForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const store = {
    name: document.getElementById("name").value,
    address: document.getElementById("address").value,
    website: document.getElementById("website").value,
    phone: document.getElementById("phone").value,
    type: document.getElementById("type").value,
    rating: selectedRating,
    city: document.getElementById("city").value,
    country: document.getElementById("country").value,
    status: "pending"
  };

  const { error } = await supabase.from("stores").insert([store]);
  if (error) {
    alert("❌ Fel vid sparande: " + er
