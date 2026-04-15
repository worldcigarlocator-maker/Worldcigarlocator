/* ============================================================
   WCL — USERS FUNNEL (CANONICAL v2)
   ============================================================ */

import { supabase } from "./globals.js";
import { setActiveDay } from "./analytics-state.js";

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

    // 🔥 RENDER (alla dagar, även 0)
    tbody.innerHTML = data.map(row => `
      <tr data-day="${row.day}">
        <td>${row.day || "—"}</td>
        <td class="num">${row.users ?? 0}</td>
      </tr>
    `).join("");

    // 🔥 CLICK → DRILLDOWN
    document.querySelectorAll("#overviewTableBody tr").forEach(tr => {

      tr.addEventListener("click", () => {

        const day = tr.dataset.day;
        if (!day) return;

     setActiveDay(day);

// 🔥 RESET STATE RÄTT
import("./analytics-state.js").then(s => {
  s.setLevel("country");
});

console.log("SET DAY:", day);

        // 🔥 byt view till market
        document.getElementById("view-users")?.classList.add("hidden");
        document.getElementById("view-market")?.classList.remove("hidden");

        // 🔥 trigga market
        import("./funnel-market.js").then(m => {
          const days = Number(document.getElementById("globalRange")?.value || 30);
          m.renderMarket(days);
        });

      });

    });

  } catch (err) {
    console.error("Users overview crash", err);
  }

}
