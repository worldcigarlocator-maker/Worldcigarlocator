import { supabase } from "./globals.js";
import { loadStores, resetToHero } from "./cards.js";
import { buildFrontendSidebar } from "./sidebar.js";

/* ============================================================
   AGE GATE (localStorage)
   ============================================================ */
export function initAgeGate() {
  const modal = document.getElementById("ageGate");
  const enter = document.getElementById("enterBtn");
  const leave = document.getElementById("leaveBtn");

  // If verified → hide immediately
  const ok = localStorage.getItem("ageVerified");
  if (ok === "yes") {
    modal.classList.add("hidden");
    return;
  }

  // Show modal
  modal.classList.remove("hidden");

  // ENTER (fade-out)
  enter.onclick = () => {
    localStorage.setItem("ageVerified", "yes");
    modal.classList.add("fade-out");
    setTimeout(() => modal.classList.add("hidden"), 420);
  };

  // LEAVE PAGE
  leave.onclick = () => {
    window.location.href = "https://google.com";
  };
}

/* ============================================================
   FAKE ONLINE COUNTER
   ============================================================ */
export function fakeOnlineCount() {
  const el = document.getElementById("onlineText");
  if (!el) return;

  const n = Math.floor(28 + Math.random() * 23);
  el.textContent = `${n} online`;
}

/* ============================================================
   AUTH PLACEHOLDER
   ============================================================ */
export function setupAuth() {
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  if (loginBtn)
    loginBtn.onclick = () => alert("Auth not implemented yet.");

  if (logoutBtn)
    logoutBtn.onclick = () => alert("Logout not implemented yet.");
}

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  // Sidebar hierarchy
  buildFrontendSidebar(supabase, loadStores);

  // SEARCH BAR
  const input = document.getElementById("searchInput");

  document.getElementById("searchBtn").onclick = () => {
    loadStores({}, input.value.trim());
  };

  document.getElementById("clearBtn").onclick = () => {
    input.value = "";
    resetToHero();
  };

  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      loadStores({}, input.value.trim());
    }
  });

  // AGE GATE
  initAgeGate();

  // Simulated online counter
  fakeOnlineCount();
});
