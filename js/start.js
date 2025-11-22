// js/start.js
import { supabase, getContinentFromCountry } from "./globals.js";
import { renderCards } from "./cards.js";
import { buildFrontendSidebar } from "./sidebar.js";

/* Snabb helper */
const qs = (id) => document.getElementById(id);

/* ============================================================
   AGE GATE (localStorage)
   ============================================================ */
function initAgeGate() {
  const modal = qs("ageGate");
  const enter = qs("enterBtn");
  const leave = qs("leaveBtn");

  if (!modal || !enter || !leave) return;

  const ok = localStorage.getItem("ageVerified");
  if (ok === "yes") {
    modal.classList.add("hidden");
    return;
  }

  modal.classList.remove("hidden");

  enter.onclick = () => {
    localStorage.setItem("ageVerified", "yes");
    modal.classList.add("hidden");
  };

  leave.onclick = () => {
    window.location.href = "https://google.com";
  };
}

/* ============================================================
   ONLINE COUNTER (fake for now)
   ============================================================ */
function fakeOnlineCount() {
  const el = qs("onlineText");
  if (!el) return;

  const n = Math.floor(28 + Math.random() * 23);
  el.textContent = `${n} online`;
}

/* ============================================================
   AUTH BUTTONS (placeholder)
   ============================================================ */
function setupAuth() {
  const loginBtn = qs("loginBtn");
  const logoutBtn = qs("logoutBtn");

  if (!loginBtn || !logoutBtn) return;

  loginBtn.onclick = () => {
    alert("Login (mock) – riktig auth kommer senare.");
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
  };

  logoutBtn.onclick = () => {
    alert("Logout (mock).");
    logoutBtn.style.display = "none";
    loginBtn.style.display = "inline-block";
  };
}

/* ============================================================
   HERO SHOW / HIDE
   ============================================================ */
const heroSection = qs("heroSection");
const heroText = qs("heroText");
const resultHeading = qs("resultHeading");
const showAllBtn = qs("showAllBtn");
const storeGrid = qs("storeGrid");

function showHeroIdle() {
  if (heroSection) heroSection.style.display = "block";
  if (heroText) heroText.style.display = "block";
  if (resultHeading) resultHeading.style.display = "none";
  if (showAllBtn) showAllBtn.style.display = "none";
  if (storeGrid) storeGrid.innerHTML = "";
}

function hideHeroForResults() {
  if (heroSection) heroSection.style.display = "none";
  if (heroText) heroText.style.display = "none";
}

/* ============================================================
   LOAD STORES (used by search + sidebar)
   ============================================================ */
export async function loadStores(filter = {}, searchTerm = "") {
  if (!storeGrid) return;

  hideHeroForResults();
  storeGrid.innerHTML =
    "<p style='color:#888;text-align:center;margin-top:1rem;'>Loading…</p>";

  let query = supabase
    .from("stores_public")
    .select("*")
    .order("id", { ascending: false });

  // Kontinentfilter (kräver att vi hämtar allt och mappar)
  if (filter.continent) {
    const { data, error } = await query;
    if (error || !data) {
      console.error(error);
      storeGrid.innerHTML =
        "<p style='color:#f55;text-align:center;'>Error loading stores.</p>";
      return;
    }
    const filtered = data
      .map((s) => ({
        ...s,
        continent: s.continent || getContinentFromCountry(s.country),
      }))
      .filter((s) => s.continent === filter.continent);

    updateResultHeading(filter, searchTerm, filtered.length);
    storeGrid.innerHTML = "";
    renderCards(filtered);
    return;
  }

  if (filter.country) query = query.eq("country", filter.country);
  if (filter.city) query = query.eq("city", filter.city);

  if (searchTerm) {
    query = query.or(
      `name.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%,country.ilike.%${searchTerm}%`
    );
  }

  const { data: stores, error } = await query;
  if (error || !stores) {
    console.error(error);
    storeGrid.innerHTML =
      "<p style='color:#f55;text-align:center;'>Error loading stores.</p>";
    return;
  }

  const withContinent = stores.map((s) => ({
    ...s,
    continent: s.continent || getContinentFromCountry(s.country),
  }));

  updateResultHeading(filter, searchTerm, withContinent.length);
  storeGrid.innerHTML = "";
  renderCards(withContinent);
}

function updateResultHeading(filter, searchTerm, count) {
  if (!resultHeading) return;

  let label = "";
  if (filter.city) label = `${filter.city} — ${count} locations`;
  else if (filter.country) label = `${filter.country} — ${count} locations`;
  else if (filter.continent)
    label = `${filter.continent} — ${count} locations`;
  else if (searchTerm)
    label = `Search results for “${searchTerm}” — ${count} locations`;
  else label = `Latest ${count} worldwide`;

  resultHeading.textContent = label;
  resultHeading.style.display = "block";
}

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  // Sidebar (skickar in wrapper som gömmer hero automatiskt)
  const wrappedLoader = (filter = {}, searchTerm = "") =>
    loadStores(filter, searchTerm);

  buildFrontendSidebar(supabase, wrappedLoader, getContinentFromCountry);

  // Search
  const input = qs("searchInput");
  const searchBtn = qs("searchBtn");
  const clearBtn = qs("clearBtn");

  if (searchBtn && input) {
    searchBtn.onclick = () =>
      loadStores({}, input.value.trim());
  }

  if (clearBtn && input) {
    clearBtn.onclick = () => {
      input.value = "";
      showHeroIdle(); // tillbaka till hero + intro, inga kort
    };
  }

  if (input) {
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        loadStores({}, input.value.trim());
      }
    });
  }

  // Startläge: bara hero + intro
  showHeroIdle();

  // Age gate
  initAgeGate();

  // Fake online counter
  fakeOnlineCount();

  // Auth mock
  setupAuth();
});
