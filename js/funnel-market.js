/* ============================================================
   WCL — MARKET LEGACY BRIDGE
   ============================================================ */

export async function renderMarket(days = 30) {

  const m = await import("./funnel-market-v2.js");

  return m.renderMarketV2(days);
}
