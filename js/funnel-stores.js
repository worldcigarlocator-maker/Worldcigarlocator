/* ============================================================
   WCL — STORES FUNNEL
   ============================================================ */

import { supabase } from "./globals.js";

const sb = supabase;

const topStoresBody = document.getElementById("topStoresBody");

/* ============================================================
   TOP STORES
   ============================================================ */

export async function renderTopStores(days = 30) {

  try {

    const { data, error } = await sb.rpc(
      "analytics_top_stores_v2",
      {
        p_days: days,
        p_country: null,
        p_city: null,
        p_state: null,
        p_limit: 50
      }
    );

    if (error) {
      console.error("Top stores error", error);
      return;
    }

    if (!topStoresBody) return;

    if (!data || !data.length) {

      topStoresBody.innerHTML =
        `<tr><td colspan="4" class="muted center">No data yet.</td></tr>`;

      return;
    }

    topStoresBody.innerHTML = data.map(r => {

      const location =
        [r.city, r.country].filter(Boolean).join(", ");

      return `
        <tr data-id="${r.store_id}">
          <td class="store-cell">
            <div class="store-name">${r.name}</div>
            <div class="store-geo">${location}</div>
          </td>

          <td><div class="kpi-pill kpi-views">${Number(r.views)}</div></td>
          <td><div class="kpi-pill kpi-clicks">${Number(r.clicks)}</div></td>
          <td><div class="kpi-pill kpi-ctr">${(Number(r.ctr) * 100).toFixed(1)}%</div></td>
        </tr>
      `;
    }).join("");

  } catch (err) {
    console.error("Top stores crash", err);
  }

}
