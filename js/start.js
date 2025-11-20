/* ============================================================
   start.js — World Cigar Locator (Frontend with Supabase Auth)
   ============================================================ */

import { WCL, getContinentFromCountry } from "./globals.js";
import { renderCards } from "./cards.js";
import { buildFrontendSidebar } from "./sidebar.js";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* Helpers */
function qs(id) {
  return document.getElementById(id);
}

/* Supabase client */
const supabase = createClient(WCL.SUPABASE_URL, WCL.SUPABASE_ANON_KEY);

/* ============================================================
   LOAD STORES
   ============================================================ */
export async function loadStores(filter = {}, searchTerm = "") {
  const grid = qs("storeGrid");
  if (!grid) return;

  grid.innerHTML =
    "<p style='color:#777;text-align:center;margin-top:1rem;'>Loading…</p>";

  let query = supabase
    .from("stores_public")
    .select("*")
    .order("id", { ascending: false });

  if (filter.continent) {
    const { data, error } = await query;
    if (error || !data) {
      console.error(error);
      grid.innerHTML =
        "<p style='color:#f55;text-align:center;'>Error loading stores.</p>";
      return;
    }
    const filtered = data
      .map((s) => ({
        ...s,
        continent: getContinentFromCountry(s.country),
      }))
      .filter((s) => s.continent === filter.continent);
    renderCards(filtered);
    return;
  }

  if (filter.country) query = query.eq("country", filter.country);
  if (filter.city) query = query.eq("city", filter.city);

  if (searchTerm) {
    query = query.or(
      `name.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%,country.ilike.%${searchTerm}%`
    );
  }

  const { data: stores, error } = await query;
  if (error || !stores) {
    console.error(error);
    grid.innerHTML =
      "<p style='color:#f55;text-align:center;'>Error loading stores.</p>";
    return;
  }

  const withContinent = stores.map((s) => ({
    ...s,
    continent: s.continent || getContinentFromCountry(s.country),
  }));

  renderCards(withContinent);
}

/* ============================================================
   AUTH UI HELPERS
   ============================================================ */

function setAuthStatus(user) {
  const authStatus = qs("authStatus");
  const loginBtn = qs("loginBtn");
  const logoutBtn = qs("logoutBtn");

  if (!authStatus || !loginBtn || !logoutBtn) return;

  if (user) {
    const email = user.email || "logged in";
    authStatus.textContent = `Logged in as ${email}`;
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
  } else {
    authStatus.textContent = "Not logged in";
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
  }
}

async function refreshAuthState() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.warn("auth getUser error", error.message);
  }
  setAuthStatus(data?.user || null);
}

/* ============================================================
   AUTH MODAL LOGIC
   ============================================================ */

function setupAuthModal() {
  const loginBtn = qs("loginBtn");
  const logoutBtn = qs("logoutBtn");
  const authModal = qs("authModal");
  const authClose = document.querySelector(".auth-close");
  const authSubmit = qs("authSubmit");
  const emailInput = qs("authEmail");
  const passwordInput = qs("authPassword");

  if (!authModal || !loginBtn || !logoutBtn || !authSubmit) return;

  const openModal = () => {
    authModal.classList.add("show");
    authModal.setAttribute("aria-hidden", "false");
    emailInput.value = "";
    passwordInput.value = "";
    emailInput.focus();
  };

  const closeModal = () => {
    authModal.classList.remove("show");
    authModal.setAttribute("aria-hidden", "true");
  };

  loginBtn.addEventListener("click", openModal);
  authClose?.addEventListener("click", closeModal);
  authModal.addEventListener("click", (e) => {
    if (e.target === authModal) closeModal();
  });

  authSubmit.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      alert("Please enter both email and password.");
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Login error", error);
      alert("Login failed: " + error.message);
      return;
    }

    setAuthStatus(data.user);
    closeModal();
  });

  logoutBtn.addEventListener("click", async () => {
    await supabase.auth.signOut();
    setAuthStatus(null);
  });
}

/* ============================================================
   REALTIME ONLINE USERS
   ============================================================ */

let sessionId = localStorage.getItem("wcl_session_id");
if (!sessionId) {
  sessionId = crypto.randomUUID();
  localStorage.setItem("wcl_session_id", sessionId);
}

async function heartbeat() {
  // Upsert this session
  await supabase.from("online_users").upsert({
    session_id: sessionId,
    updated_at: new Date().toISOString(),
  });

  // Rensa gamla sessions (äldre än 45 sek)
  const cutoff = new Date(Date.now() - 45_000).toISOString();
  await supabase.from("online_users").delete().lt("updated_at", cutoff);
}

async function updateOnlineCount() {
  const onlineCountEl = qs("onlineCount");
  if (!onlineCountEl) return;

  const { count, error } = await supabase
    .from("online_users")
    .select("id", { count: "exact", head: true });

  if (error) {
    console.warn("online count error", error.message);
    onlineCountEl.textContent = "Online: –";
    return;
  }

  onlineCountEl.textContent = `Online: ${count ?? 0}`;
}

function setupRealtimeOnline() {
  // Första värdet
  updateOnlineCount();
  // Heartbeat var 30:e sekund
  heartbeat();
  setInterval(heartbeat, 30_000);

  // Realtime-kanal
  supabase
    .channel("online-users-channel")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "online_users" },
      () => {
        updateOnlineCount();
      }
    )
    .subscribe();
}

/* ============================================================
   INIT
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  console.log("🌍 Frontend with Supabase Auth & Online loaded");

  // Sidebar hierarchy
  buildFrontendSidebar(supabase, loadStores, getContinentFromCountry);

  // Default cards
  loadStores();

  // Search hooks — live filter + clear
  const searchInput = qs("searchInput");
  const clearBtn = qs("clearBtn");

  searchInput?.addEventListener("input", (e) => {
    const term = e.target.value.trim();
    loadStores({}, term);
  });

  clearBtn?.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    loadStores();
  });

  // Store modal close
  const storeModal = qs("storeModal");
  if (storeModal) {
    const close = () => {
      storeModal.classList.remove("show");
      storeModal.setAttribute("aria-hidden", "true");
    };
    storeModal.querySelector(".modal-close")?.addEventListener("click", close);
    storeModal.addEventListener("click", (e) => {
      if (e.target === storeModal) close();
    });
  }

  // Expose modal opener for cards.js
  window.openStoreModal = (store) => {
    if (!storeModal) return;
    storeModal.classList.add("show");
    storeModal.setAttribute("aria-hidden", "false");

    qs("mTitle").textContent = store.name || "";
    qs("mAddress").textContent = store.address || "";
    qs("mLocation").textContent =
      [store.country, store.city].filter(Boolean).join(", ");
    const img = qs("mPhoto");
    if (img) {
      img.src = store.photo_url || "";
    }
  };

  // Auth + online
  setupAuthModal();
  refreshAuthState();
  setupRealtimeOnline();
});
