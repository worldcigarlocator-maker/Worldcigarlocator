/* ======================================================
   Backoffice Logic — World Cigar Locator
   Clean rebuild 2025-10-28 (stable)
====================================================== */

const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let STORES = [];
let CURRENT_TAB = "approved";
let FLAG_TARGET_ID = null;

/* -------------------- Toast -------------------- */
function showToast(msg, type = "info") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

/* -------------------- Load Stores -------------------- */
async function reloadData() {
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .order("id", { ascending: false });
  if (error) {
    console.error(error);
    showToast("❌ Failed to load stores", "error");
    return;
  }
  STORES = data || [];
  renderCards();
}

/* -------------------- Render Cards -------------------- */
function renderCards() {
  const grid = document.getElementById("cards");
  if (!grid) return;
  grid.innerHTML = "";

  const filtered = STORES.filter((s) => {
    if (CURRENT_TAB === "approved") return s.approved && !s.deleted;
    if (CURRENT_TAB === "pending") return !s.approved && !s.deleted && !s.flagged;
    if (CURRENT_TAB === "flagged") return s.flagged && !s.deleted;
    if (CURRENT_TAB === "deleted") return s.deleted;
    return !s.deleted;
  });

  if (!filtered.length) {
    grid.innerHTML = `<div style="text-align:center;color:#666;margin-top:1rem">No stores found in this category</div>`;
    return;
  }

  filtered.forEach((s) => {
    const card = document.createElement("div");
    card.className = "card";

    const photo =
      s.photo_url ||
      (s.type === "lounge" ? "images/lounge.jpg" : "images/store.jpg");

    card.innerHTML = `
      <img src="${photo}" alt="${s.name}" class="preview-photo" />
      <h3>${s.name}</h3>
      <p>${s.city ? s.city + ", " : ""}${s.country || ""}</p>
      <div class="muted">${s.type || "–"} ${s.access ? "• " + s.access : ""}</div>
      <div class="muted">⭐ ${s.rating || "N/A"}</div>
      <div class="row" style="justify-content:flex-end;gap:.4rem;margin-top:.5rem">
        ${s.deleted
          ? `<button class="btn" onclick="restoreStore(${s.id})">Restore</button>`
          : `
          ${
            s.flagged
              ? `<button class="btn" onclick="unflagStore(${s.id})">Unflag</button>`
              : `<button class="btn" onclick="openFlag(${s.id})">Flag</button>`
          }
          ${
            !s.approved && !s.deleted
              ? `<button class="btn primary" onclick="approveStore(${s.id})">Approve</button>`
              : ""
          }
          <button class="btn" onclick="softDelete(${s.id})">Delete</button>`}
      </div>
    `;

    grid.appendChild(card);
  });

  document.getElementById("hCrumbs").innerHTML = `Showing: <b>All ${
    CURRENT_TAB[0].toUpperCase() + CURRENT_TAB.slice(1)
  }</b>`;
}

/* -------------------- Store Actions -------------------- */
async function approveStore(id) {
  const { error } = await supabase
    .from("stores")
    .update({ approved: true })
    .eq("id", id);
  if (error) {
    console.error(error);
    showToast("❌ Error approving store", "error");
  } else {
    showToast("✅ Store approved", "success");
    reloadData();
  }
}

async function softDelete(id) {
  const { error } = await supabase
    .from("stores")
    .update({ deleted: true })
    .eq("id", id);
  if (error) {
    console.error(error);
    showToast("❌ Error deleting store", "error");
  } else {
    showToast("🗑️ Moved to trash", "info");
    reloadData();
  }
}

async function restoreStore(id) {
  const { error } = await supabase
    .from("stores")
    .update({ deleted: false })
    .eq("id", id);
  if (error) {
    console.error(error);
    showToast("❌ Error restoring store", "error");
  } else {
    showToast("♻️ Restored", "success");
    reloadData();
  }
}

/* -------------------- Flagging -------------------- */
function openFlag(id) {
  FLAG_TARGET_ID = id;
  document.getElementById("flagModal").style.display = "flex";
}
function closeFlag() {
  document.getElementById("flagModal").style.display = "none";
  document.getElementById("flagReason").value = "";
}
async function confirmFlag() {
  const reason = document.getElementById("flagReason").value.trim();
  if (!reason) {
    showToast("⚠️ Please enter a reason", "error");
    return;
  }
  const { error } = await supabase
    .from("stores")
    .update({ flagged: true, flag_reason: reason })
    .eq("id", FLAG_TARGET_ID);
  if (error) {
    console.error(error);
    showToast("❌ Error flagging", "error");
  } else {
    showToast("🚩 Store flagged", "success");
    closeFlag();
    reloadData();
  }
}
async function unflagStore(id) {
  const { error } = await supabase
    .from("stores")
    .update({ flagged: false, flag_reason: null })
    .eq("id", id);
  if (error) {
    console.error(error);
    showToast("❌ Error unflagging", "error");
  } else {
    showToast("✅ Unflagged", "success");
    reloadData();
  }
}

/* -------------------- Filter Tabs -------------------- */
function setTab(tab) {
  CURRENT_TAB = tab;
  document.querySelectorAll(".pill").forEach((p) => p.classList.remove("active"));
  const active = document.querySelector(`.pill[data-tab='${tab}']`);
  if (active) active.classList.add("active");
  renderCards();
}

/* -------------------- Google Maps Ready -------------------- */
function _mapsReady() {
  console.log("✅ Google Maps API Ready");
}

/* -------------------- Init -------------------- */
document.addEventListener("DOMContentLoaded", () => {
  // Tabs
  document.querySelectorAll(".pill").forEach((b) =>
    b.addEventListener("click", () => setTab(b.dataset.tab))
  );

  // Flag modal
  document.getElementById("flagCancel").addEventListener("click", closeFlag);
  document.getElementById("flagConfirm").addEventListener("click", confirmFlag);

  // Initial load
  reloadData();
});
