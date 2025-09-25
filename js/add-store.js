// Initiera Supabase-klienten
const { createClient } = supabase;
const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";
const supabaseClient = createClient(supabaseUrl, supabaseKey);

// 🔹 Ladda alla städer till dropdown vid sidstart
async function loadCities() {
  const { data, error } = await supabaseClient
    .from("cities")
    .select("*")
    .order("name");

  if (error) {
    console.error("Error loading cities:", error);
    return;
  }

  const citySelect = document.getElementById("storeCity");
  citySelect.innerHTML = ""; // rensa först

  data.forEach((city) => {
    const option = document.createElement("option");
    option.value = city.id; // använd city_id
    option.textContent = city.name;
    citySelect.appendChild(option);
  });

  // Lägg till alternativet för att skapa ny stad
  const addNewOption = document.createElement("option");
  addNewOption.value = "new";
  addNewOption.textContent = "➕ Add new city";
  citySelect.appendChild(addNewOption);
}

// 🔹 Visa / göm inputfältet för ny stad
document.getElementById("storeCity").addEventListener("change", (e) => {
  const newCityInput = document.getElementById("newCity");
  if (e.target.value === "new") {
    newCityInput.style.display = "block";
  } else {
    newCityInput.style.display = "none";
  }
});

// 🔹 Hantera formuläret
document.getElementById("storeForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("storeName").value.trim();
  const address = document.getElementById("storeAddress").value.trim();
  const link = document.getElementById("storeLink").value.trim();
  const citySelect = document.getElementById("storeCity");
  const newCityInput = document.getElementById("newCity");

  let cityId;

  // Om användaren vill skapa en ny stad
  if (citySelect.value === "new") {
    const newCityName = newCityInput.value.trim();
    if (!newCityName) {
      document.getElementById("status").innerText = "Please enter a city name.";
      return;
    }

    // Spara ny stad i Supabase
    const { data: newCity, error: cityError } = await supabaseClient
      .from("cities")
      .insert([{ name: newCityName }])
      .select()
      .single();

    if (cityError) {
      console.error(cityError);
      document.getElementById("status").innerText = "Error saving new city.";
      return;
    }

    cityId = newCity.id; // hämta id från nya staden
  } else {
    cityId = citySelect.value; // använd befintlig stad
  }

  // Skapa ett slug för butikens ID
  const storeId = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  // Spara butiken i Supabase
  const { error: storeError } = await supabaseClient.from("stores").insert([
    {
      id: storeId,
      name: name,
      address: address,
      link: link || null,
      city_id: cityId, // relation till staden
    },
  ]);

  if (storeError) {
    console.error(storeError);
    document.getElementById("status").innerText = "Error saving store.";
  } else {
    document.getElementById("status").innerText = "✅ Store added successfully!";
    document.getElementById("storeForm").reset();
    newCityInput.style.display = "none"; // göm igen
    loadCities(); // ladda om listan om ny stad tillkom
  }
});

// 🔹 Ladda städerna direkt när sidan öppnas
loadCities();
