// ============================================================
// SIDEBAR.JS — WCL Sidebar (STATIC, CANONICAL)
// ============================================================

import { activateLocation } from "./cards.js";
import { supabase } from "./globals.js";

const menu = document.querySelector("#sidebarMenu");

// ------------------------------------------------------------
// FETCH — BACKEND IS SOURCE OF TRUTH
// ------------------------------------------------------------
async function fetchSidebarRows() {
  const { data, error } = await supabase.rpc(
    "sidebar_hierarchy_frontend_v1"
  );
  if (error) throw error;
  return data || [];
}

// ------------------------------------------------------------
// BUILD SIDEBAR — RUN ONCE
// ------------------------------------------------------------
export async function buildFrontendSidebar() {
  if (!menu) return;

  menu.innerHTML = "Loading…";

  let rows;
  try {
    rows = await fetchSidebarRows();
  } catch (e) {
    console.error("❌ Sidebar load failed", e);
    menu.innerHTML = "Failed to load";
    return;
  }

  menu.innerHTML = "";

  rows.forEach((r) => {
    const el = document.createElement("div");
    el.className = "line city";
    el.innerHTML = `
      <span class="label">${r.city}</span>
      <span class="pill">${r.count}</span>
    `;

    el.onclick = () =>
      activateLocation({
        continent: r.continent,
        country: r.country,
        state: r.state,
        city: r.city,
      });

    menu.appendChild(el);
  });
}
