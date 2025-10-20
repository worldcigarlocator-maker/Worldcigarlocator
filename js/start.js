// start.js — full dynamic hierarchy + count system
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
      showFilteredCount("continent", cont.name, cont.name);
    });

    menu.appendChild(contLi);
  }
}

// === Load countries ===
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
    });

    container.appendChild(li);
  }
}

// === Load states ===
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

    btn.addEventListener("click", () =>
      showFilteredCount("state", st.name, st.name)
    );
  }
}

// === Utility ===
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

// === Count functions ===
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

// === Init ===
document.addEventListener("DOMContentLoaded", () => {
  buildSidebar();
  loadGlobalCount();
});
