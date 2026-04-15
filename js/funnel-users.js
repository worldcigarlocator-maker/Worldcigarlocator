/* ============================================================
   WCL — USERS FUNNEL (CANONICAL v3)
   ============================================================ */

import { supabase } from "./globals.js";
import { setActiveDay, setLevel } from "./analytics-state.js";
import { renderMarket } from "./funnel-market.js";

const sb = supabase;

/* ============================================================
   USERS OVERVIEW
   ============================================================ */

export async function renderUsersOverview(days = 7) {

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

    /* ============================================================
       CLICK → DRILLDOWN
       ============================================================ */

    document.querySelectorAll("#overviewTableBody tr").forEach(tr => {

      tr.onclick = async () => {

        const day = tr.dataset.day;
        if (!day) return;

        console.log("SET DAY:", day);

        // 🔥 STATE
        setActiveDay(day);
        setLevel("country");

        // 🔥 UI
        document.getElementById("usersDrillPanel")?.classList.remove("hidden");
        document.getElementById("overviewTable")?.closest("section")?.classList.add("hidden");

        // 🔥 RENDER FUNNEL
        const days = Number(document.getElementById("globalRange")?.value || 30);
        await renderMarket(days);

      };

    });

  } catch (err) {
    console.error("Users overview crash", err);
  }

}
