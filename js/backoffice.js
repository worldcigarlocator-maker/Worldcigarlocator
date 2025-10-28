/* =====================================================
   Backoffice — Full Management Panel (2025-10-28)
   Includes filtering, flagging, approval, deletion,
   search, list/cards view, toast, and Supabase sync
===================================================== */

const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let stores = [];
let currentTab = "all";
let currentView = "cards";
let flagTarget = null;

/* ---------- Toast ---------- */
function showToast(msg, type = "info") {
  const c = document.getElementById("toast-container");
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

/* ---------- Load Data ---------- */
async function reloadData() {
  const { data, error } = await supabase.from("stores").select("*").order("id", { ascending: false });
  if (error) return console.error(error), showToast("❌ Failed to load", "error");
  stores = data || [];
  renderView();
}

/* ---------- Filtering ---------- */
function getFiltered() {
  return stores.filter((s) => {
    if (currentTab === "approved") return s.approved && !s.deleted;
    if (currentTab === "pending") return !s.approved && !s.deleted && !s.flagged;
    if (currentTab === "flagged") return s.flagged && !s.deleted;
    if (currentTab === "deleted") return s.deleted;
    if (currentTab === "all") return !s.deleted; // ✅ fix: don't show deleted in All
    return true;
  });
}

/* ---------- Render View ---------- */
function renderView() {
  if (currentView === "cards") renderCards();
  else renderTable();
}

/* ---------- Cards View ---------- */
function renderCards() {
  const grid = document.getElementById("cards");
  const table = document.getElementById("table");
  table.style.display = "none";
  grid.style.display = "grid";
  grid.innerHTML = "";

  const filtered = getFiltered();
  if (!filtered.length) {
    grid.innerHTML = `<div class="muted" style="text-align:center;">No stores found.</div>`;
    return;
  }

  filtered.forEach((s) => {
    const photo = s.photo_url || (s.type === "lounge" ? "images/lounge.jpg" : "images/store.jpg");
    const badge = s.deleted
      ? "Deleted"
      : s.flagged
      ? "Flagged"
      : s.approved
      ? "Approved"
      : "Pending";
    const badgeClass = badge.toLowerCase();

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <img src="${photo}" class="photo" alt="${s.name}" />
      <h3>${s.name}</h3>
      <p>${s.city || ""}, ${s.country || ""}</p>
      <span class="badge ${badgeClass}">${badge}</span>
      <div class="actions">
        ${!s.deleted ? `
          ${s.approved ? "" : `<button class="btn" onclick="approveStore(${s.id})">Approve</button>`}
          ${s.flagged ? `<button class="btn" onclick="unflagStore(${s.id})">Unflag</button>` : `<button class="btn" onclick="openFlag(${s.id})">Flag</button>`}
          <button class="btn danger" onclick="deleteStore(${s.id})">Delete</button>
        ` : `<button class="btn" onclick="restoreStore(${s.id})">Restore</button>`}
      </div>
    `;
    grid.appendChild(card);
  });
}

/* ---------- List View ---------- */
function renderTable() {
  const grid = document.getElementById("cards");
  const table = document.getElementById("table");
  const tbody = document.getElementById("tbody");
  grid.style.display = "none";
  table.style.display = "block";
  tbody.innerHTML = "";

  getFiltered().forEach((s) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${s.name}</td>
      <td>${s.city || ""}</td>
      <td>${s.country || ""}</td>
      <td>${s.type || ""}</td>
      <td>${s.access || ""}</td>
      <td>${s.rating || "–"}</td>
      <td>${s.flagged ? "🚩" : s.approved ? "✅" : s.deleted ? "🗑️" : "🕓"}</td>
      <td>
        ${!s.deleted ? `
          ${s.approved ? "" : `<button class="btn small" onclick="approveStore(${s.id})">Approve</button>`}
          ${s.flagged ? `<button class="btn small" onclick="unflagStore(${s.id})">Unflag</button>` : `<button class="btn small" onclick="openFlag(${s.id})">Flag</button>`}
          <button class="btn small danger" onclick="deleteStore(${s.id})">Delete</button>
        ` : `<button class="btn small" onclick="restoreStore(${s.id})">Restore</button>`}
      </td>
    `;
    tbody.appendChild(row);
  });
}

/* ---------- Actions ---------- */
async function approveStore(id) {
  const { error } = await supabase.from("stores").update({ approved: true }).eq("id", id);
  if (error) return showToast("Error approving", "error");
  showToast("✅ Approved", "success");
  reloadData();
}
async function deleteStore(id) {
  const { error } = await supabase.from("stores").update({ deleted: true }).eq("id", id);
  if (error) return showToast("Error deleting", "error");
  showToast("🗑️ Moved to Trash", "info");
  reloadData();
}
async function restoreStore(id) {
  const { error } = await supabase.from("stores").update({ deleted: false }).eq("id", id);
  if (error) return showToast("Error restoring", "error");
  showToast("♻️ Restored", "success");
  reloadData();
}
async function openFlag(id) {
  flagTarget = id;
  document.getElementById("flagModal").style.display = "flex";
}
async function confirmFlag() {
  const reason = document.getElementById("flagReason").value.trim();
  if (!reason) return showToast("⚠️ Enter reason", "error");
  const { error } = await supabase.from("stores").update({ flagged: true, flag_reason: reason }).eq("id", flagTarget);
  if (error) return showToast("Error flagging", "error");
  showToast("🚩 Flagged", "success");
  closeFlag();
  reloadData();
}
async function unflagStore(id) {
  const { error } = await supabase.from("stores").update({ flagged: false, flag_reason: null }).eq("id", id);
  if (error) return showToast("Error unflagging", "error");
  showToast("✅ Unflagged", "success");
  reloadData();
}
function closeFlag() {
  document.getElementById("flagModal").style.display = "none";
  document.getElementById("flagReason").value = "";
}

/* ---------- Event Bindings ---------- */
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".pill").forEach((btn) =>
    btn.addEventListener("click", () => {
      document.querySelectorAll(".pill").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      currentTab = btn.dataset.tab;
      renderView();
    })
  );
  document.querySelectorAll(".seg").forEach((seg) =>
    seg.addEventListener("click", () => {
      document.querySelectorAll(".seg").forEach((s) => s.classList.remove("active"));
      seg.classList.add("active");
      currentView = seg.dataset.view;
      renderView();
    })
  );
  document.getElementById("flagCancel").addEventListener("click", closeFlag);
  document.getElementById("flagConfirm").addEventListener("click", confirmFlag);
  document.getElementById("searchInput").addEventListener("input", renderView);
  reloadData();
});
