# World Cigar Locator 🌍💨

En webbplats för att hitta cigarraffärer och lounger världen över.  
Byggd med **GitHub Pages** (frontend) och **Supabase** (databas + API).

---

## 🚀 Struktur

### Viktiga HTML-sidor
- **index.html** → startsida / age gate (över 18-årskontroll).  
- **start.html** → huvudmeny med sidebar (kontinenter, länder, städer).  
- **city.html** → dynamisk stadssida (`city.html?city=Paris`) som visar butiker i vald stad.  
- **store.html** → dynamisk butikssida (`store.html?store=gottegrisen`) med detaljer, betyg och recensioner.  
- **add-store.html** → formulär för att lägga till nya butiker.  
- **list-store.html** → lista alla butiker (bra som admin/katalogsida).

### Mappar
- **css/** → globala stilmallar (`global.css`) + ev. sid-specifika CSS.  
- **js/** → JavaScript-filer, t.ex. `add-store.js` för att hantera formulär.  
- **images/** → bilder (t.ex. stadskartor, banners).  
- **europe/** → sidfiler för manuella tester (kan ev. rensas bort senare).  

---

## 🗄️ Databas (Supabase)

### Tabeller
- **stores** → lagrar butiker (id, name, address, link, city).  
- **cities** → lagrar städer (namn används i dropdown vid add-store).  
- **ratings** → lagrar betyg och recensioner för varje butik.  

### Vy
- **store_ratings_summary** → visar snittbetyg, antal röster och antal recensioner per butik.  
  (används i `store.html` och `list-store.html`).

---

## 🔑 Funktioner
- Dynamiska sidor (`city.html`, `store.html`) laddar innehåll från Supabase.  
- Användare kan **lägga till nya butiker** direkt via formuläret.  
- Butiker kan **betygsättas och recenseras**.  
- Konsistent design med **global.css** (guldtema för rubriker och länkar).  

---

## 📌 Att göra
- Fyll på tabellen **cities** i Supabase med fler städer.  
- Koppla sidans sidebar (`start.html`) till att läsa direkt från databasen.  
- Eventuellt ta bort gamla testfiler i `/europe/`.

---

👨‍💻 Projektet byggs för att vara enkelt att underhålla: lägg till en butik via `add-store.html` → den syns direkt på rätt stadssida och får en egen butiksida automatiskt.
