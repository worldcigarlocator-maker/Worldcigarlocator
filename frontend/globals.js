/* ============================================================
   GLOBALS — backend logic reused for frontend
   ============================================================ */

export const WCL = {
  SUPABASE_URL: "https://gbxxoeplkzbhsvagnfsr.supabase.co",
  SUPABASE_ANON_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4",

  PHOTO_PROXY_URL: "https://gbxxoeplkzbhsvagnfsr.functions.supabase.co/photo-proxy",
  FALLBACK_IMG: "https://worldcigarlocator-maker.github.io/Worldcigarlocator/images/store.jpg",
  FLAGS_BASE: "https://worldcigarlocator-maker.github.io/Worldcigarlocator/assets/flags"
};

/* --------------------- PHOTO URL ---------------------- */
export function photoURL(ref, w = 800) {
  if (!ref) return WCL.FALLBACK_IMG;
  return `${WCL.PHOTO_PROXY_URL}?photo_reference=${encodeURIComponent(ref)}&maxwidth=${w}`;
}

/* --------------------- ISO2 ENGINE ---------------------- */
/* exact same engine as backend */

const ISO2_BASE = {
  "us":"united states","gb":"united kingdom","se":"sweden","de":"germany","fr":"france","it":"italy","es":"spain",
  "ca":"canada","mx":"mexico","br":"brazil","ar":"argentina","ch":"switzerland","no":"norway","fi":"finland",
  "dk":"denmark","nl":"netherlands","be":"belgium","pt":"portugal","pl":"poland","jp":"japan","cn":"china",
  "kr":"south korea","au":"australia","nz":"new zealand","za":"south africa","th":"thailand","sg":"singapore",
  "ae":"united arab emirates","gr":"greece","at":"austria","ie":"ireland","cz":"czechia",
  "ro":"romania","bg":"bulgaria","hu":"hungary","hr":"croatia","rs":"serbia","ua":"ukraine"
};

const COUNTRY_TO_ISO2 = {};
for (const [iso, name] of Object.entries(ISO2_BASE)) {
  COUNTRY_TO_ISO2[name] = iso;
}

function norm(str){
  return (str||"").toLowerCase().trim()
    .replace(/[’']/g,"'")
    .replace(/\./g,"")
    .replace(/,/g,"")
    .replace(/-/g," ")
    .replace(/\s+/g," ");
}

/* --------------------- FLAG URL ---------------------- */
export function flagURL(country, isoOverride = null){
  if (!country && !isoOverride) return null;

  if (isoOverride && ISO2_BASE[isoOverride]) {
    return `${WCL.FLAGS_BASE}/${isoOverride}.svg`;
  }

  const key = norm(country);

  if (ISO2_BASE[key]) {
    return `${WCL.FLAGS_BASE}/${key}.svg`;
  }

  const iso = COUNTRY_TO_ISO2[key];
  return iso ? `${WCL.FLAGS_BASE}/${iso}.svg` : null;
}

/* ----------------- CONTINENT MAPPER ------------------ */
export function getContinentFromCountry(country){
  const c = norm(country);

  const EU = ["sweden","germany","france","italy","spain","norway","finland","denmark","netherlands","belgium","austria","switzerland","poland","czechia"];
  const NA = ["united states","usa","canada","mexico","cuba","dominican republic"];
  const SA = ["brazil","argentina","chile","peru","colombia","uruguay","paraguay"];
  const AS = ["china","japan","india","thailand","malaysia","singapore","israel","turkey","vietnam","indonesia"];
  const AF = ["south africa","nigeria","kenya","morocco","egypt","ghana"];
  const OC = ["australia","new zealand","fiji"];

  if (EU.includes(c)) return "Europe";
  if (NA.includes(c)) return "North America";
  if (SA.includes(c)) return "South America";
  if (AS.includes(c)) return "Asia";
  if (AF.includes(c)) return "Africa";
  if (OC.includes(c)) return "Oceania";
  return "Other";
}

/* ============================================================
   CARD RENDERER — Backoffice layout (minus admin)
   ============================================================ */

import { WCL, flagURL, photoURL } from "./globals.js";

export function renderCards(stores){
  const grid = document.getElementById("storeGrid");
  if (!grid) return;

  grid.innerHTML = "";

  stores.forEach((s)=>{

    const card = document.createElement("div");
    card.className = "store-card";

    /* PHOTO */
    const img = document.createElement("img");
    img.className = "store-img";
    img.src = photoURL(s.photo_reference, 800);
    img.onerror = ()=> img.src = WCL.FALLBACK_IMG;
    card.appendChild(img);

    /* BODY */
    const body = document.createElement("div");
    body.className = "store-body";

    /* NAME */
    const name = document.createElement("h3");
    name.className = "store-title";
    name.textContent = s.name || "";
    body.appendChild(name);

    /* BADGES */
    const badgeRow = document.createElement("div");
    badgeRow.className = "badge-row";

    const types = Array.isArray(s.types)
      ? s.types
      : (s.type ? [s.type] : []);

    types.forEach(t=>{
      const b = document.createElement("span");
      b.className = `badge ${
        t === "store" ? "blue" :
        t === "lounge" ? "gold" : "gray"
      }`;
      b.textContent = t.toUpperCase();
      badgeRow.appendChild(b);

      if (t === "lounge" && s.access){
        const acc = document.createElement("span");
        acc.className = "badge access " +
          (s.access === "public"
            ? "green"
            : s.access === "members"
            ? "purple"
            : "gray");
        acc.textContent = s.access.toUpperCase();
        badgeRow.appendChild(acc);
      }
    });

    body.appendChild(badgeRow);

    /* STARS */
    const stars = document.createElement("div");
    stars.className = "stars";
    const rating = Math.round(Number(s.rating) || 0);
    stars.textContent = "★★★★★☆☆☆☆☆".slice(5-rating,10-rating);
    body.appendChild(stars);

    /* LOCATION */
    const loc = document.createElement("div");
    loc.className = "locrow";

    const top = document.createElement("div");
    top.className = "loc-top";

    const flagSrc = flagURL(s.country, s.country_iso2);
    if (flagSrc){
      const f = document.createElement("img");
      f.className = "flag";
      f.src = flagSrc;
      top.appendChild(f);
    }

    const geo = document.createElement("span");
    geo.textContent = [s.country, s.state, s.city].filter(Boolean).join(", ");
    top.appendChild(geo);
    loc.appendChild(top);

    if (s.continent){
      const c = document.createElement("div");
      c.className = "continent-line";
      c.textContent = s.continent.toUpperCase();
      loc.appendChild(c);
    }

    body.appendChild(loc);

    /* INFO BLOCK */
    const info = document.createElement("div");
    info.className = "infoblock";
    info.innerHTML = `
      <p><strong>Address:</strong> ${s.address || "–"}</p>
      <p><strong>Phone:</strong> ${s.phone || "–"}</p>
      <p><strong>Website:</strong> ${
        s.website ? `<a href="${s.website}" target="_blank">Visit</a>` : "–"
      }</p>
    `;
    body.appendChild(info);

    /* COMMENTS */
    const btn = document.createElement("button");
    btn.className = "reviews-btn";
    btn.textContent = "💬 View comments";
    btn.addEventListener("click",(e)=>{
      e.stopPropagation();
      if (window.openStoreModal) window.openStoreModal(s);
    });
    body.appendChild(btn);

    /* CLICK CARD */
    card.addEventListener("click",()=>{
      if (window.openStoreModal) window.openStoreModal(s);
    });

    card.appendChild(body);
    grid.appendChild(card);
  });
}

