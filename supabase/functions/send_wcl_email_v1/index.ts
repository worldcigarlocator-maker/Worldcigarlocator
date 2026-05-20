import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type EmailAction =
  | "listing_submitted"
  | "report_received"
  | "support_received"
  | "account_received";

type EmailTemplate = {
  subject: string;
  preview: string;
  html: string;
  text: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BRONZE = "#7E624B";
const SITE_NAME = "World Cigar Locator";

function readEnv(name: string) {
  return Deno.env.get(name) || "";
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function compact(value: unknown, fallback = "Not provided") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeEmail(value: string) {
  return String(value || "").trim().toLowerCase();
}

function baseText(lines: string[]) {
  return [
    SITE_NAME,
    "",
    ...lines,
    "",
    "World Cigar Locator",
    readEnv("WCL_SITE_URL") || "https://worldcigarlocator.com",
  ].join("\n");
}

function baseHtml({
  title,
  preview,
  body,
}: {
  title: string;
  preview: string;
  body: string;
}) {
  const siteUrl =
    readEnv("WCL_SITE_URL") || "https://worldcigarlocator.com";

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;background:#090909;color:#f4f0ea;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      ${escapeHtml(preview)}
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#090909;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#101010;border:1px solid #25211d;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="padding:28px 30px;background:#050505;border-bottom:1px solid ${BRONZE};">
                <div style="font-size:34px;letter-spacing:8px;color:#d6b17c;font-family:Georgia,serif;line-height:1;">WCL</div>
                <div style="margin-top:8px;font-size:12px;letter-spacing:5px;color:${BRONZE};text-transform:uppercase;">World Cigar Locator</div>
              </td>
            </tr>
            <tr>
              <td style="padding:30px;">
                <h1 style="margin:0 0 18px;font-size:26px;line-height:1.2;color:#ffffff;">${escapeHtml(title)}</h1>
                <div style="font-size:16px;line-height:1.65;color:#d8d2ca;">
                  ${body}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 30px;background:#0b0b0b;border-top:1px solid #25211d;color:#8f867c;font-size:13px;line-height:1.5;">
                <div style="color:${BRONZE};font-weight:700;">World Cigar Locator</div>
                <div><a href="${escapeHtml(siteUrl)}" style="color:#bfa072;text-decoration:none;">${escapeHtml(siteUrl)}</a></div>
                <div style="margin-top:12px;">This is an automated message from WCL. Replies are routed to the WCL team when reply-to is configured.</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function detailTable(rows: Array<[string, unknown]>) {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;border-collapse:collapse;">
      ${rows
        .map(
          ([label, value]) => `
            <tr>
              <td style="padding:10px 0;color:${BRONZE};font-weight:700;width:140px;vertical-align:top;">${escapeHtml(label)}</td>
              <td style="padding:10px 0;color:#f4f0ea;vertical-align:top;">${escapeHtml(compact(value))}</td>
            </tr>`
        )
        .join("")}
    </table>`;
}

function buildListingSubmitted(body: any): EmailTemplate {
  const listing = body?.listing || {};
  const title = "We received your listing submission";
  const preview =
    "Thank you for helping improve World Cigar Locator. Your listing will be reviewed manually.";

  const html = baseHtml({
    title,
    preview,
    body: `
      <p style="margin:0 0 16px;">Thank you for helping improve World Cigar Locator.</p>
      <p style="margin:0 0 16px;">We received your listing submission and will review it manually before anything becomes public.</p>
      ${detailTable([
        ["Listing", listing.name],
        ["City", listing.city],
        ["Country", listing.country],
        ["Website", listing.website],
      ])}
      <p style="margin:0;">If the listing is approved, it may appear in WCL after review. We may edit details for accuracy, duplicate prevention, safety, and consistency.</p>
    `,
  });

  const text = baseText([
    "Thank you for helping improve World Cigar Locator.",
    "We received your listing submission and will review it manually before anything becomes public.",
    "",
    `Listing: ${compact(listing.name)}`,
    `City: ${compact(listing.city)}`,
    `Country: ${compact(listing.country)}`,
    `Website: ${compact(listing.website)}`,
    "",
    "If the listing is approved, it may appear in WCL after review. We may edit details for accuracy, duplicate prevention, safety, and consistency.",
  ]);

  return {
    subject: "WCL: Listing submission received",
    preview,
    html,
    text,
  };
}

function buildReportReceived(body: any): EmailTemplate {
  const report = body?.report || {};
  const title = "We received your listing report";
  const preview =
    "Thank you for helping keep World Cigar Locator accurate and trustworthy.";
  const reportTypes = Array.isArray(report.report_types)
    ? report.report_types.join(", ")
    : report.report_types;

  const html = baseHtml({
    title,
    preview,
    body: `
      <p style="margin:0 0 16px;">Thank you for helping keep World Cigar Locator accurate and trustworthy.</p>
      <p style="margin:0 0 16px;">Your report has been sent to the WCL moderation queue. Reports are reviewed manually and do not automatically change or remove a listing.</p>
      ${detailTable([
        ["Store ID", report.store_id],
        ["Issue", reportTypes],
        ["Message", report.message],
      ])}
      <p style="margin:0;">If we can verify the issue, the listing may be corrected, marked for review, or removed.</p>
    `,
  });

  const text = baseText([
    "Thank you for helping keep World Cigar Locator accurate and trustworthy.",
    "Your report has been sent to the WCL moderation queue. Reports are reviewed manually and do not automatically change or remove a listing.",
    "",
    `Store ID: ${compact(report.store_id)}`,
    `Issue: ${compact(reportTypes)}`,
    `Message: ${compact(report.message)}`,
    "",
    "If we can verify the issue, the listing may be corrected, marked for review, or removed.",
  ]);

  return {
    subject: "WCL: Listing report received",
    preview,
    html,
    text,
  };
}

function buildSupportReceived(body: any): EmailTemplate {
  const contact = body?.contact || {};
  const title = "We received your message";
  const preview =
    "Thank you for contacting World Cigar Locator. We will review your message.";

  const html = baseHtml({
    title,
    preview,
    body: `
      <p style="margin:0 0 16px;">Thank you for contacting World Cigar Locator.</p>
      <p style="margin:0 0 16px;">We received your message and will review it as soon as possible.</p>
      ${detailTable([
        ["Topic", contact.topic],
        ["Message", contact.message],
      ])}
      <p style="margin:0;">For urgent account or security matters, please include enough detail for us to identify the relevant account or listing.</p>
    `,
  });

  const text = baseText([
    "Thank you for contacting World Cigar Locator.",
    "We received your message and will review it as soon as possible.",
    "",
    `Topic: ${compact(contact.topic)}`,
    `Message: ${compact(contact.message)}`,
  ]);

  return {
    subject: "WCL: Message received",
    preview,
    html,
    text,
  };
}

function buildAccountReceived(body: any): EmailTemplate {
  const title = "We received your account request";
  const preview =
    "Your account-related message has been received by World Cigar Locator.";

  const html = baseHtml({
    title,
    preview,
    body: `
      <p style="margin:0 0 16px;">Your account-related message has been received.</p>
      <p style="margin:0 0 16px;">The WCL team will review it manually. For your safety, never send passwords or payment details by email.</p>
      ${detailTable([
        ["Topic", body?.contact?.topic],
        ["Message", body?.contact?.message],
      ])}
    `,
  });

  const text = baseText([
    "Your account-related message has been received.",
    "The WCL team will review it manually. For your safety, never send passwords or payment details by email.",
    "",
    `Topic: ${compact(body?.contact?.topic)}`,
    `Message: ${compact(body?.contact?.message)}`,
  ]);

  return {
    subject: "WCL: Account request received",
    preview,
    html,
    text,
  };
}

function buildTemplate(action: EmailAction, body: any) {
  switch (action) {
    case "listing_submitted":
      return buildListingSubmitted(body);
    case "report_received":
      return buildReportReceived(body);
    case "support_received":
      return buildSupportReceived(body);
    case "account_received":
      return buildAccountReceived(body);
  }
}

function buildAdminTemplate(template: EmailTemplate, userEmail: string) {
  return {
    ...template,
    subject: `[Admin] ${template.subject}`,
    text: [
      template.text,
      "",
      `Submitted by: ${userEmail}`,
    ].join("\n"),
    html: template.html.replace(
      "</div>\n              </td>",
      `<p style="margin:20px 0 0;color:#8f867c;">Submitted by: ${escapeHtml(userEmail)}</p></div>
              </td>`
    ),
  };
}

async function sendWithResend({
  to,
  template,
}: {
  to: string;
  template: EmailTemplate;
}) {
  const apiKey = readEnv("RESEND_API_KEY");
  const from =
    readEnv("WCL_EMAIL_FROM") ||
    "World Cigar Locator <notifications@worldcigarlocator.com>";
  const replyTo =
    readEnv("WCL_EMAIL_REPLY_TO") || "support@worldcigarlocator.com";

  if (!apiKey) {
    return {
      ok: false,
      status: 500,
      body: {
        ok: false,
        message: "RESEND_API_KEY is not configured.",
      },
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: template.subject,
      html: template.html,
      text: template.text,
      reply_to: replyTo,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  return {
    ok: response.ok,
    status: response.status,
    body: payload,
  };
}

async function getUserFromRequest(req: Request) {
  const supabaseUrl = readEnv("SUPABASE_URL");
  const anonKey = readEnv("SUPABASE_ANON_KEY");
  const authorization = req.headers.get("Authorization") || "";

  if (!supabaseUrl || !anonKey || !authorization) {
    return null;
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: authorization,
      },
    },
  });

  const {
    data: { user },
  } = await userClient.auth.getUser();

  return user || null;
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
        message: "Method not allowed",
      },
      405
    );
  }

  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "") as EmailAction;
  const allowedActions: EmailAction[] = [
    "listing_submitted",
    "report_received",
    "support_received",
    "account_received",
  ];

  if (!allowedActions.includes(action)) {
    return jsonResponse(
      {
        ok: false,
        message: "Unknown email action",
      },
      400
    );
  }

  const user = await getUserFromRequest(req);
  const requestedTo = normalizeEmail(body.to || "");
  const userEmail = normalizeEmail(user?.email || "");
  const recipient = requestedTo || userEmail;

  if (!recipient || !isEmail(recipient)) {
    return jsonResponse(
      {
        ok: false,
        message: "No valid recipient",
      },
      400
    );
  }

  if (requestedTo && requestedTo !== userEmail) {
    return jsonResponse(
      {
        ok: false,
        message: "Recipient must match the signed-in user",
      },
      403
    );
  }

  if (!userEmail) {
    return jsonResponse(
      {
        ok: false,
        message: "Sign-in is required before sending WCL email",
      },
      401
    );
  }

  const template = buildTemplate(action, body);
  const adminEmail = normalizeEmail(readEnv("WCL_ADMIN_EMAIL"));
  const shouldSendAdmin = Boolean(
    adminEmail &&
    isEmail(adminEmail) &&
    ["listing_submitted", "report_received"].includes(action)
  );
  const adminTemplate =
    shouldSendAdmin ? buildAdminTemplate(template, userEmail) : null;
  const recipientTemplate =
    shouldSendAdmin && adminEmail === recipient && adminTemplate
      ? adminTemplate
      : template;

  const result = await sendWithResend({
    to: recipient,
    template: recipientTemplate,
  });

  if (!result.ok) {
    console.error("Resend email failed", result.status, result.body);

    return jsonResponse(
      {
        ok: false,
        message: "Email could not be sent",
      },
      502
    );
  }

  let adminSent = shouldSendAdmin && adminEmail === recipient;

  if (shouldSendAdmin && adminEmail !== recipient && adminTemplate) {
    const adminResult = await sendWithResend({
      to: adminEmail,
      template: adminTemplate,
    });

    adminSent = adminResult.ok;
  }

  return jsonResponse({
    ok: true,
    action,
    sent: true,
    admin_sent: adminSent,
  });
});
