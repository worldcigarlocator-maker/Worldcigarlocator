// start.js – bygg sidomenyn från Supabase

// ===== Supabase-konfiguration (din publika anon-nyckel) =====
const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== Hjälpfunktioner =====
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

// ===== Ladda kontineneter och bygg meny =====
async function buildSidebar() {
  const menu = document.getElementById("sidebarMenu");
  if (!menu) return;

  // Hämta kontinenter i bokstavsordning
  const { data: continents, error } = await supabase
    .from("continents")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error loading continents:", error);
    menu.innerHTML = `<li style="color:#f56">Failed to load continents</li>`;
    return;
  }

  menu.innerHTML = "";
  continents.forEach((cont) => {
    // <li class="continent">
    const li = el("li", "continent");

    // knappen (rad)
    const btn = el("button", "continent-btn");
    const sign = el("span", "sign", "+");
    const label = el("span", "label", cont.name);
    btn.append(sign, label);
    li.appendChild(btn);

    // underlista för länder
    const nested = el("ul", "nested");
    li.appendChild(nested);

    // toggle + lazy load
    let loaded = false;
    btn.addEventListener("click", async () => {
      if (!loaded) {
        await loadCountries(cont.id, nested);
        loaded = true;
      }
      const isOpen = nested.classList.toggle("open");
      sign.textContent = isOpen ? "−" : "+";
    });

    menu.appendChild(li);
  });
}

// ===== Hämta länder för en kontinent =====
async function loadCountries(continentId, containerUl) {
  // Hämta länder
  const { data: countries, error } = await supabase
    .from("countries")
    .select("id, name, flag, continent_id")
    .eq("continent_id", continentId)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error loading countries:", error);
    containerUl.innerHTML = `<li style="color:#f56">Failed to load countries</li>`;
    return;
  }

  containerUl.innerHTML = "";
  countries.forEach((c) => {
    const li = el("li", "country");
    const flag = el("span", "flag", c.flag || "");
    const name = el("span", "name", c.name);
    li.append(flag, name);
    containerUl.appendChild(li);
  });
}

// ===== Start =====
document.addEventListener("DOMContentLoaded", buildSidebar);
