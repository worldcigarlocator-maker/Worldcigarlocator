// ===============================
// START PAGE LOGIC
// ===============================

import { supabase } from "./globals.js";
import { renderCards } from "./cards.js";
import { buildFrontendSidebar } from "./sidebar.js";

// DOM
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const clearBtn = document.getElementById("clearBtn");
const resultHeading = document.getElementById("resultHeading");
const showAllBtn = document.getElementById("showAllBtn");
const storeGrid = document.getElementById("storeGrid");

// ===============================
// DEFAULT = NO CARDS
// ===============================
function resetToHero() {
  storeGrid.innerHTML = "";
  resultHeading.style.display = "none";
  showAllBtn.style.display = "none";
}
resetToHero();  // <-- IMPORTANT

// ===============================
// SEARCH
// ===============================
searchBtn.addEventListener("click", async () => {
  const q = searchInput.value.trim();
  if (!q) return;

  const { data, error } = await supabase
    .from("stores_public")
    .select("*")
    .ilike("name", `%${q}%`);

  resultHeading.style.display = "block";
  resultHeading.textContent = `Results for "${q}"`;
  showAllBtn.style.display = "none";

  if (!error && data.length > 0) {
    renderCards(data);
  } else {
    storeGrid.innerHTML = "<p>No results found.</p>";
  }
});

// ===============================
// CLEAR BUTTON
// ===============================
clearBtn.addEventListener("click", () => {
  searchInput.value = "";
  resetToHero();   // <-- No cards
});

// ===============================
// SIDEBAR FILTER (loadStores)
// ===============================
export async function loadStores(filter) {
  let query = supabase.from("stores_public").select("*");

  if (filter.continent) query = query.eq("continent", filter.continent);
  if (filter.country) query = query.eq("country", filter.country);
  if (filter.city) query = query.eq("city", filter.city);

  const { data } = await query;

  resultHeading.style.display = "block";
  resultHeading.textContent =
    filter.city || filter.country || filter.continent;

  renderCards(data);
}

buildFrontendSidebar(supabase, loadStores, (country) => {
  // Simple continent mapping
  if (!country) return "Other";
  if (["Sweden","Norway","Germany","France","Spain","Italy"].includes(country)) return "Europe";
  if (["Thailand","Japan","China"].includes(country)) return "Asia";
  if (["USA","Canada"].includes(country)) return "North America";
  return "Other";
});
