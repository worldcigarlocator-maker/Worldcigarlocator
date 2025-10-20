// start.js — Dynamic sidebar (WCL gold & white edition)

const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

async function buildSidebar() {
  const menu = document.querySelector(".nav");
  if (!menu) return;
  menu.innerHTML = "<p style='color:#aaa;text-align:center;'>Loading…</p>";

  const { data: continents, error } = await supabase
    .from("continents")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error loading continents:", error);
    menu.innerHTML = `<li style="color:#f56">Failed to load continents</li>`;
    return;
  }

  menu.innerHTML = "";
  continents.forEach((cont) => {
    const li = el("div", "continent");
    const btn = el("button", "continent-btn");
    btn.innerHTML = `<span class="arrow">›</span> ${cont.name}`;
    li.appendChild(btn);

    const nested = el("div", "nested");
    li.appendChild(nested);

    let loaded = false;
    btn.addEventListener("click", async () => {
      const open = btn.classList.toggle("open");
      btn.querySelector(".arrow").style.transform = open ? "rotate(90deg)" : "rotate(0deg)";
      if (!loaded) {
        await loadCountries(cont.id, nested);
        loaded = true;
      }
      nested.classList.toggle("show", open);
    });

    menu.appendChild(li);
  });
}

async function loadCountries(continentId, container) {
  container.innerHTML = "<p class='loading'>Loading countries…</p>";
  const { data: countries, error } = await supabase
    .from("countries")
    .select("id, name, flag")
    .eq("continent_id", continentId)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error loading countries:", error);
    container.innerHTML = `<p style="color:#f56">Failed to load countries</p>`;
    return;
  }

  container.innerHTML = "";
  countries.forEach((c) => {
    const item = el("div", "country-item");
    item.innerHTML = `<span class="flag">${c.flag || "🌍"}</span> <span class="country-name">${c.name}</span>`;
    container.appendChild(item);
  });
}

document.addEventListener("DOMContentLoaded", buildSidebar);
