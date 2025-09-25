document.getElementById("storeForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("storeName").value.trim();
  const address = document.getElementById("storeAddress").value.trim();
  const link = document.getElementById("storeLink").value.trim();
  const citySelect = document.getElementById("storeCity");
  const newCityInput = document.getElementById("newCity");

  let cityId;

  // 1. Om användaren valde "Add new city"
  if (citySelect.value === "new") {
    const newCityName = newCityInput.value.trim();
    if (!newCityName) {
      document.getElementById("status").innerText = "Please enter a city name.";
      return;
    }

    // Spara ny stad i Supabase
    const { data: newCity, error: cityError } = await supabase
      .from("cities")
      .insert([{ name: newCityName }])
      .select()
      .single();

    if (cityError) {
      console.error(cityError);
      document.getElementById("status").innerText = "Error saving new city.";
      return;
    }

    cityId = newCity.id; // ta id från ny stad
  } else {
    cityId = citySelect.value; // ta city_id från dropdown
  }

  // 2. Skapa ett ID för butiken (slug)
  const storeId = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  // 3. Lägg till butik i Supabase
  const { error: storeError } = await supabase.from("stores").insert([
    {
      id: storeId,
      name: name,
      address: address,
      link: link || null,
      city_id: cityId, // <--- Spara relationen här
    },
  ]);

  if (storeError) {
    console.error(storeError);
    document.getElementById("status").innerText = "Error saving store.";
  } else {
    document.getElementById("status").innerText = "Store added successfully!";
    document.getElementById("storeForm").reset();
    newCityInput.style.display = "none"; // göm om man skrev ny stad
  }
});
