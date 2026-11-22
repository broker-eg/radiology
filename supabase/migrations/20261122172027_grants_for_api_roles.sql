-- This project does not auto-grant new tables to the Data API roles, so grant explicitly.
-- Grants only open the door; RLS policies (schema_and_rls) decide which rows pass.
grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.apps to authenticated;
grant select on public.profiles to authenticated;            -- updates: column grants (full_name, hero_app_id)
grant select, insert, delete on public.favorites to authenticated;

grant all on public.categories, public.apps, public.profiles, public.favorites to service_role;
