/* ============================================================
   cards.js — Card layout + modal + reviews for WCL frontend
   ============================================================ */

// safe text with "—" fallback
function safeText(v) {
  if (!v) return "—";
  return esc(v);
}

/* ================== Render cards ================== */
function renderStoreCards(stores){
  const grid = document.getElementById("storeGrid");
  if (!grid) return;
  grid.innerHTML = "";

  stores.forEach((s)=>{
    const card = document.createElement("div");
    card.className = "store-card";

    // Bild via proxy eller fallback
    const imgSrc = s.photo_reference
      ? buildPhotoProxyUrl(s.photo_reference, 800)
      : "images/store.jpg";

    // Typ-badges (store/lounge)
    const typeList = (s.type||"")
      .split(",")
      .map(t=>t.trim().toLowerCase())
      .filter(t=>t==="store"||t==="lounge");
    const badgesHtml = typeList.length
      ? typeList.map(t=>`<span class="type-badge-inline ${t}">${t.toUpperCase()}</span>`).join(" ")
      : `<span class="type-badge-inline store">STORE</span>`;

    // Rating (från stores_public, uppdateras senare via reviews)
    const baseRating = Math.round(Number(s.rating)||0);
    const stars = Array.from({length:5})
      .map((_,i)=> i<baseRating ? "★" : "☆")
      .join("");

    // Flagga + location
    const flagData = flagURL(s.country);
    let flagImg = "";
    if (flagData) {
      flagImg = `<img src="${flagData.svgUrl}" class="flag" alt="${esc(s.country)}"
        onerror="this.style.display='none';const span=document.createElement('span');span.className='flag-fallback';span.textContent='${flagData.flagEmoji}';this.parentNode.insertBefore(span,this.nextSibling);">`;
    }
    const locText = [s.country, s.city].filter(Boolean).join(", ");

    const locationRow = `
      <div class="locrow">
        ${flagImg}
        <span class="loc-text">${esc(locText)}</span>
      </div>
    `;

    // Continent (ljus text)
    const cont = getContinentFromCountry(s.country);
    const contLabel = (cont || "—").toUpperCase();

    // Website / Visit
    const websiteCell = s.website
      ? `<button class="visit-btn" data-url="${esc(s.website)}" type="button">Visit</button>`
      : "—";

    card.innerHTML = `
      <div class="card-top">
        <img src="${imgSrc}" alt="${esc(s.name)}" class="store-img" />
      </div>

      <div class="card-body">

        <div class="badge-row">
          ${badgesHtml}
        </div>

        <div class="title-wrap">
          <h3 class="card-title">${safeText(s.name)}</h3>
        </div>

        <div class="rating-stars">${stars}</div>

        ${locationRow}

        <div class="continent">${esc(contLabel)}</div>

        <div class="card-info"><strong>Address:</strong> ${safeText(s.address)}</div>
        <div class="card-info"><strong>Phone:</strong> ${safeText(s.phone)}</div>
        <div class="card-info"><strong>Website:</strong> ${websiteCell}</div>

        <button class="comment-btn" type="button">View comments</button>
      </div>
    `;

    // dataset för modal
    card.dataset.id = s.id; // bigint
    card.dataset.name = s.name || "";
    card.dataset.address = s.address || "";
    card.dataset.city = s.city || "";
    card.dataset.country = s.country || "";
    card.dataset.phone = s.phone || "";
    card.dataset.website = s.website || "";
    card.dataset.img = imgSrc;

    grid.appendChild(card);
  });

  // Visit-knappar
  grid.querySelectorAll(".visit-btn").forEach(btn=>{
    btn.addEventListener("click",(e)=>{
      e.stopPropagation();
      const url = e.currentTarget.getAttribute("data-url");
      if (url) window.open(url, "_blank", "noopener");
    });
  });

  // Klick på hela kortet → öppna modal
  grid.querySelectorAll(".store-card").forEach(card=>{
    card.addEventListener("click", ()=> openStoreModal(card));
  });

  // Klick på “View comments” → öppna samma modal
  grid.querySelectorAll(".comment-btn").forEach(btn=>{
    btn.addEventListener("click",(e)=>{
      e.stopPropagation();
      const card = e.currentTarget.closest(".store-card");
      if (card) openStoreModal(card);
    });
  });
}

/* ============================================================
   Store modal (details + reviews)
   ============================================================ */
async function openStoreModal(card){
  const id = Number(card.dataset.id);
  const modal = qs("storeModal");
  const mPhoto = qs("mPhoto");
  const mTitle = qs("mTitle");
  const mAddress = qs("mAddress");
  const mLocation = qs("mLocation");
  const mVisit = qs("mVisit");

  // Basinfo
  mPhoto.src = card.dataset.img || "";
  mTitle.textContent = card.dataset.name || "";
  mAddress.textContent = `Address: ${card.dataset.address || ""}`.trim();
  mLocation.textContent = [card.dataset.city, card.dataset.country].filter(Boolean).join(", ");

  // Visit-knapp
  mVisit.onclick = null;
  if (card.dataset.website){
    mVisit.style.display = "";
    mVisit.addEventListener("click",()=>window.open(card.dataset.website,"_blank","noopener"));
  } else {
    mVisit.style.display = "none";
  }

  // Reviews: medel + lista + composer
  await renderReviewsSection(id);

  modal.classList.add("show");
  modal.setAttribute("aria-hidden","false");
}

async function renderReviewsSection(storeId){
  let reviewsBox = qs("reviewsBox");
  if(!reviewsBox){
    const modal = qs("storeModal").querySelector(".modal-content");
    reviewsBox = el("div", "reviews-box");
    reviewsBox.id = "reviewsBox";
    reviewsBox.innerHTML = `
      <div id="avgRating" style="margin:.5rem 0 .25rem; font-size:1.05rem;"></div>
      <div id="reviewsList" style="display:grid;gap:.4rem;margin:.4rem 0;"></div>
      <div id="reviewComposer" style="margin-top:.6rem;">
        <div id="starInput" style="margin:.25rem 0;">
          ${[1,2,3,4,5].map(v=>`<button class="star" data-v="${v}">★</button>`).join("")}
          <small id="starHint" style="margin-left:.25rem;color:#aaa;"></small>
        </div>
        <textarea id="mComment" placeholder="Write a comment… (login required)"></textarea>
        <div class="m-actions">
          <button id="mSave" class="btn outline">Post review</button>
        </div>
      </div>
    `;
    modal.appendChild(reviewsBox);
  }

  // Medelrating
  const { data: avgRows, error: avgErr } = await supabase
    .from("store_reviews")
    .select("rating")
    .eq("store_id", storeId);

  let avg = 0;
  if(!avgErr && avgRows && avgRows.length){
    avg = avgRows.reduce((a,b)=>a+Number(b.rating||0),0) / avgRows.length;
  }
  const stars = Array.from({length:5}).map((_,i)=> i<Math.round(avg) ? "★":"☆").join("");
  qs("avgRating").innerHTML =
    `<strong>Rating:</strong> ${stars} <small style="color:#aaa;">(${avgRows?.length||0})</small>`;

  // Lista senaste reviews
  const { data: revs, error: listErr } = await supabase
    .from("store_reviews")
    .select("rating, comment, created_at")
    .eq("store_id", storeId)
    .order("created_at", { ascending:false })
    .limit(5);

  const listEl = qs("reviewsList");
  listEl.innerHTML = "";
  if(listErr){
    listEl.innerHTML = `<small style="color:#c66;">Failed loading reviews</small>`;
  } else if(!revs || !revs.length){
    listEl.innerHTML = `<small style="color:#aaa;">No reviews yet.</small>`;
  } else {
    revs.forEach(r=>{
      const li = el("div","rev");
      const s = Array.from({length:5}).map((_,i)=> i<Number(r.rating||0) ? "★":"☆").join("");
      const dt = r.created_at ? new Date(r.created_at).toLocaleDateString() : "";
      li.innerHTML =
        `<div style="display:flex;justify-content:space-between;">
           <span>${s}</span>
           <small style="color:#777;">${dt}</small>
         </div>
         ${r.comment?`<div style="color:#ddd;">${esc(r.comment)}</div>`:""}`;
      listEl.appendChild(li);
    });
  }

  setupComposer(storeId);
}

function requireLoginOr(fn){
  if(!currentUser){
    openAuthModal();
    return;
  }
  fn();
}

function setupComposer(storeId){
  const stars = Array.from(qs("starInput").querySelectorAll(".star"));
  const hint = qs("starHint");
  let selected = 0;

  stars.forEach(btn=>{
    btn.style.color = "var(--accent, #c9a227)";
    btn.addEventListener("click", ()=> requireLoginOr(()=>{
      selected = Number(btn.getAttribute("data-v"));
      stars.forEach(s=> s.style.opacity =
        Number(s.getAttribute("data-v")) <= selected ? "1" : ".35"
      );
      hint.textContent = `You selected ${selected}/5`;
    }));
  });

  qs("mSave").onclick = ()=> requireLoginOr(async ()=>{
    if(!selected){ alert("Choose a rating (1–5)"); return; }
    const comment = (qs("mComment").value||"").trim();

    const payload = {
      store_id: storeId,
      user_id: currentUser.id,
      rating: selected,
      comment: comment || null
    };

    const { error } = await supabase.from("store_reviews").insert(payload);
    if(error){ alert(error.message); return; }

    // reset
    qs("mComment").value = "";
    stars.forEach(s=> s.style.opacity = ".35");
    selected = 0;
    hint.textContent = "";

    await renderReviewsSection(storeId);
    updateCardStarsInGrid(storeId);
  });
}

async function updateCardStarsInGrid(storeId){
  const { data, error } = await supabase
    .from("store_reviews")
    .select("rating")
    .eq("store_id", storeId);
  if(error) return;

  const avg = data?.length
    ? data.reduce((a,b)=>a+Number(b.rating||0),0)/data.length
    : 0;

  const stars = Array.from({length:5})
    .map((_,i)=> i<Math.round(avg) ? "★":"☆")
    .join("");

  const card = Array.from(document.querySelectorAll(".store-card"))
    .find(c=> Number(c.dataset.id)===Number(storeId));
  if(card){
    const row = card.querySelector(".rating-stars");
    if(row) row.textContent = stars;
  }
}
