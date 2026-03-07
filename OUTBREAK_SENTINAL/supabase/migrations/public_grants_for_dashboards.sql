grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on table public.medical_vehicles to anon, authenticated;
grant select, insert, update, delete on table public.vehicle_assignments to anon, authenticated;
grant select, insert, update, delete on table public.navigation_routes to anon, authenticated;
grant select, insert, update, delete on table public.vehicle_location_logs to anon, authenticated;
grant select, insert, update, delete on table public.vehicle_stock_usage to anon, authenticated;

grant select, insert, update, delete on table public.outbreaks to anon, authenticated;
grant select, insert, update, delete on table public.resource_medicines to anon, authenticated;
grant select, insert, update, delete on table public.resource_equipment to anon, authenticated;
grant select, insert, update, delete on table public.resource_staff to anon, authenticated;
grant select, insert, update, delete on table public.support_requests to anon, authenticated;
grant select, insert, update, delete on table public.treatment_category_stats to anon, authenticated;
grant select, insert, update, delete on table public.recovery_trend_daily to anon, authenticated;
