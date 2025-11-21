import { supabase, qs } from "./globals.js";
import { loadStores, resetToHero } from "./cards.js";
import { buildFrontendSidebar } from "./sidebar.js";

/* ============================================================
   AGE GATE
   ============================================================ */
export function initAgeGate() {
  const modal = qs("ageGate");
  const enter = qs("enterBtn");
  const leave = qs("leaveBtn");

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

  // ENTER KEY SUPPORT
  document.addEventListener("keydown", (e) => {
    if (modal.classList.contains("hidden")) return;
    if (e.key === "Enter") enter.click();
  });
}

/* ============================================================
   FAKE ONLINE COUNTER
   ============================================================ */
export function fakeOnlineCount() {
  const el = qs("onlineText");
  if (!el) return;
  el.textContent = Math.floor(28 + Math.random() * 23) + " online";
}

/* ============================================================
   AUTH PLACEHOLDER
   ============================================================ */
export function setupAuth() {
  qs("loginBtn").onclick = () => alert("Auth coming soon!");
  qs("logoutBtn").onclick = () => alert("Logout coming soon!");
}

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  // Sidebar
  buildFrontendSidebar(supabase, loadStores);

  // Search
  const input = qs("searchInput");

  qs("searchBtn").onclick = () =>
    loadStores({}, input.value.trim());

  qs("clearBtn").onclick = () => {
    input.value = "";
    resetToHero();
  };

  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") loadStores({}, input.value.trim());
  });

  // Age gate
  initAgeGate();

  // Fake online
  fakeOnlineCount();
});
