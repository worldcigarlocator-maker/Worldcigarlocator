const { createClient } = supabase;
const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4"; // byt till din anon key
const supabaseClient = createClient(supabaseUrl, supabaseKey);

async function loadStores() {
  await loadList("pending", "pendingList");
  await loadList("approved", "approvedList");
}

async function loadList(status, containerId) {
  const list = document.getElementById(containerId);
  list.innerHTML = "<p>Laddar...</p>";

  const { data, error } = await supabaseClient
    .from("stores")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: false });

  if (error) {
    list.innerHTML = "<p style='color:red'>Fel vid hämtning.</p>";
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML = "<p>Inga stores.</p>";
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
        ${status === "pending" ? `<button class="approve">Approve</button>` : ""}
        <button class="edit">Edit</button>
        <button class="delete">Delete</button>
      </div>
    `;

    if (status === "pending") {
      card.querySelector(".approve").addEventListener("click", async () => {
        const { error } = await supabaseClient
          .from("stores")
          .update({ status: "approved" })
          .eq("id", store.id);

        if (error) alert("Kunde inte godkänna.");
        else loadStores();
      });
    }

    card.querySelector(".delete").addEventListener("click", async () => {
      if (!confirm("Säker på att du vill ta bort detta?")) return;
      const { error } = await supabaseClient
        .from("stores")
        .delete()
        .eq("id", store.id);

      if (error) alert("Kunde inte ta bort.");
      else loadStores();
    });

    card.querySelector(".edit").addEventListener("click", () => {
      alert("Edit kommer i nästa version 🚀");
    });

    list.appendChild(card);
  });
}

loadStores();
