-- Storage: report-generator HTML is private and plan-gated; covers are public images.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('app-html', 'app-html', false, 15728640, array['text/html', 'text/plain']),
  ('app-covers', 'app-covers', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

-- app-html: Pro users and admins download any generator; everyone signed in may download
-- generators whose catalog row is tier = 'free'.
create policy app_html_select on storage.objects for select to authenticated
  using (
    bucket_id = 'app-html'
    and (
      (select public.has_pro_access())
      or exists (
        select 1 from public.apps a
        where a.html_path = objects.name and a.tier = 'free'
      )
    )
  );

create policy app_html_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'app-html' and (select public.is_admin()));
create policy app_html_update on storage.objects for update to authenticated
  using (bucket_id = 'app-html' and (select public.is_admin()))
  with check (bucket_id = 'app-html' and (select public.is_admin()));
create policy app_html_delete on storage.objects for delete to authenticated
  using (bucket_id = 'app-html' and (select public.is_admin()));

-- app-covers: public bucket (served by public URL); only admins write. Admins also need
-- SELECT through the API for upserts.
create policy app_covers_select on storage.objects for select to authenticated
  using (bucket_id = 'app-covers' and (select public.is_admin()));
create policy app_covers_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'app-covers' and (select public.is_admin()));
create policy app_covers_update on storage.objects for update to authenticated
  using (bucket_id = 'app-covers' and (select public.is_admin()))
  with check (bucket_id = 'app-covers' and (select public.is_admin()));
create policy app_covers_delete on storage.objects for delete to authenticated
  using (bucket_id = 'app-covers' and (select public.is_admin()));
