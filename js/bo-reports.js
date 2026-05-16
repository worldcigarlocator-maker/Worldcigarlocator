// ============================================================
// WCL Backoffice — Store Reports
// Clean · RPC Only · Canonical
// ============================================================

import { supabase } from "../../js/globals.js";

const el = (id) => document.getElementById(id);

let ACTIVE_REPORT_ID = null;

const REPORT_TYPE_LABELS = {
  no_longer_sells: "Store type is wrong",
  no_smoking_allowed: "Lounge type is wrong",
  membership_policy_wrong: "Phone or website is wrong",
  wrong_address: "Wrong address",
  permanently_closed: "Does not exist any longer",
  duplicate: "Duplicate",
  other: "Other"
};

function reportTypeLabel(type) {
  return REPORT_TYPE_LABELS[type] || type || "Reported issue";
}

// ------------------------------------------------------------
// LOAD LIST
// ------------------------------------------------------------

async function loadReports(status = "pending") {
  const { data, error } = await supabase.rpc(
    "bo_list_store_reports_v1",
    { p_status: status === "all" ? null : status }
  );

  if (error) {
    console.error(error);
    return;
  }

  renderList(data || []);
}

function renderList(rows) {
  const list = el("reportList");
  if (!list) return;

  list.innerHTML = "";

  rows.forEach((r) => {
    const div = document.createElement("div");
    div.className = "report-item";
    div.dataset.id = r.id;

    div.innerHTML = `
      <div class="ri-top">
        <div class="ri-title">${r.store_name}</div>
        <div class="pill">${r.status}</div>
      </div>
      <div class="ri-sub">${r.country} · ${r.city}</div>
      <div class="ri-meta">
        <span>${reportTypeLabel(r.report_type)}</span>
        <span>Count: ${r.report_count}</span>
      </div>
    `;

    div.addEventListener("click", () => selectReport(r.id, div));
    list.appendChild(div);
  });
}

// ------------------------------------------------------------
// SELECT REPORT
// ------------------------------------------------------------

async function selectReport(reportId, element) {
  ACTIVE_REPORT_ID = reportId;

  document
    .querySelectorAll(".report-item")
    .forEach((i) => i.classList.remove("active"));

  element.classList.add("active");

  const { data, error } = await supabase.rpc(
    "bo_get_report_details_v2",
    { p_report_id: reportId }
  );

  if (error) {
    console.error(error);
    return;
  }

  renderDetails(data);
}

// ------------------------------------------------------------
// RENDER DETAILS
// ------------------------------------------------------------

function renderDetails({ store, report, audit }) {
  el("reportEmpty")?.classList.add("hidden");
  el("reportDetail")?.classList.remove("hidden");

  el("detailStoreName").textContent = store.name;
  el("detailStoreMeta").textContent =
    `${store.country} · ${store.city}`;

  el("detailStatusPill").textContent = report.status;

  el("detailType").textContent = reportTypeLabel(report.report_type);
  el("detailCount").textContent = report.report_count;

  el("detailCreated").textContent =
    new Date(report.created_at).toLocaleString();

  el("detailUpdated").textContent =
    new Date(report.updated_at).toLocaleString();

  el("detailStoreId").textContent = store.id;
  el("detailStoreTypes").textContent =
    (store.types || []).join(", ");

  el("detailStoreAccess").textContent = store.access;
  el("detailStoreAddress").textContent = store.address;
  el("detailStorePhone").textContent = store.phone;

  const website = el("detailStoreWebsite");
  if (store.website) {
    website.href = store.website;
  }

  renderMessages(report.messages || []);
  renderAudit(audit || []);
}

function renderMessages(messages) {
  const box = el("detailMessages");
  box.innerHTML = "";

  messages.forEach((m) => {
    const div = document.createElement("div");
    div.className = "msg";

    div.innerHTML = `
      <div class="muted">${new Date(m.ts).toLocaleString()}</div>
      <div>${m.message || "—"}</div>
    `;

    box.appendChild(div);
  });
}

function renderAudit(rows) {
  const box = el("detailAudit");
  box.innerHTML = "";

  rows.forEach((a) => {
    const div = document.createElement("div");
    div.className = "audit-row";

    div.innerHTML = `
      <div><strong>${a.action}</strong></div>
      <div class="muted">
        ${a.from_status} → ${a.to_status}
        · ${new Date(a.created_at).toLocaleString()}
      </div>
      <div>${a.note || ""}</div>
    `;

    box.appendChild(div);
  });
}

// ------------------------------------------------------------
// SET STATUS
// ------------------------------------------------------------

async function setStatus() {
  if (!ACTIVE_REPORT_ID) return;

  const status = el("statusSelect").value;
  const note = el("actionNote").value || null;

  const { error } = await supabase.rpc(
    "bo_moderate_store_report_v1",
    {
      p_report_id: ACTIVE_REPORT_ID,
      p_action: mapAction(status),
      p_note: note
    }
  );

  if (error) {
    console.error(error);
    return;
  }

  loadReports(el("statusFilter").value);
}

function mapAction(status) {
  if (status === "reviewed") return "set_reviewed";
  if (status === "resolved") return "resolve";
  if (status === "rejected") return "reject";
  if (status === "pending") return "reopen";
  return "set_reviewed";
}


// ============================================================
// SUSPICIOUS USERS PANEL
// ============================================================

async function loadSuspiciousUsers() {

  const { data, error } =
    await supabase
      .from("suspicious_users_v1")
      .select("*")
      .order("last_activity", { ascending: false });

  if (error) {
    console.warn("Suspicious users error:", error);
    return;
  }

  renderSuspiciousUsers(data || []);
}

function renderSuspiciousUsers(users) {

  const box = el("suspiciousUsers");
  if (!box) return;

  box.innerHTML = "";

  if (!users.length) {
    box.innerHTML = "<div class='muted'>No suspicious activity</div>";
    return;
  }

  users.forEach((u) => {

    const div = document.createElement("div");
    div.className = "sus-user";

    div.innerHTML = `
      <div><strong>User:</strong> ${u.user_id}</div>
      <div class="muted">
        Reviews (10min): ${u.reviews_10min}
        · Ratings (10min): ${u.ratings_10min}
      </div>
      <div class="muted">
        Last activity: ${new Date(u.last_activity).toLocaleString()}
      </div>
    `;

    box.appendChild(div);
  });

}

// ------------------------------------------------------------
// INIT
// ------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {

  loadReports("pending");
  loadSuspiciousUsers();

  el("refreshBtn")?.addEventListener("click", () =>
    loadReports(el("statusFilter").value)
  );

  el("statusFilter")?.addEventListener("change", (e) =>
    loadReports(e.target.value)
  );

  el("setStatusBtn")?.addEventListener("click", setStatus);

});
