// ===== Supabase Init =====
const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co"; 
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."; // din anon key här
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// ===== Load stores =====
async function loadStores() {
  console.log("Loading stores...");

  // Pending
  const { data: pending, error: err1 } = await supabase
    .from("stores")
    .select("*")
    .eq("approved", false);

  renderCards(pending, "pendingContainer", true);

  // Approved
  const { data: approved, error: err2 } = await supabase
    .from("stores")
    .select("*")
    .eq("approved", true);

  renderCards(approved, "approvedContainer", false);
}

// ===== Render cards =====
function renderCards(stores, containerId, isPending) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  if (!stores || stores.length === 0) {
    container.innerHTML = "<p>No stores found.</p>";
    return;
  }

  stores.forEach(store => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h3>${store.name}</h3>
      <p><strong>Address:</strong> ${store.address}</p>
      <p><strong>City:</strong> ${store.city}</p>
      <p><strong>Country:</strong> ${store.country}</p>
      <p><strong>Phone:</strong> ${store.phone || "-"}</p>
      <p><strong>Website:</strong> ${store.website || "-"}</p>
      <p><strong>Rating:</strong> ${store.rating || 0} ⭐</p>
      ${isPending ? `
        <button class="approve-btn" data-id="${store.id}">Approve</button>
        <button class="reject-btn" data-id="${store.id}">Reject</button>
      ` : ""}
    `;
    container.appendChild(card);
  });

  if (isPending) {
    document.querySelectorAll(".approve-btn").forEach(btn =>
      btn.addEventListener("click", () => updateApproval(btn.dataset.id, true))
    );
    document.querySelectorAll(".reject-btn").forEach(btn =>
      btn.addEventListener("click", () => updateApproval(btn.dataset.id, false))
    );
  }
}

// ===== Update approval =====
async function updateApproval(id, approved) {
  const { error } = await supabase.from("stores").update({ approved }).eq("id", id);
  if (error) {
    console.error("Error updating:", error);
    alert("Could not update store ❌");
  } else {
    loadStores();
  }
}

// ===== Search approved =====
document.getElementById("searchInput").addEventListener("input", async (e) => {
  const term = e.target.value.toLowerCase();
  const { data } = await supabase
    .from("stores")
    .select("*")
    .eq("approved", true)
    .or(`name.ilike.%${term}%,city.ilike.%${term}%,country.ilike.%${term}%`);

  renderCards(data, "approvedContainer", false);
});

// ===== Init =====
document.addEventListener("DOMContentLoaded", loadStores);
