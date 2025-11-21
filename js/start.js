/* ============================================================
   START.JS — STEP 1
   ============================================================ */

import { WCL } from "./globals.js";
import { buildFrontendSidebar } from "./sidebar.js";
import { renderCards } from "./cards.js";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(WCL.SUPABASE_URL, WCL.SUPABASE_ANON_KEY);

const qs = (id) => document.getElementById(id);

let HERO_VISIBLE = true;

/* ============================================================
   LOAD STORES
   ============================================================ */
export async function loadStores(filter = {}, search = "") {
  const grid = qs("storeGrid");
  const hero = qs("hero");
  const heading = qs("resultHeading");
  const showAll = qs("showAllBtn");

  // Hide hero when searching or selecting continent/country/city
  hero.style.display = "none";
  HERO_VISIBLE = false;

  heading.style.display = "block";

  let query = supabase
    .from("stores_public")
    .select("*")
    .order("id", { ascending: false })
    .limit(20);

  if (filter.continent) query = query.eq("continent", filter.continent);
  if (filter.country) query = query.eq("country", filter.country);
  if (filter.city) query = query.eq("city", filter.city);

  if (search) {
    query = query.or(`name.ilike.%${search}%,city.ilike.%${search}%,country.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error(error);
    grid.innerHTML = "<p style='color:red;text-align:center;'>Error loading stores.</p>";
    return;
  }

  renderCards(data || []);
}

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  console.log("🌍 Frontend Step 1 loaded");

  buildFrontendSidebar(supabase, loadStores);

  // SEARCH
  const searchInput = qs("searchInput");
  qs("searchBtn").addEventListener("click", () => loadStores({}, searchInput.value.trim()));
  qs("clearBtn").addEventListener("click", () => {
    searchInput.value = "";
    resetToHero();
  });

  // ENTER key
  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") loadStores({}, searchInput.value.trim());
  });

  // Mock login
  qs("loginBtn").onclick = () => alert("Login placeholder — real auth coming in step 2");
  qs("logoutBtn").onclick = () => alert("Logout placeholder");
});

/* ============================================================
   RESET TO HERO (Clear)
   ============================================================ */
function resetToHero() {
  qs("storeGrid").innerHTML = "";
  qs("resultHeading").style.display = "none";
  qs("showAllBtn").style.display = "none";
  qs("hero").style.display = "block";
  HERO_VISIBLE = true;
}
