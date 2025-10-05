// Initiera Supabase
const { createClient } = supabase;
const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co"; // din URL
const supabaseKey = "YOUR_SUPABASE_ANON_KEY"; // byt till din anon key
const supabaseClient = createClient(supabaseUrl, supabaseKey);

async function loadPendingStores() {
  const list = document.getElementById("pendingList");
  list.innerHTML = "<p>Laddar pending stores...</p>";

  const { data, error } = await supabaseClient
    .from("stores")
    .select("*")
    .eq("status", "pending");

  if (error) {
    list.innerHTML = "<p style='color:red'>Kunde inte hämta stores.</p>";
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML = "<p>Inga pending stores just nu.</p>";
    return;
  }

  list.innerHTML = "";
  data.forEach(store => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <div>
        <h3>${store.name}</h3>
        <p>${store.address || ""}, ${store.city || ""}, ${store.country || ""}</p>
        <p>Typ: ${store.type}</p>
      </div>
      <div class="buttons">
        <button class="approve">Approve</button>
        <button class="delete">Delete</button>
      </div>
    `;

    // Approve knapp
    card.querySelector(".approve").addEventListener("click", async () => {
      const { error } = await supabaseClient
        .from("stores")
        .update({ status: "approved" })
        .eq("id", store.id);

      if (error) {
        alert("Kunde inte godkänna.");
        console.error(error);
      } else {
        alert("Store godkänd!");
        loadPendingStores();
      }
    });

    // Delete knapp
    card.querySelector(".delete").addEventListener("click", async () => {
      if (!confirm("Är du säker på att du vill ta bort detta?")) return;
      const { error } = await supabaseClient
        .from("stores")
        .delete()
        .eq("id", store.id);

      if (error) {
        alert("Kunde inte ta bort.");
        console.error(error);
      } else {
        alert("Store borttagen!");
        loadPendingStores();
      }
    });

    list.appendChild(card);
  });
}

// Ladda pending stores vid start
loadPendingStores();
