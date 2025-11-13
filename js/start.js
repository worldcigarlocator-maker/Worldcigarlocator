/* ============================================================
   start.js — World Cigar Locator (Frontend v7.2 – auth + reviews)
   ============================================================ */

/* ================== Supabase setup ================== */
const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ================== Flags ================== */
const FLAGS_BASE = "https://worldcigarlocator-maker.github.io/Worldcigarlocator/assets/flags";
function flagURL(country) {
  if (!country) return null;
  const name = country.trim().toLowerCase();
  const map = {
    "united states":"us","usa":"us","united kingdom":"gb","england":"gb","scotland":"gb","wales":"gb","northern ireland":"gb",
    "czech republic":"cz","czechia":"cz","south korea":"kr","north korea":"kp","dominican republic":"do","puerto rico":"pr",
    "hong kong":"hk","taiwan":"tw","vietnam":"vn","venezuela":"ve","laos":"la","ivory coast":"ci","côte d’ivoire":"ci",
    "congo":"cd","dr congo":"cd","democratic republic of the congo":"cd","republic of the congo":"cg","united arab emirates":"ae",
    "uae":"ae","palestine":"ps","vatican city":"va","syria":"sy","iran":"ir","iraq":"iq","bolivia":"bo","tanzania":"tz",
    "cape verde":"cv","eswatini":"sz","north macedonia":"mk",
  };
  const isoGuess = name.replace(/[^a-z]/g,"").slice(0,2).toLowerCase();
  const iso = map[name] || isoGuess;
  const svgUrl = `${FLAGS_BASE}/${iso}.svg`;
  const flagEmoji = iso.toUpperCase().replace(/./g,c=>String.fromCodePoint(127397+c.charCodeAt(0)));
  return { svgUrl, flagEmoji };
}

/* ================== Photo proxy ================== */
const PHOTO_PROXY_URL = "https://gbxxoeplkzbhsvagnfsr.functions.supabase.co/photo-proxy";
function buildPhotoProxyUrl(ref, w=800) {
  return ref ? `${PHOTO_PROXY_URL}?photo_reference=${encodeURIComponent(ref)}&maxwidth=${w}` : null;
}

/* ================== Small helpers ================== */
function el(tag, cls, text){
  const e = document.createElement(tag);
  if(cls) e.className = cls;
  if(text) e.textContent = text;
  return e;
}
function esc(str){
  return String(str||"").replace(/[&<>"']/g,(c)=>(
    {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]
  ));
}
function qs(id){ return document.getElementById(id); }

function getContinentFromCountry(country){
  const c=(country||"").toLowerCase();
  if(["sweden","germany","france","italy","spain","norway","finland","denmark","netherlands","belgium","austria","switzerland","poland","czech republic","czechia"].includes(c)) return "Europe";
  if(["united states","usa","canada","mexico","cuba","dominican republic"].includes(c)) return "North America";
  if(["brazil","argentina","chile","peru","colombia","uruguay","paraguay"].includes(c)) return "South America";
  if(["china","japan","india","thailand","malaysia","singapore","israel","turkey","vietnam","indonesia"].includes(c)) return "Asia";
  if(["south africa","nigeria","kenya","morocco","egypt","ghana"].includes(c)) return "Africa";
  if(["australia","new zealand","fiji"].includes(c)) return "Oceania";
  return "Other";
}

/* ============================================================
   AUTH UI (button + modal) — created dynamically
   ============================================================ */
let currentUser = null;

function ensureAuthButton(){
  const bar = document.querySelector(".searchbar");
  if(!bar || qs("authBtn")) return;
  const btn = el("button","btn outline");
  btn.id="authBtn";
  btn.textContent="Log in";
  btn.addEventListener("click", ()=> {
    currentUser ? signOut() : openAuthModal();
  });
  bar.appendChild(btn);
}

function openAuthModal(){
  if(qs("authModal")){ qs("authModal").classList.add("show"); return; }

  const wrap = document.createElement("div");
  wrap.id = "authModal";
  wrap.className = "modal show";
  wrap.innerHTML = `
    <div class="modal-content" role="dialog" aria-modal="true">
      <button class="modal-close" aria-label="Close">&times;</button>
      <h2 style="margin-bottom:.5rem">Sign in</h2>

      <div style="display:grid;gap:.5rem;margin:.5rem 0 1rem;">
        <input id="authEmail" type="email" placeholder="Email" style="padding:.5rem;border-radius:8px;border:1px solid var(--border,#333);background:#0c0c0c;color:#eee;">
        <input id="authPass" type="password" placeholder="Password" style="padding:.5rem;border-radius:8px;border:1px solid var(--border,#333);background:#0c0c0c;color:#eee;">
        <button id="authEmailBtn" class="btn">Sign in with Email</button>
      </div>

      <div style="display:flex;gap:.5rem;align-items:center;margin:.5rem 0 1rem;">
        <div style="height:1px;background:#333;flex:1"></div>
        <small style="color:#aaa;">or</small>
        <div style="height:1px;background:#333;flex:1"></div>
      </div>

      <button id="authGoogleBtn" class="btn outline">Continue with Google</button>
    </div>`;
  document.body.appendChild(wrap);

  wrap.querySelector(".modal-close").addEventListener("click", ()=>wrap.classList.remove("show"));
  wrap.addEventListener("click",(e)=>{ if(e.target===wrap) wrap.classList.remove("show"); });

  qs("authEmailBtn").addEventListener("click", async ()=>{
    const email = qs("authEmail").value.trim();
    const password = qs("authPass").value;
    if(!email || !password){ alert("Enter email and password"); return; }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if(error){ alert(error.message); return; }
    wrap.classList.remove("show");
  });

  qs("authGoogleBtn").addEventListener("click", async ()=>{
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google" });
    if(error){ alert(error.message); }
  });
}

async function signOut(){
  await supabase.auth.signOut();
}

async function initAuth(){
  ensureAuthButton();
  const { data:{ session } } = await supabase.auth.getSession();
  currentUser = session?.user || null;
  updateAuthUI();

  supabase.auth.onAuthStateChange(async (_event, sess)=>{
    currentUser = sess?.user || null;
    updateAuthUI();
  });
}

function updateAuthUI(){
  const btn = qs("authBtn");
  if(!btn) return;
  if(currentUser){
    btn.textContent = "Log out";
    btn.classList.remove("outline");
  } else {
    btn.textContent = "Log in";
    btn.classList.add("outline");
  }
}

/* ============================================================
   Load stores (cards renderas i /js/cards.js)
   ============================================================ */
async function loadStores(filter = {}, searchTerm = "") {
  const grid = document.getElementById("storeGrid");
  const heading = document.getElementById("resultHeading");
  const showAllBtn = document.getElementById("showAllBtn");
  if (!grid) return;
  grid.innerHTML = `<p style="color:#777;text-align:center;">Loading…</p>`;

  let query = supabase.from("stores_public").select("*").order("id",{ascending:false});

  if (filter.city) query = query.eq("city", filter.city);
  else if (filter.country) query = query.eq("country", filter.country);
  else if (filter.continent) {
    const { data: all, error } = await query;
    if (error) {
      grid.innerHTML = `<p style="color:#c33;text-align:center;">Error loading stores.</p>`;
      return;
    }
    const filtered = all.filter((s)=> getContinentFromCountry(s.country) === filter.continent);
    heading.textContent = `Latest in ${filter.continent}`;
    showAllBtn.style.display = "inline-block";
    renderStoreCards(filtered);  // <-- nu definierad i cards.js
    return;
  }

  if (searchTerm) {
    query = query.or(`name.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%,country.ilike.%${searchTerm}%`);
  }

  const { data: stores, error } = await query;
  if (error) {
    console.error(error);
    grid.innerHTML = `<p style="color:#c33;text-align:center;">Error loading stores.</p>`;
    return;
  }
  if (!stores || stores.length === 0) {
    grid.innerHTML = `<p style="color:#777;text-align:center;">No stores found.</p>`;
    return;
  }

  if (filter.city){
    heading.textContent = `Latest in ${filter.city}`;
    showAllBtn.style.display="inline-block";
  } else if (filter.country){
    heading.textContent = `Latest in ${filter.country}`;
    showAllBtn.style.display="inline-block";
  } else {
    heading.textContent = "Latest 20 worldwide";
    showAllBtn.style.display="none";
  }

  renderStoreCards(stores);   // <-- från cards.js
}

/* ============================================================
   Sidebar + Init
   ============================================================ */
async function buildSidebar() {
  const menu = document.getElementById("sidebarMenu");
  if (!menu) return;
  menu.innerHTML = `<li style="color:#999">Loading…</li>`;
  const { data: stores, error } = await supabase
    .from("stores_public")
    .select("id,name,city,country");
  if (error || !stores) {
    menu.innerHTML = `<li style="color:#f56">Failed to load data</li>`;
    return;
  }

  const grouped = {};
  for (const s of stores) {
    const cont = getContinentFromCountry(s.country);
    if (!grouped[cont]) grouped[cont] = {};
    const ctry = s.country || "Unknown";
    if (!grouped[cont][ctry]) grouped[cont][ctry] = {};
    const city = s.city || "Unknown";
    if (!grouped[cont][ctry][city]) grouped[cont][ctry][city] = [];
    grouped[cont][ctry][city].push(s);
  }

  menu.innerHTML = "";
  Object.entries(grouped).sort(([a],[b])=>a.localeCompare(b)).forEach(([continent, countries])=>{
    const line = el("button","line continent");
    line.innerHTML = `<span class="arrow">▶</span><span class="label">${continent}</span><span class="pill">${
      Object.values(countries).reduce(
        (acc,c)=> acc + Object.values(c).reduce((a,b)=>a+b.length,0),
        0
      )
    }</span>`;
    const nested = el("div","nested");
    line.addEventListener("click",()=>{
      const isOpen = nested.classList.toggle("show");
      line.classList.toggle("open", isOpen);
      line.querySelector(".arrow").style.transform = isOpen ? "rotate(90deg)" : "rotate(0deg)";
      if (isOpen) loadStores({ continent });
    });

    Object.entries(countries).sort(([a],[b])=>a.localeCompare(b)).forEach(([country, cities])=>{
      const lineCountry = el("button","line country");
      lineCountry.innerHTML = `<span class="arrow">▶</span><span class="label">${country}</span><span class="pill">${
        Object.values(cities).reduce((a,b)=>a+b.length,0)
      }</span>`;
      const nestedCity = el("div","nested");
      lineCountry.addEventListener("click",(e)=>{
        e.stopPropagation();
        const isOpen = nestedCity.classList.toggle("show");
        lineCountry.classList.toggle("open", isOpen);
        lineCountry.querySelector(".arrow").style.transform = isOpen ? "rotate(90deg)" : "rotate(0deg)";
        if (isOpen) loadStores({ country });
      });

      Object.entries(cities).sort(([,a],[,b])=> b.length-a.length).forEach(([city, cityStores])=>{
        const btnCity = el("button","line city");
        btnCity.innerHTML = `<span class="label">${city}</span><span class="pill">${cityStores.length}</span>`;
        btnCity.addEventListener("click",(e)=>{
          e.stopPropagation();
          document.querySelector(".main").scrollIntoView({ behavior: "smooth" });
          loadStores({ city });
        });
        nestedCity.appendChild(btnCity);
      });

      nested.append(lineCountry, nestedCity);
    });

    menu.append(line, nested);
  });
}

/* ================== Init ================== */
document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Frontend v7.2 (split) loaded");
  ensureAuthButton();
  initAuth();
  buildSidebar();
  loadStores();

  const searchInput = qs("searchInput");
  const searchBtn = qs("searchBtn");
  const clearBtn = qs("clearBtn");
  const showAllBtn = qs("showAllBtn");

  searchBtn?.addEventListener("click",()=> loadStores({}, searchInput.value.trim()));
  clearBtn?.addEventListener("click",()=>{ searchInput.value=""; loadStores(); });
  searchInput?.addEventListener("keypress",(e)=>{ if(e.key==="Enter") loadStores({}, e.target.value.trim()); });
  showAllBtn?.addEventListener("click",()=>{ loadStores(); showAllBtn.style.display="none"; });

  // Close store modal handlers (modal HTML finns redan i start.html)
  const storeModal = qs("storeModal");
  if(storeModal){
    const closeBtn = storeModal.querySelector(".modal-close");
    const close = ()=>{ storeModal.classList.remove("show"); storeModal.setAttribute("aria-hidden","true"); }
    closeBtn?.addEventListener("click", close);
    storeModal.addEventListener("click",(e)=>{ if(e.target===storeModal) close(); });
  }
});
