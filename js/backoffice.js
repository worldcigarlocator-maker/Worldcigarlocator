// ===== Supabase Init =====
const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co"; 
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."; // din anon key här
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);


document.addEventListener("DOMContentLoaded", loadStores);

async function loadStores() {
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .order("id", { ascending: false });

  if (error) {
    console.error("Error loading stores:", error);
    return;
  }

  const pending = data.filter(s => !s.approved);
  const approved = data.filter(s => s.approved);

  renderCards(pending, document.getElementById("pending-cards"));
  renderCards(approved, document.getElementById("approved-cards"));
}

function renderCards(stores, container) {
  container.innerHTML = "";

  stores.forEach(store => {
    const card = document.createElement("div");
    card.className = "card";

    // preview
    const preview = document.createElement("div");
    preview.className = "card-preview";
    preview.innerHTML = `
      <img src="https://via.placeholder.com/400x200?text=${store.name}" alt="${store.name}">
      <h3>${store.name}</h3>
      <p>${store.city}, ${store.country}</p>
      <p>${store.website || ""}</p>
    `;

    // details
    const details = document.createElement("div");
    details.className = "card-details";
    details.innerHTML = `
      <label>Name</label>
      <input type="text" value="${store.name}" data-field="name">
      <label>Address</label>
      <input type="text" value="${store.address}" data-field="address">
      <label>City</label>
      <input type="text" value="${store.city}" data-field="city">
      <label>Country</label>
      <input type="text" value="${store.country}" data-field="country">
      <label>Website</label>
      <input type="text" value="${store.website || ""}" data-field="website">

      <div class="card-buttons">
        ${store.approved 
          ? `<button class="save-btn">Save</button>
             <button class="reject-btn">Delete</button>`
          : `<button class="approve-btn">Approve</button>
             <button class="save-btn">Save</button>
             <button class="reject-btn">Delete</button>`}
      </div>
    `;

    card.appendChild(preview);
    card.appendChild(details);

    // toggle open
    preview.addEventListener("click", () => {
      card.classList.toggle("open");
    });

    // buttons
    const approveBtn = details.querySelector(".approve-btn");
    const saveBtn = details.querySelector(".save-btn");
    const deleteBtn = details.querySelector(".reject-btn");

    if (approveBtn) {
      approveBtn.addEventListener("click", e => {
        e.stopPropagation();
        approveStore(store.id);
      });
    }

    saveBtn.addEventListener("click", e => {
      e.stopPropagation();
      saveStore(store.id, details);
    });

    deleteBtn.addEventListener("click", e => {
      e.stopPropagation();
      deleteStore(store.id);
    });

    container.appendChild(card);
  });
}

async function approveStore(id) {
  const { error } = await supabase
    .from("stores")
    .update({ approved: true })
    .eq("id", id);

  if (error) console.error("Error approving:", error);
  else loadStores();
}

async function saveStore(id, details) {
  const inputs = details.querySelectorAll("input");
  const updateData = {};
  inputs.forEach(input => {
    updateData[input.dataset.field] = input.value;
  });

  const { error } = await supabase
    .from("stores")
    .update(updateData)
    .eq("id", id);

  if (error) console.error("Error saving:", error);
  else loadStores();
}

async function deleteStore(id) {
  if (!confirm("Are you sure you want to delete this store?")) return;

  const { error } = await supabase
    .from("stores")
    .delete()
    .eq("id", id);

  if (error) console.error("Error deleting:", error);
  else loadStores();
}
