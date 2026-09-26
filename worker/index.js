/**
 * MD Works Hospitality Template — Cloudflare Worker
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
    siteName: 'The Ridge House',
    tagline: 'Boutique Forest Retreat',
    location: 'Knysna, Garden Route, South Africa',
    phone: '+27 44 000 0000',
    whatsapp: '27440000000',
    email: 'stay@theridgehouse.co.za',
    instagram: '',
    facebook: '',
    googleMapsEmbed: '',
    address: 'The Ridge House, Knysna Heights, Knysna, 6571',
  },
  specials: {
    active: true,
    title: 'Opening Special — October 2026',
    body: 'Celebrate our opening with 3 nights for the price of 2. Includes breakfast daily and a welcome sundowner.',
    ctaLabel: 'View Rates',
    ctaLink: '/rates/',
  },
  rates: [
    {
      id: 'r1',
      package: 'Bed & Breakfast',
      standard: 1100,
      weekend: 1300,
      peak: 1600,
      unit: 'pp/night',
    },
    {
      id: 'r2',
      package: 'Bed, Breakfast & Dinner',
      standard: 1450,
      weekend: 1650,
      peak: 1950,
      unit: 'pp/night',
    },
    {
      id: 'r3',
      package: 'Full Board (all meals)',
      standard: 1750,
      weekend: 1950,
      peak: 2350,
      unit: 'pp/night',
    },
  ],
  ratesNotes: 'Peak season: December school holidays, Easter, and all South African public holiday long weekends. Single supplement applies.',
  laundry: [
    { id: 'l1', item: 'Small load', price: 150 },
    { id: 'l2', item: 'Medium load', price: 250 },
    { id: 'l3', item: 'Large load', price: 350 },
    { id: 'l4', item: 'Shirts', price: 35 },
    { id: 'l5', item: 'Trousers / Skirts / Dresses', price: 45 },
    { id: 'l6', item: 'Jackets / Jerseys', price: 60 },
  ],
  rooms: [
    { id: 'room-1', name: 'The Canopy Suite', slug: 'canopy-suite', placeholder: false, description: 'Our signature room — a spacious suite with floor-to-ceiling forest views, a private deck and a freestanding bath positioned to catch the morning light through the trees. Pure indulgence.', bedType: 'King', occupancy: '2 adults', amenities: ['En-suite', 'Private deck', 'Freestanding bath', 'Forest views', 'AC', 'Smart TV', 'Coffee station', 'Safe', 'Wi-Fi'], heroImage: '' },
    { id: 'room-2', name: 'The Fern Room', slug: 'fern-room', placeholder: false, description: 'A serene garden-level room with direct access to the indigenous garden. Earthy tones, natural textures and a generous bathroom with a rain shower. Perfect for couples seeking quiet.', bedType: 'Queen', occupancy: '2 adults', amenities: ['En-suite', 'Garden access', 'Rain shower', 'AC', 'Smart TV', 'Coffee station', 'Safe', 'Wi-Fi'], heroImage: '' },
    { id: 'room-3', name: 'The Treetop Room', slug: 'treetop-room', placeholder: false, description: 'Perched on the upper level with a bird\'s-eye view over the Knysna forest canopy. Light-filled, airy and utterly peaceful. Watch the mist roll through the trees from your private balcony.', bedType: 'King', occupancy: '2 adults', amenities: ['En-suite', 'Private balcony', 'Forest canopy views', 'AC', 'Smart TV', 'Coffee station', 'Safe', 'Wi-Fi'], heroImage: '' },
    { id: 'room-4', name: 'The Lagoon Room', slug: 'lagoon-room', placeholder: false, description: 'The only room with a glimpse of the Knysna Lagoon through the trees. Twin beds that can be configured as a king, making it ideal for friends travelling together or couples who prefer extra space.', bedType: 'Twin / King', occupancy: '2 adults', amenities: ['En-suite', 'Lagoon views', 'Configurable beds', 'AC', 'Smart TV', 'Coffee station', 'Safe', 'Wi-Fi'], heroImage: '' },
    { id: 'room-5', name: 'The Garden Cottage', slug: 'garden-cottage', placeholder: false, description: 'A self-contained cottage set apart from the main house — ideal for families or guests who prefer complete privacy. Features a small kitchenette, a private patio and a pull-out sofa for a third guest.', bedType: 'Queen + sofa bed', occupancy: '2 adults + 1 child', amenities: ['En-suite', 'Kitchenette', 'Private patio', 'Sofa bed', 'AC', 'Smart TV', 'Coffee station', 'Safe', 'Wi-Fi'], heroImage: '' },
  ],
  story: {
    headline: 'Born from the Forest',
    body: `The Ridge House began as a family home — built into the hillside above Knysna by the van der Berg family in the early 1980s, when the surrounding indigenous forest was still wild and largely uncharted. For decades it was a private retreat, a place to escape the noise of the world.\n\nIn 2024, after years of careful restoration, The Ridge House opened its doors as a boutique guesthouse — honouring the original spirit of the property while creating something new. The bones of the building remain: the stone walls, the wide stoep, the enormous windows that frame the forest like living paintings.\n\nThe kitchen has always been at the heart of the Ridge House. Chef Thembi, who grew up in Knysna and trained in Cape Town, brings a distinctly Garden Route sensibility to the table — seasonal, unfussy, deeply flavourful. Her breakfasts alone are worth the stay.\n\nThis is not a hotel. It is a home that happens to have five beautiful rooms — and guests who leave always say they felt the difference.`,
  },
  facilities: {
    sport: ['Heated infinity pool with forest views', 'Mountain bikes available', 'Forest hiking trails from the property'],
    wellness: ['In-room massage by arrangement', 'Yoga deck overlooking the canopy'],
    dining: ['Chef Thembi\'s breakfast daily', 'Two-course set dinner (bookable)', 'Sundowner drinks on the main stoep'],
    notes: 'All facilities are exclusive to Ridge House guests.',
  },
  thingsToDo: [
    { id: 'td1', title: 'Knysna Lagoon', description: 'One of South Africa\'s most beautiful estuaries — kayak, boat cruise, or simply watch the light change over the water from the famous Heads.' },
    { id: 'td2', title: 'The Knysna Heads', description: 'The dramatic sandstone cliffs at the mouth of the lagoon are iconic Garden Route. Walk the clifftop path for sweeping views of the Indian Ocean.' },
    { id: 'td3', title: 'Tsitsikamma Forest', description: 'Ancient yellowwood trees, the Storms River Gorge, and the famous suspension bridge. One of South Africa\'s most spectacular national parks, an hour from Knysna.' },
    { id: 'td4', title: 'Elephant Encounters', description: 'The Knysna Elephant Park offers intimate walking encounters with the last free-roaming elephants of the Knysna forest — a rare and remarkable experience.' },
    { id: 'td5', title: 'Garden Route Wines', description: 'The Outeniqua and Langkloof valleys produce exceptional cool-climate wines. Several estates offer tastings and cellar tours within easy driving distance.' },
    { id: 'td6', title: 'Knysna Oysters & Food', description: 'Knysna is famous for its oysters — enjoy them fresh at the waterfront, or explore the town\'s growing food scene of local restaurants and the Saturday market.' },
  ],
  policies: {
    checkIn: '14:00',
    checkOut: '10:30',
    cancellation: 'Free cancellation up to 7 days before arrival. Within 7 days, one night\'s accommodation is charged. No-shows are charged in full.',
    payment: '50% deposit required to confirm booking. Balance due on arrival. EFT and card accepted.',
    smoking: 'Non-smoking property. Smoking permitted on the lower terrace only.',
    quietHours: '22:00 – 07:00',
    children: 'Children 12 and older are welcome. The Garden Cottage is ideal for families.',
    pets: 'Well-behaved dogs are welcome in the Garden Cottage by prior arrangement. Please advise when booking.',
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
      heading: 'The Ridge House',
      subtext: 'A forest retreat above Knysna — five rooms, one chef, and a view that stops you in your tracks.',
    },
    intro: {
      label: 'Welcome',
      heading: 'Where the forest begins',
      body1: 'The Ridge House is a boutique guesthouse perched above the Knysna forest on the Garden Route — five individually designed rooms set in a lovingly restored stone house with views over the indigenous canopy and, on clear days, a glimpse of the lagoon below.',
      body2: 'This is a place for people who want to slow down. Who want to wake up to birdsong, eat well, explore one of South Africa\'s most beautiful corners, and come back to something that feels like home. We\'re not a hotel — and that\'s exactly the point.',
    },
    whyRidgeHouse: {
      label: 'Why The Ridge House',
      heading: 'Six reasons guests come back',
      subtext: 'Small by design. Personal by nature.',
      items: [
        'Five individually designed rooms — each one different, each one considered',
        'Set in a restored stone house with 40 years of Knysna history',
        'Chef Thembi\'s breakfasts and set dinners, made from local produce',
        'Heated infinity pool with an uninterrupted view over the forest canopy',
        'Hiking trails, mountain bikes and the Knysna Lagoon on your doorstep',
        'Genuine, unhurried hospitality — we know your name before you arrive',
      ],
    },
    experienceTeaser: {
      label: 'The Experience',
      heading: 'Forest, food and complete quiet',
      body: 'The Ridge House has everything you need and nothing you don\'t. An infinity pool that seems to float above the canopy. A kitchen that produces the kind of food you talk about on the drive home. Bikes and trails for the explorers, hammocks and novels for everyone else.',
    },
    cta: {
      label: 'Ready to book?',
      heading: 'Come and find your quiet',
      body: 'Message us directly on WhatsApp or fill in the booking form — we\'ll confirm personally and make sure everything is ready for you.',
    },
  },
  aboutSections: {
    kaylaAnn: {
      label: 'The Chef',
      heading: "Thembi's Kitchen",
      body1: 'Chef Thembi grew up in Knysna and trained at a Cape Town culinary school before returning to the Garden Route to cook the food she knows best — fresh, seasonal, and deeply rooted in this landscape.',
      body2: 'Every morning she prepares a full breakfast from scratch. On evenings when guests book the dinner package, she puts together a two-course set menu that changes with the season and whatever looks best at the Knysna Saturday market.',
      note: 'Dinner is bookable as part of our Bed, Breakfast & Dinner package or as an add-on. Please let us know at least 24 hours in advance.',
    },
    ridgeHouseWay: {
      label: 'What we stand for',
      heading: 'The Ridge House Way',
      pillars: [
        { emoji: '🌿', heading: 'Forest first', body: 'The indigenous forest is not a backdrop — it is the reason this place exists. We protect it, we walk in it, and we never take it for granted.' },
        { emoji: '🤝', heading: 'Genuine welcome', body: 'We know your name before you arrive and remember your coffee order by morning two. This is what small looks like done well.' },
        { emoji: '🍳', heading: 'Real food', body: "Thembi doesn't do menus printed in six fonts. She cooks what's in season, what's local, and what she'd want to eat herself." },
      ],
    },
    cta: {
      heading: 'Come and stay in the forest',
      body: 'The Ridge House has five rooms, one kitchen and a forest that has been here far longer than any of us. We think that\'s worth experiencing.',
    },
  },
  experienceSections: {
    dining: {
      label: 'Dining',
      heading: "Thembi's Kitchen",
      body1: 'Breakfast at The Ridge House is the meal guests mention first when they leave a review. Thembi starts early — eggs from the farm down the road, fruit from the Saturday market, bread baked that morning. It\'s the kind of breakfast that makes you cancel your plans for the morning.',
      body2: 'Dinner is a two-course set menu, available when booked in advance as part of a package or as an add-on. The menu changes with the season and the market. Guests eat together at the long table on the stoep when the weather allows — strangers who leave as friends.',
      note: 'Dietary requirements are always accommodated — just let us know when you book.',
    },
    facilities: {
      label: 'At The Ridge House',
      heading: 'Everything you need',
      intro: 'The Ridge House is a private property — all facilities are exclusive to guests staying with us. No day visitors, no conference groups. Just the people staying here, the forest, and complete quiet.',
      note: 'Mountain bikes and hiking maps available at the house. In-room massage bookable through us with 24 hours\' notice.',
    },
    cta: {
      heading: 'Ready to experience the Ridge?',
      body: 'Book direct for the best rate — or WhatsApp us to plan your stay around what you want to do.',
    },
  },
  roomsSections: {
    intro: {
      body: 'Five rooms, each one different. We designed them to feel like distinct spaces rather than variations on a theme — different views, different moods, different reasons to choose one over another. All of them have the same things in common: good beds, proper bathrooms, and a forest outside the window.',
    },
    inclusions: {
      label: 'Every Room Includes',
      heading: 'Standard in Every Room',
      items: [
        'En-suite bathroom',
        'Premium linen and towels',
        'Air conditioning',
        'Tea, coffee & filtered water',
        'Hair dryer',
        'Smart TV',
        'Free high-speed Wi-Fi',
        'In-room safe',
        'Daily housekeeping',
      ],
      note: 'Additional amenities vary by room. See individual room descriptions for details.',
    },
    ratesTeaser: {
      label: 'Rates',
      heading: 'From R1,100 per person per night',
      body: 'All packages include Thembi\'s full breakfast. Dinner packages are available. Book direct for the best rate — we never charge booking platform fees.',
    },
    livingDining: {
      enabled: true,
      heading: 'The Main Stoep & Living Room',
      body: 'The heart of The Ridge House is the main stoep — a wide, covered terrace overlooking the forest canopy where guests gather for sundowners, breakfast on clear mornings, and dinner under the stars. Inside, the living room has deep sofas, a wood-burning fireplace for winter evenings, and a library of books about the Garden Route and its history.',
      image: '',
    },
  },
  siteIdentity: {
    logoImage: '',
    siteName: 'The Ridge House',
    tagline: 'Boutique Forest Retreat',
    footerTagline: 'A boutique forest retreat above Knysna on the Garden Route, Western Cape.',
    propertyType: 'Lodge',
  },
  pending: {
    items: [
      { id: 'p1', label: 'Final website domain', done: false },
      { id: 'p2', label: 'Final email address', done: false },
      { id: 'p3', label: 'WhatsApp booking number', done: false },
      { id: 'p4', label: 'Physical address and Google Maps pin', done: false },
      { id: 'p5', label: 'Photography — property exterior and surroundings', done: false },
      { id: 'p6', label: 'Photography — all 5 rooms', done: false },
      { id: 'p7', label: 'Photography — kitchen and dining', done: false },
      { id: 'p8', label: 'Photography — pool and stoep', done: false },
      { id: 'p9', label: 'Instagram and Facebook handles', done: false },
      { id: 'p10', label: 'Confirm deposit and payment terms', done: false },
      { id: 'p11', label: 'Logo file from designer', done: false },
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
    `*New Booking Request — The Ridge House*`,
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
  const title = encodeURIComponent(`${booking.name} — The Ridge House`);
  const details = encodeURIComponent(
    `Guest: ${booking.name}\nPhone: ${booking.phone}\nEmail: ${booking.email}\nGuests: ${booking.guests}\nRef: ${booking.id}`
  );
  const location = encodeURIComponent("The Ridge House, Pennington, KZN South Coast");
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
