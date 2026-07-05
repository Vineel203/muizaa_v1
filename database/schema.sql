-- Muizaa Logistics - PostgreSQL Schema
-- Run via: npm run migrate  (or npm run db:fresh for clean reset)

CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- USERS & SESSIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'ADMIN',
  full_name VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

CREATE TABLE IF NOT EXISTS session (
  sid VARCHAR NOT NULL COLLATE "default",
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL,
  PRIMARY KEY (sid)
);

CREATE INDEX IF NOT EXISTS idx_session_expire ON session (expire);

-- ============================================================
-- MASTER DATA
-- ============================================================

CREATE TABLE IF NOT EXISTS locations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_locations_name_trgm ON locations USING gin (name gin_trgm_ops);

CREATE TABLE IF NOT EXISTS consignors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consignors_name_trgm ON consignors USING gin (name gin_trgm_ops);

CREATE TABLE IF NOT EXISTS consignees (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consignees_name_trgm ON consignees USING gin (name gin_trgm_ops);

CREATE TABLE IF NOT EXISTS banking_details (
  id SERIAL PRIMARY KEY,
  bank_name VARCHAR(255) NOT NULL,
  account_number VARCHAR(100),
  ifsc VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (bank_name, account_number, ifsc)
);

CREATE INDEX IF NOT EXISTS idx_banking_details_bank_trgm ON banking_details USING gin (bank_name gin_trgm_ops);

CREATE TABLE IF NOT EXISTS transporters (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  phone_number VARCHAR(50),
  address TEXT,
  operating_routes TEXT,
  banking_detail_id INTEGER REFERENCES banking_details(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transporters_name_trgm ON transporters USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_transporters_phone ON transporters (phone_number);

CREATE TABLE IF NOT EXISTS drivers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  number VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (name, number)
);

CREATE INDEX IF NOT EXISTS idx_drivers_name_trgm ON drivers USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_drivers_number ON drivers (number);

CREATE TABLE IF NOT EXISTS truck_owners (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  number VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (name, number)
);

CREATE INDEX IF NOT EXISTS idx_truck_owners_name_trgm ON truck_owners USING gin (name gin_trgm_ops);

CREATE TABLE IF NOT EXISTS trucks (
  id SERIAL PRIMARY KEY,
  number VARCHAR(50) NOT NULL UNIQUE,
  capacity DOUBLE PRECISION,
  default_driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
  default_owner_id INTEGER REFERENCES truck_owners(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE trucks ADD COLUMN IF NOT EXISTS default_driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS default_owner_id INTEGER REFERENCES truck_owners(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_trucks_number_trgm ON trucks USING gin (number gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_trucks_default_driver_id ON trucks (default_driver_id);
CREATE INDEX IF NOT EXISTS idx_trucks_default_owner_id ON trucks (default_owner_id);

-- ============================================================
-- DOCUMENT SEQUENCES (Booking, GDM, Invoice)
-- ============================================================

CREATE TABLE IF NOT EXISTS document_sequences (
  document_type VARCHAR(20) NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  last_serial INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (document_type, year, month)
);

-- ============================================================
-- INVOICES
-- ============================================================

CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  invoice_number VARCHAR(20) NOT NULL UNIQUE,
  recipient_details TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by VARCHAR(255),
  updated_by VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices (invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices (created_at DESC);

-- ============================================================
-- BOOKINGS
-- ============================================================

CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  booking_id VARCHAR(20) UNIQUE,
  gdm_number VARCHAR(20) UNIQUE,
  stage VARCHAR(50) NOT NULL DEFAULT 'PARKING_LOT',

  invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
  transporter_id INTEGER REFERENCES transporters(id) ON DELETE SET NULL,
  driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
  truck_id INTEGER REFERENCES trucks(id) ON DELETE SET NULL,
  truck_owner_id INTEGER REFERENCES truck_owners(id) ON DELETE SET NULL,
  banking_detail_id INTEGER REFERENCES banking_details(id) ON DELETE SET NULL,

  goods_remark TEXT,
  unload_quantity DOUBLE PRECISION,
  unloaded_weight_kgs DOUBLE PRECISION,

  on_road_time TIMESTAMPTZ,
  unload_time TIMESTAMPTZ,

  management_remark TEXT,
  serial_number VARCHAR(100),
  company_unload VARCHAR(255),
  commission DOUBLE PRECISION,
  local_driver_charges DOUBLE PRECISION,
  rough_balance DOUBLE PRECISION,
  gumasta_charges DOUBLE PRECISION,
  weight_katta_charges DOUBLE PRECISION,
  lorry_freight_paid DOUBLE PRECISION,
  finance_remark TEXT,
  finance_edited_flag BOOLEAN NOT NULL DEFAULT false,
  is_finance_complete BOOLEAN NOT NULL DEFAULT false,
  is_unload_complete BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by VARCHAR(255),
  updated_by VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_bookings_stage ON bookings (stage);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_id ON bookings (booking_id);
CREATE INDEX IF NOT EXISTS idx_bookings_gdm_number ON bookings (gdm_number);
CREATE INDEX IF NOT EXISTS idx_bookings_invoice_id ON bookings (invoice_id);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_on_road_time ON bookings (on_road_time);
CREATE INDEX IF NOT EXISTS idx_bookings_driver_id ON bookings (driver_id);
CREATE INDEX IF NOT EXISTS idx_bookings_truck_id ON bookings (truck_id);
CREATE INDEX IF NOT EXISTS idx_bookings_transporter_id ON bookings (transporter_id);
CREATE INDEX IF NOT EXISTS idx_bookings_truck_owner_id ON bookings (truck_owner_id);
CREATE INDEX IF NOT EXISTS idx_bookings_is_finance_complete ON bookings (is_finance_complete);
CREATE INDEX IF NOT EXISTS idx_bookings_is_unload_complete ON bookings (is_unload_complete);

-- ============================================================
-- BOOKING CHILD RECORDS
-- ============================================================

CREATE TABLE IF NOT EXISTS booking_pickups (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
  consignor_id INTEGER REFERENCES consignors(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_booking_pickups_booking_id ON booking_pickups (booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_pickups_location_id ON booking_pickups (location_id);
CREATE INDEX IF NOT EXISTS idx_booking_pickups_consignor_id ON booking_pickups (consignor_id);

CREATE TABLE IF NOT EXISTS booking_deliveries (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
  consignee_id INTEGER REFERENCES consignees(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_booking_deliveries_booking_id ON booking_deliveries (booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_deliveries_location_id ON booking_deliveries (location_id);
CREATE INDEX IF NOT EXISTS idx_booking_deliveries_consignee_id ON booking_deliveries (consignee_id);

CREATE TABLE IF NOT EXISTS booking_goods_items (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  packages INTEGER,
  package_name VARCHAR(50),
  weight_kgs DOUBLE PRECISION,
  unload_packages INTEGER,
  unload_weight_kgs DOUBLE PRECISION,
  company_freight DOUBLE PRECISION,
  advance DOUBLE PRECISION,
  loading_hamali DOUBLE PRECISION,
  unloading_hamali DOUBLE PRECISION,
  balance DOUBLE PRECISION
);

ALTER TABLE booking_goods_items ADD COLUMN IF NOT EXISTS package_name VARCHAR(50);
ALTER TABLE booking_goods_items ADD COLUMN IF NOT EXISTS company_freight DOUBLE PRECISION;
ALTER TABLE booking_goods_items ADD COLUMN IF NOT EXISTS advance DOUBLE PRECISION;
ALTER TABLE booking_goods_items ADD COLUMN IF NOT EXISTS loading_hamali DOUBLE PRECISION;
ALTER TABLE booking_goods_items ADD COLUMN IF NOT EXISTS unloading_hamali DOUBLE PRECISION;
ALTER TABLE booking_goods_items ADD COLUMN IF NOT EXISTS balance DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS idx_booking_goods_items_booking_id ON booking_goods_items (booking_id);

-- ============================================================
-- GDM DOCUMENTS (generated PDF metadata)
-- ============================================================

CREATE TABLE IF NOT EXISTS gdm_documents (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  gdm_number VARCHAR(20) NOT NULL,
  invoice_number VARCHAR(100),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  generated_by VARCHAR(255) NOT NULL,
  drive_file_id VARCHAR(255),
  drive_url TEXT,
  drive_file_name VARCHAR(255) NOT NULL,
  local_file_path TEXT,
  document_data JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_gdm_documents_booking_id ON gdm_documents (booking_id);
CREATE INDEX IF NOT EXISTS idx_gdm_documents_generated_at ON gdm_documents (generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_gdm_documents_gdm_number ON gdm_documents (gdm_number);

-- ============================================================
-- BOOKING HISTORY
-- ============================================================

CREATE TABLE IF NOT EXISTS booking_history (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  changed_by VARCHAR(255) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  action_description TEXT NOT NULL,
  field_name VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  stage_from VARCHAR(50),
  stage_to VARCHAR(50),
  remark TEXT
);

CREATE INDEX IF NOT EXISTS idx_booking_history_booking_id ON booking_history (booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_history_timestamp ON booking_history (timestamp DESC);

-- ============================================================
-- APPLICATION SETTINGS
-- ============================================================

CREATE TABLE IF NOT EXISTS application_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO application_settings (key, value)
VALUES ('schema_version', '6')
ON CONFLICT (key) DO NOTHING;
