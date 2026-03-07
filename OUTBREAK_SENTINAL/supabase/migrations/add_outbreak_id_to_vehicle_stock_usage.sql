do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'vehicle_stock_usage'
      and column_name = 'outbreak_id'
  ) then
    alter table public.vehicle_stock_usage
      add column outbreak_id uuid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'vehicle_stock_usage_outbreak_id_fkey'
  ) then
    alter table public.vehicle_stock_usage
      add constraint vehicle_stock_usage_outbreak_id_fkey
      foreign key (outbreak_id)
      references public.outbreaks(id)
      on delete set null;
  end if;
end $$;

create index if not exists vehicle_stock_usage_outbreak_id_idx
  on public.vehicle_stock_usage(outbreak_id);

