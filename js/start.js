
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

  const ok = localStorage.getItem("ageVerified");
  if (ok === "yes") {
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
   ONLINE COUNTER (fake for now)
   ============================================================ */
export function fakeOnlineCount() {
  const el = document.getElementById("onlineText");
  if (!el) return;

  const n = Math.floor(28 + Math.random() * 23);
  el.textContent = n + " online";
}

/* ============================================================
   AUTH BUTTONS (placeholder)
   ============================================================ */
export function setupAuth() {
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  loginBtn.onclick = () => alert("Auth not implemented yet.");
  logoutBtn.onclick = () => alert("Logout not implemented.");
}

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {

  // Sidebar
  buildFrontendSidebar(supabase, loadStores);

  // Search buttons
  const input = document.getElementById("searchInput");
  document.getElementById("searchBtn").onclick = () =>
    loadStores({}, input.value.trim());

  document.getElementById("clearBtn").onclick = () => {
    input.value = "";
    resetToHero();
  };

  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") loadStores({}, input.value.trim());
  });

  // Age gate
  initAgeGate();

  // Fake online counter
  fakeOnlineCount();
});
