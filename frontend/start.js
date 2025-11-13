/* ============================================================
   start.js — World Cigar Locator (Frontend v8)
   - Uses globals.js (WCL + helpers)
   - Uses cards.js (renderCards)
   - Uses sidebar.js (buildFrontendSidebar)
   ============================================================ */

import { WCL, getContinentFromCountry, photoURL } from "./globals.js";
import { renderCards } from "./cards.js";
import { buildFrontendSidebar } from "./sidebar.js";

/* ---------------- Helpers ---------------- */
function qs(id){ return document.getElementById(id); }

/* ---------------- Supabase client ---------------- */
const SUPABASE_URL = WCL.SUPABASE_URL || "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const SUPABASE_ANON_KEY =
  WCL.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ============================================================
   LOAD STORES — used by sidebar + search
   ============================================================ */
export async function loadStores(filter = {}, searchTerm = "") {
  const grid = qs("storeGrid");
  const heading = qs("resultHeading");
  const showAllBtn = qs("showAllBtn");

  if (!grid) return;

  grid.innerHTML = `<p style="color:#777;text-align:center;">Loading…</p>`;

  let query = supabase
    .from("stores_public")
    .select("*")
    .order("id", { ascending: false });

  // Continent filter (client-side using helper)
  if (filter.continent) {
    const { data, error } = await query;
    if (error || !data) {
      grid.innerHTML = `<p style="color:#c33;text-align:center;">Error loading stores.</p>`;
      return;
    }
    const filtered = data.filter(
      (s) => getContinentFromCountry(s.country) === filter.continent
    );
    if (heading) heading.textContent = `Latest in ${filter.continent}`;
    if (showAllBtn) showAllBtn.style.display = "inline-block";
    renderCards(filtered);
    return;
  }

  if (filter.country) {
    query = query.eq("country", filter.country);
    if (heading) heading.textContent = `Latest in ${filter.country}`;
  }

  if (filter.city) {
    query = query.eq("city", filter.city);
    if (heading) heading.textContent = `Latest in ${filter.city}`;
  }

  if (searchTerm) {
    query = query.or(
      `name.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%,country.ilike.%${searchTerm}%`
    );
    if (heading) heading.textContent = `Results for "${searchTerm}"`;
  }

  const { data: stores, error } = await query;
  if (error) {
    console.error(error);
    grid.innerHTML = `<p style="color:#c33;text-align:center;">Error loading stores.</p>`;
    return;
  }

  if (!stores || !stores.length) {
    grid.innerHTML = `<p style="color:#777;text-align:center;">No stores found.</p>`;
    if (showAllBtn) showAllBtn.style.display = "none";
    return;
  }

  // Default heading
  if (!filter.city && !filter.country && !filter.continent && !searchTerm) {
    if (heading) heading.textContent = "Latest 20 worldwide";
    if (showAllBtn) showAllBtn.style.display = "none";
  } else {
    if (showAllBtn) showAllBtn.style.display = "inline-block";
  }

  renderCards(stores);
}

/* ============================================================
   MODAL: openStoreModal (used by cards.js via window.openStoreModal)
   ============================================================ */
window.openStoreModal = function(store) {
  const modal     = qs("storeModal");
  const mPhoto    = qs("mPhoto");
  const mTitle    = qs("mTitle");
  const mAddress  = qs("mAddress");
  const mLocation = qs("mLocation");
  const mVisit    = qs("mVisit");

  if (!modal) return;

  // Basic info
  if (mPhoto) {
    if (store.photo_reference) {
      mPhoto.src = photoURL(store.photo_reference, 800);
    } else {
      mPhoto.src = WCL.FALLBACK_IMG;
    }
  }

  if (mTitle)   mTitle.textContent   = store.name || "";
  if (mAddress) mAddress.textContent = store.address || "";
  if (mLocation) {
    const locParts = [store.city, store.country].filter(Boolean);
    mLocation.textContent = locParts.join(", ");
  }

  if (mVisit) {
    if (store.website) {
      mVisit.style.display = "inline-block";
      mVisit.onclick = () => {
        window.open(store.website, "_blank", "noopener");
      };
    } else {
      mVisit.style.display = "none";
      mVisit.onclick = null;
    }
  }

  // For now: comments / rating knappar är UI-only (ingen save-logik här)
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
};

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  console.log("🌍 Frontend v8 loaded");

  // Sidebar
  buildFrontendSidebar(loadStores);

  // Default load
  loadStores();

  // Search wiring
  const searchInput = qs("searchInput");
  const searchBtn   = qs("searchBtn");
  const clearBtn    = qs("clearBtn");
  const showAllBtn  = qs("showAllBtn");

  searchBtn?.addEventListener("click", () => {
    const term = (searchInput?.value || "").trim();
    loadStores({}, term);
  });

  clearBtn?.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    loadStores();
  });

  searchInput?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      const term = (searchInput.value || "").trim();
      loadStores({}, term);
    }
  });

  showAllBtn?.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    loadStores();
    showAllBtn.style.display = "none";
  });

  // Modal close behavior
  const modal = qs("storeModal");
  if (modal) {
    const closeBtn = modal.querySelector(".modal-close");
    const close = () => {
      modal.classList.remove("show");
      modal.setAttribute("aria-hidden","true");
    };
    closeBtn?.addEventListener("click", close);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) close();
    });
  }
});
