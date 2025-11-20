/* ============================================================
   start.js — World Cigar Locator (Frontend premium)
   ============================================================ */

import { WCL, getContinentFromCountry } from "./globals.js";
import { renderCards } from "./cards.js";
import { buildFrontendSidebar } from "./sidebar.js";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* Helpers */
function qs(id) {
  return document.getElementById(id);
}

/* Supabase client */
const supabase = createClient(WCL.SUPABASE_URL, WCL.SUPABASE_ANON_KEY);

/* ============================================================
   LOAD STORES — used by sidebar + search
   ============================================================ */
export async function loadStores(filter = {}, searchTerm = "") {
  const grid = qs("storeGrid");
  if (!grid) return;

  grid.innerHTML = `<p style="color:#777;text-align:center;">Loading…</p>`;

  let query = supabase
    .from("stores_public")
    .select("*")
    .order("id", { ascending: false });

  // Filter via continent (calculated via helper)
  if (filter.continent) {
    const { data, error } = await query;
    if (error || !data) {
      console.error(error);
      grid.innerHTML =
        "<p style='color:#c00;text-align:center;'>Error loading stores.</p>";
      return;
    }

    const filtered = data
      .map((s) => ({
        ...s,
        continent: getContinentFromCountry(s.country),
      }))
      .filter((s) => s.continent === filter.continent);

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
    grid.innerHTML =
      "<p style='color:#c00;text-align:center;'>Error loading stores.</p>";
    return;
  }

  const withContinent = stores.map((s) => ({
    ...s,
    continent: s.continent || getContinentFromCountry(s.country),
  }));

  renderCards(withContinent);
}

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  console.log("🌍 Frontend premium layout loaded");

  // Sidebar
  buildFrontendSidebar(supabase, loadStores, getContinentFromCountry);

  // Default load
  loadStores();

  // =========================
  // Search / autocomplete
  // =========================
  const searchInput = qs("searchInput");
  const searchBtn = qs("searchBtn");
  const clearBtn = qs("clearBtn");

  // Klick på Search
  searchBtn?.addEventListener("click", () => {
    const term = searchInput.value.trim();
    loadStores({}, term);
  });

  // Clear
  clearBtn?.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    loadStores();
  });

  // Enter i sök
  searchInput?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      const term = searchInput.value.trim();
      loadStores({}, term);
    }
  });

  // Autocomplete / live-sök
  let searchTimeout;
  searchInput?.addEventListener("input", () => {
    const term = searchInput.value.trim();

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      if (term.length >= 2) {
        loadStores({}, term);
      } else if (term.length === 0) {
        loadStores();
      }
    }, 250);
  });

  // =========================
  // Modal close behaviour
  // =========================
  const modal = qs("storeModal");
  if (modal) {
    const close = () => {
      modal.classList.remove("show");
      modal.setAttribute("aria-hidden", "true");
    };
    modal.querySelector(".modal-close")?.addEventListener("click", close);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) close();
    });
  }

  // =========================
  // Fake ONLINE COUNTER
  // =========================
  const onlineText = qs("onlineText");

  if (onlineText) {
    const base = 40;   // basantal
    const spread = 25; // variation

    const updateOnline = () => {
      const n = base + Math.floor(Math.random() * spread);
      onlineText.textContent = `${n} online (demo)`;
    };

    updateOnline();
    setInterval(updateOnline, 15000); // uppdatera var 15:e sekund
  }

  // =========================
  // AUTH PLACEHOLDER
  // =========================
  const loginBtn = qs("loginBtn");
  const logoutBtn = qs("logoutBtn");

  if (loginBtn && logoutBtn) {
    loginBtn.addEventListener("click", () => {
      alert("Login placeholder – riktig Supabase-auth kommer sen!");
      loginBtn.style.display = "none";
      logoutBtn.style.display = "inline-block";
    });

    logoutBtn.addEventListener("click", () => {
      alert("Logout placeholder – riktig Supabase-auth kommer sen!");
      logoutBtn.style.display = "none";
      loginBtn.style.display = "inline-block";
    });
  }
});
