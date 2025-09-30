// ====== Supabase init ======
const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";
const supabaseClient = createClient(supabaseUrl, supabaseKey);

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const storeId = params.get("id");

  if (!storeId) {
    document.getElementById("storeName").textContent = "No store selected";
    return;
  }

  // ====== Ladda butik ======
  const { data: stores, error: storeError } = await supabaseClient
    .from("stores")
    .select("id, name, address, website")
    .eq("id", storeId)
    .single();

  if (storeError) {
    console.error("Error loading store:", storeError);
    return;
  }

  document.getElementById("storeName").textContent = stores.name;
  document.getElementById("storeAddress").textContent = stores.address || "";
  if (stores.website) {
    document.getElementById("storeWebsite").href = stores.website;
    document.getElementById("storeWebsite").textContent = "Website";
  }

  // ====== Ladda recensioner ======
  loadReviews(storeId);

  // ====== Lägg till ny recension ======
  const form = document.getElementById("reviewForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const rating = document.getElementById("rating").value;
    const comment = document.getElementById("comment").value;

    const { error } = await supabaseClient
      .from("reviews")
      .insert([{ store_id: storeId, rating: parseInt(rating), comment }]);

    if (error) {
      console.error("Error adding review:", error);
      return;
    }

    form.reset();
    loadReviews(storeId);
  });
});

// ====== Funktion för recensioner ======
async function loadReviews(storeId) {
  const { data, error } = await supabaseClient
    .from("reviews")
    .select("rating, comment, created_at")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading reviews:", error);
    return;
  }

  const container = document.getElementById("reviewsList");
  container.innerHTML = "";

  if (!data || data.length === 0) {
    container.innerHTML = "<p>No reviews yet.</p>";
    return;
  }

  data.forEach(r => {
    const div = document.createElement("div");
    div.className = "review";
    div.innerHTML = `
      <p>${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</p>
      <p>${r.comment}</p>
      <small>${new Date(r.created_at).toLocaleDateString()}</small>
    `;
    container.appendChild(div);
  });
}
