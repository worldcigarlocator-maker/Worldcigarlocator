// ===== Supabase init =====
const SUPABASE_URL = "https://YOUR_PROJECT.supabase.co";
const SUPABASE_KEY = "YOUR_PUBLIC_ANON_KEY";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener("DOMContentLoaded", async () => {
  const sidebar = document.getElementById("sidebarContent");
  const searchInput = document.getElementById("sidebarSearch");

  // Alltid dessa världsdelar (utan Antarctica)
  const continents = ["Europe", "North America", "South America", "Asia", "Africa", "Oceania"];

  // Initiera tom struktur
  const grouped = {};
  continents.forEach(c => grouped[c] = {});

  // Hämta städer med butiker
  const { data: stores, error } = await supabase
    .from("stores")
    .select("id, city:cities(name, country, continent)");

  if (!error && stores) {
    stores.forEach(store => {
      const city = store.city;
      if (!city) return;
      const cont = city.continent || "Other";
      const country = city.country || "Unknown";

      if (!grouped[cont]) grouped[cont] = {};
      if (!grouped[cont][country]) grouped[cont][country] = new Set();
      grouped[cont][country].add(city.name);
    });
  }

  // Bygg HTML
  let html = "<ul class='sidebar-list'>";
  continents.forEach(cont => {
    html += `
      <li class="continent">
        <button class="toggle">${cont}</button>
        <ul class="country-list">`;

    Object.keys(grouped[cont]).sort().forEach(country => {
      html += `
        <li class="country">
          <button class="toggle">${country}</button>
          <ul class="city-list">`;

      Array.from(grouped[cont][country]).sort().forEach(city => {
        html += `<li><a href="city.html?city=${encodeURIComponent(city)}">${city}</a></li>`;
      });

      html += `</ul></li>`;
    });

    html += `</ul></li>`;
  });

  // Alltid knappar längst ner
  html += `
    <li class="sidebar-extra"><a href="add-store.html">➕ Add Store</a></li>
    <li class="sidebar-extra"><a href="mailto:support@worldcigarlocator.com">📩 Contact</a></li>
  `;
  html += "</ul>";

  sidebar.innerHTML = html;

  // Expand/Collapse funktion
  sidebar.querySelectorAll(".toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      btn.classList.toggle("open");
      const next = btn.nextElementSibling;
      if (next) next.classList.toggle("open");
    });
  });

  // Sökfunktion
  searchInput.addEventListener("input", () => {
    const term = searchInput.value.toLowerCase();
    sidebar.querySelectorAll("a").forEach(link => {
      const match = link.textContent.toLowerCase().includes(term);
      link.parentElement.style.display = match ? "" : "none";
    });
  });
});
