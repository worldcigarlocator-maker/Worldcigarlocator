# 🌍 World Cigar Locator (WCL)

World Cigar Locator (WCL) is a global directory and mapping platform for cigar lounges, cigar shops, and premium smoking locations around the world.  
The goal is to deliver the most accurate and user-friendly cigar venue index worldwide.

WCL consists of:

- A public-facing frontend  
- A secure admin Backoffice  
- A Supabase backend with RLS  
- Server-side Edge Functions  
- Google Maps / Places integrations  
- Optional OpenAI-powered metadata tools  

---

## 🚀 Features

### Public Website
- Global list of cigar lounges and cigar-friendly locations  
- Fast continent → country → city navigation  
- Google Maps integration  
- Automatic photo fetching via **photo-proxy**  
- Fully responsive UI  
- Real-time data from Supabase  
- Clean, trusted, and consistent card layout  

### Admin Backoffice
- Secure login via Supabase Auth  
- Admin-only write permissions  
- Add, edit, and remove venues  
- Approval, moderation & flagging system  
- Photo replacement & metadata upload  
- AI-assisted tools (optional)  
- Excel-style list view for bulk editing  
- Place ID validator & duplicate detection  

### Security & API Architecture
- Full **RLS (Row Level Security)** protection  
- All sensitive logic runs via **Edge Functions**  
- OpenAI & Google server keys never exposed  
- Strict domain restrictions for browser keys  
- Rate-limiting and abuse protection  
- Safe public endpoints (read-only, filtered)  

---

## 🏗 Architecture Overview

Frontend (public website)
│
├─ Static HTML/CSS/JS
│ └─ Fetches only approved venues (RLS-filtered)
│
├─ Google Maps JS API (browser key, domain restricted)
│
Backend
│
├─ Supabase PostgreSQL
│ ├─ Tables: stores, countries, cities, continents
│ ├─ RLS: anon SELECT only where approved=true
│ └─ Functions: counts, metadata helpers
│
├─ Supabase Auth (Admin only)
│
├─ Edge Functions
│ ├─ photo-proxy (Google Photos → browser)
│ ├─ openai-metadata (optional)
│ ├─ admin-store-actions
│ └─ data cleanup & tools
│
External Integrations
│
├─ Google Places / Photos (server key only)
└─ OpenAI API (server key only)


---

## ⚙️ Requirements

- Supabase project (Free or Pro)  
- Node.js (optional for local development)  
- Google Cloud account with Places API enabled  
- OpenAI account (optional metadata tools)  
- Hosting provider (Vercel, Netlify, GitHub Pages, Cloudflare Pages)

---

## 🔑 Environment Variables (Supabase Secrets)

All secrets must be stored in Supabase → **Project Settings → Secrets**:

OPENAI_API_KEY=sk-xxxx
GOOGLE_SERVER_KEY=xxxx
MAPS_BROWSER_KEY=xxxx
SUPABASE_URL=https://xxx.supabase.co

SUPABASE_SERVICE_ROLE=xxxx


Do **not** commit any `.env` files to GitHub.

---

## 🖼 Photo Proxy (Edge Function)

WCL uses a secure proxy to fetch Google Place Photos without exposing server keys.

**Frontend request example:**

/photo-proxy?ref=PHOTO_REFERENCE&maxwidth=800


The Edge Function:

- Receives the request from browser  
- Fetches the image from Google using server key  
- Streams it back as a safe, proxied response  
- Keeps server key private at all times  

---

## 🔐 Security Model

Full security documentation is available in **SECURITY.md**.

Key principles:

- No sensitive API key in frontend  
- RLS restricts public access to approved data only  
- Admin Backoffice protected by Supabase Auth  
- Edge Functions verify JWT tokens  
- All writes require admin privileges  
- Rate-limits applied on backend  
- Google browser keys locked to `worldcigarlocator.com`  

---

## 📦 Deployment

### Frontend
Can be deployed to:

- Vercel  
- Netlify  
- GitHub Pages  
- Cloudflare Pages  

The site is entirely static and requires no server.

### Edge Functions
Deployed via Supabase CLI:

supabase functions deploy photo-proxy
supabase functions deploy admin-store-actions


### Supabase
Database is handled automatically via:

- SQL migrations
- RLS policies
- triggers & functions

---

## 📊 Data Model (Simplified)

stores
id
name
country
city
continent
lat
lng
address
website
phone
place_id
photo_reference
access
type
rating
approved
flagged
deleted
created_at
updated_at


---

## 🧪 Testing

Manual testing recommended:

- Test photo-proxy with several Google Place IDs  
- Add/remove venues through Backoffice  
- Validate RLS by making anon requests  
- Confirm admin-only write actions  

---

## 🤝 Contributing

Pull requests are welcome.  
To contribute:

- Document any schema changes  
- Include screenshots for UI updates  
- Never commit secrets or API keys  
- Follow the project architecture and naming standards  

---

## 📄 License

Copyright © 2025  
The project may not be copied or redistributed without permission from the owner.

---

## ⭐ Thank You for Using World Cigar Locator!

More features are coming soon — AI tools, automatic metadata, improved photo systems, and more.

