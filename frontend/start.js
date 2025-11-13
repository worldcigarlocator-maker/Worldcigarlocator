/* ============================================================
   start.js — World Cigar Locator Frontend v8
   Clean build with sidebar.js + cards.js + globals.js
   ============================================================ */

import { renderCards } from "./cards.js";
import { buildFrontendSidebar } from "./sidebar.js";
import { photoURL, WCL } from "./globals.js";

/* ============================================================
   Supabase
   ============================================================ */
const SUPABASE_URL = WCL.SUPABASE_URL;
const SUPABASE_ANON_KEY = WCL.SUPABASE_ANON_KEY ?? 
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ============================================================
   Helpers
   ============================================================ */
function qs(id){ return document.getElementById(id); }

function getContinentFromCountry(country){
  if(!country) return "Other";
  const c = country.toLowerCase();
  if(["sweden","germany","france","italy","spain","norway","finland","denmark","netherlands","belgium","austria","switzerland","poland","czech republic","czechia"].includes(c)) return "Europe";
  if(["united states","usa","canada","mexico","cuba","dominican republic"].includes(c)) return "North America";
  if(["brazil","argentina","chile","peru","colombia","uruguay","paraguay"].includes(c)) return "South America";
  if(["china","japan","india","thailand","malaysia","singapore","israel","turkey","vietnam","indonesia"].includes(c)) return "Asia";
  if(["south africa","nigeria","kenya","morocco","egypt","ghana"].includes(c)) return "Africa";
  if(["australia","new zealand","fiji"].includes(c)) return "Oceania";
  return "Other";
}

/* ============================================================
   LOAD STORES — used by sidebar + search
   ============================================================ */
export async function loadStores(filter = {}, searchTerm = "") {
  const grid = document.getElementById("storeGrid");
  grid.innerHTML = `<p style="color:#777;text-align:center;">Loading…</p>`;

  let query = supabase
    .from("stores_public")
    .select("*")
    .order("id", { ascending: false });

  // continent filter
  if (filter.continent){
    const { data } = await query;
    const filtered = data.filter((s)=> getContinentFromCountry(s.country) === filter.continent);
    renderCards(filtered);
    return;
  }

  if(filter.country) query = query.eq("country", filter.country);
  if(filter.city)    query = query.eq("city", filter.city);

  if(searchTerm){
    query = query.or(`
      name.ilike.%${searchTerm}%,
      city.ilike.%${searchTerm}%,
      country.ilike.%${searchTerm}%
    `);
  }

  const { data: stores } = await query;
  renderCards(stores);
}

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {

  console.log("🌍 Frontend v8 loaded");

  // sidebar
  buildFrontendSidebar(loadStores, getContinentFromCountry);

  // default load
  loadStores();

  // search
  const searchInput = qs("searchInput");
  const searchBtn = qs("searchBtn");
  const clearBtn = qs("clearBtn");

  searchBtn?.addEventListener("click",()=> {
    loadStores({}, searchInput.value.trim());
  });

  clearBtn?.addEventListener("click",()=> {
    searchInput.value = "";
    loadStores();
  });

  searchInput?.addEventListener("keypress",(e)=>{
    if(e.key === "Enter"){
      loadStores({}, searchInput.value.trim());
    }
  });

  // modal close behaviour
  const modal = qs("storeModal");
  if(modal){
    const close = ()=> modal.classList.remove("show");
    modal.querySelector(".modal-close")?.addEventListener("click", close);
    modal.addEventListener("click",(e)=>{ if(e.target === modal) close(); });
  }
});
