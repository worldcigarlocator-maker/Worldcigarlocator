import { supabase } from "./globals.js";
import { loadStores, resetToHero } from "./cards.js";
import { buildFrontendSidebar } from "./sidebar.js";

/* ============================================================
   AGE GATE (localStorage)
   ============================================================ */
function initAgeGate() {
  const modal = document.getElementById("ageGate");
  const enter = document.getElementById("enterBtn");
  const leave = document.getElementById("leaveBtn");

  if (localStorage.getItem("ageVerified") === "yes") {
    modal.classList.add("hidden");
    return;
  }

  modal.classList.remove("hidden");

  enter.onclick = () => {
    localStorage.setItem("ageVerified", "yes");
    modal.classList.add("hidden");
  };

  leave.onclick = () => {
    window.location.href = "https://google.com";
  };
}

/* ============================================================
   FAKE ONLINE COUNTER
   ============================================================ */
function fakeOnlineCount() {
  const el = document.getElementById("onlineText");
  if (!el) return;
  const n = Math.floor(20 + Math.random() * 40);
  el.textContent = n + " online";
}

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {

  // Sidebar hierarchy
  buildFrontendSidebar(supabase, loadStores);

  // Search
  const input = document.getElementById("searchInput");

  function doSearch() {
    loadStores({}, input.value.trim());
  }

  document.getElementById("searchBtn").onclick = doSearch;
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") doSearch();
  });

  document.getElementById("clearBtn").onclick = () => {
    input.value = "";
    resetToHero();
  };

  // Age gate
  initAgeGate();

  // Online count
  fakeOnlineCount();
});
