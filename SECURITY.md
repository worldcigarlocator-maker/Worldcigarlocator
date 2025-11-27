# World Cigar Locator – Security Blueprint

Senast uppdaterad: 2025-11-27

Detta dokument beskriver säkerhetsmodellen för World Cigar Locator (WCL), inklusive
hantering av hemligheter, API-nycklar, backend-logik, RLS och frontend-begränsningar.

---

## 1. Översikt

WCL består av:

- **Publik frontend** (statisk webb + Supabase som datakälla)
- **Backoffice / Adminpanel** (endast för inloggade admins)
- **Supabase** (databas + RLS + Edge Functions)
- **Externa API:er**
  - OpenAI API
  - Google Maps / Places (inkl. foto)

Målet är att:
- API-nycklar aldrig exponeras publikt
- Endast godkänd data exponeras mot publik frontend
- Alla muterande operationer kräver autentiserad admin

---

## 2. Hemligheter & API-nycklar

### 2.1 Var hemligheter lagras

Alla hemliga nycklar ska lagras som **Supabase Secrets**:

- `OPENAI_API_KEY`
- `GOOGLE_SERVER_API_KEY` (Places / Photos, endast server)
- `MAPS_BROWSER_API_KEY` (klient, men låst på domännivå)

Inga keys får:

- ligga hårdkodade i repo
- ligga i `.env` som committas
- ligga i frontend-kod

### 2.2 Användning

- **OpenAI**  
  - Endast i Edge Functions / backend  
  - Hämtas via `Deno.env.get("OPENAI_API_KEY")`

- **Google server key**  
  - Endast i foto-proxy / andra serverfunktioner  
  - Aldrig direkt i browsern

- **Maps browser key**  
  - Får ligga i frontend, men:
    - Begränsad till domäner: t.ex. `worldcigarlocator.com`
    - Endast nödvändiga APIs aktiverade (Maps JS, Places, ev. Geocoding om behövs)

---

## 3. Supabase & RLS

### 3.1 RLS (Row Level Security)

Tabeller som styrs med RLS (exempel):

- `stores`
- `cities`
- `countries`
- `flags` (om sådan finns)
- ev. `flags_reports` eller liknande

**Princip:**

- **anon (publik)**:
  - Får endast SELECT på offentliga / `approved = true` rader
  - Får inte INSERT / UPDATE / DELETE

- **auth (inloggad användare)**:
  - Begränsad till det som är rimligt (oftast fortfarande read-only)

- **admin / service role**:
  - Får skriva, men bara via kontrollerad backend (Edge Functions / Backoffice)

Exempelpolicy för `stores`:

- Publik:
  - `SELECT` där `approved = true` och `status = 'active'`
- Backoffice (admin):
  - Full read/write via service role eller specifik role

### 3.2 Direktanslutning från frontend

Frontend bör använda:
- `supabase-js` med **anon-key**
- Endast SELECT mot vyer eller tabeller som är hårt filtrerade av RLS

---

## 4. Backoffice / Adminpanel

### 4.1 Autentisering

- Backoffice kräver alltid **Supabase Auth** (e-post eller annan metod)
- Endast användare med roll "admin" (eller motsvarande fält) får:
  - Ändra `stores`
  - Godkänna / avvisa poster
  - Ändra foton, flaggor, metadata

### 4.2 Autorisering (authorization)

Varje känslig funktion ska kontrollera:

1. Är användaren inloggad?
2. Har användaren rätt roll / behörighet?

I Edge Functions / admin-API:

```ts
const { data: { user } } = await supabase.auth.getUser();

if (!user) {
  return new Response("Unauthorized", { status: 401 });
}

// Exempel: kolla roll i JWT claim eller profil-tabell
