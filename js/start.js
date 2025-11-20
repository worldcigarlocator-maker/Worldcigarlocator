/* ============================================================
   start.js — World Cigar Locator (Frontend v8)
   ============================================================ */

import { WCL, getContinentFromCountry } from "./globals.js";
import { renderCards } from "./cards.js";
import { buildFrontendSidebar } from "./sidebar.js";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* Helpers */
function qs(id) {
  return document.getElementById(id);
}

/* Supabase client (ESM, no window.supabase) */
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

  if (filter.continent) {
    const { data, error } = await query;
    if (error || !data) {
      console.error(error);
      grid.innerHTML =
        "<p style='color:#f55;text-align:center;'>Error loading stores.</p>";
      return;
    }
    const filtered = data.map((s) => ({
      ...s,
      continent: getContinentFromCountry(s.country),
    })).filter((s) => s.continent === filter.continent);
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
   INIT
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  console.log("🌍 Frontend v8 loaded");

  // Sidebar (gets supabase instance, loader + continent helper)
  buildFrontendSidebar(supabase, loadStores, getContinentFromCountry);

  // Default load
  loadStores();

  // Search hooks
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

  // Modal close behaviour (modal markup finns i start.html)
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
// AUTH placeholder (vi bygger riktig senare)
document.getElementById("loginBtn").onclick = () => {
  alert("Login placeholder – riktig auth kommer sen!");
};

document.getElementById("logoutBtn").onclick = () => {
  alert("Logout placeholder – riktig auth kommer sen!");
};

// ============================================================
// AUTH placeholder (riktig Supabase-auth kommer senare)
// ============================================================

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const authStatus = document.getElementById("authStatus");

if (loginBtn) {
  loginBtn.addEventListener("click", () => {
    authStatus.textContent = "Logged in (mock)";
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    authStatus.textContent = "Logged out";
    logoutBtn.style.display = "none";
    loginBtn.style.display = "inline-block";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  if (loginBtn) {
    loginBtn.onclick = () => alert("Login placeholder – riktig auth kommer sen!");
  }

  if (logoutBtn) {
    logoutBtn.onclick = () => alert("Logout placeholder – riktig auth kommer sen!");
  }
});
