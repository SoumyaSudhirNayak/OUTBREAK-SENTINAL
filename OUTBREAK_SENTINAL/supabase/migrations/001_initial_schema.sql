-- ============================================================
-- OUTBREAK SENTINEL — Full Schema Migration
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Project: lgrfklkfxxvabbvsbxep
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

DO $$ BEGIN
  CREATE TYPE outbreak_severity_enum AS ENUM ('mild', 'moderate', 'severe');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE support_request_status_enum AS ENUM ('pending', 'approved', 'rejected', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE vehicle_status_enum AS ENUM ('idle', 'assigned', 'on_route', 'treating', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE vehicle_assignment_status_enum AS ENUM ('pending', 'accepted', 'rejected', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE navigation_route_status_enum AS ENUM ('active', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- DOCTOR DASHBOARD TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS outbreaks (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  disease_type      VARCHAR(80)  NOT NULL,
  severity          outbreak_severity_enum NOT NULL,
  affected_people   INTEGER      NOT NULL DEFAULT 0,
  children          INTEGER      NOT NULL DEFAULT 0,
  adults            INTEGER      NOT NULL DEFAULT 0,
  elderly           INTEGER      NOT NULL DEFAULT 0,
  outbreak_date     DATE         NOT NULL,
  notes             TEXT,
  latitude          FLOAT        NOT NULL,
  longitude         FLOAT        NOT NULL,
  area_name         VARCHAR(180),
  reported_by       VARCHAR(120),
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_outbreaks_created_at    ON outbreaks (created_at);
CREATE INDEX IF NOT EXISTS ix_outbreaks_disease_type  ON outbreaks (disease_type);

CREATE TABLE IF NOT EXISTS resource_medicines (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_name       VARCHAR(120) NOT NULL UNIQUE,
  stock_count         INTEGER      NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER      NOT NULL DEFAULT 10,
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS resource_equipment (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_name   VARCHAR(120) NOT NULL UNIQUE,
  available        INTEGER      NOT NULL DEFAULT 0,
  total            INTEGER      NOT NULL DEFAULT 0,
  icon             VARCHAR(16),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS resource_staff (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  role        VARCHAR(80) NOT NULL UNIQUE,
  available   INTEGER     NOT NULL DEFAULT 0,
  total       INTEGER     NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS support_requests (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type  VARCHAR(40) NOT NULL,
  description    TEXT        NOT NULL,
  requested_by   VARCHAR(120),
  status         support_request_status_enum NOT NULL DEFAULT 'pending',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_support_requests_created_at ON support_requests (created_at);

CREATE TABLE IF NOT EXISTS treatment_category_stats (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  disease_type     VARCHAR(80) NOT NULL,
  total_cases      INTEGER     NOT NULL DEFAULT 0,
  treated          INTEGER     NOT NULL DEFAULT 0,
  under_treatment  INTEGER     NOT NULL DEFAULT 0,
  recovered        INTEGER     NOT NULL DEFAULT 0,
  critical         INTEGER     NOT NULL DEFAULT 0,
  snapshot_date    DATE        NOT NULL DEFAULT CURRENT_DATE,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_treatment_category_stats_snapshot_date ON treatment_category_stats (snapshot_date);

CREATE TABLE IF NOT EXISTS recovery_trend_daily (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date  DATE        NOT NULL UNIQUE,
  recovered      INTEGER     NOT NULL DEFAULT 0,
  active         INTEGER     NOT NULL DEFAULT 0,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- VEHICLE DASHBOARD TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS medical_vehicles (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_name          VARCHAR(120) NOT NULL,
  driver_name           VARCHAR(120) NOT NULL,
  contact_number        VARCHAR(32)  NOT NULL,
  current_latitude      FLOAT,
  current_longitude     FLOAT,
  fuel_level_percentage INTEGER,
  vehicle_status        vehicle_status_enum NOT NULL DEFAULT 'idle',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vehicle_assignments (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id        UUID        NOT NULL REFERENCES medical_vehicles(id) ON DELETE CASCADE,
  outbreak_id       UUID        NOT NULL,
  assigned_by       UUID        NOT NULL,
  assignment_status vehicle_assignment_status_enum NOT NULL DEFAULT 'pending',
  assigned_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_vehicle_assignments_vehicle_id ON vehicle_assignments (vehicle_id);

CREATE TABLE IF NOT EXISTS navigation_routes (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id              UUID        NOT NULL REFERENCES medical_vehicles(id) ON DELETE CASCADE,
  origin_lat              FLOAT       NOT NULL,
  origin_lng              FLOAT       NOT NULL,
  destination_lat         FLOAT       NOT NULL,
  destination_lng         FLOAT       NOT NULL,
  route_geometry          JSONB       NOT NULL,
  distance_km             FLOAT       NOT NULL,
  duration_minutes        FLOAT       NOT NULL,
  alternative_routes_json JSONB,
  selected_route_index    INTEGER     NOT NULL DEFAULT 0,
  traffic_level           VARCHAR(32),
  eta_timestamp           TIMESTAMPTZ,
  route_status            navigation_route_status_enum NOT NULL DEFAULT 'active',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_navigation_routes_vehicle_id ON navigation_routes (vehicle_id);

CREATE TABLE IF NOT EXISTS vehicle_location_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id  UUID        NOT NULL REFERENCES medical_vehicles(id) ON DELETE CASCADE,
  latitude    FLOAT       NOT NULL,
  longitude   FLOAT       NOT NULL,
  speed       FLOAT,
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_vehicle_location_logs_vehicle_id ON vehicle_location_logs (vehicle_id);
CREATE INDEX IF NOT EXISTS ix_vehicle_location_logs_vehicle_id_timestamp ON vehicle_location_logs (vehicle_id, timestamp);

CREATE TABLE IF NOT EXISTS vehicle_stock_usage (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id       UUID        NOT NULL REFERENCES medical_vehicles(id) ON DELETE CASCADE,
  medicine_name    VARCHAR(120) NOT NULL,
  quantity_used    INTEGER     NOT NULL DEFAULT 0,
  equipment_used   JSONB,
  patients_treated INTEGER     NOT NULL DEFAULT 0,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_vehicle_stock_usage_vehicle_id ON vehicle_stock_usage (vehicle_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Enable RLS on all tables — Supabase anon key can only read;
-- the backend service role key can write.
-- ============================================================

ALTER TABLE outbreaks               ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_medicines      ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_equipment      ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_staff          ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_requests        ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_category_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_trend_daily    ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_vehicles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_assignments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE navigation_routes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_location_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_stock_usage     ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all data
CREATE POLICY "Allow authenticated read outbreaks"
  ON outbreaks FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read vehicles"
  ON medical_vehicles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read assignments"
  ON vehicle_assignments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read navigation"
  ON navigation_routes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read location logs"
  ON vehicle_location_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read stock"
  ON vehicle_stock_usage FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read medicines"
  ON resource_medicines FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read equipment"
  ON resource_equipment FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read staff"
  ON resource_staff FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read support"
  ON support_requests FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read treatment stats"
  ON treatment_category_stats FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read recovery trend"
  ON recovery_trend_daily FOR SELECT TO authenticated USING (true);

-- ============================================================
-- SEED DATA — Sample resources for testing
-- ============================================================

INSERT INTO resource_medicines (medicine_name, stock_count, low_stock_threshold) VALUES
  ('Paracetamol 500mg', 500, 50),
  ('Amoxicillin 250mg', 200, 30),
  ('ORS Sachets', 1000, 100),
  ('Chloroquine 150mg', 150, 20),
  ('Metronidazole 400mg', 300, 40)
ON CONFLICT (medicine_name) DO NOTHING;

INSERT INTO resource_equipment (equipment_name, available, total, icon) VALUES
  ('Stretchers', 8, 10, '🛏️'),
  ('Oxygen Cylinders', 5, 6, '🫀'),
  ('Defibrillators', 2, 3, '⚡'),
  ('IV Drip Sets', 120, 150, '💉'),
  ('Blood Pressure Monitors', 10, 12, '🩺')
ON CONFLICT (equipment_name) DO NOTHING;

INSERT INTO resource_staff (role, available, total) VALUES
  ('Doctors', 4, 6),
  ('Nurses', 12, 15),
  ('Paramedics', 8, 10),
  ('Lab Technicians', 3, 4)
ON CONFLICT (role) DO NOTHING;
