/* ============================================================
   start.js — World Cigar Locator (Frontend v8)
   ============================================================ */

import { WCL, getContinentFromCountry } from "./globals.js";
import { renderCards } from "./cards.js";
import { buildFrontendSidebar } from "./sidebar.js";

/* ============================================================
   Helpers
   ============================================================ */
function qs(id){ 
  return document.getElementById(id); 
}

/* ============================================================
   Supabase
   ============================================================ */
const SUPABASE_URL = WCL.SUPABASE_URL;
const SUPABASE_ANON_KEY = WCL.SUPABASE_ANON_KEY;

const supabase = window.supabase.createClient(
  SUPABASE_URL, 
  SUPABASE_ANON_KEY
);


/* ============================================================
   LOAD STORES — used by sidebar + search
   ============================================================ */
export async function loadStores(filter = {}, searchTerm = "") {

  const grid = qs("storeGrid");
  grid.innerHTML = `<p style="color:#777;text-align:center;">Loading…</p>`;

  let q = supabase
    .from("stores_public")
    .select("*")
    .order("id", { ascending: false });

  /* -------- CONTINENT FILTER -------- */
  if (filter.continent) {
    const { data } = await q;
    const filtered = data.filter(
      (s) => getContinentFromCountry(s.country) === filter.continent
    );
    renderCards(filtered);
    return;
  }

  /* -------- COUNTRY / CITY FILTER -------- */
  if (filter.country) q = q.eq("country", filter.country);
  if (filter.city)    q = q.eq("city", filter.city);

  /* -------- SEARCH -------- */
  if (searchTerm) {
    q = q.or(`
      name.ilike.%${searchTerm}%,
      city.ilike.%${searchTerm}%,
      country.ilike.%${searchTerm}%
    `);
  }

  const { data: stores } = await q;
  renderCards(stores);
}


/* ============================================================
   INIT
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {

  console.log("🌍 Frontend v8 loaded");

  /* ---- Sidebar ---- */
  buildFrontendSidebar(loadStores, getContinentFromCountry);

  /* ---- Load latest ---- */
  loadStores();

  /* ---- Search ---- */
  const searchInput = qs("searchInput");
  const searchBtn   = qs("searchBtn");
  const clearBtn    = qs("clearBtn");

  searchBtn?.addEventListener("click", () => {
    loadStores({}, searchInput.value.trim());
  });

  clearBtn?.addEventListener("click", () => {
    searchInput.value = "";
    loadStores();
  });

  searchInput?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      loadStores({}, searchInput.value.trim());
    }
  });

  /* ---- Modal close ---- */
  const modal = qs("storeModal");
  if (modal) {
    const close = () => modal.classList.remove("show");

    modal.querySelector(".modal-close")?.addEventListener("click", close);

    modal.addEventListener("click", (e) => {
      if (e.target === modal) close();
    });
  }
});
