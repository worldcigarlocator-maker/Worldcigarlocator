// start.js – unified sidebar (continents → countries → states)
// -------------------------------------------------------------
const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

// === Build Sidebar ===
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
    });

    menu.appendChild(contLi);
  }
}

// === Load countries for a continent ===
async function loadCountries(continentId, container) {
  const { data: countries, error } = await supabase
    .from("countries")
    .select("id, name, continent_id")
    .eq("continent_id", continentId)
    .order("name", { ascending: true });

  if (error) {
    container.innerHTML = `<li style="color:#f56">Failed to load countries</li>`;
    return;
  }

  container.innerHTML = "";
  for (const country of countries) {
    const countryBtn = makeButton(country.name, "country-item");
    const li = el("li");
    li.appendChild(countryBtn);

    const statesList = el("ul", "nested");
    li.appendChild(statesList);

    let loaded = false;
    countryBtn.addEventListener("click", async () => {
      if (!loaded) {
        await loadStates(country.id, statesList);
        loaded = true;
      }
      toggleList(statesList, countryBtn);
    });

    container.appendChild(li);
  }
}

// === Load states for a country ===
async function loadStates(countryId, container) {
  const { data: states, error } = await supabase
    .from("states")
    .select("id, name, country_id")
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
    const stateBtn = makeButton(st.name, "state-item");
    const li = el("li");
    li.appendChild(stateBtn);
    container.appendChild(li);
  }
}

// === Utility: make button and arrow ===
function makeButton(label, cls) {
  const btn = el("button", cls);
  const text = el("span", "label", label);
  const arrow = el("span", "arrow", "▸");
  btn.append(text, arrow);
  return btn;
}

// === Utility: toggle nested lists ===
function toggleList(list, btn) {
  const isOpen = list.classList.toggle("open");
  const arrow = btn.querySelector(".arrow");
  if (arrow) arrow.style.transform = isOpen ? "rotate(90deg)" : "rotate(0)";
}

document.addEventListener("DOMContentLoaded", buildSidebar);
