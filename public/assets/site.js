/**
 * Perry's @ Umdoni Point — shared site JS
 * Handles: API fetch, nav highlight, specials banner, booking form, image injection
 */

const API = 'https://perrys-umdonipoint-worker.morneydeetlefs.workers.dev';

// ─── Content loader ────────────────────────────────────────────────────────────

let _content = null;

async function getContent() {
  if (_content) return _content;
  try {
    const r = await fetch(`${API}/api/content`);
    _content = await r.json();
  } catch {
    _content = {};
  }
  return _content;
}

// ─── Specials banner ───────────────────────────────────────────────────────────

async function initSpecialsBanner() {
  const el = document.getElementById('specials-banner');
  if (!el) return;
  const c = await getContent();
  const s = c.specials;
  if (!s || !s.active) { el.style.display = 'none'; return; }
  el.innerHTML = `
    <div class="banner-inner">
      <strong>${s.title}</strong> — ${s.body}
      <a href="${s.ctaLink}" class="banner-cta">${s.ctaLabel}</a>
    </div>
  `;
  el.style.display = 'block';
}

// ─── Rates table ───────────────────────────────────────────────────────────────

async function initRatesTable() {
  const el = document.getElementById('rates-table-body');
  const notesEl = document.getElementById('rates-notes');
  if (!el) return;
  const c = await getContent();
  const rates = c.rates || [];
  el.innerHTML = rates.map(r => `
    <tr>
      <td>${r.package}</td>
      <td>R${r.standard}</td>
      <td>R${r.weekend}</td>
      <td>R${r.peak}</td>
    </tr>
  `).join('');
  if (notesEl && c.ratesNotes) notesEl.textContent = c.ratesNotes;
}

// ─── Laundry table ─────────────────────────────────────────────────────────────

async function initLaundryTable() {
  const el = document.getElementById('laundry-table-body');
  if (!el) return;
  const c = await getContent();
  const items = c.laundry || [];
  el.innerHTML = items.map(i => `<tr><td>${i.item}</td><td>R${i.price}</td></tr>`).join('');
}

// ─── Rooms ─────────────────────────────────────────────────────────────────────

async function initRooms() {
  const el = document.getElementById('rooms-grid');
  if (!el) return;
  const c = await getContent();
  const rooms = c.rooms || [];
  el.innerHTML = rooms.map(r => `
    <div class="room-card ${r.placeholder ? 'placeholder' : ''}">
      <div class="room-img-wrap">
        ${r.heroImage
          ? `<img src="${r.heroImage}" alt="${r.name}" loading="lazy">`
          : `<div class="room-img-placeholder"><span>Photo coming soon</span></div>`}
      </div>
      <div class="room-card-body">
        <h3>${r.name}</h3>
        <p>${r.description}</p>
        ${r.bedType ? `<p class="room-detail"><strong>Bed:</strong> ${r.bedType}</p>` : ''}
        ${r.occupancy ? `<p class="room-detail"><strong>Sleeps:</strong> ${r.occupancy}</p>` : ''}
        ${r.placeholder
          ? `<a href="/contact/" class="btn btn-outline">Enquire</a>`
          : `<a href="/rates/" class="btn btn-primary">Book this room</a>`}
      </div>
    </div>
  `).join('');
}

// ─── Gallery ───────────────────────────────────────────────────────────────────

async function initGallery() {
  const el = document.getElementById('gallery-grid');
  if (!el) return;
  const c = await getContent();
  const images = (c.images && c.images.gallery) || [];
  if (images.length === 0) {
    el.innerHTML = '<p class="gallery-empty">Photography coming soon — follow us on Instagram for sneak peeks.</p>';
    return;
  }
  el.innerHTML = images.map(img => `
    <figure class="gallery-item" data-category="${img.category || 'general'}">
      <img src="${img.url}" alt="${img.alt || ''}" loading="lazy">
    </figure>
  `).join('');
}

// ─── Named image injection ─────────────────────────────────────────────────────
//
// HTML elements opt in with:
//   data-img-key="keyName"          → sets src (for <img> tags)
//   data-bg-key="keyName"           → sets background-image (for hero divs)
//   data-og-key="true"              → sets the og:image meta content
//
// Keys match images object in KV:
//   hero, ogImage, farmhouse, farmhouseExterior, kaylaAnn, dining, golf, whales
//
// Falls back gracefully: if KV has no value the element keeps its existing src/style.

async function initImages() {
  const c = await getContent();
  const imgs = (c.images) || {};

  // <img data-img-key="farmhouse"> → set src from KV
  document.querySelectorAll('[data-img-key]').forEach(el => {
    const key = el.dataset.imgKey;
    const url = imgs[key];
    if (url) el.src = url;
  });

  // <div data-bg-key="hero"> → set background-image from KV
  document.querySelectorAll('[data-bg-key]').forEach(el => {
    const key = el.dataset.bgKey;
    const url = imgs[key];
    if (url) el.style.backgroundImage = `url('${url}')`;
  });

  // <meta property="og:image" data-og-key="true"> → set content from KV
  const ogMeta = document.querySelector('meta[property="og:image"][data-og-key]');
  if (ogMeta && imgs.ogImage) ogMeta.setAttribute('content', imgs.ogImage);
}

// ─── Booking form ──────────────────────────────────────────────────────────────

function initBookingForm() {
  const form = document.getElementById('booking-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const msgEl = document.getElementById('booking-msg');
    btn.disabled = true;
    btn.textContent = 'Sending…';

    const data = Object.fromEntries(new FormData(form));
    try {
      const r = await fetch(`${API}/api/booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await r.json();
      if (result.success) {
        msgEl.className = 'booking-msg success';
        msgEl.textContent = 'Your enquiry has been received! Opening WhatsApp to confirm with Debbi…';
        if (result.whatsappUrl) setTimeout(() => window.open(result.whatsappUrl, '_blank'), 1200);
        form.reset();
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (err) {
      msgEl.className = 'booking-msg error';
      msgEl.textContent = `Something went wrong: ${err.message}. Please WhatsApp us directly.`;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Send Enquiry';
    }
  });
}

// ─── Site identity (logo) ─────────────────────────────────────────────────────
//
// If siteIdentity.logoImage is set in KV, replace the text "Perry's" in every
// .nav-logo anchor with an <img> tag. Falls back to the existing text if empty.

async function initSiteIdentity() {
  const c = await getContent();
  const identity = c.siteIdentity || {};
  if (!identity.logoImage) return;

  document.querySelectorAll('.nav-logo').forEach(el => {
    // Preserve the href and aria-label; replace inner content with img
    el.innerHTML = `<img src="${identity.logoImage}" alt="${identity.siteName || "Perry's @ Umdoni Point"}" class="nav-logo-img">`;
  });
}

// ─── Nav active state ──────────────────────────────────────────────────────────

function initNav() {
  const path = window.location.pathname;
  document.querySelectorAll('.nav-link').forEach(a => {
    if (a.getAttribute('href') === path || (path !== '/' && a.getAttribute('href') !== '/' && path.startsWith(a.getAttribute('href')))) {
      a.classList.add('active');
    }
  });

  const burger = document.getElementById('nav-burger');
  const navMenu = document.getElementById('nav-menu');
  if (burger && navMenu) {
    burger.addEventListener('click', () => {
      navMenu.classList.toggle('open');
      burger.setAttribute('aria-expanded', navMenu.classList.contains('open'));
    });
  }
}

// ─── Contact info injection ────────────────────────────────────────────────────

async function initContactInfo() {
  const c = await getContent();
  const meta = c.meta || {};
  document.querySelectorAll('[data-phone]').forEach(el => { el.textContent = meta.phone || 'TBC'; });
  document.querySelectorAll('[data-whatsapp-link]').forEach(el => {
  const raw = (meta.whatsapp || '').replace(/\D/g, '');
  const num = raw.startsWith('0') ? '27' + raw.slice(1) : raw;
  if (num) el.href = `https://wa.me/${num}`;
});
  document.querySelectorAll('[data-email]').forEach(el => { el.textContent = meta.email || 'TBC'; });
  document.querySelectorAll('[data-instagram]').forEach(el => {
    if (meta.instagram) { el.href = meta.instagram; el.style.display = ''; }
    else el.style.display = 'none';
  });
  document.querySelectorAll('[data-facebook]').forEach(el => {
    if (meta.facebook) { el.href = meta.facebook; el.style.display = ''; }
    else el.style.display = 'none';
  });
  const mapEl = document.getElementById('google-map');
  if (mapEl && meta.googleMapsEmbed) mapEl.innerHTML = meta.googleMapsEmbed;
}

// ─── Things to do ─────────────────────────────────────────────────────────────

async function initThingsToDo() {
  const el = document.getElementById('things-grid');
  if (!el) return;
  const c = await getContent();
  const items = c.thingsToDo || [];
  el.innerHTML = items.map(t => `
    <div class="thing-card">
      <h3>${t.title}</h3>
      <p>${t.description}</p>
    </div>
  `).join('');
}

// ─── Story text ────────────────────────────────────────────────────────────────

async function initStory() {
  const el = document.getElementById('story-body');
  if (!el) return;
  const c = await getContent();
  const story = c.story || {};
  if (story.headline) {
    const h = document.getElementById('story-headline');
    if (h) h.textContent = story.headline;
  }
  if (story.body) {
    el.innerHTML = story.body.split('\n\n').map(p => `<p>${p}</p>`).join('');
  }
}

// ─── Init all ─────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initSiteIdentity();
  initImages();
  initSpecialsBanner();
  initRatesTable();
  initLaundryTable();
  initRooms();
  initGallery();
  initBookingForm();
  initContactInfo();
  initThingsToDo();
  initStory();
});
