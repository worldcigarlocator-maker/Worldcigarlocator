/* ============================================================
   Backoffice V5.7 — Proxy + Hierarchy + Edit + Reviews
   Requires: backoffice.html (senaste), Supabase-js@2
   ============================================================ */

(function () {
  // ---------- Config ----------
  const WCL = {
    SUPABASE_URL: "https://gbxxoeplkzbhsvagnfsr.supabase.co",
    SUPABASE_ANON_KEY:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4",
    PHOTO_PROXY_URL:
      "https://gbxxoeplkzbhsvagnfsr.functions.supabase.co/photo-proxy",
    FALLBACK_IMG:
      "https://worldcigarlocator-maker.github.io/Worldcigarlocator/images/store.jpg",
  };
  const supabase = window.supabase.createClient(
    WCL.SUPABASE_URL,
    WCL.SUPABASE_ANON_KEY
  );

  // ---------- State ----------
  let CURRENT_TAB = "pending"; // 'all' | 'approved' | 'pending' | 'flagged' | 'deleted'
  let CURRENT_VIEW = "cards"; // 'cards' | 'list'
  let STORES = [];
  let CURRENT_FILTER = { continent: null, country: null, city: null };

  // ---------- Utils ----------
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const esc = (s) =>
    String(s ?? "")
      .replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const toast = (msg, cls = "success") => {
    let c = $("#toast-container");
    if (!c) {
      c = document.createElement("div");
      c.id = "toast-container";
      document.body.appendChild(c);
    }
    const t = document.createElement("div");
    t.className = `toast ${cls}`;
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => t.remove(), 2500);
  };

  const buildPhotoUrl = (ref, w = 600) =>
    ref
      ? `${WCL.PHOTO_PROXY_URL}?photo_reference=${encodeURIComponent(
          ref
        )}&maxwidth=${w}`
      : WCL.FALLBACK_IMG;

  const CONTINENTS = [
    "Europe",
    "North America",
    "South America",
    "Asia",
    "Africa",
    "Oceania",
    "Other",
  ];

  // ---------- Ensure required containers exist (auto-inject if missing) ----------
  function ensureContainers() {
    if (!$("#hierarchyPanel")) {
      const h = document.createElement("div");
      h.id = "hierarchyPanel";
      h.className = "hierarchy-panel";
      h.innerHTML = `
        <div class="h-row">
          <div class="h-controls">
            <input id="hSearch" placeholder="Filter continent / country / city…" />
            <button class="btn ghost" id="hCloseAll">Close All</button>
            <button class="btn ghost" id="hClearSel" title="Clear selection">Clear</button>
          </div>
          <div class="crumbs" id="hCrumbs">Showing: <b>All</b></div>
        </div>
        <div id="hTree" class="h-tree"></div>
      `;
      // Lägg den ovanför grid/list
      const wrap = document.querySelector(".wrap");
      wrap.insertBefore(h, $("#cards"));
    }

    if (!$("#editModal")) {
      const m = document.createElement("div");
      m.id = "editModal";
      m.className = "modal-backdrop";
      m.innerHTML = `
        <div class="modal wide">
          <h3>Edit store</h3>
          <div class="modal-body">
            <div class="edit-grid">
              <div>
                <label>Name</label>
                <input id="e_name" />
              </div>
              <div>
                <label>Phone</label>
                <input id="e_phone" />
              </div>
              <div class="full">
                <label>Address</label>
                <input id="e_address" />
              </div>
              <div>
                <label>City</label>
                <input id="e_city" />
              </div>
              <div>
                <label>Country</label>
                <input id="e_country" />
              </div>
              <div>
                <label>Continent</label>
                <select id="e_continent"></select>
              </div>
              <div>
                <label>Type</label>
                <div class="pill-row" id="e_types">
                  <button type="button" data-t="store" class="pill-t">Store</button>
                  <button type="button" data-t="lounge" class="pill-t">Lounge</button>
                </div>
              </div>
              <div>
                <label>Access</label>
                <div class="pill-row" id="e_access">
                  <button type="button" data-a="public" class="pill-a">Public</button>
                  <button type="button" data-a="members" class="pill-a">Members</button>
                </div>
              </div>
              <div class="full">
                <label>Website</label>
                <input id="e_website" placeholder="https://" />
              </div>
              <div>
                <label>Place ID</label>
                <input id="e_place_id" />
              </div>
              <div class="full">
                <label>Photo reference</label>
                <input id="e_photo_reference" />
              </div>
            </div>
            <div class="preview-col">
              <img id="e_preview" class="photo" alt="Preview"/>
            </div>
          </div>

          <h4>Comments (store_reviews)</h4>
          <div id="reviewList" class="reviews"></div>

          <div class="row end">
            <button class="btn ghost" id="e_cancel">Cancel</button>
            <button class="btn" id="e_save">Save</button>
          </div>
        </div>
      `;
      document.body.appendChild(m);
    }
  }

  // ---------- Hierarchy ----------
  function buildHierarchy(stores) {
    const treeEl = $("#hTree");
    const crumbs = $("#hCrumbs");
    if (!treeEl || !crumbs) return;

    // filter text
    const filterTxt = ($("#hSearch")?.value || "").trim().toLowerCase();

    const grouped = {};
    for (const s of stores) {
      if (filterTxt) {
        const blob = `${s.continent} ${s.country} ${s.city}`.toLowerCase();
        if (!blob.includes(filterTxt)) continue;
      }
      const cont = s.continent || "Other";
      const country = s.country || "Unknown";
      const city = s.city || "Unknown";
      grouped[cont] = grouped[cont] || {};
      grouped[cont][country] = grouped[cont][country] || {};
      grouped[cont][country][city] = (grouped[cont][country][city] || 0) + 1;
    }

    treeEl.innerHTML = "";

    const openCls = "open";
    const mkLine = (label, count, lvl) => {
      const btn = document.createElement("button");
      btn.className = `line ${lvl}`;
      btn.innerHTML = `<span class="arrow">▶</span><span class="label">${esc(
        label
      )}</span><span class="pill">${count}</span>`;
      return btn;
    };

    const applyFilter = (f) => {
      CURRENT_FILTER = f;
      renderView(); // re-render current list/cards view under current tab
      const parts = [
        f.continent ? esc(f.continent) : null,
        f.country ? esc(f.country) : null,
        f.city ? esc(f.city) : null,
      ].filter(Boolean);
      crumbs.innerHTML = `Showing: <b>${parts.join(" / ") || "All"}</b>`;
    };

    Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([continent, countries]) => {
        const contTotal = Object.values(countries).reduce(
          (acc, cities) =>
            acc + Object.values(cities).reduce((a, c) => a + c, 0),
          0
        );
        const contBtn = mkLine(continent, contTotal, "continent");
        const contWrap = document.createElement("div");
        contWrap.className = "nested";
        contBtn.addEventListener("click", () => {
          const isOpen = contWrap.classList.toggle(openCls);
          contBtn.querySelector(".arrow").style.transform = isOpen
            ? "rotate(90deg)"
            : "rotate(0)";
          applyFilter({ continent, country: null, city: null });
        });

        Object.entries(countries)
          .sort(([a], [b]) => a.localeCompare(b))
          .forEach(([country, cities]) => {
            const cCount = Object.values(cities).reduce((a, c) => a + c, 0);
            const countryBtn = mkLine(country, cCount, "country");
            const countryWrap = document.createElement("div");
            countryWrap.className = "nested";
            countryBtn.addEventListener("click", (e) => {
              e.stopPropagation();
              const isOpen = countryWrap.classList.toggle(openCls);
              countryBtn.querySelector(".arrow").style.transform = isOpen
                ? "rotate(90deg)"
                : "rotate(0)";
              applyFilter({ continent, country, city: null });
            });

            Object.entries(cities)
              .sort(([a], [b]) => b - a)
              .forEach(([city, count]) => {
                const cityBtn = mkLine(city, count, "city");
                cityBtn.addEventListener("click", (e) => {
                  e.stopPropagation();
                  applyFilter({ continent, country, city });
                });
                countryWrap.appendChild(cityBtn);
              });

            contWrap.append(countryBtn, countryWrap);
          });

        treeEl.append(contBtn, contWrap);
      });

    $("#hCloseAll")?.addEventListener("click", () => {
      $$(".nested").forEach((n) => n.classList.remove(openCls));
      $$(".line .arrow").forEach((a) => (a.style.transform = "rotate(0)"));
    });
    $("#hClearSel")?.addEventListener("click", () => {
      CURRENT_FILTER = { continent: null, country: null, city: null };
      crumbs.innerHTML = "Showing: <b>All</b>";
      renderView();
    });
  }

  // ---------- Load ----------
  async function loadStores() {
    const cardsWrap = $("#cards");
    const tableWrap = $("#table");
    if (cardsWrap) cardsWrap.innerHTML = `<p style="text-align:center;color:#888;">Loading…</p>`;
    if (tableWrap) tableWrap.style.display = "none";

    try {
      let query = supabase
        .from("stores")
        .select(
          "id, name, address, city, country, continent, type, access, rating, approved, flagged, deleted, status, photo_reference, place_id, website, created_at"
        )
        .order("id", { ascending: false });

      // Tab filter
      if (CURRENT_TAB === "pending") {
        query = query.eq("approved", false).eq("flagged", false).eq("deleted", false);
      } else if (CURRENT_TAB === "approved") {
        query = query.eq("approved", true).eq("deleted", false);
      } else if (CURRENT_TAB === "flagged") {
        query = query.eq("flagged", true).eq("deleted", false);
      } else if (CURRENT_TAB === "deleted") {
        query = query.eq("deleted", true);
      } else if (CURRENT_TAB === "all") {
        query = query.eq("deleted", false);
      }

      const { data, error } = await query;
      if (error) throw error;

      STORES = data || [];
      buildHierarchy(STORES);
      renderView();
    } catch (err) {
      console.error("loadStores error", err);
      if ($("#cards")) $("#cards").innerHTML = `<div class="error">Error loading stores</div>`;
    }
  }

  // ---------- Render ----------
  function filteredStores() {
    return STORES.filter((s) => {
      if (CURRENT_FILTER.continent && s.continent !== CURRENT_FILTER.continent) return false;
      if (CURRENT_FILTER.country && s.country !== CURRENT_FILTER.country) return false;
      if (CURRENT_FILTER.city && s.city !== CURRENT_FILTER.city) return false;
      return true;
    });
  }

  function renderView() {
    const data = filteredStores();
    if (CURRENT_VIEW === "cards") {
      $("#table")?.style && ($("#table").style.display = "none");
      $("#cards")?.style && ($("#cards").style.display = "grid");
      renderCards(data);
    } else {
      $("#cards")?.style && ($("#cards").style.display = "none");
      $("#table")?.style && ($("#table").style.display = "block");
      renderList(data);
    }
  }

  function renderCards(stores) {
    const grid = $("#cards");
    grid.innerHTML = "";

    stores.forEach((s) => {
      const card = document.createElement("div");
      card.className = "card";
      const img = document.createElement("img");
      img.className = "photo";
      img.src = buildPhotoUrl(s.photo_reference);
      img.onerror = () => (img.src = WCL.FALLBACK_IMG);

      const body = document.createElement("div");
      body.className = "body";
      const badges = `
        ${s.flagged ? `<span class="badge red">FLAGGED</span>` : ""}
        ${s.approved ? `<span class="badge green">APPROVED</span>` : ""}
        ${s.deleted ? `<span class="badge gray">DELETED</span>` : ""}
        ${!s.approved && !s.deleted && !s.flagged ? `<span class="badge gold">PENDING</span>` : ""}
      `;

      body.innerHTML = `
        <div class="badges">${badges}</div>
        <h3>${esc(s.name || "Unnamed")}</h3>
        <p class="muted"><strong>📍</strong> ${esc(s.city || "Unknown")}, ${esc(s.country || "")} — ${esc(s.continent || "")}</p>
        <p class="muted"><strong>🧭</strong> ${esc(s.type || "—")} • ${esc(s.access || "—")}</p>
        <p class="muted"><strong>⭐</strong> ${s.rating ?? "—"} &nbsp;&nbsp; <strong>🕑</strong> ${new Date(s.created_at).toLocaleDateString()}</p>
        ${s.website ? `<p class="muted"><strong>🌐</strong> <a href="${esc(s.website)}" target="_blank">${esc(s.website)}</a></p>` : ""}
      `;

      const actions = document.createElement("div");
      actions.className = "actions";
      actions.innerHTML = `
        <button class="btn small" data-act="edit">Edit</button>
        ${!s.approved ? `<button class="btn small" data-act="approve">Approve</button>` : ""}
        ${s.flagged ? `<button class="btn small" data-act="unflag">Unflag</button>` : `<button class="btn small danger" data-act="flag">Flag</button>`}
        ${!s.deleted ? `<button class="btn small ghost" data-act="delete">Delete</button>` : `<button class="btn small" data-act="restore">Restore</button>`}
      `;

      actions.addEventListener("click", (e) => {
        const a = e.target.closest("button")?.dataset.act;
        if (!a) return;
        if (a === "edit") openEditModal(s.id);
        if (a === "approve") actionApprove(s.id);
        if (a === "flag") actionFlag(s.id);
        if (a === "unflag") actionUnflag(s.id);
        if (a === "delete") actionDelete(s.id);
        if (a === "restore") actionRestore(s.id);
      });

      card.append(img, body, actions);
      grid.appendChild(card);
    });
  }

  function renderList(stores) {
    const tbody = $("#tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    stores.forEach((s) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${esc(s.name || "")}</td>
        <td>${esc(s.country || "")}</td>
        <td>${esc(s.continent || "")}</td>
        <td>${esc(s.city || "")}</td>
        <td>${esc(s.type || "")}</td>
        <td>${esc(s.access || "")}</td>
        <td>${s.rating ?? "—"}</td>
        <td>${new Date(s.created_at).toLocaleDateString()}</td>
        <td>${s.approved ? "approved" : s.flagged ? "flagged" : s.deleted ? "deleted" : "pending"}</td>
        <td class="t-actions">
          <button class="btn ghost small" data-act="edit">Edit</button>
          ${!s.approved ? `<button class="btn ghost small" data-act="approve">Approve</button>` : ""}
          ${s.flagged ? `<button class="btn ghost small" data-act="unflag">Unflag</button>` : `<button class="btn danger small" data-act="flag">Flag</button>`}
          ${!s.deleted ? `<button class="btn ghost small" data-act="delete">Delete</button>` : `<button class="btn small" data-act="restore">Restore</button>`}
        </td>
      `;
      tr.querySelector(".t-actions").addEventListener("click", (e) => {
        const a = e.target.closest("button")?.dataset.act;
        if (!a) return;
        if (a === "edit") openEditModal(s.id);
        if (a === "approve") actionApprove(s.id);
        if (a === "flag") actionFlag(s.id);
        if (a === "unflag") actionUnflag(s.id);
        if (a === "delete") actionDelete(s.id);
        if (a === "restore") actionRestore(s.id);
      });
      tbody.appendChild(tr);
    });
  }

  // ---------- Actions ----------
  async function actionApprove(id) {
    const { error } = await supabase.from("stores").update({ approved: true, flagged: false }).eq("id", id);
    if (error) return toast("Error approving", "error");
    toast("Approved ✅");
    await loadStores();
  }

  async function actionFlag(id) {
    const reason = prompt("Enter reason for flagging:");
    const upd = { flagged: true };
    if (reason) upd.flag_reason = reason;
    const { error } = await supabase.from("stores").update(upd).eq("id", id);
    if (error) return toast("Error flagging", "error");
    toast("Flagged 🚩");
    await loadStores();
  }

  async function actionUnflag(id) {
    const { error } = await supabase.from("stores").update({ flagged: false, flag_reason: null }).eq("id", id);
    if (error) return toast("Error unflagging", "error");
    toast("Unflagged ✅");
    await loadStores();
  }

  async function actionDelete(id) {
    if (!confirm("Move this store to Trash?")) return;
    const { error } = await supabase.from("stores").update({ deleted: true }).eq("id", id);
    if (error) return toast("Error deleting", "error");
    toast("Moved to Trash 🗑️");
    await loadStores();
  }

  async function actionRestore(id) {
    const { error } = await supabase.from("stores").update({ deleted: false }).eq("id", id);
    if (error) return toast("Error restoring", "error");
    toast("Restored ♻️");
    await loadStores();
  }

  // ---------- Edit Modal ----------
  let EDIT_ID = null;

  function fillContinentSelect(value) {
    const sel = $("#e_continent");
    sel.innerHTML = CONTINENTS.map((c) => `<option value="${c}">${c}</option>`).join("");
    if (value) sel.value = value;
  }

  function setTypeButtons(typesCsv) {
    const active = (typesCsv || "")
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    $$(".pill-t").forEach((b) => {
      const on = active.includes(b.dataset.t);
      b.classList.toggle("active", on);
      b.addEventListener("click", () => {
        b.classList.toggle("active");
      });
    });
  }

  function setAccessButtons(val) {
    $$(".pill-a").forEach((b) => {
      b.classList.toggle("active", b.dataset.a === (val || ""));
      b.addEventListener("click", () => {
        if (b.classList.contains("active")) {
          // toggle off
          b.classList.remove("active");
        } else {
          // set this, toggle off others
          $$(".pill-a").forEach((x) => x.classList.remove("active"));
          b.classList.add("active");
        }
      });
    });
  }

  async function openEditModal(id) {
    EDIT_ID = id;
    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) {
      toast("Failed to load store", "error");
      return;
    }

    fillContinentSelect(data.continent || "");
    $("#e_name").value = data.name || "";
    $("#e_phone").value = data.phone || "";
    $("#e_address").value = data.address || "";
    $("#e_city").value = data.city || "";
    $("#e_country").value = data.country || "";
    $("#e_website").value = data.website || "";
    $("#e_place_id").value = data.place_id || "";
    $("#e_photo_reference").value = data.photo_reference || "";
    setTypeButtons(data.type || (data.types || []).join(","));
    setAccessButtons(data.access || "");

    $("#e_preview").src = buildPhotoUrl(data.photo_reference);

    // load reviews
    await loadReviews(id);

    $("#editModal").classList.add("show");
  }

  async function loadReviews(storeId) {
    const list = $("#reviewList");
    list.innerHTML = `<div class="muted">Loading…</div>`;
    const { data, error } = await supabase
      .from("store_reviews")
      .select("id, rating, comment, created_at, user_id")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });
    if (error) {
      list.innerHTML = `<div class="muted" style="color:#c33">Failed to load reviews</div>`;
      return;
    }
    if (!data || data.length === 0) {
      list.innerHTML = `<div class="muted">No comments yet.</div>`;
      return;
    }
    list.innerHTML = "";
    data.forEach((r) => {
      const row = document.createElement("div");
      row.className = "review-row";
      row.innerHTML = `
        <div class="rev-main">
          <div class="rev-stars">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</div>
          <div class="rev-text">${esc(r.comment || "")}</div>
          <div class="rev-meta">${new Date(r.created_at).toLocaleString()} — ${r.user_id || "anon"}</div>
        </div>
        <div class="rev-actions">
          <button class="btn danger small" data-rid="${r.id}">Delete</button>
        </div>
      `;
      row.querySelector("button").addEventListener("click", () => deleteReview(r.id));
      list.appendChild(row);
    });
  }

  async function deleteReview(reviewId) {
    if (!confirm("Delete this comment?")) return;
    const { error } = await supabase.from("store_reviews").delete().eq("id", reviewId);
    if (error) return toast("Failed to delete comment", "error");
    toast("Comment deleted");
    if (EDIT_ID) await loadReviews(EDIT_ID);
    // triggers will update store rating/comment_count automatically
  }

  $("#e_cancel")?.addEventListener("click", () => {
    $("#editModal").classList.remove("show");
    EDIT_ID = null;
  });

  $("#e_save")?.addEventListener("click", async () => {
    if (!EDIT_ID) return;

    const types = $$(".pill-t.active").map((b) => b.dataset.t).join(",");
    const accessBtn = $(".pill-a.active");
    const upd = {
      name: $("#e_name").value.trim(),
      phone: $("#e_phone").value.trim() || null,
      address: $("#e_address").value.trim() || null,
      city: $("#e_city").value.trim() || null,
      country: $("#e_country").value.trim() || null,
      continent: $("#e_continent").value || null,
      type: types || null,
      access: accessBtn ? accessBtn.dataset.a : null,
      website: $("#e_website").value.trim() || null,
      place_id: $("#e_place_id").value.trim() || null,
      photo_reference: $("#e_photo_reference").value.trim() || null,
    };

    const { error } = await supabase.from("stores").update(upd).eq("id", EDIT_ID);
    if (error) {
      console.error(error);
      toast("Error saving", "error");
      return;
    }
    toast("Saved ✅");
    $("#editModal").classList.remove("show");
    await loadStores();
  });

  // ---------- Search ----------
  $("#searchInput")?.addEventListener("input", async (e) => {
    const term = e.target.value.trim();
    if (!term) return renderView();
    const lower = term.toLowerCase();
    const filtered = filteredStores().filter((s) => {
      const blob = `${s.name} ${s.city} ${s.country}`.toLowerCase();
      return blob.includes(lower);
    });
    if (CURRENT_VIEW === "cards") renderCards(filtered);
    else renderList(filtered);
  });

  // ---------- View toggle ----------
  $$(".viewtoggle .seg").forEach((seg) => {
    seg.addEventListener("click", () => {
      $$(".viewtoggle .seg").forEach((x) => x.classList.remove("active"));
      seg.classList.add("active");
      CURRENT_VIEW = seg.dataset.view;
      renderView();
    });
  });

  // ---------- Tab filters ----------
  $$(".filters .pill").forEach((p) => {
    p.addEventListener("click", () => {
      $$(".filters .pill").forEach((x) => x.classList.remove("active"));
      p.classList.add("active");
      CURRENT_TAB = p.dataset.tab;
      loadStores();
    });
  });

  // ---------- Hierarchy search handlers ----------
  document.addEventListener("input", (e) => {
    if (e.target.id === "hSearch") {
      // rebuild tree from STORES (no roundtrip)
      buildHierarchy(STORES);
    }
  });

  // ---------- Reload button ----------
  window.reloadData = () => loadStores();

  // ---------- Init ----------
  document.addEventListener("DOMContentLoaded", () => {
    ensureContainers();
    // För kontinenter i edit-dialog
    fillContinentSelect("Europe");
    loadStores();
    toast("✅ Backoffice (V5.7) ready");
  });
})();

/* ============================================================
   Minimal styles expected in css/backoffice.css (nycklar)
   (Om något saknas, lägg till ungefär följande klasser)
   .hierarchy-panel .h-row .h-controls .crumbs .h-tree
   .line.continent/.country/.city  .nested.open .pill .badge etc.
   .modal-backdrop.show .modal.wide .edit-grid .reviews .review-row
   ============================================================ */
