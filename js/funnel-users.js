/* ============================================================
   WCL - Users Funnel
   ============================================================ */

import { supabase as sb } from "/js/globals.js";
import { setActiveDay } from "/js/analytics-state.js";

/* ============================================================
   USERS OVERVIEW
   ============================================================ */

export async function renderUsersOverview(days = 7) {

  try {

const { data, error } = await sb.rpc(
  "analytics_users_by_day",
  { p_days: days }
);

    if (error) {
      console.error("Users overview error", error);
      return;
    }

    const table = document.getElementById("overviewTable");
    const tbody = document.getElementById("overviewTableBody");

    if (!table || !tbody) return;

    /* ============================================================
       HEADER
       ============================================================ */

    const thead = table.querySelector("thead");
    if (thead) {
      thead.innerHTML = `
        <tr>
          <th>Date</th>
          <th class="num">Users</th>
        </tr>
      `;
    }

    /* ============================================================
       EMPTY
       ============================================================ */

    if (!data?.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="2" class="muted center">No data yet</td>
        </tr>`;
      return;
    }

    /* ============================================================
       RENDER
       ============================================================ */

    tbody.innerHTML = data.map(row => `
      <tr data-day="${row.day}">
        <td>${row.day || "—"}</td>
        <td class="num">${row.users ?? 0}</td>
      </tr>
    `).join("");

   setTimeout(() => {
  if (window.renderUsersChart) {
    window.renderUsersChart(data);
  }
}, 0);
     
    /* ============================================================
   CLICK → DRILLDOWN
   ============================================================ */

document.querySelectorAll("#overviewTableBody tr").forEach(tr => {

  tr.onclick = async () => {

    const localDay = tr.dataset.day;
    if (!localDay) return;

   const day = localDay;

    // Reset country to guarantee the country-level drilldown state.
 const state = await import("/js/analytics-state.js");

// 1. Reset country.
state.applyCountry(null);

// 2. Force level immediately after country reset.
state.setLevel?.("member_country");

// 3. Set active day last.
setActiveDay(day);

     
    // Update active analytics views.
    document.getElementById("view-users")?.classList.remove("hidden");
    document.getElementById("view-market")?.classList.add("hidden");
    document.getElementById("view-stores")?.classList.add("hidden");

    const drillPanel = document.getElementById("usersDrillPanel");
    const overviewSection = document.getElementById("overviewTable")?.closest("section");

    if (drillPanel) drillPanel.classList.remove("hidden");
    if (overviewSection) overviewSection.classList.add("hidden");

    // Render member country drilldown.
    const days = Number(document.getElementById("globalRange")?.value || 30);
 const m = await import("./funnel-market-v2.js");
await m.renderMarketV2(days);

  };

});

} catch (err) {
  console.error("Users overview crash", err);
}

}
