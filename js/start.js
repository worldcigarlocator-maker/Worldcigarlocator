/* ============================================================
   START.JS — STEP 2 (Supabase Auth)
   ============================================================ */

import { WCL } from "./globals.js";
import { buildFrontendSidebar } from "./sidebar.js";
import { renderCards } from "./cards.js";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(WCL.SUPABASE_URL, WCL.SUPABASE_ANON_KEY);

/* Helpers */
const qs = (id) => document.getElementById(id);

let HERO_VISIBLE = true;

/* ============================================================
   LOAD STORES
   ============================================================ */
export async function loadStores(filter = {}, search = "") {
  const grid = qs("storeGrid");
  const hero = qs("hero");
  const heading = qs("resultHeading");

  hero.style.display = "none";
  HERO_VISIBLE = false;
  heading.style.display = "block";

  let query = supabase
    .from("stores_public")
    .select("*")
    .order("id", { ascending: false })
    .limit(20);

  if (filter.continent) query = query.eq("continent", filter.continent);
  if (filter.country) query = query.eq("country", filter.country);
  if (filter.city) query = query.eq("city", filter.city);

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,city.ilike.%${search}%,country.ilike.%${search}%`
    );
  }

  const { data, error } = await query;
  if (error) {
    console.error(error);
    grid.innerHTML = "<p style='color:red;text-align:center;'>Error loading.</p>";
    return;
  }

  renderCards(data || []);
}

/* ============================================================
   RESET HERO (Clear)
   ============================================================ */
function resetToHero() {
  qs("storeGrid").innerHTML = "";
  qs("resultHeading").style.display = "none";
  qs("hero").style.display = "block";
  HERO_VISIBLE = true;
}

/* ============================================================
   SUPABASE AUTH — STEP 2
   ============================================================ */
async function setupAuth() {
  const loginBtn = qs("loginBtn");
  const logoutBtn = qs("logoutBtn");
  const userLabel = qs("authUser");

  // Listen for auth events (login/logout)
  supabase.auth.onAuthStateChange(async (event, session) => {
    const user = session?.user;

    if (user) {
      // logged in
      userLabel.style.display = "inline-block";
      userLabel.textContent = `Welcome, ${user.email}`;

      loginBtn.style.display = "none";
      logoutBtn.style.display = "inline-block";
    } else {
      // logged out
      userLabel.style.display = "none";
      loginBtn.style.display = "inline-block";
      logoutBtn.style.display = "none";
    }
  });

  // LOGIN — magic link popup
  loginBtn.addEventListener("click", async () => {
    const email = prompt("Enter your email to receive a login link:");
    if (!email) return;

    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) alert("Login error: " + error.message);
    else alert("Magic link sent! Check your email.");
  });

  // LOGOUT
  logoutBtn.addEventListener("click", async () => {
    await supabase.auth.signOut();
  });

  // Check session on page load
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.user) {
    userLabel.textContent = `Welcome, ${session.user.email}`;
    userLabel.style.display = "inline-block";

    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
  }
}


/* ============================================================
   STEP 3 — REALTIME ONLINE COUNTER
   ============================================================ */

async function initRealtimePresence() {
  const onlineText = document.getElementById("onlineText");

  // create a realtime channel
  const channel = supabase.channel("online-users", {
    config: {
      presence: {
        key: (await supabase.auth.getUser()).data.user?.email || "guest"
      }
    }
  });

  // join presence
  channel.subscribe(async (status) => {
    if (status === "SUBSCRIBED") {
      await channel.track({ online_at: new Date().toISOString() });
    }
  });

  // presence change listener
  channel.on("presence", { event: "sync" }, () => {
    const state = channel.presenceState();

    // flatten presence keys into list
    const users = Object.keys(state);

    onlineText.textContent = `${users.length} online`;
  });
}


/* ============================================================
   INIT
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  buildFrontendSidebar(supabase, loadStores);

  // Search
  const searchInput = qs("searchInput");
  qs("searchBtn").onclick = () =>
    loadStores({}, searchInput.value.trim());

  qs("clearBtn").onclick = () => {
    searchInput.value = "";
    resetToHero();
  };

  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      loadStores({}, searchInput.value.trim());
    }
  });

  // Init Auth
  setupAuth();
});
