import { supabase, qs, getContinent } from "./globals.js";
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
   ONLINE COUNTER (fake)
   ============================================================ */
export function fakeOnlineCount() {
  const el = qs("onlineText");
  if (!el) return;

  const n = Math.floor(28 + Math.random() * 23);
  el.textContent = n + " online";
}

/* ============================================================
   AUTH PLACEHOLDER
   ============================================================ */
export function setupAuth() {
  const loginBtn = qs("loginBtn");
  const logoutBtn = qs("logoutBtn");

  loginBtn.onclick = () => alert("Auth coming soon!");
  logoutBtn.onclick = () => alert("Logout coming soon!");
}

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {

  // BUILD SIDEBAR (nu skickar vi med getContinent)
  buildFrontendSidebar(supabase, loadStores, getContinent);

  // Search
  const input = qs("searchInput");

  qs("searchBtn").onclick = () =>
    loadStores({}, input.value.trim());

  qs("clearBtn").onclick = () => {
    input.value = "";
    resetToHero();
  };

  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      loadStores({}, input.value.trim());
    }
  });

  // Init 18+ Gate
  initAgeGate();

  // Fake online
  fakeOnlineCount();
});
