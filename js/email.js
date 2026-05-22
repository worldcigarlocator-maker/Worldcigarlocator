import { debugLog, supabase } from "/js/globals.js";

export async function sendWclEmail(action, payload = {}) {
  try {
    const { data, error } = await supabase.functions.invoke(
      "send_wcl_email_v1",
      {
        body: {
          action,
          ...payload,
        },
      }
    );

    if (error) {
      debugLog("WCL email skipped", action, error);
      return {
        ok: false,
        error,
      };
    }

    return data || {
      ok: true,
    };
  } catch (error) {
    debugLog("WCL email failed", action, error);

    return {
      ok: false,
      error,
    };
  }
}
