/* ============================================================
   Backoffice V5.1 — Moderation + Hierarki + Edit + Proxy
   JavaScript
   ============================================================ */

console.log("🚀 Backoffice V5.1 loaded ✅");

/* ======================== CONFIG ======================== */
const WCL = {
  SUPABASE_URL: "https://gbxxoeplkzbhsvagnfsr.supabase.co",
  SUPABASE_ANON_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4",
  PHOTO_PROXY_URL:
    "https://gbxxoeplkzbhsvagnfsr.functions.supabase.co/photo-proxy",
  PHOTO_REFS_URL:
    "https://gbxxoeplkzbhsvagnfsr.functions.supabase.co/photo-refs",
  FALLBACK_IMG:
    "https://worldcigarlocator-maker.github.io/Worldcigarlocator/images/store.jpg",
};

WCL.supabase = window.supabase.createClient(
  WCL.SUPABASE_URL,
  WCL.SUPABASE_ANON_KEY
);

/* ======================== STATE ========================= */
let STORES = [];
let CURRENT_TAB = "pending"; // all | approved | pending | flagged | deleted
let CURRENT_VIEW = "cards";  // cards | list
let HIER_SEL = { continent: null, country: null, city: null };

/* ======================== HELPERS ======================== */
const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const safe = (v) => (v ?? "").toString();

const toast = (msg, cls = "success") => {
  const c = $("#toast-container");
  const t = document.createElement("div");
  t.className = `toast ${cls}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 2500);
};

const photoURL = (ref, w = 800) =>
  ref
    ? `${WCL.PHOTO_PROXY_URL}?photo_reference=${encodeURIComponent(ref)}&maxwidth=${w}`
    : WCL.FALLBACK_IMG;

/* ============================================================
   Photo Proxy Builder (för edit-modal)
   ============================================================ */
function buildPhotoProxyUrl(photo_reference, maxwidth = 800) {
  if (!photo_reference) return WCL.FALLBACK_IMG;
  return `${WCL.PHOTO_PROXY_URL}?photo_reference=${encodeURIComponent(photo_reference)}&maxwidth=${maxwidth}`;
}

/* ============================================================
   Hämta photo_reference[] från Edge-funktionen
   ============================================================ */
async function fetchPhotoRefs(placeId) {
  if (!placeId) return [];
  try {
    const url = `${WCL.PHOTO_REFS_URL}?place_id=${encodeURIComponent(placeId)}`;
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) return [];
    const json = await res.json();  // { refs: [...] }
    return Array.isArray(json?.refs) ? json.refs : [];
  } catch (e) {
    console.warn("fetchPhotoRefs failed:", e);
    return [];
  }
}

const countryToContinent = (country) => {
  const c = (country || "").toLowerCase();
  if ([
    "sweden","germany","france","italy","spain","norway","finland","denmark",
    "netherlands","belgium","austria","switzerland","poland","czech republic","czechia"
  ].includes(c)) return "Europe";
  if (["united states","usa","canada","mexico","cuba","dominican republic"].includes(c)) return "North America";
  if (["brazil","argentina","chile","peru","colombia","uruguay","paraguay"].includes(c)) return "South America";
  if ([
    "china","japan","india","thailand","malaysia","singapore","israel","turkey","vietnam","indonesia"
  ].includes(c)) return "Asia";
  if (["south africa","nigeria","kenya","morocco","egypt","ghana"].includes(c)) return "Africa";
  if (["australia","new zealand","fiji"].includes(c)) return "Oceania";
  return "Other";
};

/* ===================== DATA LOADING ====================== */
async function reloadData(tab = CURRENT_TAB) {
  CURRENT_TAB = tab;

  // uppdatera tab UI
  $$(".filters .pill").forEach((b) =>
    b.classList.toggle("active", b.dataset.tab === CURRENT_TAB)
  );

  // Visa rätt view-omslag
  if (CURRENT_VIEW === "cards") {
    $("#cards").style.display = "grid";
    $(".listview-wrap").style.display = "none";
  } else {
    $("#cards").style.display = "none";
    $(".listview-wrap").style.display = "flex";
  }

  const grid = $("#cards");
  grid.innerHTML = "<p class='muted' style='text-align:center'>Loading…</p>";

  // Basfråga
  let q = WCL.supabase.from("stores").select(
    "id,name,city,country,continent,type,access,rating,approved,flagged,deleted,status,photo_reference,place_id,website,created_at,flag_reason"
  ).order("id", { ascending: false });

  // Logiska filter (OBS: ingen 'pending' kolumn)
  if (tab === "approved") q = q.eq("approved", true).eq("deleted", false);
  else if (tab === "flagged") q = q.eq("flagged", true).eq("deleted", false);
  else if (tab === "deleted") q = q.eq("deleted", true);
  else if (tab === "pending")
    q = q.eq("approved", false).eq("flagged", false).eq("deleted", false);
  else q = q.eq("deleted", false); // all

  const { data, error } = await q;
  if (error) {
    console.error(error);
    grid.innerHTML = "<p class='error' style='text-align:center'>Error loading stores</p>";
    return;
  }
  STORES = (data || []).map((s) => ({
    ...s,
    continent: s.continent || countryToContinent(s.country),
  }));

  // Render enligt vald vy
  render();
}

function render() {
  const term = $("#searchInput").value.trim().toLowerCase();
  let list = !term
    ? STORES
    : STORES.filter((s) =>
        [s.name, s.city, s.country].some((v) => safe(v).toLowerCase().includes(term))
      );

  if (CURRENT_VIEW === "cards") {
    renderCards(list);
  } else {
    renderHierarchy(list);
    renderTable(applyHierarchyFilter(list));
  }
}

/* ===================== BUTTON BUILDER ==================== */
function makeBtn(label, onclick, cls = "") {
  const b = document.createElement("button");
  b.className = `btn ${cls}`;
  b.textContent = label;
  b.onclick = onclick;
  return b;
}

/* ===================== CARD RENDERING ==================== */
function renderCards(list) {
  const grid = $("#cards");
  grid.innerHTML = "";

  list.forEach((s) => {
    // statusfärg
    const borderClass = s.deleted
      ? "border-gray"
      : s.flagged
      ? "border-red"
      : s.approved
      ? "border-green"
      : "border-gold";

    const card = document.createElement("div");
    card.className = `card ${borderClass}`;

    // 🖼️ Bild
    const img = document.createElement("img");
    img.className = "photo";
    img.src = photoURL(s.photo_reference, 800);
    img.onerror = () => (img.src = WCL.FALLBACK_IMG);

    // 📋 Innehåll
    const body = document.createElement("div");
    body.className = "body";
    body.innerHTML = `
      <h3>${safe(s.name)}</h3>
      <p><strong>📍</strong> ${safe(s.city)}, ${safe(s.country)}</p>
      <p><strong>🗺️</strong> ${safe(s.continent || "")}</p>
      <p><strong>⭐</strong> ${s.rating ?? "–"}</p>
      <div class="badges">
        ${s.approved ? `<span class='badge green'>APPROVED</span>` : ""}
        ${s.flagged ? `<span class='badge red'>FLAGGED</span>` : ""}
        ${s.deleted ? `<span class='badge gray'>DELETED</span>` : ""}
        ${!s.approved && !s.flagged && !s.deleted
          ? `<span class='badge gold'>PENDING</span>`
          : ""}
      </div>
    `;

    // 🧩 Knappar
    const actions = document.createElement("div");
    actions.className = "actions";

    const approveBtn = makeBtn("Approve", () => approveStore(s.id), "green");
    const deleteBtn = makeBtn(
      s.deleted ? "Restore" : "Delete",
      () => toggleDelete(s),
      "danger"
    );
    const editBtn = makeBtn("Edit", () => editStore(s.id), "blue");

    // 🧰 Ny “Repair Photo”-knapp (kopplad till denna kortbild)
    const repairBtn = makeBtn(
      "Repair Photo",
      () => repairPhoto(s.id, s.place_id, img),
      "orange"
    );

    if (s.flagged) {
      actions.append(
        approveBtn,
        makeBtn("Unflag", () => unflagStore(s.id), "yellow"),
        deleteBtn,
        editBtn,
        repairBtn
      );
    } else {
      actions.append(approveBtn, deleteBtn, editBtn, repairBtn);
    }

    // 🔗 Montera kortet
    card.append(img, body, actions);
    grid.appendChild(card);
  });

  if (!list.length) {
    grid.innerHTML = `<p class="muted center">No stores</p>`;
  }
}


/* ===================== LIST RENDERING ==================== */
function renderTable(list) {
  const tbody = $("#tbody");
  tbody.innerHTML = "";

  list.forEach((s) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${safe(s.name)}</td>
      <td>${safe(s.country)}</td>
      <td>${safe(s.continent)}</td>
      <td>${safe(s.city)}</td>
      <td>${safe(s.type) || "store"}</td>
      <td>${safe(s.access) || "—"}</td>
      <td>${s.rating ?? "—"}</td>
      <td>
        ${s.approved ? `<span class='badge green'>APPROVED</span>` : ""}
        ${s.flagged ? `<span class='badge red'>FLAGGED</span>` : ""}
        ${s.deleted ? `<span class='badge gray'>DELETED</span>` : ""}
        ${!s.approved && !s.flagged && !s.deleted ? `<span class='badge gold'>PENDING</span>` : ""}
      </td>
      <td></td>
    `;

    const actionsTd = tr.lastElementChild;
    actionsTd.style.whiteSpace = "nowrap";
    actionsTd.append(
      makeBtn("Edit", () => editStore(s.id), "blue"),
      makeBtn("Approve", () => approveStore(s.id), "green"),
      s.flagged ? makeBtn("Unflag", () => unflagStore(s.id), "yellow") : null,
      makeBtn(s.deleted ? "Restore" : "Delete", () => toggleDelete(s), "danger")
    );

    tbody.appendChild(tr);
  });

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="muted" style="text-align:center">No stores</td></tr>`;
  }
}

/* ================ HIERARCHY (LIST-VIEW) ================== */
function renderHierarchy(list) {
  const panel = $("#hierarchyPanel");
  panel.innerHTML = "";

  const byCont = groupBy(list, (s) => s.continent || "Other");
  Object.keys(byCont)
    .sort()
    .forEach((continent) => {
      const contNode = line("continent", continent, countStores(byCont[continent]));
      const nestedCountries = document.createElement("div");
      nestedCountries.className = "nested";

      contNode.addEventListener("click", () => {
        toggleNested(nestedCountries, contNode);
        HIER_SEL = { continent, country: null, city: null };
        render(); // uppdatera tabell
        highlight(panel, contNode);
      });

      const byCountry = groupBy(byCont[continent], (s) => s.country || "Unknown");
      Object.keys(byCountry)
        .sort()
        .forEach((country) => {
          const cNode = line("country", country, countStores(byCountry[country]));
          const nestedCities = document.createElement("div");
          nestedCities.className = "nested";

          cNode.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleNested(nestedCities, cNode);
            HIER_SEL = { continent, country, city: null };
            render();
            highlight(panel, cNode);
          });

          const byCity = groupBy(byCountry[country], (s) => s.city || "Unknown");
          Object.keys(byCity)
            .sort((a, b) => byCity[b].length - byCity[a].length)
            .forEach((city) => {
              const cityNode = document.createElement("div");
              cityNode.className = "line city";
              cityNode.textContent = `${city} (${byCity[city].length})`;
              cityNode.addEventListener("click", (e) => {
                e.stopPropagation();
                HIER_SEL = { continent, country, city };
                render();
                highlight(panel, cityNode);
              });
              nestedCities.appendChild(cityNode);
            });

          nestedCountries.append(cNode, nestedCities);
        });

      panel.append(contNode, nestedCountries);
    });
}

function line(level, label, count) {
  const el = document.createElement("div");
  el.className = `line ${level}`;
  el.innerHTML = `<span class="arrow">▶</span> ${label} <span class="muted">(${count})</span>`;
  return el;
}

function toggleNested(nested, lineEl) {
  const a = lineEl.querySelector(".arrow");
  const open = nested.style.display === "block";
  nested.style.display = open ? "none" : "block";
  a.textContent = open ? "▶" : "▼";
}

function highlight(root, el) {
  root.querySelectorAll(".highlight").forEach((n) => n.classList.remove("highlight"));
  el.classList.add("highlight");
}

function groupBy(arr, fn) {
  return arr.reduce((acc, x) => {
    const k = fn(x);
    (acc[k] ||= []).push(x);
    return acc;
  }, {});
}
const countStores = (arr) => arr.length;

function applyHierarchyFilter(list) {
  let out = list.slice();
  if (HIER_SEL.continent) out = out.filter((s) => s.continent === HIER_SEL.continent);
  if (HIER_SEL.country) out = out.filter((s) => s.country === HIER_SEL.country);
  if (HIER_SEL.city) out = out.filter((s) => s.city === HIER_SEL.city);
  return out;
}
/* ============================================================
   Repair Photo – hämtar nya refs från Google & uppdaterar butiken
   ============================================================ */
async function repairPhoto(id, place_id, imgEl) {
  if (!place_id) {
    toast("No place_id found for this store", "error");
    return;
  }

  toast("Repairing photo…", "info");
  try {
    const refs = await fetchPhotoRefs(place_id);
    if (!refs.length) {
      toast("No photos found from Google", "error");
      return;
    }

    const newRef = refs[0];
    const { error } = await WCL.supabase
      .from("stores")
      .update({ photo_reference: newRef })
      .eq("id", id);

    if (error) {
      toast("Error updating photo", "error");
      console.error(error);
      return;
    }

    toast("Photo repaired ✅");
    if (imgEl) imgEl.src = buildPhotoProxyUrl(newRef); // uppdatera bilden direkt
  } catch (e) {
    console.error(e);
    toast("Repair failed", "error");
  }
}


/* ==================== MODERATION ACTIONS ================= */
async function approveStore(id) {
  const { error } = await WCL.supabase
    .from("stores")
    .update({ approved: true, flagged: false })
    .eq("id", id);
  if (error) return toast("Error approving", "error");
  toast("Approved ✅");
  reloadData(CURRENT_TAB);
}

async function unflagStore(id) {
  const { error } = await WCL.supabase
    .from("stores")
    .update({ flagged: false, flag_reason: null })
    .eq("id", id);
  if (error) return toast("Error unflagging", "error");
  toast("Unflagged ✅");
  reloadData(CURRENT_TAB);
}

async function toggleDelete(s) {
  const next = !s.deleted;
  const { error } = await WCL.supabase
    .from("stores")
    .update({ deleted: next })
    .eq("id", s.id);
  if (error) return toast("Error updating delete", "error");
  toast(next ? "Moved to Trash 🗑️" : "Restored ♻️");
  reloadData(CURRENT_TAB);
}

/* ============================================================
   Edit Store Modal (med kommentarer + fotopilar + Repair Photo)
   ============================================================ */
async function editStore(id) {
  closeEdit();

  // ladda butik + kommentarer
  const [{ data: store, error }, { data: comments }] = await Promise.all([
    WCL.supabase.from("stores").select("*").eq("id", id).single(),
    WCL.supabase.from("store_comments").select("*").eq("store_id", id).order("created_at", { ascending: false })
  ]);

  if (error || !store) {
    toast("Failed to load store", "error");
    console.error(error);
    return;
  }

  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal">
      <h3>Edit Store</h3>
      <div class="edit-grid">
        <label>Name</label>
        <input id="edit-name" value="${safe(store.name)}" />

        <label>City</label>
        <input id="edit-city" value="${safe(store.city)}" />

        <label>Country</label>
        <input id="edit-country" value="${safe(store.country)}" />

        <label>Website</label>
        <input id="edit-website" value="${safe(store.website)}" />

        <label>Type</label>
        <div class="type-group">
          <button type="button" class="type-btn ${store.type === "store" ? "active" : ""}" data-type="store">Store</button>
          <button type="button" class="type-btn ${store.type === "lounge" ? "active" : ""}" data-type="lounge">Lounge</button>
        </div>

        <label>Access</label>
        <div class="access-group">
          <label class="access-pill">
            <input type="radio" name="access" value="public" ${store.access === "public" ? "checked" : ""}>
            <span>Public</span>
          </label>
          <label class="access-pill">
            <input type="radio" name="access" value="members" ${store.access === "members" ? "checked" : ""}>
            <span>Members Only</span>
          </label>
        </div>

        <label>Photo</label>
        <div class="photo-picker">
          <button id="edit-prev" class="photo-nav">◀</button>
          <img id="edit-photo" class="preview-photo" src="${
            store.photo_reference ? buildPhotoProxyUrl(store.photo_reference) : WCL.FALLBACK_IMG
          }" />
          <button id="edit-next" class="photo-nav">▶</button>
        </div>
        <div id="photo-meta" class="muted" style="text-align:center;">
          ${store.photo_reference ? "Loaded from proxy" : "No photo loaded"}
        </div>

        ${
          comments?.length
            ? `<label>Comments (${comments.length})</label>
               <div class="comment-list">
                 ${comments
                   .map(
                     (c) => `
                     <div class="comment-item">
                       <p><strong>${safe(c.user_name || "Anon")}:</strong> ${safe(c.comment)}</p>
                       <span class="muted">${new Date(c.created_at).toLocaleString()}</span>
                       <button class="btn small ghost del-comment" data-id="${c.id}">🗑️</button>
                     </div>`
                   )
                   .join("")}
               </div>`
            : `<label>Comments</label><p class="muted">No comments yet.</p>`
        }
      </div>

      <div class="row" style="justify-content:flex-end;gap:.6rem;margin-top:1rem;">
        <button class="btn ghost" id="edit-cancel">Cancel</button>
        <button class="btn blue" id="edit-save">Save</button>
        <button class="btn orange" id="repair-photo">Repair Photo</button>
        ${store.flagged ? `<button class="btn yellow" id="edit-unflag">Unflag</button>` : ""}
        <button class="btn danger" id="edit-delete">Delete</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // stängning
  modal.addEventListener("click", (e) => { if (e.target === modal) closeEdit(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeEdit(); }, { once: true });

  // typknappar
  modal.querySelectorAll(".type-btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      modal.querySelectorAll(".type-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    })
  );

  // hämta refs
  let refs = await fetchPhotoRefs(store.place_id);
  if (!refs.length && store.photo_reference) refs = [store.photo_reference];

  let currentIndex = 0;
  const startAt = refs.indexOf(store.photo_reference);
  currentIndex = startAt >= 0 ? startAt : 0;

  const imgEl  = modal.querySelector("#edit-photo");
  const metaEl = modal.querySelector("#photo-meta");

  function showCurrent() {
    if (!refs.length) {
      imgEl.src = WCL.FALLBACK_IMG;
      metaEl.textContent = "No photo loaded";
      return;
    }
    imgEl.src = buildPhotoProxyUrl(refs[currentIndex]);
    metaEl.textContent = `Photo ${currentIndex + 1} / ${refs.length} — via proxy`;
  }
  showCurrent();

  modal.querySelector("#edit-prev").onclick = () => {
    if (!refs.length) return;
    currentIndex = (currentIndex - 1 + refs.length) % refs.length;
    showCurrent();
  };
  modal.querySelector("#edit-next").onclick = () => {
    if (!refs.length) return;
    currentIndex = (currentIndex + 1) % refs.length;
    showCurrent();
  };

  // 🧰 Repair Photo-knapp
  $("#repair-photo").onclick = async () => {
    toast("Repairing photo…", "info");
    const fresh = await fetchPhotoRefs(store.place_id);
    if (!fresh.length) {
      toast("No photos found from Google", "error");
      return;
    }
    const newRef = fresh[0];
    const { error } = await WCL.supabase.from("stores").update({ photo_reference: newRef }).eq("id", id);
    if (error) return toast("Error updating photo", "error");
    toast("Photo repaired ✅");
    imgEl.src = buildPhotoProxyUrl(newRef);
    metaEl.textContent = "Photo repaired from Google";
  };

  // radera kommentar
  modal.querySelectorAll(".del-comment").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this comment?")) return;
      const cid = btn.dataset.id;
      const { error } = await WCL.supabase.from("store_comments").delete().eq("id", cid);
      if (error) return toast("Error deleting comment", "error");
      toast("Comment deleted 🗑️");
      closeEdit();
      editStore(id);
    });
  });

  // övriga knappar
  $("#edit-cancel").onclick = closeEdit;
  $("#edit-save").onclick = async () => {
    const payload = {
      name: $("#edit-name").value.trim(),
      city: $("#edit-city").value.trim(),
      country: $("#edit-country").value.trim(),
      website: $("#edit-website").value.trim(),
      type: document.querySelector(".type-btn.active")?.dataset.type || null,
      access: document.querySelector('input[name="access"]:checked')?.value || null,
      photo_reference: refs.length ? refs[currentIndex] : null,
    };
    const { error } = await WCL.supabase.from("stores").update(payload).eq("id", id);
    if (error) return toast("Error saving", "error");
    toast("Saved ✅");
    closeEdit();
    reloadData(CURRENT_TAB);
  };

  $("#edit-delete").onclick = async () => {
    if (!confirm("Move to trash?")) return;
    const { error } = await WCL.supabase.from("stores").update({ deleted: true }).eq("id", id);
    if (error) return toast("Error deleting", "error");
    toast("Deleted 🗑️");
    closeEdit();
    reloadData(CURRENT_TAB);
  };

  if (store.flagged) {
    $("#edit-unflag").onclick = async () => {
      const { error } = await WCL.supabase
        .from("stores")
        .update({ flagged: false, flag_reason: null })
        .eq("id", id);
      if (error) return toast("Error unflagging", "error");
      toast("Unflagged ✅");
      closeEdit();
      reloadData(CURRENT_TAB);
    };
  }
}


/* ============================================================
   Stäng edit-modal
   ============================================================ */
function closeEdit() {
  document.querySelectorAll(".modal-backdrop").forEach((m) => m.remove());
}

/* ===================== UI WIRING ========================= */
document.addEventListener("DOMContentLoaded", () => {
  // tabbar
  $$(".filters .pill").forEach((p) =>
    p.addEventListener("click", () => {
      CURRENT_TAB = p.dataset.tab;
      reloadData(CURRENT_TAB);
    })
  );

  // view-toggle
  $$(".viewtoggle .seg").forEach((seg) =>
    seg.addEventListener("click", () => {
      $$(".viewtoggle .seg").forEach((x) => x.classList.remove("active"));
      seg.classList.add("active");
      CURRENT_VIEW = seg.dataset.view;

      if (CURRENT_VIEW === "cards") {
        $("#cards").style.display = "grid";
        $(".listview-wrap").style.display = "none";
      } else {
        $("#cards").style.display = "none";
        $(".listview-wrap").style.display = "flex";
      }
      render();
    })
  );

  // search
  $("#searchInput").addEventListener("input", () => render());

  // initial load
  reloadData("pending");
});
document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ DOM fully loaded — Backoffice V5.1 ready");
  // befintlig init-kod
  $$(".filters .pill").forEach((p) =>
    p.addEventListener("click", () => {
      CURRENT_TAB = p.dataset.tab;
      reloadData(CURRENT_TAB);
    })
  );
  $$(".viewtoggle .seg").forEach((seg) =>
    seg.addEventListener("click", () => {
      $$(".viewtoggle .seg").forEach((x) => x.classList.remove("active"));
      seg.classList.add("active");
      CURRENT_VIEW = seg.dataset.view;
      if (CURRENT_VIEW === "cards") {
        $("#cards").style.display = "grid";
        $(".listview-wrap").style.display = "none";
      } else {
        $("#cards").style.display = "none";
        $(".listview-wrap").style.display = "flex";
      }
      render();
    })
  );
  $("#searchInput").addEventListener("input", () => render());
  reloadData("pending");
});
