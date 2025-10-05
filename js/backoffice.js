const { createClient } = supabase;
const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4"; // byt till din anon key
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

async function loadStores() {
  // Hämta pending
  let { data: pending } = await supabase.from("stores").select("*").eq("status", "pending");
  renderStores(pending, document.getElementById("pending-list"), true);

  // Hämta approved
  let { data: approved } = await supabase.from("stores").select("*").eq("status", "approved");
  renderStores(approved, document.getElementById("approved-list"), false);
}

function renderStores(stores, container, isPending) {
  container.innerHTML = "";
  if (!stores || stores.length === 0) {
    container.innerHTML = "<p>Inga stores.</p>";
    return;
  }

  stores.forEach(store => {
    const div = document.createElement("div");
    div.classList.add("store-card");
    div.innerHTML = `
      <h3>${store.name}</h3>
      <p>${store.address || ""}</p>
      <p>${store.city || ""}, ${store.country || ""}</p>
      <p>${store.phone || ""}</p>
      <a href="${store.website || "#"}" target="_blank">${store.website || ""}</a>
      <div class="actions">
        ${isPending 
          ? `<button onclick="approveStore('${store.id}')">✅ Approve</button>` 
          : ""
        }
        <button onclick="openEdit('${store.id}', '${store.name || ""}', '${store.address || ""}', '${store.city || ""}', '${store.country || ""}', '${store.phone || ""}', '${store.website || ""}')">✏️ Edit</button>
        <button onclick="deleteStore('${store.id}')">🗑️ Delete</button>
      </div>
    `;
    container.appendChild(div);
  });
}

async function approveStore(id) {
  await supabase.from("stores").update({ status: "approved" }).eq("id", id);
  loadStores();
}

async function deleteStore(id) {
  if (confirm("Är du säker på att du vill ta bort denna store?")) {
    await supabase.from("stores").delete().eq("id", id);
    loadStores();
  }
}

// === Edit Modal ===
const modal = document.getElementById("editModal");
const closeModal = document.getElementById("closeModal");
const editForm = document.getElementById("editForm");

function openEdit(id, name, address, city, country, phone, website) {
  document.getElementById("edit-id").value = id;
  document.getElementById("edit-name").value = name;
  document.getElementById("edit-address").value = address;
  document.getElementById("edit-city").value = city;
  document.getElementById("edit-country").value = country;
  document.getElementById("edit-phone").value = phone;
  document.getElementById("edit-website").value = website;
  modal.style.display = "block";
}

closeModal.onclick = () => (modal.style.display = "none");
window.onclick = e => { if (e.target == modal) modal.style.display = "none"; };

editForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("edit-id").value;
  const updates = {
    name: document.getElementById("edit-name").value,
    address: document.getElementById("edit-address").value,
    city: document.getElementById("edit-city").value,
    country: document.getElementById("edit-country").value,
    phone: document.getElementById("edit-phone").value,
    website: document.getElementById("edit-website").value
  };

  await supabase.from("stores").update(updates).eq("id", id);
  modal.style.display = "none";
  loadStores();
});

// === Sökfunktion för approved ===
document.getElementById("search").addEventListener("input", async (e) => {
  const term = e.target.value.toLowerCase();
  let { data: approved } = await supabase.from("stores").select("*").eq("status", "approved");
  const filtered = approved.filter(s =>
    (s.name || "").toLowerCase().includes(term) ||
    (s.city || "").toLowerCase().includes(term) ||
    (s.country || "").toLowerCase().includes(term)
  );
  renderStores(filtered, document.getElementById("approved-list"), false);
});

// Ladda direkt
loadStores();
