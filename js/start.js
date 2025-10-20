// start.js – Dynamic sidebar for approved stores (World Cigar Locator)

// ===== Supabase Config =====
const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== Helpers =====
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

function getContinent(country) {
  const c = (country || "").toLowerCase();
  if (["sweden", "germany", "italy", "france", "spain", "norway", "finland", "denmark", "netherlands", "belgium", "austria", "poland", "czech republic", "czechia"].includes(c)) return "Europe";
  if (["united states", "usa", "canada", "mexico"].includes(c)) return "North America";
  if (["brazil", "argentina", "chile", "colombia", "peru"].includes(c)) return "South America";
  if (["china", "japan", "india", "thailand", "malaysia", "israel", "singapore"].includes(c)) return "Asia";
  if (["south africa", "nigeria", "kenya", "morocco"].includes(c)) return "Africa";
  if (["australia", "new zealand", "fiji"].includes(c)) return "Oceania";
  return "Other";
}

// ===== Build Sidebar =====
async function buildSidebar() {
  const menu = document.querySelector(".nav");
  if (!menu) return;

  menu.innerHTML = "<p style='color:#ccc;text-align:center;'>Loading...</p>";

  const { data, error } = await supabase
    .from("stores")
    .select("name, city, state, country, approved, deleted")
    .eq("approved", true)
    .eq("deleted", false);

  if (error) {
    console.error(error);
    menu.innerHTML = `<p style="color:#f56;text-align:center;">Failed to load stores</p>`;
    return;
  }

  // Group data → Continent → Country → City
  const grouped = {};
  data.forEach((s) => {
    const cont = getContinent(s.country);
    if (!grouped[cont]) grouped[cont] = {};
    if (!grouped[cont][s.country]) grouped[cont][s.country] = {};
    if (!grouped[cont][s.country][s.city]) grouped[cont][s.country][s.city] = [];
    grouped[cont][s.country][s.city].push(s.name);
  });

  // Build HTML tree
  menu.innerHTML = "";
  Object.entries(grouped).forEach(([continent, countries]) => {
    const contBtn = el("button", "nav-item");
    contBtn.textContent = `+ ${continent}`;
    const contList = el("div", "nested");
    contList.style.display = "none";

    contBtn.addEventListener("click", () => {
      const open = contList.style.display === "block";
      contList.style.display = open ? "none" : "block";
      contBtn.textContent = (open ? "+ " : "− ") + continent;
    });

    // Countries
    Object.entries(countries).forEach(([country, cities]) => {
      const cBtn = el("button", "nav-item country-btn", `› ${country}`);
      cBtn.style.marginLeft = "1rem";
      const cList = el("div", "nested");
      cList.style.display = "none";

      cBtn.addEventListener("click", () => {
        const open = cList.style.display === "block";
        cList.style.display = open ? "none" : "block";
      });

      // Cities
      Object.entries(cities).forEach(([city, stores]) => {
        const cityBtn = el("button", "nav-item city-btn", `• ${city}`);
        cityBtn.style.marginLeft = "2rem";
        const storeList = el("div", "nested");
        storeList.style.display = "none";

        cityBtn.addEventListener("click", () => {
          const open = storeList.style.display === "block";
          storeList.style.display = open ? "none" : "block";
        });

        // Stores
        stores.forEach((store) => {
          const sBtn = el("button", "nav-item store-btn", store);
          sBtn.style.marginLeft = "3rem";
          storeList.appendChild(sBtn);
        });

        cList.append(cityBtn, storeList);
      });

      contList.append(cBtn, cList);
    });

    menu.append(contBtn, contList);
  });
}

// ===== Init =====
document.addEventListener("DOMContentLoaded", buildSidebar);
