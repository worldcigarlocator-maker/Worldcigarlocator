// locationService.js
// Hämtar kontinenter, länder och städer från Supabase
// Används i add-store.js

// Supabase klient
const supabaseUrl = "https:// https://gbxxoeplkzbhsvagnfsr.supabase.co";
const supabaseKey = " eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4"; 
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);


// Fyller landslistan när man valt kontinent
export async function loadCountries(continent) {
  const { data: countries, error } = await supabase
    .from("countries")
    .select("id, name, code, continent")
    .eq("continent", continent)
    .order("name");

  const countrySelect = document.getElementById("country");
  countrySelect.innerHTML = '<option value="">Välj land</option>';

  if (countries) {
    countries.forEach(c => {
      const option = document.createElement("option");
      // flagga via emoji från landets ISO-kod (2 bokstäver)
      const flag = String.fromCodePoint(...[...c.code].map(ch => 127397 + ch.charCodeAt()));
      option.value = c.id;
      option.textContent = `${flag} ${c.name}`;
      countrySelect.appendChild(option);
    });
  }
}

// Fyller stadlistan när man valt land
export async function loadCities(countryId) {
  const { data: cities, error } = await supabase
    .from("cities")
    .select("id, name")
    .eq("country_id", countryId)
    .order("name");

  const citySelect = document.getElementById("city");
  citySelect.innerHTML = '<option value="">Välj stad</option>';

  if (cities && cities.length > 0) {
    cities.forEach(city => {
      const option = document.createElement("option");
      option.value = city.id;
      option.textContent = city.name;
      citySelect.appendChild(option);
    });
  } else {
    // Om inga städer finns i DB → ge möjlighet att skriva själv
    const option = document.createElement("option");
    option.value = "manual";
    option.textContent = "✏️ Skriv stad själv…";
    citySelect.appendChild(option);
  }
}
