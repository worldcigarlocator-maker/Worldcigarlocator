# 🗒️ **World Cigar Locator – Frontend Update Plan**

**Version:** draft 1.0  
**Created:** 2025-10-29  
**Author:** Andreas + GPT-5  

---

## 🎯 Goal

Make the frontend fully compatible with the new **permanent Google CDN image system** used in Backoffice.  
This ensures:
- ✅ No more 404s or broken Google images  
- ✅ No API-key dependency for image display  
- ✅ Consistent image handling between frontend and backoffice  

---

## ⚙️ 1️⃣ Replace `cardImageSrc()` with new logic

Replace the current image source logic in `frontend.js` (or equivalent JS file) with:

```js
function cardImageSrc(s){
  // 1️⃣ Use permanent Google CDN if available
  if (s.photo_cdn_url) return s.photo_cdn_url;

  // 2️⃣ Otherwise build CDN URL from reference
  if (s.photo_reference)
    return `https://lh3.googleusercontent.com/p/${encodeURIComponent(s.photo_reference)}=w800-h600`;

  // 3️⃣ Accept stable own-hosted URLs (non-PhotoService)
  if (s.photo_url && !s.photo_url.includes("PhotoService.GetPhoto"))
    return s.photo_url;

  // 4️⃣ Allow googleusercontent URLs directly
  if (s.photo_url && s.photo_url.includes("googleusercontent"))
    return s.photo_url;

  // 5️⃣ Fallback to GitHub default images
  return (s.types?.includes("lounge"))
    ? "https://worldcigarlocator-maker.github.io/Worldcigarlocator/images/lounge.jpg"
    : "https://worldcigarlocator-maker.github.io/Worldcigarlocator/images/store.jpg";
}
```

---

## 🧱 2️⃣ Remove Google PhotoService image loading

Remove or comment out any code that builds URLs like:
```js
https://maps.googleapis.com/maps/api/place/photo?maxwidth=...
```

These links require an API key and expire quickly.  
They should be replaced with the **permanent CDN link** built from `photo_cdn_url` or `photo_reference`.

---

## 🖼️ 3️⃣ Improve fallback handling in `<img>` tags

Every `<img>` that displays a store/lounge image should follow this format:

```html
<img 
  src="..." 
  data-fallback="https://worldcigarlocator-maker.github.io/Worldcigarlocator/images/store.jpg"
  onerror="this.onerror=null; this.src=this.dataset.fallback;"
  alt="Store photo" 
/>
```

If an image fails to load, the fallback (white/gold design) is shown instantly.

---

## 🧩 4️⃣ Add automatic `photo_cdn_url` when adding new stores

In the **Add Store** form JavaScript:

When a new store submission includes a `photo_reference`,  
generate and save the permanent CDN link directly:

```js
if (formData.photo_reference) {
  formData.photo_cdn_url =
    `https://lh3.googleusercontent.com/p/${encodeURIComponent(formData.photo_reference)}=w800-h600`;
  formData.photo_url = null; // remove temporary PhotoService link
}
```

Then insert this into Supabase via your existing `stores` insert function.

This ensures that even *new unapproved* stores display properly.

---

## 🔁 5️⃣ Summary of Image Source Priority

| Priority | Field | Description |
|-----------|--------|-------------|
| 1️⃣ | `photo_cdn_url` | Permanent CDN image (best) |
| 2️⃣ | `photo_reference` | Builds a permanent Google link dynamically |
| 3️⃣ | `photo_url` | Stable custom URL (non-PhotoService) |
| 4️⃣ | `photo_url` includes `googleusercontent` | Acceptable |
| 5️⃣ | GitHub fallback | Final default image |

---

## 🧪 6️⃣ Testing checklist (after changes)

| Test | Expected Result |
|------|------------------|
| Load approved store | Image loads instantly (no 404) |
| Load new unapproved store | Image loads via CDN URL |
| Disconnect from API key | Images still visible |
| Flag/delete store | No effect on images |
| Load lounge/store fallback | Correct white-and-gold fallback appears |

---

## 🧰 7️⃣ Optional enhancements

Later, you can also:
- 🧭 Add `photo_cdn_url` to the **Supabase `stores_public` view** for faster queries  
- 🧮 Add caching headers on GitHub fallbacks for better performance  
- 🧷 Add “Reload Image” admin button in Backoffice to refresh CDN link if broken  

---

## ✅ Final Result

| Stage | Behavior |
|-------|-----------|
| Add Store | Automatically generates `photo_cdn_url` |
| Approve Store | Syncs `photo_cdn_url` and clears old URLs |
| Backoffice | Uses permanent Google CDN links |
| Frontend | Always loads `photo_cdn_url` first |
| All devices | No broken photos or API-key issues |
