/* ============================================================
   WCL — USERS FUNNEL
   ============================================================ */

import { supabase } from "./globals.js";

const sb = supabase;

/* ============================================================
   USERS OVERVIEW
   ============================================================ */

export async function renderUsersOverview(days = 30) {

  console.log("👤 USERS OVERVIEW");

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
      <tr>
        <td>${row.date}</td>
        <td class="num">${row.users ?? 0}</td>
      </tr>
    `).join("");

  } catch (err) {
    console.error("Users overview crash", err);
  }

}
