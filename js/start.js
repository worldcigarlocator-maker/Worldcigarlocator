// start.js — World Cigar Locator frontend bootstrap

import { supabase, qs } from "./globals.js";
import { loadStores, resetToHero } from "./cards.js";
import { buildFrontendSidebar } from "./sidebar.js";

/* ============================================================
   AGE GATE (localStorage)
   ============================================================ */
export function initAgeGate() {
  const modal = document.getElementById("ageGate");
  const enter = document.getElementById("enterBtn");
  const leave = document.getElementById("leaveBtn");

  if (!modal || !enter || !leave) return;

  const ok = localStorage.getItem("ageVerified");
  if (ok === "yes") {
    modal.classList.add("hidden");
    return;
  }

  // Visa popup
  modal.classList.remove("hidden");

  // Enter (18+)
  enter.onclick = () => {
    localStorage.setItem("ageVerified", "yes");
    modal.classList.add("hidden");
  };

  // Leave
  leave.onclick = () => {
    window.location.href = "https://google.com";
  };
}

/* ============================================================
   ONLINE COUNTER (fake just nu)
   ============================================================ */
export function fakeOnlineCount() {
  const el = qs("onlineText");
  if (!el) return;

  const n = Math.floor(28 + Math.random() * 23); // 28–50
  el.textContent = `${n} online`;
}

/* ============================================================
   AUTH PLACEHOLDER (riktig Supabase-auth senare)
   ============================================================ */
export function setupAuth() {
  const loginBtn = qs("loginBtn");
  const logoutBtn = qs("logoutBtn");

  if (!loginBtn || !logoutBtn) return;

  loginBtn.onclick = () => {
    alert("Auth coming soon! (Supabase auth)");
  };

  logoutBtn.onclick = () => {
    alert("Logout coming soon!");
  };
}

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  // 1) Bygg sidomenyn (hierarki)
  buildFrontendSidebar(supabase, loadStores);

  // 2) Search-fält & knappar
  const input = qs("searchInput");
  const searchBtn = qs("searchBtn");
  const clearBtn = qs("clearBtn");

  if (searchBtn && input) {
    searchBtn.onclick = () => {
      const term = input.value.trim();
      if (!term) {
        // Tom sök => gå tillbaka till hero
        resetToHero();
        return;
      }
      loadStores({}, term);
    };
  }

  if (clearBtn && input) {
    clearBtn.onclick = () => {
      input.value = "";
      resetToHero(); // visar hero + gömmer kort
    };
  }

  if (input) {
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        const term = input.value.trim();
        if (!term) {
          resetToHero();
          return;
        }
        loadStores({}, term);
      }
    });
  }

  // 3) Age gate
  initAgeGate();

  // 4) Fake online counter
  fakeOnlineCount();
  // uppdatera lite då och då om du vill:
  // setInterval(fakeOnlineCount, 15000);

  // 5) Auth-placeholder
  setupAuth();

  // 6) Start-läge: hero synlig, inga kort
  resetToHero();
});
