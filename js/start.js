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

  if (!modal) return;

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

  /* 1. SIDEBAR */
  buildFrontendSidebar(supabase, loadStores);

  /* 2. SÖKNING */
  const input = qs("searchInput");
  const searchBtn = qs("searchBtn");
  const clearBtn = qs("clearBtn");

  searchBtn.onclick = () => {
    const term = input.value.trim();
    if (term) loadStores({}, term);
  };

  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      const term = input.value.trim();
      if (term) loadStores({}, term);
    }
  });

  clearBtn.onclick = () => {
    input.value = "";
    resetToHero();
  };

  /* 3. AGE GATE */
  initAgeGate();

  /* 4. FAKE ONLINE */
  fakeOnline();
});
