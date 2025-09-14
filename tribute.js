import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 🔑 Din Supabase config
const SUPABASE_URL = "https://kvmifqqbpbkfalqlhaud.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2bWlmcXFicGJrZmFscWxoYXVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4NzU3ODEsImV4cCI6MjA3MzQ1MTc4MX0.RCgl3Va7KGK21HP7sW_wueNWa5l17XMHnSXJ1aQA7gM";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Elementreferenser
const continentEl = document.getElementById("continent");
const countryEl   = document.getElementById("country");
const regionEl    = document.getElementById("region");
const cityEl      = document.getElementById("city");
const cityManualWrapper = document.getElementById("cityManualWrapper");
const cityManual  = document.getElementById("cityManual");

// 🚀 Ladda kontinenter
(async function loadContinents(){
  const { data, error } = await supabase
    .from("continents")
    .select("id, name")
    .order("name", { ascending: true });

  continentEl.innerHTML = "<option value=''>Select...</option>";
  data?.forEach(c => {
    const o = document.createElement("option");
    o.value = c.id;
    o.textContent = c.name;
    continentEl.appendChild(o);
  });
})();

// 🌍 När man väljer kontinent
continentEl.addEventListener("change", async () => {
  countryEl.innerHTML = "<option value=''>Select...</option>";
  regionEl.innerHTML  = "<option value=''>Select...</option>";
  cityEl.innerHTML    = "<option value=''>Select...</option>";
  cityManualWrapper.style.display = "none";

  if (!continentEl.value) return;
  const { data } = await supabase
    .from("countries")
    .select("id, name")
    .eq("continent_id", continentEl.value)
    .order("name", { ascending: true });

  data?.forEach(c => {
    const o = document.createElement("option");
    o.value = c.id;
    o.textContent = c.name;
    countryEl.appendChild(o);
  });
});

// 🇨🇭 När man väljer land
countryEl.addEventListener("change", async () => {
  regionEl.innerHTML = "<option value=''>Select...</option>";
  cityEl.innerHTML   = "<option value=''>Select...</option>";
  cityManualWrapper.style.display = "none";

  if (!countryEl.value) return;
  const { data } = await supabase
    .from("regions")
    .select("id, name")
    .eq("country_id", countryEl.value)
    .order("name", { ascending: true });

  data?.forEach(r => {
    const o = document.createElement("option");
    o.value = r.id;
    o.textContent = r.name;
    regionEl.appendChild(o);
  });
});

// 🏙️ När man väljer region
regionEl.addEventListener("change", async () => {
  cityEl.innerHTML = "<option value=''>Select...</option>";
  cityManualWrapper.style.display = "none";

  if (!regionEl.value) return;
  const { data } = await supabase
    .from("cities")
    .select("id, name")
    .eq("region_id", regionEl.value)
    .order("name", { ascending: true });

  data?.forEach(ci => {
    const o = document.createElement("option");
    o.value = ci.id;
    o.textContent = ci.name;
    cityEl.appendChild(o);
  });

  const other = document.createElement("option");
  other.value = "OTHER";
  other.textContent = "Other (add manually)";
  cityEl.appendChild(other);
});

cityEl.addEventListener("change", () => {
  cityManualWrapper.style.display = (cityEl.value === "OTHER") ? "block" : "none";
});

// 💾 Submit
document.getElementById("tributeForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  let city_id = cityEl.value;

  // Hantera manuell stad
  if (city_id === "OTHER") {
    const name = (cityManual.value || "").trim();
    if (!name) { alert("Please enter the city name."); return; }

    const { data: cityIns, error: cityErr } = await supabase
      .from("cities")
      .insert({ name, region_id: regionEl.value })
      .select("id")
      .single();

    if (cityErr) { alert("Could not add city: " + cityErr.message); return; }
    city_id = cityIns.id;
  }

  // Mapping
  const typeMap   = { "Store":"store", "Lounge":"lounge" };
  const accessMap = {
    "Open for everyone":"open",
    "Members only":"members_only",
    "Temporary membership available":"temporary"
  };

  // Payload
  const payload = {
    city_id,
    name: document.getElementById("venueName").value,   // 🆕 namn på venue
    type:   typeMap[document.getElementById("type").value],
    access: accessMap[document.getElementById("access").value],
    address: document.getElementById("address").value || null,
    phone:   document.getElementById("phone").value   || null,
    email:   document.getElementById("email").value   || null
  };

  const { data: venue, error: vErr } = await supabase
    .from("venues")
    .insert(payload)
    .select("id")
    .single();

  const out = document.getElementById("output");
  out.style.display = "block";
  if (vErr) {
    out.textContent = "Error: " + vErr.message;
  } else {
    out.textContent = "Saved! Venue ID: " + venue.id;
  }
});
