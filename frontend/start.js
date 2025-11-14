/* ============================================================
   start.js — FRONTEND v8 (full sync with Backoffice)
   ============================================================ */

import { WCL, getContinentFromCountry } from "./globals.js";
import { renderCards } from "./cards.js";
import { buildFrontendSidebar } from "./sidebar.js";

/* Supabase ESM */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(WCL.SUPABASE_URL, WCL.SUPABASE_ANON_KEY);

function qs(id){ return document.getElementById(id); }

/* ============================================================
   Load stores
   ============================================================ */
export async function loadStores(filter = {}, search = ""){
  const grid = qs("storeGrid");
  grid.innerHTML = `<p style="color:#777;text-align:center;">Loading…</p>`;

  let q = supabase
    .from("stores_public")
    .select("*")
    .order("id",{ ascending:false });

  if (filter.continent){
    const { data } = await q;
    renderCards(data.filter(s => getContinentFromCountry(s.country) === filter.continent));
    return;
  }

  if (filter.country) q = q.eq("country", filter.country);
  if (filter.city)    q = q.eq("city", filter.city);

  if (search){
    q = q.or(`name.ilike.%${search}%, city.ilike.%${search}%, country.ilike.%${search}%`);
  }

  const { data } = await q;
  renderCards(data);
}

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener("DOMContentLoaded", ()=>{

  console.log("🌍 Frontend v8 ready");

  /* Hierarchy */
  buildFrontendSidebar(supabase, loadStores, getContinentFromCountry);

  /* Initial load */
  loadStores();

  /* Search */
  const searchInput = qs("searchInput");
  qs("searchBtn")?.addEventListener("click",()=> loadStores({}, searchInput.value.trim()));
  qs("clearBtn")?.addEventListener("click",()=>{
    searchInput.value = "";
    loadStores();
  });
  searchInput?.addEventListener("keypress",(e)=>{
    if(e.key==="Enter") loadStores({}, searchInput.value.trim());
  });

  /* Modal close */
  const modal = qs("storeModal");
  if(modal){
    const close = ()=> modal.classList.remove("show");
    modal.querySelector(".modal-close")?.addEventListener("click", close);
    modal.addEventListener("click",(e)=>{ if(e.target===modal) close(); });
  }
});
