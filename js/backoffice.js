/* ============================================================
   Backoffice V5 — Cards + Hierarchy + Edit + Proxy Photos
   ============================================================ */

const WCL = {
  SUPABASE_URL: "https://gbxxoeplkzbhsvagnfsr.supabase.co",
  SUPABASE_ANON_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4",
  PHOTO_PROXY_URL: "https://gbxxoeplkzbhsvagnfsr.functions.supabase.co/photo-proxy",
  FALLBACK_IMG: "https://worldcigarlocator-maker.github.io/Worldcigarlocator/images/store.jpg",
};

WCL.supabase = window.supabase.createClient(WCL.SUPABASE_URL, WCL.SUPABASE_ANON_KEY);

// state
let CURRENT_TAB = "all";
let CURRENT_VIEW = "cards";
let STORES = [];
let FLAG_ID = null;
let EDIT_ID = null;

// tiny helpers
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const toast = (msg, cls = "success") => {
  const c = $("#toast-container");
  const t = document.createElement("div");
  t.className = `toast ${cls}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 2500);
};

const photoURL = (ref, w = 800) =>
  ref ? `${WCL.PHOTO_PROXY_URL}?photo_reference=${encodeURIComponent(ref)}&maxwidth=${w}` : WCL.FALLBACK_IMG;

const starRow = (rating) => {
  const r = Math.round(Number(rating) || 0);
  return Array.from({ length: 5 }, (_, i) => (i < r ? "★" : "☆")).join("");
};

const safe = (s) => (s ?? "").toString();

/* ============================================================
   Load + Render
   ============================================================ */
async function reloadData(tab = CURRENT_TAB) {
  CURRENT_TAB = tab;

  // tabs UI
  $$(".tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === CURRENT_TAB));

  const grid = $("#cards");
  grid.innerHTML = "<p class='muted center'>Loading…</p>";

  let q = WCL.supabase.from("stores").select("*").order("id", { ascending: false });

  // logical filters (no 'pending' column)
  if (tab === "approved") q = q.eq("approved", true).eq("deleted", false);
  else if (tab === "flagged") q = q.eq("flagged", true).eq("deleted", false);
  else if (tab === "deleted") q = q.eq("deleted", true);
  else if (tab === "pending")
    q = q.eq("approved", false).eq("flagged", false).eq("deleted", false);
  else q = q.eq("deleted", false); // all

  const { data, error } = await q;
  if (error) {
    console.error(error);
    grid.innerHTML = "<p class='error center'>Error loading stores</p>";
    $("#countLine").textContent = "";
    return;
  }

  STORES = data || [];
  $("#countLine").textContent = `${STORES.length} ${tab} stores found`;

  render();
}

function render() {
  const term = $("#searchInput").value.trim().toLowerCase();
  const filtered = !term
    ? STORES
    : STORES.filter((s) =>
        [s.name, s.city, s.country].some((v) => safe(v).toLowerCase().includes(term))
      );

  if (CURRENT_VIEW === "cards") {
    $("#hierarchyPanel").style.display = "none";
    $("#cards").style.display = "grid";
    renderCards(filtered);
  } else {
    $("#cards").style.display = "none";
    $("#hierarchyPanel").style.display = "block";
    renderHierarchy(filtered);
  }
}

/* ============================================================
   Cards
   ============================================================ */
function renderCards(list) {
  const grid = $("#cards");
  grid.innerHTML = "";

  list.forEach((s) => {
    const card = document.createElement("div");
    card.className =
      "card " +
      (s.deleted ? "border-gray" : s.flagged ? "border-red" : s.approved ? "border-green" : "border-gold");

    const img = document.createElement("img");
    img.className = "photo";
    img.src = photoURL(s.photo_reference);
    img.onerror = () => (img.src = WCL.FALLBACK_IMG);

    const body = document.createElement("div");
    body.className = "body";
    body.innerHTML = `
      <div class="chip small">${safe(s.type) || "store"}</div>
      <h3>${safe(s.name)}</h3>
      <p class="muted">${safe(s.city)}, ${safe(s.country)}</p>
      <div class="stars">${starRow(s.rating)}</div>

      <div class="statusline">
        ${s.approved ? `<span class="badge green">APPROVED</span>` : ""}
        ${s.flagged ? `<span class="badge red">FLAGGED</span>` : ""}
        ${s.deleted ? `<span class="badge gray">DELETED</span>` : ""}
        ${!s.approved && !s.flagged && !s.deleted ? `<span class="badge gold">PENDING</span>` : ""}
      </div>
    `;

    const actions = document.createElement("div");
    actions.className = "actions";
    actions.append(
      button("Approve", () => approveStore(s.id), "ok"),
      button(s.flagged ? "Unflag" : "Flag", () => openFlag(s), s.flagged ? "" : "warn"),
      button(s.deleted ? "Restore" : "Delete", () => toggleDelete(s), "ghost"),
      button("Edit", () => openEdit(s), "primary")
    );

    card.append(img, body, actions);
    grid.appendChild(card);
  });

  if (!list.length) {
    grid.innerHTML = `<p class="muted center">No stores</p>`;
  }
}

function button(label, onClick, cls = "") {
  const b = document.createElement("button");
  b.className = `btn ${cls}`;
  b.textContent = label;
  b.onclick = onClick;
  return b;
}

/* ============================================================
   Hierarchy (List view)
   ============================================================ */
function renderHierarchy(list) {
  const tree = $("#hTree");
  tree.innerHTML = "";

  // group: continent → country → city
  const byCont = {};
  for (const s of list) {
    const cont = safe(s.continent) || "Other";
    const ctry = safe(s.country) || "Unknown";
    const city = safe(s.city) || "Unknown";
    byCont[cont] ??= {};
    byCont[cont][ctry] ??= {};
    byCont[cont][ctry][city] ??= [];
    byCont[cont][ctry][city].push(s);
  }

  Object.entries(byCont)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([continent, countries]) => {
      const total = Object.values(countries).reduce(
        (acc, cities) => acc + Object.values(cities).reduce((a, arr) => a + arr.length, 0),
        0
      );
      const contRow = line("continent", continent, total);
      const contNest = nested();

      contRow.addEventListener("click", () => toggleNest(contRow, contNest));
      tree.append(contRow, contNest);

      Object.entries(countries)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([country, cities]) => {
          const subtotal = Object.values(cities).reduce((a, arr) => a + arr.length, 0);
          const cRow = line("country", country, subtotal);
          const cNest = nested();
          cRow.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleNest(cRow, cNest);
          });
          contNest.append(cRow, cNest);

          Object.entries(cities)
            .sort(([a], [b]) => a.localeCompare(b))
            .forEach(([city, stores]) => {
              const cityRow = line("city", city, stores.length, false);
              cityRow.addEventListener("click", (e) => {
                e.stopPropagation();
                // quick scroll to cards view of this city (or filter in list)
                CURRENT_VIEW = "cards";
                $("#cards").style.display = "grid";
                $("#hierarchyPanel").style.display = "none";
                $("#searchInput").value = city;
                render();
              });
              cNest.append(cityRow);
            });
        });
    });

  $("#hCrumbs").innerHTML = `Showing: <b>${capitalize(CURRENT_TAB)}</b>`;
}

function line(level, label, count, showArrow = true) {
  const b = document.createElement("button");
  b.className = `line ${level}`;
  b.innerHTML = `${showArrow ? `<span class="arrow">▶</span>` : ""}<span class="label">${label}</span><span class="pill">${count}</span>`;
  return b;
}
function nested() {
  const d = document.createElement("div");
  d.className = "nested";
  return d;
}
function toggleNest(btn, nest) {
  const isOpen = nest.classList.toggle("show");
  btn.classList.toggle("open", isOpen);
  const ar = btn.querySelector(".arrow");
  if (ar) ar.style.transform = isOpen ? "rotate(90deg)" : "rotate(0deg)";
}
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/* ============================================================
   Actions: approve / flag / delete / edit
   ============================================================ */
async function approveStore(id) {
  const { error } = await WCL.supabase.from("stores").update({ approved: true, flagged: false }).eq("id", id);
  if (error) return toast("Error approving", "error");
  toast("Approved");
  reloadData();
}

function openFlag(s) {
  FLAG_ID = s.id;
  $("#flagReason").value = "";
  $("#flagModal").classList.add("show");
}
$("#flagCancel").onclick = () => $("#flagModal").classList.remove("show");
$("#flagConfirm").onclick = async () => {
  if (!FLAG_ID) return;
  const reason = $("#flagReason").value.trim() || null;

  // toggle flag/unflag depending on current state
  const st = STORES.find((x) => x.id === FLAG_ID);
  const next = st?.flagged ? { flagged: false, flag_reason: null } : { flagged: true, flag_reason: reason };

  const { error } = await WCL.supabase.from("stores").update(next).eq("id", FLAG_ID);
  if (error) return toast("Error updating flag", "error");
  $("#flagModal").classList.remove("show");
  FLAG_ID = null;
  toast(next.flagged ? "Flagged" : "Unflagged");
  reloadData();
};

async function toggleDelete(s) {
  const next = !s.deleted;
  const { error } = await WCL.supabase.from("stores").update({ deleted: next }).eq("id", s.id);
  if (error) return toast("Error updating delete", "error");
  toast(next ? "Moved to Trash" : "Restored");
  reloadData();
}

/* ----------------- Edit modal ----------------- */
function openEdit(s) {
  EDIT_ID = s.id;

  $("#e_name").value = safe(s.name);
  $("#e_phone").value = safe(s.phone);
  $("#e_address").value = safe(s.address);
  $("#e_city").value = safe(s.city);
  $("#e_country").value = safe(s.country);
  $("#e_continent").value = safe(s.continent) || "Other";
  $("#e_website").value = safe(s.website);

  // type chips
  $("#e_type_store").checked = safe(s.type).toLowerCase().includes("store");
  $("#e_type_lounge").checked = safe(s.type).toLowerCase().includes("lounge");

  // access
  const acc = (safe(s.access) || "public").toLowerCase();
  (acc === "members" ? $("#e_access_members") : $("#e_access_public")).checked = true;

  // badges
  $("#e_badge_pending").style.display = !s.approved && !s.flagged && !s.deleted ? "inline-block" : "none";
  $("#e_badge_approved").style.display = s.approved ? "inline-block" : "none";
  $("#e_badge_flagged").style.display = s.flagged ? "inline-block" : "none";
  $("#e_badge_deleted").style.display = s.deleted ? "inline-block" : "none";

  // reviews (best effort – hide if table missing)
  loadReviews(s.id);

  $("#editModal").classList.add("show");
}
$("#editCancel").onclick = () => {
  $("#editModal").classList.remove("show");
  EDIT_ID = null;
};

$("#editSave").onclick = async () => {
  if (!EDIT_ID) return;

  const typeParts = [];
  if ($("#e_type_store").checked) typeParts.push("store");
  if ($("#e_type_lounge").checked) typeParts.push("lounge");

  const payload = {
    name: $("#e_name").value.trim() || null,
    phone: $("#e_phone").value.trim() || null,
    address: $("#e_address").value.trim() || null,
    city: $("#e_city").value.trim() || null,
    country: $("#e_country").value.trim() || null,
    continent: $("#e_continent").value,
    website: $("#e_website").value.trim() || null,
    type: typeParts.join(",") || null,
    access: document.querySelector('input[name="e_access"]:checked')?.value || null,
  };

  const { error } = await WCL.supabase.from("stores").update(payload).eq("id", EDIT_ID);
  if (error) return toast("Error saving", "error");

  toast("Saved");
  $("#editModal").classList.remove("show");
  reloadData();
};

/* reviews: safe if table absent */
async function loadReviews(storeId) {
  const list = $("#reviewsList");
  list.innerHTML = `<div class="muted">Loading…</div>`;
  try {
    const { data, error } = await WCL.supabase
      .from("store_reviews")
      .select("id, created_at, author, rating, comment")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;

    if (!data || !data.length) {
      list.innerHTML = `<div class="muted">No comments yet.</div>`;
      return;
    }

    list.innerHTML = "";
    data.forEach((r) => {
      const row = document.createElement("div");
      row.className = "review";
      row.innerHTML = `
        <div class="r-head">
          <b>${safe(r.author) || "Anon"}</b>
          <span class="r-stars">${starRow(r.rating)}</span>
          <span class="r-date">${new Date(r.created_at).toLocaleDateString()}</span>
          <button class="btn ghost small danger">Delete</button>
        </div>
        <div class="r-body">${safe(r.comment)}</div>
      `;
      row.querySelector("button").onclick = async () => {
        const { error: delErr } = await WCL.supabase.from("store_reviews").delete().eq("id", r.id);
        if (delErr) return toast("Delete failed", "error");
        row.remove();
        toast("Comment deleted");
      };
      list.appendChild(row);
    });
  } catch (e) {
    console.warn("Reviews table missing / failed:", e.message || e);
    list.innerHTML = `<div class="muted">Reviews unavailable.</div>`;
  }
}

/* ============================================================
   UI wiring
   ============================================================ */
$("#reloadBtn").onclick = () => reloadData();

$("#searchBtn").onclick = render;
$("#clearBtn").onclick = () => {
  $("#searchInput").value = "";
  render();
};
$("#searchInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") render();
});

// tabs
$$(".tab").forEach((b) =>
  b.addEventListener("click", () => {
    reloadData(b.dataset.tab);
  })
);

// view toggle
$$(".seg").forEach((s) =>
  s.addEventListener("click", () => {
    $$(".seg").forEach((x) => x.classList.remove("active"));
    s.classList.add("active");
    CURRENT_VIEW = s.dataset.view;
    render();
  })
);

// hierarchy controls
$("#hCloseAll").onclick = () => {
  $$(".nested").forEach((n) => n.classList.remove("show"));
  $$(".line").forEach((l) => l.classList.remove("open"));
  $$(".line .arrow").forEach((a) => (a.style.transform = "rotate(0deg)"));
};

// init
document.addEventListener("DOMContentLoaded", () => {
  reloadData("all");
  toast("Backoffice ready");
});
