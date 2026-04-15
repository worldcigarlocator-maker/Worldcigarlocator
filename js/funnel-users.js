/* ============================================================
   WCL — USERS FUNNEL
   ============================================================ */

import { supabase } from "./globals.js";
import { setActiveDay } from "./analytics-state.js";
import { getActiveDay } from "./analytics-state.js";

const sb = supabase;

/* ============================================================
   USERS OVERVIEW
   ============================================================ */

export async function renderUsersOverview(days = 30) {

  console.log("👤 USERS OVERVIEW");

  try {

    const { data, error } = await sb.rpc(
  "analytics_users_by_day_v2",
  { p_days: days }
);

    if (error) {
      console.error("Users overview error", error);
      return;
    }

    const table = document.getElementById("overviewTable");
    const tbody = document.getElementById("overviewTableBody");

    if (!table || !tbody) return;

    // HEADER
    const thead = table.querySelector("thead");
    if (thead) {
      thead.innerHTML = `
        <tr>
          <th>Date</th>
          <th class="num">Users</th>
        </tr>
      `;
    }

    // EMPTY
    if (!data?.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="2" class="muted center">No data yet</td>
        </tr>`;
      return;
    }

 // RENDER
tbody.innerHTML = data.map(row => `
  <tr data-day="${row.day}">
    <td>${row.day || "—"}</td>
    <td class="num">${row.users ?? 0}</td>
  </tr>
`).join("");

     document.querySelectorAll("#overviewTable tbody tr").forEach(tr => {

  tr.addEventListener("click", () => {

    const day = tr.dataset.day;
    if (!day) return;

setActiveDay(day);

// 🔥 byt view
document.getElementById("view-users")?.classList.add("hidden");
document.getElementById("view-market")?.classList.remove("hidden");

// 🔥 TRIGGA MARKET
const days = Number(document.getElementById("globalRange")?.value || 30);

import("./funnel-market.js").then(m => {
  m.renderMarket(days);
});

console.log("DRILL → DAY:", day);

  });

});
  } catch (err) {
    console.error("Users overview crash", err);
  }

}
