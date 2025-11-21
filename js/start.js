/* ============================================================
   START.JS — HERO ACTIVE UNTIL SEARCH
   ============================================================ */

import { WCL, getContinentFromCountry } from "./globals.js";
import { renderCards } from "./cards.js";
import { buildFrontendSidebar } from "./sidebar.js";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const qs = (id) => document.getElementById(id);

const supabase = createClient(WCL.SUPABASE_URL, WCL.SUPABASE_ANON_KEY);

/* HERO TOGGLE */
function hideHero() {
  const hero = document.querySelector(".hero");
  if (hero) hero.style.display = "none";
}
function showHero() {
  const hero = document.querySelector(".hero");
  if (hero) hero.style.display = "block";
}

/* LOAD STORES */
export async function loadStores(filter = {}, searchTerm = "") {
  hideHero();

  const grid = qs("storeGrid");
  if (!grid) return;

  grid.innerHTML = `<p style="color:#777;text-align:center;">Loading…</p>`;

  let query = supabase
    .from("stores_public")
    .select("*")
    .order("id", { ascending: false });

  if (filter.continent) {
    const { data, error } = await query;
    if (error || !data) return;

    const filtered = data
      .map((s) => ({ ...s, continent: getContinentFromCountry(s.country) }))
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
  if (!stores) return;

  const enriched = stores.map((s) => ({
    ...s,
    continent: s.continent || getContinentFromCountry(s.country),
  }));

  renderCards(enriched);
}

/* INIT */
document.addEventListener("DOMContentLoaded", () => {
  console.log("🌍 start.js — hero active");

  buildFrontendSidebar(supabase, loadStores, getContinentFromCountry);

  /* Search */
  const searchInput = qs("searchInput");
  const searchBtn = qs("searchBtn");
  const clearBtn = qs("clearBtn");

  searchBtn.addEventListener("click", () => {
    const term = searchInput.value.trim();
    if (term.length === 0) return;
    hideHero();
    loadStores({}, term);
  });

  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      const term = searchInput.value.trim();
      if (term.length === 0) return;
      hideHero();
      loadStores({}, term);
    }
  });

  clearBtn.addEventListener("click", () => {
    searchInput.value = "";
    qs("storeGrid").innerHTML = "";
    qs("resultHeading").innerHTML = "";
    qs("showAllBtn").style.display = "none";
    showHero();
  });

  /* Fake auth */
  const loginBtn = qs("loginBtn");
  const logoutBtn = qs("logoutBtn");

  loginBtn.addEventListener("click", () => {
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    alert("Fake login — real auth soon");
  });

  logoutBtn.addEventListener("click", () => {
    logoutBtn.style.display = "none";
    loginBtn.style.display = "inline-block";
  });
});
