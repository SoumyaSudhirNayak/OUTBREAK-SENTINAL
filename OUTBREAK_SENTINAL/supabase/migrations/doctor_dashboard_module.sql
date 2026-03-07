create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'outbreak_severity_enum') then
    create type outbreak_severity_enum as enum ('mild', 'moderate', 'severe');
  end if;

  if not exists (select 1 from pg_type where typname = 'support_request_status_enum') then
    create type support_request_status_enum as enum ('pending', 'approved', 'rejected', 'completed');
  end if;
end $$;

create table if not exists outbreaks (
  id uuid primary key default gen_random_uuid(),
  disease_type varchar(80) not null,
  severity outbreak_severity_enum not null,
  affected_people integer not null default 0,
  children integer not null default 0,
  adults integer not null default 0,
  elderly integer not null default 0,
  outbreak_date date not null,
  notes text,
  latitude double precision not null,
  longitude double precision not null,
  area_name varchar(180),
  reported_by varchar(120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ix_outbreaks_created_at on outbreaks(created_at desc);
create index if not exists ix_outbreaks_disease_type on outbreaks(disease_type);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'vehicle_assignments_outbreak_id_fkey'
  ) then
    alter table vehicle_assignments
      add constraint vehicle_assignments_outbreak_id_fkey
      foreign key (outbreak_id)
      references outbreaks(id);
  end if;
exception when undefined_table then
  null;
end $$;

create table if not exists resource_medicines (
  id uuid primary key default gen_random_uuid(),
  medicine_name varchar(120) not null,
  stock_count integer not null default 0,
  low_stock_threshold integer not null default 10,
  updated_at timestamptz not null default now(),
  unique (medicine_name)
);

create table if not exists resource_equipment (
  id uuid primary key default gen_random_uuid(),
  equipment_name varchar(120) not null,
  available integer not null default 0,
  total integer not null default 0,
  icon varchar(16),
  updated_at timestamptz not null default now(),
  unique (equipment_name)
);

create table if not exists resource_staff (
  id uuid primary key default gen_random_uuid(),
  role varchar(80) not null,
  available integer not null default 0,
  total integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (role)
);

create table if not exists support_requests (
  id uuid primary key default gen_random_uuid(),
  resource_type varchar(40) not null,
  description text not null,
  requested_by varchar(120),
  status support_request_status_enum not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ix_support_requests_created_at on support_requests(created_at desc);

create table if not exists treatment_category_stats (
  id uuid primary key default gen_random_uuid(),
  disease_type varchar(80) not null,
  total_cases integer not null default 0,
  treated integer not null default 0,
  under_treatment integer not null default 0,
  recovered integer not null default 0,
  critical integer not null default 0,
  snapshot_date date not null default current_date,
  updated_at timestamptz not null default now()
);

create index if not exists ix_treatment_category_stats_snapshot_date on treatment_category_stats(snapshot_date desc);

create table if not exists recovery_trend_daily (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null,
  recovered integer not null default 0,
  active integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (snapshot_date)
);
