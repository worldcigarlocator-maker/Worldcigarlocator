import { createClient } from "@supabase/supabase-js";

// ersätt med dina egna värden
const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4"; // byt till din egen
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);


async function buildSidebar() {
  const sidebar = document.getElementById("sidebarMenu");
  if (!sidebar) return;

  // Hämta kontinenter i bokstavsordning
  const { data: continents, error: errCont } = await supabase
    .from("continents")
    .select("id, name")
    .order("name", { ascending: true });

  if (errCont) {
    console.error("Fel vid hämtning av kontinenter:", errCont);
    return;
  }

  // Hämta länder i bokstavsordning
  const { data: countries, error: errCountries } = await supabase
    .from("countries")
    .select("id, name, flag, continent_id")
    .order("name", { ascending: true });

  if (errCountries) {
    console.error("Fel vid hämtning av länder:", errCountries);
    return;
  }

  // Bygg hierarki: kontinent -> länder
  continents.forEach(cont => {
    const contLi = document.createElement("li");
    contLi.classList.add("continent");
    contLi.textContent = cont.name;

    const countryUl = document.createElement("ul");
    countryUl.classList.add("countries");

    countries
      .filter(c => c.continent_id === cont.id)
      .forEach(c => {
        const countryLi = document.createElement("li");
        countryLi.classList.add("country");
        countryLi.textContent = `${c.flag || ""} ${c.name}`;
        countryUl.appendChild(countryLi);
      });

    contLi.appendChild(countryUl);
    sidebar.appendChild(contLi);
  });
}

document.addEventListener("DOMContentLoaded", buildSidebar);
