/* ============================================================
   WCL Analytics Tracker
   ============================================================ */

import { supabase } from "./globals.js";
import { getSessionId } from "./session.js";
import { hasViewedStore, markStoreViewed } from "./view-dedupe.js";

export async function trackEvent(eventType, payload = {}) {

  try {

    await supabase
      .from("analytics_events")
      .insert({
        event_type: eventType,
        payload
      });

  } catch (err) {

    console.warn("Analytics event failed", err);

  }

}
