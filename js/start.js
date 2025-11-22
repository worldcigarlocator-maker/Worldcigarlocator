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

  leave.onclick = () => (window.location.href = "https://google.com");
}

/* ============================================================
   FAKE ONLINE COUNTER
   ============================================================ */
function fakeOnline() {
  const el = qs("onlineText");
  el.textContent = Math.floor(28 + Math.random() * 23) + " online";
}

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  buildFrontendSidebar(supabase, loadStores);

  const input = qs("searchInput");

  qs("searchBtn").onclick = () => loadStores({}, input.value.trim());

  qs("clearBtn").onclick = () => {
    input.value = "";
    resetToHero();
  };

  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") loadStores({}, input.value.trim());
  });

  initAgeGate();
  fakeOnline();
});
