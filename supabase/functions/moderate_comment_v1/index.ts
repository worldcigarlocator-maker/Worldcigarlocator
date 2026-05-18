import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type ModerationDecision = "safe" | "block";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const POLICY_MESSAGE =
  "Due to WCL policy, we can not post your comment.";

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function readEnv(name: string) {
  return Deno.env.get(name) || "";
}

function normalizeDecision(value: unknown): ModerationDecision {
  return value === "safe" ? "safe" : "block";
}

function getOutputText(payload: any) {
  if (payload?.choices?.[0]?.message?.content) {
    return String(payload.choices[0].message.content);
  }

  return "";
}

async function classifyWithOpenAI(comment: string) {
  const apiKey = readEnv("OPENAI_API_KEY");
  const model =
    readEnv("OPENAI_COMMENT_MODERATION_MODEL") ||
    "gpt-4o-mini";

  if (!apiKey) {
    return {
      decision: "block" as ModerationDecision,
      reason: "missing_openai_key",
    };
  }

  try {
    const moderationResponse = await fetch(
      "https://api.openai.com/v1/moderations",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "omni-moderation-latest",
          input: comment,
        }),
      }
    );

    const moderationPayload =
      await moderationResponse.json().catch(() => null);

    if (moderationPayload?.results?.[0]?.flagged) {
      return {
        decision: "block" as ModerationDecision,
        reason: "openai_moderation_flagged",
      };
    }
  } catch (error) {
    console.error("OpenAI moderation failed", error);
  }

  const classifierResponse = await fetch(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        response_format: {
          type: "json_object",
        },
        messages: [
          {
            role: "system",
            content:
              "You moderate comments for World Cigar Locator in any language. Translate or interpret the text mentally when needed. Return only JSON with keys decision and reason. decision must be safe or block. Apply the same policy across all languages. Block drug sales, sexual services, pornography, exploitation, trafficking, minors in sexual context, spam, scams, social media/contact promotion, off-platform sales, personal cigar sales, payment handles, and political campaigning. Allow normal cigar discussion in any language, such as cheap cigars, Cohiba, Cubans, vintage cigars, store sells cigars, good value, and lounge recommendations.",
          },
          {
            role: "user",
            content: JSON.stringify({
              comment,
            }),
          },
        ],
        temperature: 0,
      }),
    }
  );

  if (!classifierResponse.ok) {
    const errorText = await classifierResponse.text();
    console.error("OpenAI classifier failed", errorText);

    return {
      decision: "block" as ModerationDecision,
      reason: "openai_classifier_failed",
    };
  }

  const classifierPayload = await classifierResponse.json();
  const outputText = getOutputText(classifierPayload);
  let parsed: Record<string, unknown> = {};

  try {
    parsed = JSON.parse(outputText || "{}");
  } catch (error) {
    console.error("OpenAI classifier returned invalid JSON", error);

    return {
      decision: "block" as ModerationDecision,
      reason: "openai_classifier_invalid_json",
    };
  }

  return {
    decision: normalizeDecision(parsed.decision),
    reason: String(parsed.reason || "classified"),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      {
        ok: false,
        status: "blocked",
        message: "Method not allowed",
      },
      405
    );
  }

  const supabaseUrl = readEnv("SUPABASE_URL");
  const anonKey = readEnv("SUPABASE_ANON_KEY");
  const serviceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = req.headers.get("Authorization") || "";

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !authorization) {
    return jsonResponse(
      {
        ok: false,
        status: "blocked",
        message: POLICY_MESSAGE,
      },
      401
    );
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: authorization,
      },
    },
  });

  const serviceClient = createClient(supabaseUrl, serviceRoleKey);

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return jsonResponse(
      {
        ok: false,
        status: "blocked",
        message: "Please sign in before posting a comment.",
      },
      401
    );
  }

  const body = await req.json().catch(() => ({}));
  const storeId = Number(body.store_id);
  const parentId =
    body.parent_id === null || body.parent_id === undefined
      ? null
      : Number(body.parent_id);
  const comment = String(body.comment || "").trim();

  if (!storeId || !comment || comment.length > 1500) {
    return jsonResponse(
      {
        ok: false,
        status: "blocked",
        message: POLICY_MESSAGE,
      },
      400
    );
  }

  const { data: hasPolicyHit, error: policyError } =
    await serviceClient.rpc("wcl_text_has_policy_hit_v1", {
      p_text: comment,
    });

  if (policyError) {
    console.error("wcl_text_has_policy_hit_v1 error", policyError);

    return jsonResponse(
      {
        ok: false,
        status: "blocked",
        message: POLICY_MESSAGE,
      },
      500
    );
  }

  let decision: ModerationDecision = "safe";
  let reason = "no_policy_hit";

  if (hasPolicyHit) {
    const result = await classifyWithOpenAI(comment);
    decision = result.decision;
    reason = result.reason;
  }

  if (decision !== "safe") {
    return jsonResponse({
      ok: false,
      status: "blocked",
      decision,
      reason,
      message: POLICY_MESSAGE,
    });
  }

  const { error: insertError } = await userClient.rpc(
    "modal_add_comment_ai_v1",
    {
      p_store_id: storeId,
      p_comment: comment,
      p_parent_id: parentId,
      p_ai_decision: "safe",
    }
  );

  if (insertError) {
    console.error("modal_add_comment_ai_v1 error", insertError);

    return jsonResponse(
      {
        ok: false,
        status: "blocked",
        message: POLICY_MESSAGE,
      },
      500
    );
  }

  return jsonResponse({
    ok: true,
    status: "posted",
    decision,
    reason,
  });
});
