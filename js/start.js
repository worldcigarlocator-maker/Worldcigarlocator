/* ============================================================
   start.js — World Cigar Locator (Frontend FULL v10)
   ============================================================ */

import { WCL, getContinentFromCountry } from "./globals.js";
import { renderCards } from "./cards.js";
import { buildFrontendSidebar } from "./sidebar.js";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* Helper */
function qs(id) {
  return document.getElementById(id);
}

/* Supabase client */
const supabase = createClient(WCL.SUPABASE_URL, WCL.SUPABASE_ANON_KEY);

/* ============================================================
   LOAD STORES (sidebar filters, search, default)
   ============================================================ */
export async function loadStores(filter = {}, searchTerm = "") {
  const grid = qs("storeGrid");
  if (!grid) return;

  grid.innerHTML = `<p style="color:#777;text-align:center;">Loading…</p>`;

  let query = supabase
    .from("stores_public")
    .select("*")
    .order("id", { ascending: false });

  // 🌍 Filter: Continent
  if (filter.continent) {
    const { data, error } = await query;
    if (error || !data) {
      console.error(error);
      grid.innerHTML =
        "<p style='color:#f55;text-align:center;'>Error loading stores.</p>";
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

  // Country + City filters
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
    console.error(error);
    grid.innerHTML =
      "<p style='color:#f55;text-align:center;'>Error loading stores.</p>";
    return;
  }

  const withContinent = stores.map((s) => ({
    ...s,
    continent: s.continent || getContinentFromCountry(s.country),
  }));

  renderCards(withContinent);
}

/* ============================================================
   INIT (sidebar, default, search, modal)
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  console.log("🌍 Frontend FULL v10 loaded");

  // Sidebar (hierarchy)
  buildFrontendSidebar(supabase, loadStores, getContinentFromCountry);

  // Load default
  loadStores();

  /* SEARCH HOOKS */
  const searchInput = qs("searchInput");
  const searchBtn = qs("searchBtn");
  const clearBtn = qs("clearBtn");

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

  /* MODAL CLOSE */
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
});

/* ============================================================
   HERO — Online Counter (fake for now)
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  const el = document.getElementById("onlineText");
  if (el) {
    const base = 20 + Math.floor(Math.random() * 40);
    el.textContent = `${base} online`;
  }
});

/* ============================================================
   AUTH — Fake Login/Logout (real Supabase coming later)
   ============================================================ */

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

if (loginBtn) {
  loginBtn.onclick = () => {
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
  };
}

if (logoutBtn) {
  logoutBtn.onclick = () => {
    logoutBtn.style.display = "none";
    loginBtn.style.display = "inline-block";
  };
}
