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
  if (!el) return;
  el.textContent = Math.floor(28 + Math.random() * 23) + " online";
}

/* ============================================================
   INIT FRONTEND
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  
  /* ---------------------------
     1. Ladda hierarkin
  ----------------------------*/
  buildFrontendSidebar(supabase, loadStores);

  /* ---------------------------
     2. Sökning
  ----------------------------*/
  const input = qs("searchInput");

  // Klick på Search → sök & dölj hero
  qs("searchBtn").onclick = () => {
    const term = input.value.trim();
    if (term.length > 0) loadStores({}, term);
  };

  // Enter → sök
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      const term = input.value.trim();
      if (term.length > 0) loadStores({}, term);
    }
  });

  // Clear → återställ hero
  qs("clearBtn").onclick = () => {
    input.value = "";
    resetToHero();
  };

  /* ---------------------------
     3. Age Gate
  ----------------------------*/
  initAgeGate();

  /* ---------------------------
     4. Fake Online
  ----------------------------*/
  fakeOnline();
});
