/* ============================================================
   WCL — USERS FUNNEL (FIXED)
   ============================================================ */

import { supabase as sb } from "/js/globals.js";
import { setActiveDay, getActiveDay } from "/js/analytics-state.js";

console.log("🔥 FUNNEL USERS LOADED");

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

     console.log("ACTIVE DAY DEBUG:", activeDay);
    const activeDay = getActiveDay();

    /* ============================================================
       HEADER
       ============================================================ */

    const thead = table.querySelector("thead");

    if (thead) {
      thead.innerHTML = activeDay
        ? `
          <tr>
            <th>Country</th>
            <th class="num">Users</th>
          </tr>
        `
        : `
          <tr>
            <th>Date</th>
            <th class="num">Users</th>
          </tr>
        `;
    }

    /* ============================================================
       DRILLDOWN (DAY → COUNTRY)
       ============================================================ */

    if (activeDay) {
console.log("CALLING COUNTRY RPC WITH:", activeDay);
      const { data: countries, error } = await sb.rpc(
        "analytics_users_by_day_country",
        { p_day: activeDay }
      );

      if (error) {
        console.error("Users country error", error);
        return;
      }

      if (!countries?.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="2" class="muted center">0 users on this day</td>
          </tr>`;
        return;
      }

      tbody.innerHTML = countries.map(c => `
        <tr>
          <td>${c.country}</td>
          <td class="num">${c.users}</td>
        </tr>
      `).join("");

      return;
    }

    /* ============================================================
       EMPTY (OVERVIEW)
       ============================================================ */

    if (!data?.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="2" class="muted center">No data yet</td>
        </tr>`;
      return;
    }

    /* ============================================================
       RENDER (DAYS)
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

      tr.onclick = () => {

        const localDay = tr.dataset.day;
        if (!localDay) return;

        const day = new Date(localDay).toISOString().slice(0, 10);

        if (getActiveDay() !== day) {
          setActiveDay(day);
        }

        document.getElementById("view-users")?.classList.remove("hidden");
        document.getElementById("view-market")?.classList.add("hidden");
        document.getElementById("view-stores")?.classList.add("hidden");

        const drillPanel = document.getElementById("usersDrillPanel");
        const overviewSection = document.getElementById("overviewTable")?.closest("section");

        if (drillPanel) drillPanel.classList.remove("hidden");
        if (overviewSection) overviewSection.classList.add("hidden");

      };

    });

  } catch (err) {
    console.error("Users overview crash", err);
  }

}
