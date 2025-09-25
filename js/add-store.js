// 🔑 Din Supabase-info
const supabaseUrl = "DIN_SUPABASE_URL";
const supabaseKey = "DIN_SUPABASE_ANON_KEY";
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// Ladda städer i dropdown
async function loadCities() {
  const { data: cities, error } = await supabaseClient
    .from("cities")
    .select("*")
    .order("name");

  if (error) {
    console.error(error);
    return;
  }

  const select = document.getElementById("citySelect");
  if (cities) {
    cities.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.name;
      opt.textContent = c.name;
      select.insertBefore(opt, select.querySelector('option[value="__new__"]'));
    });
  }
}

// Visa/dölj fältet för ny stad
document.getElementById("citySelect").addEventListener("change", e => {
  const newCityInput = document.getElementById("newCityInput");
  newCityInput.style.display = e.target.value === "__new__" ? "block" : "none";
});

// Skapa ID automatiskt
function generateId(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

// Spara butik
document.getElementById("storeForm").addEventListener("submit", async e => {
  e.preventDefault();

  const name = document.getElementById("storeName").value.trim();
  const address = document.getElementById("storeAddress").value.trim();
  const link = document.getElementById("storeLink").value.trim();
  let city = document.getElementById("citySelect").value;

  // Ny stad
  if (city === "__new__") {
    city = document.getElementById("newCityInput").value.trim();
    if (city) {
      await supabaseClient.from("cities").insert([{ name: city }]);
    }
  }

  const id = generateId(name);

  const { error } = await supabaseClient.from("stores").insert([
    { id, name, address, link, city }
  ]);

  const status = document.getElementById("status");
  if (error) {
    console.error(error);
    status.textContent = "❌ Fel: " + error.message;
    status.style.color = "red";
  } else {
    status.textContent = "✅ Butiken sparad!";
    status.style.color = "green";
    document.getElementById("storeForm").reset();
  }
});

// 🚀 Starta
loadCities();
