/* ============================================================
WCL — MARKET V2 (CLEAN ENGINE)
============================================================ */

import { supabase } from "/js/globals.js";
const sb = supabase;

console.log("🔥 MARKET V2 LOADED");

/* ============================================================
STATE (ISOLATED)
============================================================ */

const MARKET_STATE = {
level: "country",   // country | city | store | traffic
country: null,
city: null,
store: null,
sort: "views"
};

/* ============================================================
DOM
============================================================ */

function getBody() {
return document.getElementById("marketDemandBody");
}

/* ============================================================
CLICK HANDLER (SINGLE SOURCE)
============================================================ */

function bindRows(days) {

const tbody = getBody();
if (!tbody) return;

tbody.querySelectorAll("tr").forEach(row => {

```
row.onclick = async () => {

  // 🔹 COUNTRY → CITY
  if (MARKET_STATE.level === "country") {

    const country = row.dataset.country;
    if (!country) return;

    MARKET_STATE.level = "city";
    MARKET_STATE.country = country;

    await renderMarketV2(days);
    return;
  }

  // 🔹 CITY → STORE
  if (MARKET_STATE.level === "city") {

    const city = row.dataset.city;
    if (!city) return;

    MARKET_STATE.level = "store";
    MARKET_STATE.city = city;

    await renderMarketV2(days);
    return;
  }

  // 🔹 STORE → TRAFFIC ORIGIN
  if (MARKET_STATE.level === "store") {

    const storeId = row.dataset.store;
    if (!storeId) return;

    MARKET_STATE.level = "traffic";
    MARKET_STATE.store = Number(storeId);

    await renderMarketV2(days);
    return;
  }

};
```

});

}

/* ============================================================
MAIN RENDER
============================================================ */

export async function renderMarketV2(days = 30) {

console.log("🔥 MARKET V2 RENDER", MARKET_STATE);

const tbody = getBody();
if (!tbody) return;

let data = [];

/* ============================================================
COUNTRY
============================================================ */

if (MARKET_STATE.level === "country") {

```
const { data: res, error } = await sb.rpc(
  "analytics_top_countries",
  { p_days: days, p_day: null, p_limit: 100 }
);

if (error) {
  console.error("❌ countries error", error);
  return;
}

data = res || [];

tbody.innerHTML = data.map(r => {

  const ctr = r.views
    ? ((r.clicks / r.views) * 100).toFixed(1) + "%"
    : "0%";

  return `
    <tr data-country="${r.country}">
      <td>${r.country || "-"}</td>
      <td class="num">${r.views || 0}</td>
      <td class="num">${r.clicks || 0}</td>
      <td class="num">${ctr}</td>
    </tr>
  `;

}).join("");

bindRows(days);
return;
```

}

/* ============================================================
CITY
============================================================ */

if (MARKET_STATE.level === "city") {

```
const { data: res, error } = await sb.rpc(
  "analytics_top_cities",
  {
    p_days: days,
    p_day: null,
    p_country: MARKET_STATE.country,
    p_limit: 100
  }
);

if (error) {
  console.error("❌ cities error", error);
  return;
}

data = res || [];

tbody.innerHTML = data.map(c => {

  const ctr = c.views
    ? ((c.clicks / c.views) * 100).toFixed(1) + "%"
    : "0%";

  return `
    <tr data-city="${c.city}">
      <td>${c.city}</td>
      <td class="num">${c.views || 0}</td>
      <td class="num">${c.clicks || 0}</td>
      <td class="num">${ctr}</td>
    </tr>
  `;

}).join("");

bindRows(days);
return;
```

}

/* ============================================================
STORE
============================================================ */

if (MARKET_STATE.level === "store") {

```
const { data: res, error } = await sb.rpc(
  "analytics_top_stores_by_city",
  {
    p_day: null,
    p_country: MARKET_STATE.country,
    p_city: MARKET_STATE.city,
    p_limit: 50
  }
);

if (error) {
  console.error("❌ stores error", error);
  return;
}

data = res || [];

tbody.innerHTML = data.map(s => {

  const ctr = s.views
    ? ((s.clicks / s.views) * 100).toFixed(1) + "%"
    : "0%";

  return `
    <tr data-store="${s.store_id}">
      <td>${s.name}</td>
      <td class="num">${s.views || 0}</td>
      <td class="num">${s.clicks || 0}</td>
      <td class="num">${ctr}</td>
    </tr>
  `;

}).join("");

bindRows(days);
return;
```

}

/* ============================================================
TRAFFIC (STORE → CITY ORIGIN)
============================================================ */

if (MARKET_STATE.level === "traffic") {

```
const { data: res, error } = await sb.rpc(
  "analytics_store_traffic_by_city",
  {
    p_store_id: MARKET_STATE.store,
    p_days: days
  }
);

if (error) {
  console.error("❌ traffic error", error);
  return;
}

data = res || [];

tbody.innerHTML = data.map(c => {

  const ctr = c.views
    ? ((c.clicks / c.views) * 100).toFixed(1) + "%"
    : "0%";

  return `
    <tr>
      <td>${c.city}, ${c.country}</td>
      <td class="num">${c.views || 0}</td>
      <td class="num">${c.clicks || 0}</td>
      <td class="num">${ctr}</td>
    </tr>
  `;

}).join("");

return;
```

}

}

/* ============================================================
DEBUG (OPTIONAL)
============================================================ */

window.renderMarketV2 = renderMarketV2;
