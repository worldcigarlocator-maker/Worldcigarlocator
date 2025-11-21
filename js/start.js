/* ============================================================
   START.JS — FRONTEND CONTROLLER (no auto-load on start)
   ============================================================ */

import { WCL, getContinentFromCountry } from "./globals.js";
import { renderCards } from "./cards.js";
import { buildFrontendSidebar } from "./sidebar.js";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* Helper */
const qs = (id) => document.getElementById(id);

/* Supabase client */
const supabase = createClient(WCL.SUPABASE_URL, WCL.SUPABASE_ANON_KEY);

/* Hide hero */
function hideHero() {
  const hero = document.querySelector(".hero");
  if (hero) hero.style.display = "none";
}

/* Show hero */
function showHero() {
  const hero = document.querySelector(".hero");
  if (hero) hero.style.display = "block";
}

/* ============================================================
   LOAD STORES (Search or Sidebar only)
   ============================================================ */
export async function loadStores(filter = {}, searchTerm = "") {
  hideHero(); // Always hide hero when loading cards

  const grid = qs("storeGrid");
  if (!grid) return;

  grid.innerHTML = `<p style="color:#777;text-align:center;">Loading…</p>`;

  let query = supabase
    .from("stores_public")
    .select("*")
    .order("id", { ascending: false });

  // Filters
  if (filter.continent) {
    const { data, error } = await query;
    if (error || !data) {
      grid.innerHTML = `<p style="color:#f55;text-align:center;">Error loading stores.</p>`;
      return;
    }

    const filtered = data
      .map((s) => ({ ...s, continent: getContinentFromCountry(s.country) }))
      .filter((s) => s.continent === filter.continent);

    renderCards(filtered);
    return;
  }

  if (filter.country) query = query.eq("country", filter.country);
  if (filter.city) query = query.eq("city", filter.city);

  // Search
  if (searchTerm) {
    query = query.or(
      `name.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%,country.ilike.%${searchTerm}%`
    );
  }

  const { data: stores, error } = await query;
  if (error || !stores) {
    grid.innerHTML = `<p style="color:#f55;text-align:center;">Error loading stores.</p>`;
    return;
  }

  const enriched = stores.map((s) => ({
    ...s,
    continent: s.continent || getContinentFromCountry(s.country),
  }));

  renderCards(enriched);
}

/* ============================================================
   INIT — Do NOT auto-load stores
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  console.log("🌍 start.js loaded — hero mode active");

  // Build sidebar (will call loadStores itself on click)
  buildFrontendSidebar(supabase, loadStores, getContinentFromCountry);

  // ---- IMPORTANT ----
  // Do NOT call loadStores() here!
  // We want only the hero image visible on first load.

  /* Search */
  const searchInput = qs("searchInput");
  const searchBtn = qs("searchBtn");
  const clearBtn = qs("clearBtn");

  searchBtn?.addEventListener("click", () => {
    const term = searchInput.value.trim();
    if (term.length === 0) return; // empty search does nothing

    hideHero();
    loadStores({}, term);
  });

  searchInput?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      const term = searchInput.value.trim();
      if (term.length === 0) return;

      hideHero();
      loadStores({}, term);
    }
  });

  /* Clear */
  clearBtn?.addEventListener("click", () => {
    searchInput.value = "";

    // Remove cards
    qs("storeGrid").innerHTML = "";

    // Reset heading
    qs("resultHeading").innerHTML = "";

    // Hide "show all"
    qs("showAllBtn").style.display = "none";

    // Show hero again ❤️
    showHero();
  });

  /* Modal close */
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

  /* Fake auth */
  const loginBtn = qs("loginBtn");
  const logoutBtn = qs("logoutBtn");

  loginBtn?.addEventListener("click", () => {
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    alert("Fake login – real Supabase Auth coming later!");
  });

  logoutBtn?.addEventListener("click", () => {
    logoutBtn.style.display = "none";
    loginBtn.style.display = "inline-block";
  });
});
