/**
 * Perry's @ Umdoni Point — Cloudflare Worker
 * 
 * Routes:
 *   GET  /api/content                        — all public content from KV (with defaults)
 *   POST /api/booking                         — save booking, return WhatsApp URL + Calendar link
 *   GET  /api/bookings          (admin)       — booking index
 *   GET  /api/booking/:id       (admin)       — single booking detail
 *   PATCH /api/admin/booking/:id/status (admin) — update booking status
 *   DELETE /api/admin/booking/:id   (admin)  — delete booking
 *   POST /api/admin/content     (admin)       — save any content section to KV
 *   POST /api/admin/image       (admin)       — upload image via ImageKit, store URL in KV
 *   DELETE /api/admin/image     (admin)       — remove image URL from KV gallery list
 *
 * Env vars (set via wrangler secrets / wrangler.toml):
 *   CONTENT                  — KV namespace binding
 *   ADMIN_TOKEN              — bearer token for admin routes
 *   IMAGEKIT_PRIVATE_KEY     — ImageKit private API key (secret)
 *   IMAGEKIT_URL_ENDPOINT    — e.g. https://ik.imagekit.io/perrys
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function err(msg, status = 400) {
  return json({ error: msg }, status);
}

// ─── Default content (fallback when KV is empty) ──────────────────────────────

const DEFAULTS = {
  meta: {
    siteName: "Perry's @ Umdoni Point",
    tagline: 'Boutique Coastal Forest Getaway',
    location: 'Pennington, KwaZulu-Natal, South Coast, South Africa',
    phone: '', // to be confirmed by Debbi
    whatsapp: '', // to be confirmed by Debbi
    email: '', // to be confirmed by Debbi
    instagram: '', // to be confirmed by Debbi
    facebook: '', // to be confirmed by Debbi
    googleMapsEmbed: '', // to be confirmed by Debbi
    address: 'Pennington, KwaZulu-Natal, South Africa',
  },
  specials: {
    active: true,
    title: 'September 2026 Opening Special',
    body: 'Celebrate our grand opening with exclusive rates. From R950 pp/night including continental breakfast.',
    ctaLabel: 'View Rates',
    ctaLink: '/rates/',
  },
  rates: [
    {
      id: 'r1',
      package: 'Accommodation + Continental Breakfast',
      standard: 950,
      weekend: 1100,
      peak: 1350,
      unit: 'pp/night',
    },
    {
      id: 'r2',
      package: 'Accommodation + Continental & Hot Breakfast',
      standard: 1100,
      weekend: 1250,
      peak: 1500,
      unit: 'pp/night',
    },
    {
      id: 'r3',
      package: 'Accommodation + Dinner + Continental Breakfast',
      standard: 1300,
      weekend: 1450,
      peak: 1700,
      unit: 'pp/night',
    },
    {
      id: 'r4',
      package: 'Accommodation + Dinner + Continental & Hot Breakfast',
      standard: 1450,
      weekend: 1600,
      peak: 1850,
      unit: 'pp/night',
    },
  ],
  ratesNotes: 'Peak season: December and all South African public and school holiday periods (Easter, long weekends, etc.).',
  laundry: [
    { id: 'l1', item: 'Small load', price: 150 },
    { id: 'l2', item: 'Medium load', price: 250 },
    { id: 'l3', item: 'Large load', price: 350 },
    { id: 'l4', item: 'Shirts', price: 35 },
    { id: 'l5', item: 'Trousers / Skirts / Dresses', price: 45 },
    { id: 'l6', item: 'Jackets / Jerseys', price: 60 },
  ],
  rooms: [
    { id: 'room-1', name: 'Room 1 — Coming Soon', slug: 'room-1', placeholder: true, description: 'Details coming soon. Contact us to enquire.', bedType: '', occupancy: '', amenities: [], rate: '' },
    { id: 'room-2', name: 'Room 2 — Coming Soon', slug: 'room-2', placeholder: true, description: 'Details coming soon. Contact us to enquire.', bedType: '', occupancy: '', amenities: [], rate: '' },
    { id: 'room-3', name: 'Room 3 — Coming Soon', slug: 'room-3', placeholder: true, description: 'Details coming soon. Contact us to enquire.', bedType: '', occupancy: '', amenities: [], rate: '' },
    { id: 'room-4', name: 'Room 4 — Coming Soon', slug: 'room-4', placeholder: true, description: 'Details coming soon. Contact us to enquire.', bedType: '', occupancy: '', amenities: [], rate: '' },
    { id: 'room-5', name: 'Room 5 — Coming Soon', slug: 'room-5', placeholder: true, description: 'Details coming soon. Contact us to enquire.', bedType: '', occupancy: '', amenities: [], rate: '' },
  ],
  story: {
    headline: "A Historic South Coast Retreat",
    body: `Perry's @ Umdoni Point is set in the historic Barker Farmhouse on the KwaZulu-Natal South Coast — a property with deep roots in the local landscape. Formerly home to a celebrated chef school under Kayla Ann, the farmhouse has been lovingly restored and reimagined as a warm, welcoming boutique guesthouse.\n\nToday, Kayla Ann continues to bring her craft to the table — guests can enjoy her signature two-course set dinner, prepared fresh each evening.\n\nThis is a place where history, nature and genuine South African hospitality come together.`,
  },
  facilities: {
    sport: ['Heated swimming pool', 'Fully equipped gym', 'Padel court', 'Pickleball court'],
    wellness: ['Revive Coastal Luxury Spa (Beauty: 082 391 9248 · Hair: 076 792 9563)'],
    dining: ['Italian Club restaurant on-site'],
    notes: 'Guest access and discounts to be confirmed with owner.',
  },
  thingsToDo: [
    { id: 'td1', title: 'Pennington Beaches', description: 'Pristine South Coast beaches minutes away — safe swimming, sunsets, and wide open skies.' },
    { id: 'td2', title: 'Whale & Dolphin Watching', description: 'Seasonal whale watching (June–November) and year-round dolphin sightings from the shoreline.' },
    { id: 'td3', title: 'Coastal Walks', description: 'Explore the coastal forest trails and clifftop paths around Umdoni Point.' },
    { id: 'td4', title: 'Golf', description: 'Four world-class courses nearby: Umdoni Park Golf Club, Selborne Golf Estate, Penn Valley Golf, and more.' },
    { id: 'td5', title: 'Scuba Diving', description: 'The South Coast is one of South Africa\'s top dive destinations — rich reefs, sharks, and turtles.' },
    { id: 'td6', title: 'Scottburgh & South Coast', description: 'Explore local restaurants, markets, and attractions along the KZN South Coast.' },
  ],
  policies: {
    checkIn: '14:00',
    checkOut: '10:00',
    cancellation: 'Cancellation policy to be finalised. Please contact us directly.',
    payment: 'Payment details to be confirmed. Please contact us directly.',
    smoking: 'Non-smoking inside. Designated outdoor smoking area available.',
    quietHours: '22:00 – 07:00',
    children: 'Children policy to be confirmed. Please contact us directly.',
    pets: 'Pet policy to be confirmed. Please contact us directly.',
  },
  images: {
  hero: '',
  ogImage: '',
  farmhouse: '',
  farmhouseExterior: '',
  kaylaAnn: '',
  dining: '',
  golf: '',
  whales: '',
  gallery: [],
},
  homeSections: {
    hero: {
      heading: "Perry's @ Umdoni Point",
      subtext: 'A peaceful South Coast escape where coastal forest, history and warm hospitality come together.',
    },
    intro: {
      label: 'Welcome',
      heading: 'Where the forest meets the sea',
      body1: "Perry's @ Umdoni Point is a boutique guesthouse nestled in Pennington on the KwaZulu-Natal South Coast — a stretch of coastline known for its lush forests, warm waters and unhurried pace of life.",
      body2: "Situated in the historic Barker Farmhouse, our five individually styled rooms offer comfort, character and genuine South African warmth. Whether you're here for a quiet escape, a beach holiday or a romantic getaway, Perry's feels like home from the moment you arrive.",
    },
    whyPerrys: {
      label: "Why Perry's",
      heading: 'Six good reasons to stay with us',
      subtext: "We're not a hotel. We're a guesthouse — and there's a difference.",
      items: [
        'Five individually styled rooms — not a production line',
        'Set in the historic Barker Farmhouse with a story worth knowing',
        "Chef Kayla Ann's two-course set dinner, prepared fresh each evening",
        "Full access to Umdoni Point's pool, gym, spa, padel and pickleball",
        "Five minutes from Pennington's pristine beaches and coastal walks",
        'Warm, personal service — not a front-desk experience',
      ],
    },
    experienceTeaser: {
      label: 'The Experience',
      heading: 'More than a room',
      body: "Guests at Perry's have full access to Umdoni Point's resort-quality facilities — a heated pool, fully equipped gym, padel and pickleball courts, the Revive Coastal Luxury Spa, and the Italian Club restaurant, all on your doorstep.",
    },
    cta: {
      label: 'Ready to book?',
      heading: 'Come and stay with us',
      body: "Contact Debbi directly via WhatsApp or fill in our booking form — we'll confirm your stay personally.",
    },
  },
  aboutSections: {
    kaylaAnn: {
      label: 'The Chef',
      heading: "Kayla Ann's Table",
      body1: "Kayla Ann has spent decades honing her craft in this very kitchen. As founder of the former chef school on the property, she brings decades of culinary passion to Perry's dining experience.",
      body2: "Each evening she prepares a fresh two-course set dinner for guests — hearty, seasonal, and entirely her own. It's the kind of meal that makes you linger at the table long after the plates are cleared.",
      note: 'Dinner is available as part of select packages. See our rates page for details.',
    },
    perrysWay: {
      label: 'What we stand for',
      heading: "The Perry's Way",
      pillars: [
        { emoji: '🌿', heading: 'Rooted in place',       body: "The farmhouse, the forest, the sea — we're part of this landscape and we want you to feel it." },
        { emoji: '🤝', heading: 'Personal hospitality',  body: "We know your name when you arrive. No front desk, no scripts — just genuine warmth." },
        { emoji: '🍽️', heading: 'Food at the heart',    body: "This farmhouse was built around a kitchen. That hasn't changed — Kayla Ann's table is still the soul of Perry's." },
      ],
    },
    cta: {
      heading: 'Come and be part of the story',
      body: "Perry's is a living, breathing place with history in its walls and warmth in its welcome. We'd love to have you.",
    },
  },
  experienceSections: {
    dining: {
      label: 'Dining',
      heading: "Kayla Ann's Table",
      body1: 'Each evening, chef Kayla Ann prepares a fresh two-course set dinner for guests. This is home cooking at its finest — hearty, seasonal and made with genuine care.',
      body2: 'Breakfast is included in all packages, ranging from a continental spread to a full hot breakfast. See our rates page for the full package options.',
      note: "The Italian Club restaurant is also located on the Umdoni Point estate for evenings when you'd like to dine out without going far.",
    },
    facilities: {
      label: 'On-Site Facilities',
      heading: 'Resort-Quality Amenities',
      intro: "As a guest at Perry's, you have full access to the world-class facilities of the Umdoni Point estate. Guest access and any applicable discounts are to be confirmed — please ask us when you book.",
      note: 'Guest access and discounts to be confirmed with Debbi when booking.',
    },
    cta: {
      heading: "Ready for your Perry's experience?",
      body: 'Book direct for the best rates — or WhatsApp Debbi to plan your stay.',
    },
  },
  roomsSections: {
    intro: {
      body: "Each room at Perry's has its own character — no two are the same. Full room details and photography are coming soon as we complete our opening preparations. Contact us to enquire about a specific room.",
    },
    inclusions: {
      label: 'Every Room Includes',
      heading: 'Standard Inclusions',
      items: [
        'En-suite bathroom',
        'Air conditioning',
        'Quality linen and towels',
        'Tea & coffee station',
        'Hair dryer',
        'Smart TV',
        'Free Wi-Fi',
        'Safe',
        'Daily housekeeping',
      ],
      note: 'Amenities to be confirmed per room. Contact us for current availability.',
    },
    ratesTeaser: {
      label: 'Rates',
      heading: 'From R950 per person per night',
      body: 'All our packages include breakfast. Dinner packages are also available. View the full rates table and book direct for the best price.',
    },
    livingDining: {
      enabled: false,
      heading: 'Living & Dining',
      body: '',
      image: '',
    },
  },
  siteIdentity: {
    logoImage: '',      // URL of uploaded logo (served via ImageKit)
    siteName: "Perry's @ Umdoni Point",
    tagline: 'Boutique Coastal Forest Getaway',
    footerTagline: 'Boutique Coastal Forest Getaway in the historic Barker Farmhouse, Pennington, KwaZulu-Natal South Coast.',
  },
  pending: {
    // Debbi's outstanding items — visible in admin dashboard
    items: [
      { id: 'p1', label: 'Final website domain', done: false },
      { id: 'p2', label: 'Final email address', done: false },
      { id: 'p3', label: 'Final WhatsApp / direct booking number', done: false },
      { id: 'p4', label: 'Exact physical address and Google Maps pin', done: false },
      { id: 'p5', label: 'Final 5 room names', done: false },
      { id: 'p6', label: 'Maximum occupancy per room', done: false },
      { id: 'p7', label: 'Full room descriptions and confirmed amenities (per room)', done: false },
      { id: 'p8', label: 'Confirmed check-in and check-out times', done: false },
      { id: 'p9', label: 'Final rates and inclusions', done: false },
      { id: 'p10', label: 'Deposit / payment arrangements', done: false },
      { id: 'p11', label: 'Cancellation policy (final wording)', done: false },
      { id: 'p12', label: 'Children policy', done: false },
      { id: 'p13', label: 'Pet policy', done: false },
      { id: 'p14', label: 'Instagram handle + Facebook page URL', done: false },
      { id: 'p15', label: 'Photography (property, rooms, bathrooms, pool, food, surroundings)', done: false },
      { id: 'p16', label: 'Booking platform links (Lekker Slaap, etc.) once accounts created', done: false },
    ],
  },
};

// ─── KV helpers ───────────────────────────────────────────────────────────────

async function kvGet(env, key, fallback = null) {
  const raw = await env.CONTENT.get(key);
  if (raw === null) return fallback;
  try { return JSON.parse(raw); } catch { return raw; }
}

async function kvSet(env, key, value) {
  await env.CONTENT.put(key, JSON.stringify(value));
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

function isAdmin(request, env) {
  const auth = request.headers.get('Authorization') || '';
  return auth === `Bearer ${env.ADMIN_TOKEN}`;
}

// ─── ImageKit upload ──────────────────────────────────────────────────────────

async function uploadToImageKit(env, fileBuffer, fileName, folder = '/perrys') {
  // ImageKit server-side upload uses HTTP Basic auth: privateKey as username, empty password
  const credentials = btoa(`${env.IMAGEKIT_PRIVATE_KEY}:`);

  // Build multipart form
  const formData = new FormData();
  formData.append('file', new Blob([fileBuffer]), fileName);
  formData.append('fileName', fileName);
  formData.append('folder', folder);
  formData.append('useUniqueFileName', 'true');

  const resp = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
    method: 'POST',
    headers: { Authorization: `Basic ${credentials}` },
    body: formData,
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`ImageKit upload failed: ${resp.status} ${text}`);
  }

  return resp.json(); // { url, fileId, name, ... }
}

// ─── Booking helpers ──────────────────────────────────────────────────────────

function buildWhatsAppUrl(whatsapp, booking) {
  const raw = whatsapp.replace(/\D/g, '');
const num = raw.startsWith('0') ? '27' + raw.slice(1) : raw;
  const msg = [
    `*New Booking Request — Perry's @ Umdoni Point*`,
    ``,
    `Name: ${booking.name}`,
    `Email: ${booking.email}`,
    `Phone: ${booking.phone}`,
    `Check-in: ${booking.checkIn}`,
    `Check-out: ${booking.checkOut}`,
    `Guests: ${booking.guests}`,
    `Room preference: ${booking.roomPreference || 'No preference'}`,
    `Package: ${booking.package || 'Not specified'}`,
    `Special requests: ${booking.special || 'None'}`,
    ``,
    `Ref: ${booking.id}`,
  ].join('\n');

  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
}

function buildCalendarUrl(booking) {
  const start = booking.checkIn.replace(/-/g, '');
  // Check-out is next day midnight — use date only for all-day event
  const end = booking.checkOut.replace(/-/g, '');
  const title = encodeURIComponent(`${booking.name} — Perry's @ Umdoni Point`);
  const details = encodeURIComponent(
    `Guest: ${booking.name}\nPhone: ${booking.phone}\nEmail: ${booking.email}\nGuests: ${booking.guests}\nRef: ${booking.id}`
  );
  const location = encodeURIComponent("Perry's @ Umdoni Point, Pennington, KZN South Coast");
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`;
}

// ─── Router ───────────────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // ── GET /api/content ────────────────────────────────────────────────────
    if (method === 'GET' && path === '/api/content') {
      const keys = Object.keys(DEFAULTS);
      const content = {};
      await Promise.all(
        keys.map(async (k) => {
          content[k] = await kvGet(env, k, DEFAULTS[k]);
        })
      );
      return json(content);
    }

    // ── POST /api/booking ───────────────────────────────────────────────────
    if (method === 'POST' && path === '/api/booking') {
      let body;
      try { body = await request.json(); } catch { return err('Invalid JSON'); }

      const required = ['name', 'email', 'phone', 'checkIn', 'checkOut', 'guests'];
      for (const f of required) {
        if (!body[f]) return err(`Missing required field: ${f}`);
      }

      const id = `booking-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const booking = {
        id,
        ...body,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      // Save full booking
      await kvSet(env, id, booking);

      // Update booking index
      const index = (await kvGet(env, 'bookings-index', []));
      index.unshift({ id, name: body.name, checkIn: body.checkIn, checkOut: body.checkOut, status: 'pending', createdAt: booking.createdAt });
      await kvSet(env, 'bookings-index', index);

      // Build response URLs
      const meta = await kvGet(env, 'meta', DEFAULTS.meta);
      const whatsappUrl = meta.whatsapp
        ? buildWhatsAppUrl(meta.whatsapp, booking)
        : null;
      const calendarUrl = buildCalendarUrl(booking);

      return json({ success: true, id, whatsappUrl, calendarUrl });
    }

    // ── Admin: GET /api/bookings ────────────────────────────────────────────
    if (method === 'GET' && path === '/api/bookings') {
      if (!isAdmin(request, env)) return err('Unauthorised', 401);
      const index = await kvGet(env, 'bookings-index', []);
      return json(index);
    }

    // ── Admin: GET /api/booking/:id ─────────────────────────────────────────
    const bookingMatch = path.match(/^\/api\/booking\/([^/]+)$/);
    if (method === 'GET' && bookingMatch) {
      if (!isAdmin(request, env)) return err('Unauthorised', 401);
      const booking = await kvGet(env, bookingMatch[1], null);
      if (!booking) return err('Not found', 404);
      return json(booking);
    }

    // ── Admin: PATCH /api/admin/booking/:id/status ──────────────────────────
    const statusMatch = path.match(/^\/api\/admin\/booking\/([^/]+)\/status$/);
    if (method === 'PATCH' && statusMatch) {
      if (!isAdmin(request, env)) return err('Unauthorised', 401);
      let body;
      try { body = await request.json(); } catch { return err('Invalid JSON'); }
      const { status } = body;
      if (!['pending', 'confirmed', 'cancelled'].includes(status)) return err('Invalid status');

      const booking = await kvGet(env, statusMatch[1], null);
      if (!booking) return err('Not found', 404);
      booking.status = status;
      await kvSet(env, statusMatch[1], booking);

      // Update index
      const index = await kvGet(env, 'bookings-index', []);
      const entry = index.find(b => b.id === statusMatch[1]);
      if (entry) { entry.status = status; await kvSet(env, 'bookings-index', index); }

      return json({ success: true });
    }

    // ── Admin: DELETE /api/admin/booking/:id ───────────────────────────────
    const deleteBookingMatch = path.match(/^\/api\/admin\/booking\/([^/]+)$/);
    if (method === 'DELETE' && deleteBookingMatch) {
      if (!isAdmin(request, env)) return err('Unauthorised', 401);
      await env.CONTENT.delete(deleteBookingMatch[1]);
      const index = await kvGet(env, 'bookings-index', []);
      const updated = index.filter(b => b.id !== deleteBookingMatch[1]);
      await kvSet(env, 'bookings-index', updated);
      return json({ success: true });
    }

    // ── Admin: POST /api/admin/content ─────────────────────────────────────
    if (method === 'POST' && path === '/api/admin/content') {
      if (!isAdmin(request, env)) return err('Unauthorised', 401);
      let body;
      try { body = await request.json(); } catch { return err('Invalid JSON'); }
      const { key, value } = body;
      if (!key || value === undefined) return err('Missing key or value');
      if (!Object.keys(DEFAULTS).includes(key)) return err('Unknown content key');
      await kvSet(env, key, value);
      return json({ success: true });
    }

    // ── Admin: POST /api/admin/image ────────────────────────────────────────
    if (method === 'POST' && path === '/api/admin/image') {
      if (!isAdmin(request, env)) return err('Unauthorised', 401);

      // Expect multipart/form-data with fields: file (binary), alt, category, role
      // role: 'hero' | 'gallery' | 'og'
      let formData;
      try { formData = await request.formData(); } catch { return err('Expected multipart/form-data'); }

      const file = formData.get('file');
      const alt = formData.get('alt') || '';
      const category = formData.get('category') || 'general';
      const role = formData.get('role') || 'gallery'; // 'hero' | 'gallery' | 'og'

      if (!file) return err('No file provided');

      const arrayBuffer = await file.arrayBuffer();
      const fileName = file.name || `upload-${Date.now()}.jpg`;

      let ikResult;
      try {
        ikResult = await uploadToImageKit(env, arrayBuffer, fileName, '/perrys');
      } catch (e) {
        return err(`Image upload failed: ${e.message}`, 502);
      }

      const imageUrl = ikResult.url;

      // Store URL in KV under images key
      const images = await kvGet(env, 'images', DEFAULTS.images);

      if (role === 'logo') {
  // Store logo URL in siteIdentity KV key (not in images)
  const siteIdentity = await kvGet(env, 'siteIdentity', DEFAULTS.siteIdentity);
  siteIdentity.logoImage = imageUrl;
  await kvSet(env, 'siteIdentity', siteIdentity);
  return json({ success: true, url: imageUrl, fileId: ikResult.fileId });
} else if (role === 'hero') {
  images.hero = imageUrl;
} else if (role === 'og') {
  images.ogImage = imageUrl;
} else if (role === 'named') {
  const imageKey = formData.get('imageKey');
  if (imageKey && imageKey in images) images[imageKey] = imageUrl;
} else {
  // gallery
  images.gallery.push({
    url: imageUrl,
    fileId: ikResult.fileId,
    alt,
    category,
    uploadedAt: new Date().toISOString(),
  });
}

      await kvSet(env, 'images', images);

      return json({ success: true, url: imageUrl, fileId: ikResult.fileId });
    }

    // ── Admin: DELETE /api/admin/image ──────────────────────────────────────
    if (method === 'DELETE' && path === '/api/admin/image') {
      if (!isAdmin(request, env)) return err('Unauthorised', 401);
      let body;
      try { body = await request.json(); } catch { return err('Invalid JSON'); }
      const { fileId } = body;
      if (!fileId) return err('Missing fileId');

      const images = await kvGet(env, 'images', DEFAULTS.images);
      images.gallery = images.gallery.filter(img => img.fileId !== fileId);
      await kvSet(env, 'images', images);

      // Note: to delete from ImageKit itself you'd call their delete API.
      // Omitted here as it's optional — the URL just stops being served on the site.

      return json({ success: true });
    }

    // ── 404 ─────────────────────────────────────────────────────────────────
    return err('Not found', 404);
  },
};
