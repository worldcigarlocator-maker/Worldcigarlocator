// ===============================
// 🔑 Supabase konfiguration
// ===============================
const supabaseUrl = "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"; // TODO: byt till din riktiga Supabase URL
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4"; // TODO: byt till din riktiga anon key
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// ===============================
// ⭐ Stjärnlogik
// ===============================
let currentRating = 0;
const stars = document.querySelectorAll('#starRating span');

stars.forEach((star, index) => {
  star.addEventListener('click', () => {
    currentRating = index + 1;
    stars.forEach(s => s.classList.remove('selected'));
    for (let i = 0; i < currentRating; i++) {
      stars[i].classList.add('selected');
    }
  });
});

function getRating() {
  return currentRating;
}

// ===============================
// 📍 Google Maps Autocomplete
// ===============================
function initAutocomplete() {
  const input = document.getElementById('address');
  const autocomplete = new google.maps.places.Autocomplete(input);

  autocomplete.addListener('place_changed', function () {
    const place = autocomplete.getPlace();
    let city = "Unknown";
    let country = "Unknown";

    if (place.address_components) {
      place.address_components.forEach(comp => {
        if (comp.types.includes("locality")) city = comp.long_name;
        if (comp.types.includes("country")) country = comp.long_name;
      });
    }

    document.getElementById('city').value = city;
    document.getElementById('country').value = country;
  });
}
window.initAutocomplete = initAutocomplete;

// ===============================
// 💾 Spara butik
// ===============================
async function saveStore(e) {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const address = document.getElementById("address").value.trim();
  const city = document.getElementById("city").value.trim() || "Unknown";
  const country = document.getElementById("country").value.trim() || "Unknown";
  const phone = document.getElementById("phone").value.trim();
  const website = document.getElementById("website").value.trim();
  const type = document.querySelector('input[name="type"]:checked')?.value || "store";
  const rating = getRating();

  const newStore = { name, address, city, country, phone, website, type, rating };
  console.log("Saving store:", newStore);

  const { data, error } = await supabase.from("stores").insert([newStore]);

  if (error) {
    console.error("❌ Error saving:", error.message);
    alert("Kunde inte spara: " + error.message);
  } else {
    console.log("✅ Store saved:", data);
    alert("Butiken sparades!");

    // Nollställ formuläret
    document.getElementById("storeForm").reset();
    stars.forEach(s => s.classList.remove('selected'));
    currentRating = 0;
  }
}

// ===============================
// 🎛 Event listeners
// ===============================
document.getElementById("saveBtn").addEventListener("click", saveStore);
