-- Core schema: catalog (categories + apps), user profiles with plan/role, favorites.
-- Security model: every table has RLS. Signed-in users browse the catalog; launching a
-- pro-tier generator requires plan = 'pro' (or admin) — enforced on the Storage object.

-- ── Catalog ─────────────────────────────────────────────────────────────────────────
create table public.categories (
  name        text primary key,
  icon        text    not null default '📁',
  subtitle    text    not null default '',
  color       text    not null default 'slate',
  sort_order  integer not null default 0
);

create table public.apps (
  id           text primary key default ('app-' || replace(gen_random_uuid()::text, '-', '')),
  name         text not null check (length(btrim(name)) between 1 and 200),
  category     text not null references public.categories (name) on update cascade,
  modality     text not null default 'CT / MRI',
  status       text not null default 'Integrated' check (status in ('Integrated', 'Published', 'Draft')),
  badge        text,
  description  text not null default '',
  duplicate_of text,
  kind         text not null check (kind in ('integrated', 'external')),
  external_url text,
  html_path    text,
  cover_path   text,
  tier         text not null default 'pro' check (tier in ('free', 'pro')),
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint apps_external_has_url check (kind <> 'external' or external_url is not null)
);
create index apps_category_idx on public.apps (category);
create unique index apps_html_path_key on public.apps (html_path) where html_path is not null;

-- ── Users ───────────────────────────────────────────────────────────────────────────
create table public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  email           text not null default '',
  full_name       text,
  role            text not null default 'user' check (role in ('user', 'admin')),
  plan            text not null default 'free' check (plan in ('free', 'pro')),
  plan_changed_at timestamptz,
  hero_app_id     text references public.apps (id) on delete set null,
  created_at      timestamptz not null default now()
);
create index profiles_hero_app_id_idx on public.profiles (hero_app_id);

create table public.favorites (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  app_id     text not null references public.apps (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, app_id)
);
create index favorites_app_id_idx on public.favorites (app_id);

-- ── Helpers (SECURITY DEFINER, pinned search_path) ──────────────────────────────────
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'
  );
$$;

create or replace function public.has_pro_access()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and (p.plan = 'pro' or p.role = 'admin')
  );
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger apps_touch_updated_at
  before update on public.apps
  for each row execute function public.touch_updated_at();

-- New auth user → profile. The very first account becomes the admin (bootstrap).
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    case when exists (select 1 from public.profiles where role = 'admin') then 'user' else 'admin' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_user_email_change()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.profiles set email = coalesce(new.email, '') where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.handle_user_email_change();

-- ── Admin RPCs ──────────────────────────────────────────────────────────────────────
create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  full_name text,
  role text,
  plan text,
  plan_changed_at timestamptz,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  favorites_count bigint
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can list users' using errcode = '42501';
  end if;
  return query
    select p.id, p.email, p.full_name, p.role, p.plan, p.plan_changed_at, p.created_at,
           u.last_sign_in_at,
           (select count(*) from public.favorites f where f.user_id = p.id)
    from public.profiles p
    join auth.users u on u.id = p.id
    order by p.created_at desc;
end;
$$;

create or replace function public.admin_set_plan(target_user uuid, new_plan text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can change plans' using errcode = '42501';
  end if;
  if new_plan not in ('free', 'pro') then
    raise exception 'Unknown plan: %', new_plan using errcode = '22023';
  end if;
  update public.profiles
     set plan = new_plan, plan_changed_at = now()
   where id = target_user and plan is distinct from new_plan;
end;
$$;

create or replace function public.admin_set_role(target_user uuid, new_role text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can change roles' using errcode = '42501';
  end if;
  if new_role not in ('user', 'admin') then
    raise exception 'Unknown role: %', new_role using errcode = '22023';
  end if;
  if target_user = (select auth.uid()) then
    raise exception 'You cannot change your own role' using errcode = '42501';
  end if;
  update public.profiles set role = new_role where id = target_user;
end;
$$;

-- Functions are for signed-in users only.
revoke execute on function public.is_admin(), public.has_pro_access(),
  public.admin_list_users(), public.admin_set_plan(uuid, text), public.admin_set_role(uuid, text)
  from public, anon;
grant execute on function public.is_admin(), public.has_pro_access(),
  public.admin_list_users(), public.admin_set_plan(uuid, text), public.admin_set_role(uuid, text)
  to authenticated;
revoke execute on function public.handle_new_user(), public.handle_user_email_change()
  from public, anon, authenticated;

-- ── Row Level Security ──────────────────────────────────────────────────────────────
alter table public.categories enable row level security;
alter table public.apps       enable row level security;
alter table public.profiles   enable row level security;
alter table public.favorites  enable row level security;

-- Nothing is visible to anonymous visitors.
revoke all on public.categories, public.apps, public.profiles, public.favorites from anon;

-- categories / apps: any signed-in user reads; admins write.
create policy categories_select on public.categories for select to authenticated using (true);
create policy categories_insert on public.categories for insert to authenticated
  with check ((select public.is_admin()));
create policy categories_update on public.categories for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy categories_delete on public.categories for delete to authenticated
  using ((select public.is_admin()));

create policy apps_select on public.apps for select to authenticated using (true);
create policy apps_insert on public.apps for insert to authenticated
  with check ((select public.is_admin()));
create policy apps_update on public.apps for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy apps_delete on public.apps for delete to authenticated
  using ((select public.is_admin()));

-- profiles: read own (admins read all); update own — but only the harmless columns.
-- plan/role change ONLY through the admin RPCs above.
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke insert, update, delete on public.profiles from authenticated;
grant update (full_name, hero_app_id) on public.profiles to authenticated;

-- favorites: strictly own rows.
create policy favorites_select on public.favorites for select to authenticated
  using (user_id = (select auth.uid()));
create policy favorites_insert on public.favorites for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy favorites_delete on public.favorites for delete to authenticated
  using (user_id = (select auth.uid()));
revoke update on public.favorites from authenticated;
