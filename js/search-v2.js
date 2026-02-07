// ============================================================
// search-v2.js — WCL Frontend (Search v2 · DOM-first)
// ============================================================

const qs = (sel) => document.querySelector(sel);

document.addEventListener("DOMContentLoaded", () => {
  const searchZone = qs("#searchZone");
  const filters    = qs("#searchFilters");
  const searchBtn  = qs("#searchBtn");
  const clearBtn   = qs("#clearBtn");

  if (!searchZone || !searchBtn) {
    console.warn("Search v2 DOM not ready");
    return;
  }

  // Click on search surface
  searchZone.addEventListener("click", () => {
    searchZone.classList.add("active");
    console.log("🔍 Search zone activated");
  });

  // Run search
  searchBtn.addEventListener("click", () => {
    console.log("🚀 Run search (v2)");
  });

  // Clear
  clearBtn?.addEventListener("click", () => {
    console.log("✕ Clear search (v2)");
  });

  // Filter buttons
  filters?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-filter]");
    if (!btn) return;

    btn.classList.toggle("active");
    console.log("🧩 Filter toggled", btn.dataset.filter, btn.dataset.value);
  });
});
