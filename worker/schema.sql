-- MD Works Hospitality Platform — D1 guest database schema (one database per client)
-- Run from the repo root: npx wrangler d1 execute mdworks-hospitality-guests --remote --file=worker/schema.sql
-- Safe to re-run: every statement is IF NOT EXISTS.

-- ── Guests ────────────────────────────────────────────────────────────────────
-- One row per unique guest (matched by email or normalised phone)
CREATE TABLE IF NOT EXISTS guests (
  id          TEXT PRIMARY KEY,          -- g-{timestamp}-{random}
  name        TEXT NOT NULL DEFAULT '',
  email       TEXT NOT NULL DEFAULT '',
  phone       TEXT NOT NULL DEFAULT '',  -- as entered by guest
  phone_norm  TEXT NOT NULL DEFAULT '',  -- digits only, 27XX format
  visit_count INTEGER NOT NULL DEFAULT 1,
  notes       TEXT NOT NULL DEFAULT '',  -- owner's notes: dietary, preferences, occasions
  created_at  TEXT NOT NULL,             -- ISO 8601
  last_seen   TEXT NOT NULL              -- ISO 8601 — updated on each new booking
);

-- Index for fast lookup by email and normalised phone
CREATE INDEX IF NOT EXISTS idx_guests_email      ON guests (email);
CREATE INDEX IF NOT EXISTS idx_guests_phone_norm ON guests (phone_norm);

-- ── Bookings ──────────────────────────────────────────────────────────────────
-- One row per booking, linked to a guest
-- kv_id mirrors the KV key so existing records stay accessible
CREATE TABLE IF NOT EXISTS bookings (
  id         TEXT PRIMARY KEY,           -- same as KV key: booking-{timestamp}-{random}
  guest_id   TEXT NOT NULL DEFAULT '',   -- FK → guests.id (empty for pre-D1 bookings)
  kv_id      TEXT NOT NULL DEFAULT '',   -- KV key for full booking detail fallback
  name       TEXT NOT NULL DEFAULT '',
  email      TEXT NOT NULL DEFAULT '',
  phone      TEXT NOT NULL DEFAULT '',
  room       TEXT NOT NULL DEFAULT '',
  check_in   TEXT NOT NULL DEFAULT '',   -- YYYY-MM-DD
  check_out  TEXT NOT NULL DEFAULT '',   -- YYYY-MM-DD
  guests     TEXT NOT NULL DEFAULT '',   -- number of guests (stored as text)
  package    TEXT NOT NULL DEFAULT '',
  special    TEXT NOT NULL DEFAULT '',
  status     TEXT NOT NULL DEFAULT 'pending', -- pending | confirmed | cancelled
  created_at TEXT NOT NULL
);

-- Index for guest history lookups
CREATE INDEX IF NOT EXISTS idx_bookings_guest_id  ON bookings (guest_id);
CREATE INDEX IF NOT EXISTS idx_bookings_check_in  ON bookings (check_in);
CREATE INDEX IF NOT EXISTS idx_bookings_status    ON bookings (status);

-- ── Invoices ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id                TEXT PRIMARY KEY,
  booking_id        TEXT NOT NULL DEFAULT '',
  invoice_number    TEXT NOT NULL,            -- INV-YYYYMM-NNN
  guest_name        TEXT NOT NULL DEFAULT '',
  guest_email       TEXT NOT NULL DEFAULT '',
  check_in          TEXT NOT NULL DEFAULT '',
  check_out         TEXT NOT NULL DEFAULT '',
  room              TEXT NOT NULL DEFAULT '',
  total_inc_vat     REAL NOT NULL DEFAULT 0,
  total_due         REAL NOT NULL DEFAULT 0,
  deposit_due       REAL NOT NULL DEFAULT 0,
  balance_due       REAL NOT NULL DEFAULT 0,
  vat_rate          REAL NOT NULL DEFAULT 15,  -- per client (SA VAT is 15%)
  vat_amount        REAL NOT NULL DEFAULT 0,
  security_deposit  REAL NOT NULL DEFAULT 0,
  data_json         TEXT NOT NULL DEFAULT '{}', -- full invoice object for rendering
  issued_at         TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'issued' -- issued | paid | cancelled
);

CREATE INDEX IF NOT EXISTS idx_invoices_booking_id    ON invoices (booking_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices (invoice_number);

-- ── Payments ──────────────────────────────────────────────────────────────────
-- Reserved: the worker does not write to this table yet (payment status lives in the
-- booking record in KV). Created now so the schema matches the platform's design.
CREATE TABLE IF NOT EXISTS payments (
  id          TEXT PRIMARY KEY,
  booking_id  TEXT NOT NULL DEFAULT '',
  invoice_id  TEXT NOT NULL DEFAULT '',
  amount      REAL NOT NULL DEFAULT 0,
  method      TEXT NOT NULL DEFAULT '',  -- payment method, e.g. card | eft | cash (per client)
  reference   TEXT NOT NULL DEFAULT '',  -- card or EFT reference, etc.
  type        TEXT NOT NULL DEFAULT '',  -- deposit | balance | security | extra
  notes       TEXT NOT NULL DEFAULT '',
  paid_at     TEXT NOT NULL,
  created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments (booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments (invoice_id);
