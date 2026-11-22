-- RLS / privilege smoke test. Read-only: everything runs in a transaction that is rolled back.
-- Run against the project (Supabase SQL editor, MCP execute_sql, or psql).
--
-- Expected (signed-in Free account, no admin):
--   apps_visible 93 · categories_visible 12 · profiles_visible 0 · is_admin f · has_pro f
--   html_readable = number of FREE generators hosted in the suite (7 at seed time)
--   pro_html_readable 0
-- Expected write checks: every row 'blocked: 42501', except 'non-admin update app (rows)' = 0
-- and 'anon read app-html objects' = 0.

begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select
  (select count(*) from public.apps) as apps_visible,
  (select count(*) from public.categories) as categories_visible,
  (select count(*) from public.profiles) as profiles_visible,
  (select public.is_admin()) as is_admin,
  (select public.has_pro_access()) as has_pro,
  (select count(*) from storage.objects where bucket_id = 'app-html') as html_readable,
  (select count(*) from storage.objects o join public.apps a on a.html_path = o.name
     where o.bucket_id = 'app-html' and a.tier = 'pro') as pro_html_readable;
rollback;

begin;
create temp table qa_results (test text, outcome text);
grant insert, select on qa_results to authenticated, anon;
do $$
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

  begin
    insert into public.apps (id, name, category, kind) values ('qa-x', 'x', 'Neuro & Brain', 'integrated');
    insert into qa_results values ('non-admin insert app', 'ALLOWED (bad)');
  exception when others then insert into qa_results values ('non-admin insert app', 'blocked: ' || sqlstate);
  end;

  begin
    update public.apps set tier = 'free' where id = 'local-ct-mri-pns-studio';
    insert into qa_results values ('non-admin update app (rows)',
      (select count(*)::text from public.apps where id = 'local-ct-mri-pns-studio' and tier = 'free'));
  exception when others then insert into qa_results values ('non-admin update app', 'blocked: ' || sqlstate);
  end;

  begin
    perform public.admin_list_users();
    insert into qa_results values ('non-admin admin_list_users', 'ALLOWED (bad)');
  exception when others then insert into qa_results values ('non-admin admin_list_users', 'blocked: ' || sqlstate);
  end;

  begin
    perform public.admin_set_plan('11111111-1111-1111-1111-111111111111', 'pro');
    insert into qa_results values ('non-admin admin_set_plan', 'ALLOWED (bad)');
  exception when others then insert into qa_results values ('non-admin admin_set_plan', 'blocked: ' || sqlstate);
  end;

  begin
    insert into public.favorites (user_id, app_id) values ('22222222-2222-2222-2222-222222222222', 'local-xray-msk');
    insert into qa_results values ('favorite for another user', 'ALLOWED (bad)');
  exception when others then insert into qa_results values ('favorite for another user', 'blocked: ' || sqlstate);
  end;

  set local role anon;
  begin
    perform count(*) from public.apps;
    insert into qa_results values ('anon read apps', 'ALLOWED (bad)');
  exception when others then insert into qa_results values ('anon read apps', 'blocked: ' || sqlstate);
  end;
  insert into qa_results values ('anon read app-html objects',
    (select count(*)::text from storage.objects where bucket_id = 'app-html'));
end $$;
reset role;
select * from qa_results;
rollback;
