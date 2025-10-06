// 🔑 Supabase setup
const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co; // <-- byt ut
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4"; // <-- byt ut
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// ⭐ Stjärnor klickbara
const stars = document.querySelectorAll('#starRating span');

stars.forEach((star, index) => {
  star.addEventListener('click', () => {
    stars.forEach(s => s.classList.remove('selected')); // rensa
    for (let i = 0; i <= index; i++) {
      stars[i].classList.add('selected'); // markera upp till klickade
    }
  });
});

// Hämta rating
function getRating() {
  return document.querySelectorAll('#starRating .selected').length;
}

// 💾 Spara butik
async function saveStore(e) {
  e.preventDefault();

  // Hämta värden från formuläret
  const name = document.getElementById("storeName").value.trim();
  const address = document.getElementById("storeAddress").value.trim();
  const city = document.getElementById("storeCity").value.trim() || "Unknown";
  const country = document.getElementById("storeCountry").value.trim() || "Unknown";
  const phone = document.getElementById("storePhone").value.trim();
  const website = document.getElementById("storeWebsite").value.trim();
  const type = document.querySelector('input[name="storeType"]:checked')?.value || "Other";
  let rating = getRating();
  if (isNaN(rating) || rating < 0 || rating > 5) rating = 0;

  // Skicka till Supabase
  const { data, error } = await supabase
    .from("stores")
    .insert([
      { name, address, city, country, phone, website, type, rating }
    ]);

  if (error) {
    console.error("Error saving:", error.message);
    alert("❌ Misslyckades att spara: " + error.message);
  } else {
    alert("✅ Butiken sparades!");
    document.getElementById("storeForm").reset();

    // Nollställ stjärnor
    stars.forEach(s => s.classList.remove("selected"));
  }
}

// 🟡 Koppla Save-knappen
document.getElementById("saveBtn").addEventListener("click", saveStore);
document.addEventListener('DOMContentLoaded', () => {
  const starContainer = document.getElementById('starRating');
  if (!starContainer) {
    console.warn('⚠️ Hittar inte #starRating i DOM:en.');
    return;
  }

  const stars = Array.from(starContainer.querySelectorAll('span'));
  if (!stars.length) {
    console.warn('⚠️ Inga <span> inuti #starRating – lägg in 5 stjärnor.');
  }

  let currentRating = 0;

  function clearStates() {
    stars.forEach(s => s.classList.remove('hover', 'selected'));
  }
  function applySelected(r) {
    for (let i = 0; i < stars.length; i++) {
      stars[i].classList.toggle('selected', i < r);
    }
  }
  function applyHover(r) {
    for (let i = 0; i < stars.length; i++) {
      stars[i].classList.toggle('hover', i < r);
    }
  }

  // Hover-preview på containern (event delegation)
  starContainer.addEventListener('mouseover', (e) => {
    const idx = stars.indexOf(e.target);
    if (idx >= 0) {
      clearStates();
      applyHover(idx + 1);
    }
  });

  starContainer.addEventListener('mouseout', () => {
    clearStates();
    applySelected(currentRating);
  });

  // Klick för att spara betyg
  starContainer.addEventListener('click', (e) => {
    const idx = stars.indexOf(e.target);
    if (idx >= 0) {
      currentRating = idx + 1;
      clearStates();
      applySelected(currentRating);
    }
  });

  // Gör getRating global så save-funktionen kan läsa den
  window.getRating = () => currentRating;

  // Debug (valfritt)
  // console.log('⭐ Stjärnor hittade:', stars.length);
});

