// start.js — show only regions with stores + inline counts
const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ===== Utility ===== */
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

/* ===== Sidebar ===== */
async function buildSidebar() {
  const menu = document.getElementById("sidebarMenu");
  menu.innerHTML = `<li style="color:#999;">Loading...</li>`;

  // ✅ Get distinct continents from approved stores
  const { data, error } = await supabase
    .from("stores")
    .select("continent, country, state")
    .eq("approved", true)
    .eq("deleted", false);

  if (error || !data) {
    menu.innerHTML = `<li style="color:#f56;">Failed to load</li>`;
    return;
  }

  // Group unique values + counts
  const grouped = {};
  data.forEach(s => {
    if (!s.continent) return;
    grouped[s.continent] = grouped[s.continent] || { countries: {}, count: 0 };
    grouped[s.continent].count++;
    if (s.country) {
      grouped[s.continent].countries[s.country] = grouped[s.continent].countries[s.country] || { states: {}, count: 0 };
      grouped[s.continent].countries[s.country].count++;
      if (s.state) {
        grouped[s.continent].countries[s.country].states[s.state] = (grouped[s.continent].countries[s.country].states[s.state] || 0) + 1;
      }
    }
  });

  menu.innerHTML = "";
  Object.entries(grouped).forEach(([continent, contObj]) => {
    const contLi = el("li");
    const contBtn = el("button", "continent-btn");
    const arrow = el("span", "arrow", "▸");
    const text = el("span", "label", continent);
    const count = el("span", "count-badge", contObj.count);
    contBtn.append(arrow, text, count);
    contLi.appendChild(contBtn);

    const countriesList = el("ul", "nested");
    contLi.appendChild(countriesList);

    contBtn.addEventListener("click", () => {
      const open = countriesList.classList.toggle("open");
      contBtn.classList.toggle("open", open);
      arrow.classList.toggle("open", open);
      if (open) renderCountryList(contObj.countries, countriesList, continent);
      renderStores("continent", continent);
    });

    menu.appendChild(contLi);
  });
}

/* ===== Countries ===== */
function renderCountryList(countries, container, continent) {
  container.innerHTML = "";
  Object.entries(countries).forEach(([country, cObj]) => {
    const li = el("li");
    const btn = el("button", "country-item");
    const arrow = el("span", "arrow", "▸");
    const text = el("span", "label", country);
    const count = el("span", "count-badge", cObj.count);
    btn.append(arrow, text, count);
    li.appendChild(btn);

    const stateList = el("ul", "nested");
    li.appendChild(stateList);

    btn.addEventListener("click", () => {
      const open = stateList.classList.toggle("open");
      btn.classList.toggle("open", open);
      arrow.classList.toggle("open", open);
      if (open) renderStateList(cObj.states, stateList, country);
      renderStores("country", country);
    });

    container.appendChild(li);
  });
}

/* ===== States ===== */
function renderStateList(states, container, country) {
  container.innerHTML = "";
  Object.entries(states).forEach(([state, count]) => {
    const li = el("li");
    const btn = el("button", "state-item");
    const text = el("span", "label", state);
    const badge = el("span", "count-badge", count);
    btn.append(text, badge);
    li.appendChild(btn);

    btn.addEventListener("click", () => renderStores("state", state));
    container.appendChild(li);
  });
}

/* ===== Render Store Cards ===== */
async function renderStores(field, value) {
  const grid = document.getElementById("storeGrid");
  grid.innerHTML = `<p style="color:#999;">Loading...</p>`;

  const { data, error } = await supabase
    .from("stores")
    .select("id, name, city, country, type, phone, website, photo_url, photo_reference")
    .eq(field, value)
    .eq("approved", true)
    .eq("deleted", false)
    .order("name");

  if (error || !data) {
    grid.innerHTML = `<p style="color:#f56;">Failed to load stores</p>`;
    return;
  }
  if (!data.length) {
    grid.innerHTML = `<p style="color:#999;">No stores found here</p>`;
    return;
  }

  grid.innerHTML = "";
  data.forEach(store => {
    const card = el("div", "store-card");
    const imgUrl =
      store.photo_url ||
      (store.photo_reference
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${store.photo_reference}&key=AIzaSyDdn7E6_dfwUjGQ1IUdJ2rQXUeEYIIzVtQ`
        : "images/store.jpg");

    card.innerHTML = `
      <img src="${imgUrl}" alt="${store.name}">
      <h3>${store.name}</h3>
      <p>${store.city ? store.city + ", " : ""}${store.country || ""}</p>
      ${store.phone ? `<p>📞 ${store.phone}</p>` : ""}
      ${store.website ? `<p><a href="${store.website}" target="_blank">🌐 Website</a></p>` : ""}
      <span class="store-type ${store.type || "store"}">${(store.type || "store").toUpperCase()}</span>
    `;
    grid.appendChild(card);
  });
}

/* ===== Init ===== */
document.addEventListener("DOMContentLoaded", buildSidebar);
