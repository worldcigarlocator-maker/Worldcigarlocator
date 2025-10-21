// start.js — with search + live store cards
const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

/* ====== Build Sidebar ====== */
async function buildSidebar() {
  const menu = document.getElementById("sidebarMenu");
  if (!menu) return;

  const { data: continents, error } = await supabase
    .from("continents")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) {
    console.error(error);
    menu.innerHTML = `<li style="color:#f56">Failed to load continents</li>`;
    return;
  }

  menu.innerHTML = "";
  for (const cont of continents) {
    const contBtn = makeButton(cont.name, "continent-btn");
    const contLi = el("li", "continent");
    contLi.appendChild(contBtn);

    const countriesList = el("ul", "nested");
    contLi.appendChild(countriesList);

    let loaded = false;
    contBtn.addEventListener("click", async () => {
      if (!loaded) {
        await loadCountries(cont.id, countriesList);
        loaded = true;
      }
      toggleList(countriesList, contBtn);
      showFilteredCount("continent", cont.name, cont.name);
      renderStores("continent", cont.name);
    });

    menu.appendChild(contLi);
  }
}

/* ====== Load Countries ====== */
async function loadCountries(continentId, container) {
  const { data: countries, error } = await supabase
    .from("countries")
    .select("id, name")
    .eq("continent_id", continentId)
    .order("name", { ascending: true });

  if (error) {
    container.innerHTML = `<li style="color:#f56">Failed to load countries</li>`;
    return;
  }

  container.innerHTML = "";
  for (const country of countries) {
    const btn = makeButton(country.name, "country-item");
    const li = el("li");
    li.appendChild(btn);

    const statesList = el("ul", "nested");
    li.appendChild(statesList);

    let loaded = false;
    btn.addEventListener("click", async () => {
      if (!loaded) {
        await loadStates(country.id, statesList);
        loaded = true;
      }
      toggleList(statesList, btn);
      showFilteredCount("country", country.name, country.name);
      renderStores("country", country.name);
    });

    container.appendChild(li);
  }
}

/* ====== Load States ====== */
async function loadStates(countryId, container) {
  const { data: states, error } = await supabase
    .from("states")
    .select("id, name")
    .eq("country_id", countryId)
    .order("name", { ascending: true });

  if (error) {
    container.innerHTML = `<li style="color:#f56">Failed to load states</li>`;
    return;
  }

  container.innerHTML = "";
  if (!states.length) {
    container.innerHTML = `<li style="color:#999;font-size:0.9rem;">No states found</li>`;
    return;
  }

  for (const st of states) {
    const btn = makeButton(st.name, "state-item");
    const li = el("li");
    li.appendChild(btn);
    container.appendChild(li);

    btn.addEventListener("click", () => {
      showFilteredCount("state", st.name, st.name);
      renderStores("state", st.name);
    });
  }
}

/* ====== Utilities ====== */
function makeButton(label, cls) {
  const btn = el("button", cls);
  const text = el("span", "label", label);
  const arrow = el("span", "arrow", "▸");
  btn.append(text, arrow);
  return btn;
}

function toggleList(list, btn) {
  const isOpen = list.classList.toggle("open");
  const arrow = btn.querySelector(".arrow");
  if (arrow) arrow.style.transform = isOpen ? "rotate(90deg)" : "rotate(0)";
}

/* ====== Count ====== */
async function loadGlobalCount() {
  const countBox = document.getElementById("countBox");
  const { count, error } = await supabase
    .from("stores")
    .select("*", { count: "exact", head: true })
    .eq("approved", true)
    .eq("deleted", false);
  countBox.textContent = error
    ? "⚠️ Unable to load count"
    : `🌍 Total approved cigar spots: ${count}`;
}

async function showFilteredCount(field, value, label) {
  const countBox = document.getElementById("countBox");
  const { count, error } = await supabase
    .from("stores")
    .select("*", { count: "exact", head: true })
    .eq(field, value)
    .eq("approved", true)
    .eq("deleted", false);
  countBox.textContent = error
    ? "⚠️ Unable to load count"
    : `${count} store${count === 1 ? "" : "s"} in ${label}`;
}

/* ====== Render Store Cards ====== */
async function renderStores(field, value) {
  const grid = document.getElementById("storeGrid");
  grid.innerHTML = `<p>Loading...</p>`;

  const { data, error } = await supabase
    .from("stores")
    .select("id, name, city, country, type, phone, website, photo_url, photo_reference")
    .eq(field, value)
    .eq("approved", true)
    .eq("deleted", false)
    .order("name");

  if (error || !data) {
    grid.innerHTML = `<p>⚠️ Failed to load stores.</p>`;
    return;
  }

  if (!data.length) {
    grid.innerHTML = `<p>No stores found here.</p>`;
    return;
  }

  grid.innerHTML = "";
  data.forEach(store => {
    const card = el("div", "store-card");
    const imgUrl =
      store.photo_url ||
      (store.photo_reference
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${store.photo_reference}&key=AIzaSyDdn7E6_dfwUjGQ1IUdJ2rQXUeEYIIzVtQ`
        : "images/store.jpg");

    card.innerHTML = `
      <img src="${imgUrl}" alt="${store.name}">
      <h3>${store.name}</h3>
      <p>${store.city ? store.city + ", " : ""}${store.country || ""}</p>
      ${store.phone ? `<p>📞 ${store.phone}</p>` : ""}
      ${store.website ? `<p><a href="${store.website}" target="_blank">🌐 Website</a></p>` : ""}
      <span class="store-type ${store.type || "store"}">${(store.type || "store").toUpperCase()}</span>
    `;
    grid.appendChild(card);
  });
}

/* ====== Search Function ====== */
async function handleSearch() {
  const query = document.getElementById("searchInput").value.trim().toLowerCase();
  const grid = document.getElementById("storeGrid");
  const countBox = document.getElementById("countBox");

  if (!query) {
    loadGlobalCount();
    grid.innerHTML = `<p>Type something to search...</p>`;
    return;
  }

  grid.innerHTML = `<p>Searching...</p>`;

  const { data, error } = await supabase
    .from("stores")
    .select("id, name, city, country, type, phone, website, photo_url, photo_reference")
    .eq("approved", true)
    .eq("deleted", false)
    .or(`name.ilike.%${query}%,city.ilike.%${query}%,country.ilike.%${query}%,type.ilike.%${query}%`)
    .order("name");

  if (error) {
    console.error(error);
    grid.innerHTML = `<p>⚠️ Search failed.</p>`;
    return;
  }

  if (!data.length) {
    grid.innerHTML = `<p>No results found for "${query}".</p>`;
    countBox.textContent = "No matches";
    return;
  }

  grid.innerHTML = "";
  countBox.textContent = `${data.length} match${data.length === 1 ? "" : "es"} found`;

  data.forEach(store => {
    const card = el("div", "store-card");
    const imgUrl =
      store.photo_url ||
      (store.photo_reference
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${store.photo_reference}&key=AIzaSyDdn7E6_dfwUjGQ1IUdJ2rQXUeEYIIzVtQ`
        : "images/store.jpg");

    card.innerHTML = `
      <img src="${imgUrl}" alt="${store.name}">
      <h3>${store.name}</h3>
      <p>${store.city ? store.city + ", " : ""}${store.country || ""}</p>
      ${store.phone ? `<p>📞 ${store.phone}</p>` : ""}
      ${store.website ? `<p><a href="${store.website}" target="_blank">🌐 Website</a></p>` : ""}
      <span class="store-type ${store.type || "store"}">${(store.type || "store").toUpperCase()}</span>
    `;
    grid.appendChild(card);
  });
}

/* ====== Init ====== */
document.addEventListener("DOMContentLoaded", () => {
  buildSidebar();
  loadGlobalCount();

  document.getElementById("searchBtn").addEventListener("click", handleSearch);
  document.getElementById("searchInput").addEventListener("keypress", e => {
    if (e.key === "Enter") handleSearch();
  });
});
