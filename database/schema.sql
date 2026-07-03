-- Muizaa Logistics - PostgreSQL Schema
-- Run via: npm run migrate

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

CREATE TABLE IF NOT EXISTS transporters (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transporters_name_trgm ON transporters USING gin (name gin_trgm_ops);

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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trucks_number_trgm ON trucks USING gin (number gin_trgm_ops);

CREATE TABLE IF NOT EXISTS banking_details (
  id SERIAL PRIMARY KEY,
  bank_name VARCHAR(255) NOT NULL,
  account_number VARCHAR(100),
  ifsc VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (bank_name, account_number, ifsc)
);

CREATE INDEX IF NOT EXISTS idx_banking_details_bank_trgm ON banking_details USING gin (bank_name gin_trgm_ops);

CREATE TABLE IF NOT EXISTS goods (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goods_name_trgm ON goods USING gin (name gin_trgm_ops);

-- ============================================================
-- BOOKING SEQUENCE (MYYYYMMSSS)
-- ============================================================

CREATE TABLE IF NOT EXISTS booking_sequences (
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  last_serial INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (year, month)
);

-- ============================================================
-- BOOKINGS
-- ============================================================

CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  booking_id VARCHAR(20) UNIQUE,
  stage VARCHAR(50) NOT NULL DEFAULT 'PARKING_LOT',

  from_location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
  to_location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
  consignor_id INTEGER REFERENCES consignors(id) ON DELETE SET NULL,
  consignee_id INTEGER REFERENCES consignees(id) ON DELETE SET NULL,
  transporter_id INTEGER REFERENCES transporters(id) ON DELETE SET NULL,
  driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
  truck_id INTEGER REFERENCES trucks(id) ON DELETE SET NULL,
  truck_owner_id INTEGER REFERENCES truck_owners(id) ON DELETE SET NULL,
  banking_detail_id INTEGER REFERENCES banking_details(id) ON DELETE SET NULL,
  good_id INTEGER REFERENCES goods(id) ON DELETE SET NULL,

  description_of_goods TEXT,
  quantity DOUBLE PRECISION,
  unload_quantity DOUBLE PRECISION,
  weight_kgs DOUBLE PRECISION,
  unloaded_weight_kgs DOUBLE PRECISION,

  on_road_time TIMESTAMPTZ,
  unload_time TIMESTAMPTZ,

  management_remark TEXT,
  courier VARCHAR(255),
  serial_number VARCHAR(100),
  invoice_number VARCHAR(100),
  rate DOUBLE PRECISION,
  capacity DOUBLE PRECISION,
  company_unload VARCHAR(255),
  advance DOUBLE PRECISION,
  loading_hamali DOUBLE PRECISION,
  unloading_hamali DOUBLE PRECISION,
  balance_courier DOUBLE PRECISION,
  commission DOUBLE PRECISION,
  local_driver_charges DOUBLE PRECISION,
  rough_balance DOUBLE PRECISION,
  gumasta_charges DOUBLE PRECISION,
  weight_katta_charges DOUBLE PRECISION,
  balance DOUBLE PRECISION,
  courier_charges DOUBLE PRECISION,
  lorry_freight_paid DOUBLE PRECISION,
  company_rate DOUBLE PRECISION,
  company_freight DOUBLE PRECISION,
  finance_remark TEXT,
  finance_edited_flag BOOLEAN NOT NULL DEFAULT false,
  recipient_details TEXT,
  is_finance_complete BOOLEAN NOT NULL DEFAULT false,
  is_unload_complete BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by VARCHAR(255),
  updated_by VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_bookings_stage ON bookings (stage);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_id ON bookings (booking_id);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_on_road_time ON bookings (on_road_time);
CREATE INDEX IF NOT EXISTS idx_bookings_driver_id ON bookings (driver_id);
CREATE INDEX IF NOT EXISTS idx_bookings_truck_id ON bookings (truck_id);
CREATE INDEX IF NOT EXISTS idx_bookings_transporter_id ON bookings (transporter_id);
CREATE INDEX IF NOT EXISTS idx_bookings_from_location_id ON bookings (from_location_id);
CREATE INDEX IF NOT EXISTS idx_bookings_to_location_id ON bookings (to_location_id);
CREATE INDEX IF NOT EXISTS idx_bookings_consignor_id ON bookings (consignor_id);
CREATE INDEX IF NOT EXISTS idx_bookings_consignee_id ON bookings (consignee_id);
CREATE INDEX IF NOT EXISTS idx_bookings_truck_owner_id ON bookings (truck_owner_id);
CREATE INDEX IF NOT EXISTS idx_bookings_is_finance_complete ON bookings (is_finance_complete);
CREATE INDEX IF NOT EXISTS idx_bookings_is_unload_complete ON bookings (is_unload_complete);

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
VALUES ('schema_version', '1')
ON CONFLICT (key) DO NOTHING;
