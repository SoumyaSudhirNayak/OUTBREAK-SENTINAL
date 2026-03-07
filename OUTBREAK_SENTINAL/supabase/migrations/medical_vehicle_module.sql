create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'vehicle_status_enum') then
    create type vehicle_status_enum as enum ('idle', 'assigned', 'on_route', 'treating', 'completed');
  end if;
  if not exists (select 1 from pg_type where typname = 'vehicle_assignment_status_enum') then
    create type vehicle_assignment_status_enum as enum ('pending', 'accepted', 'rejected', 'completed');
  end if;
  if not exists (select 1 from pg_type where typname = 'navigation_route_status_enum') then
    create type navigation_route_status_enum as enum ('active', 'completed');
  end if;
end $$;

create table if not exists medical_vehicles (
  id uuid primary key default gen_random_uuid(),
  vehicle_name varchar(120) not null,
  driver_name varchar(120) not null,
  contact_number varchar(32) not null,
  current_latitude double precision,
  current_longitude double precision,
  fuel_level_percentage integer,
  vehicle_status vehicle_status_enum not null default 'idle',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists vehicle_assignments (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references medical_vehicles(id) on delete cascade,
  outbreak_id uuid not null,
  assigned_by uuid not null,
  assignment_status vehicle_assignment_status_enum not null default 'pending',
  assigned_at timestamptz not null default now(),
  accepted_at timestamptz
);

create index if not exists ix_vehicle_assignments_vehicle_id on vehicle_assignments(vehicle_id);

create table if not exists navigation_routes (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references medical_vehicles(id) on delete cascade,
  origin_lat double precision not null,
  origin_lng double precision not null,
  destination_lat double precision not null,
  destination_lng double precision not null,
  route_geometry jsonb not null,
  distance_km double precision not null,
  duration_minutes double precision not null,
  alternative_routes_json jsonb,
  selected_route_index integer not null default 0,
  traffic_level varchar(32),
  eta_timestamp timestamptz,
  route_status navigation_route_status_enum not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ix_navigation_routes_vehicle_id on navigation_routes(vehicle_id);

create table if not exists vehicle_location_logs (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references medical_vehicles(id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  speed double precision,
  timestamp timestamptz not null default now()
);

create index if not exists ix_vehicle_location_logs_vehicle_id on vehicle_location_logs(vehicle_id);
create index if not exists ix_vehicle_location_logs_vehicle_id_timestamp on vehicle_location_logs(vehicle_id, timestamp);

create table if not exists vehicle_stock_usage (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references medical_vehicles(id) on delete cascade,
  medicine_name varchar(120) not null,
  quantity_used integer not null default 0,
  equipment_used jsonb,
  patients_treated integer not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists ix_vehicle_stock_usage_vehicle_id on vehicle_stock_usage(vehicle_id);
