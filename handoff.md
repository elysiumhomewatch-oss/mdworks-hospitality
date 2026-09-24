# Perry's @ Umdoni Point — Developer Handoff
**Date:** 2026-09-24  
**Project:** Perry's @ Umdoni Point — Boutique Guesthouse Website  
**Developer:** MD Works

---

## 1. Project Overview

A full-stack guesthouse website for Perry's @ Umdoni Point, Pennington, KwaZulu-Natal South Coast. Built with plain HTML/CSS/vanilla JS frontend, Cloudflare Pages hosting, Cloudflare Worker backend, KV storage, and ImageKit CDN for images. Includes a password-protected admin dashboard for the client (Debbi) to manage all content without touching code.

**Live URLs:**
- Public site: https://perrys.pages.dev/
- Admin dashboard: https://perrys.pages.dev/admin/
- Worker API: https://perrys-umdonipoint-worker.morneydeetlefs.workers.dev

**Final domain:** TBC — Athol is handling domain registration

---

## 2. Infrastructure

| Service | Detail |
|---|---|
| Cloudflare account | morneydeetlefs@gmail.com |
| Cloudflare account ID | 1504f196f4d6b26b16b59ef18b4126a3 |
| GitHub repo | github.com/elysiumhomewatch-oss/perrys (private) |
| Cloudflare Pages project | perrys (publish dir: `public/`) |
| Cloudflare Worker | perrys-umdonipoint-worker |
| KV namespace | CONTENT (id: cc514e1c6d7b4716b8a11c100bda9a9c) |
| ImageKit endpoint | https://ik.imagekit.io/iq9ymgpz2g |
| Wrangler version | 4.129.1 |

**Secrets (set via `wrangler secret put`):**
- `ADMIN_TOKEN` — Debbi's admin login password
- `IMAGEKIT_PRIVATE_KEY` — ImageKit private API key

---

## 3. Repository Structure

```
perrys/
├── public/                    ← Cloudflare Pages serves this
│   ├── index.html             ← Homepage
│   ├── about/index.html       ← Our Story
│   ├── rooms/index.html       ← Rooms
│   ├── experience/index.html  ← The Experience
│   ├── things-to-do/index.html
│   ├── gallery/index.html
│   ├── contact/index.html
│   ├── rates/index.html       ← Rates & Booking form
│   ├── admin/index.html       ← Admin dashboard (noindex)
│   ├── privacy/index.html
│   ├── terms/index.html
│   ├── booking-terms/index.html
│   ├── robots.txt
│   ├── sitemap.xml
│   └── assets/
│       ├── site.css           ← Shared design system
│       └── site.js            ← Shared JS (API, hydration, forms)
├── worker/
│   └── index.js               ← Cloudflare Worker (API)
└── wrangler.toml              ← Worker config
```

---

## 4. Tech Stack

- **Frontend:** Plain HTML, CSS, vanilla JS — no build step, no framework
- **Backend:** Cloudflare Worker (ES modules)
- **Storage:** Cloudflare KV (content + bookings)
- **Images:** ImageKit CDN (uploaded via admin, served globally)
- **Hosting:** Cloudflare Pages (auto-deploys on git push to main)
- **Fonts:** Google Fonts — Playfair Display + Montserrat

**Deploy process:**
```bash
# Worker changes:
wrangler deploy

# Frontend changes:
git add .
git commit -m "description"
git push
# Pages auto-deploys in ~30 seconds
```

---

## 5. Design System

| Token | Value |
|---|---|
| `--navy` | #1B2A4A |
| `--gold` | #C9A84C |
| `--gold-lt` | #E6C97A |
| `--cream` | #F5F1EB |
| `--white` | #FFFFFF |
| `--text` | #2C2C2C |
| `--muted` | #6B6B6B |
| Display font | Playfair Display |
| Body font | Montserrat |
| Max width | 1120px |

---

## 6. Worker API Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /api/content | Public | All KV content with defaults |
| POST | /api/booking | Public | Submit booking enquiry |
| GET | /api/bookings | Admin | Booking index |
| GET | /api/booking/:id | Admin | Single booking detail |
| PATCH | /api/admin/booking/:id/status | Admin | Update booking status |
| DELETE | /api/admin/booking/:id | Admin | Delete booking |
| POST | /api/admin/content | Admin | Save content section to KV |
| POST | /api/admin/image | Admin | Upload image via ImageKit |
| DELETE | /api/admin/image | Admin | Remove image from gallery |

**Admin auth:** Bearer token in Authorization header — value is `ADMIN_TOKEN` secret.

**WhatsApp number handling:** Both Worker and site.js normalise SA local numbers:
```js
const raw = number.replace(/\D/g, '');
const num = raw.startsWith('0') ? '27' + raw.slice(1) : raw;
```

---

## 7. KV Content Structure

All content lives in Cloudflare KV under the `CONTENT` namespace. Keys and their defaults are defined in `worker/index.js` → `DEFAULTS` object. The Worker merges KV values over defaults on every `/api/content` request.

**Current KV keys:**
| Key | Type | Description |
|---|---|---|
| `meta` | object | Phone, WhatsApp, email, address, social URLs, Google Maps embed |
| `specials` | object | Banner — active toggle, title, body, CTA label+link |
| `rates` | array | Accommodation packages with standard/weekend/peak prices |
| `ratesNotes` | string | Peak season note below rates table |
| `laundry` | array | Laundry service items and prices |
| `rooms` | array | 5 rooms — name, bedType, occupancy, description, amenities, heroImage, placeholder flag |
| `story` | object | About page — headline + body text |
| `facilities` | object | Sport, wellness, dining, notes lists |
| `thingsToDo` | array | Things To Do cards — title + description |
| `policies` | object | Check-in/out times, cancellation, smoking, quiet hours, children, pets |
| `images` | object | Named image URLs + gallery array |
| `pending` | object | Debbi's outstanding items checklist |
| `bookings-index` | array | Booking index (auto-managed) |
| `booking-{id}` | object | Individual booking records (auto-managed) |

**Images KV structure:**
```js
images: {
  hero: '',              // Homepage hero background
  ogImage: '',           // Social share image
  farmhouse: '',         // Homepage intro + About page
  farmhouseExterior: '', // About page
  kaylaAnn: '',          // About page
  dining: '',            // Experience page
  golf: '',              // Things To Do page
  whales: '',            // Things To Do page
  gallery: []            // Gallery grid [{url, fileId, alt, category, uploadedAt}]
}
```

**Image injection in site.js:**
- `data-bg-key="hero"` → sets `background-image` from KV
- `data-img-key="farmhouse"` → sets `src` from KV
- `data-og-key="true"` → sets OG meta `content` from KV
- Falls back to hardcoded `/assets/` path if KV value is empty

**Room images:** Each room object has a `heroImage` field. Uploaded per-room in admin Rooms editor. Saved to KV via Save All Rooms button.

---

## 8. Admin Dashboard

URL: https://perrys.pages.dev/admin/  
Login: ADMIN_TOKEN password (set via wrangler secret)

**Sections:**
- **Dashboard** — booking stats, recent bookings, Debbi's checklist preview
- **All Bookings** — filterable table, status management (confirm/cancel/delete), booking detail panel
- **Site Settings** — phone, WhatsApp, email, address, social URLs, Google Maps embed
- **Specials Banner** — toggle on/off, edit title/body/CTA
- **Our Story** — headline + body text
- **Rooms** — 5 rooms, all fields editable including per-room image upload
- **Rates** — accommodation packages + laundry prices
- **Things To Do** — add/edit/remove cards
- **Images** — 8 named image slots + gallery upload (drag & drop, category tagging)
- **Pending Items** — Debbi's checklist of outstanding items

---

## 9. Booking Flow

1. Guest fills in form on `/rates/` or `/contact/`
2. `site.js` POSTs to `/api/booking`
3. Worker validates, saves to KV, returns `whatsappUrl` + `calendarUrl`
4. Site shows success message, opens WhatsApp with pre-filled booking details
5. Debbi receives WhatsApp message, confirms booking manually
6. Debbi logs into admin, marks booking as confirmed

---

## 10. Outstanding — Debbi's Checklist (as of 2026-09-24)

These are tracked in the admin Pending Items page:

- [ ] Final website domain (Athol handling)
- [ ] Final email address
- [ ] Final WhatsApp / direct booking number
- [ ] Exact physical address and Google Maps pin
- [ ] Final 5 room names
- [ ] Maximum occupancy per room
- [ ] Full room descriptions and confirmed amenities (per room)
- [ ] Confirmed check-in and check-out times
- [ ] Final rates and inclusions
- [ ] Deposit / payment arrangements
- [ ] Cancellation policy (final wording)
- [ ] Children policy
- [ ] Pet policy
- [ ] Instagram handle + Facebook page URL
- [ ] Photography (property, rooms, bathrooms, pool, food, surroundings)
- [ ] Booking platform links (Lekker Slaap etc.)

---

## 11. Next Development Phase — Planned (not yet built)

These were scoped in the last session and ready to build:

### A — Logo image in nav
- New `siteIdentity` KV key: `{ logoImage, siteName, tagline, footerTagline }`
- Upload zone in admin Site Settings
- `site.js` injects logo into nav; falls back to "Perry's" text if no logo

### B — Editable text sections (simpler CMS approach)
New KV keys for currently-hardcoded content:

```js
homeSections: {
  hero:     { enabled: true, heading: '...', subtext: '...' },
  intro:    { enabled: true, heading: '...', body: '...' },
  whyPerrys:{ enabled: true, items: [...] },
  experienceTeaser: { enabled: true },
  cta:      { enabled: true },
}
aboutSections: {
  kaylaAnn: { enabled: true, heading: '...', body: '...' },
  perrysWay:{ enabled: true, pillars: [...] },
}
experienceSections: {
  dining:     { enabled: true, heading: '...', body: '...' },
  facilities: { enabled: true, items: [...] },
}
roomsSections: {
  intro:        { enabled: true, body: '...' },
  livingDining: { enabled: true, heading: '...', body: '...', image: '' },
}
```

Each section gets:
- `enabled` toggle (show/hide the section)
- Editable heading and/or body text
- Admin editor panel per section

### C — Living & Dining section on Rooms page
New section below rooms grid. Editable heading, body, image. Toggle to show/hide.

### D — "Farmhouse" → text should be admin-editable
Rather than a find/replace, the property type label becomes an editable field in Site Settings so Debbi can change it herself.

---

## 12. Known Issues / Notes

- CRLF warnings on git push are harmless (Windows line endings)
- `workers_dev = true` warning on wrangler deploy is harmless — add `workers_dev = false` to wrangler.toml once custom domain is live and Workers route is configured
- OG image meta tag is set dynamically by site.js — social share previews will only update after a cache refresh on the sharing platform
- Room images are uploaded to ImageKit gallery folder `/perrys` — they appear in the gallery KV under `images.gallery` but the `heroImage` URL is stored separately on each room object in the `rooms` KV key

