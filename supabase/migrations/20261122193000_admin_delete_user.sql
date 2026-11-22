-- Admins can delete an account from the Users portal. Deleting the auth user cascades to its
-- profile and favorites. Guard rails: never your own account, never another admin (remove
-- admin first) — which always leaves an admin, and admins are the only accounts that own
-- Storage files. Idempotent, so it is safe to paste into the SQL editor and db push later.

create or replace function public.admin_delete_user(target_user uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can delete accounts' using errcode = '42501';
  end if;
  if target_user = (select auth.uid()) then
    raise exception 'You cannot delete your own account' using errcode = '42501';
  end if;
  if exists (select 1 from public.profiles where id = target_user and role = 'admin') then
    raise exception 'Remove admin access before deleting this account' using errcode = '42501';
  end if;
  delete from auth.users where id = target_user;
  if not found then
    raise exception 'No such account' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.admin_delete_user(uuid) from public, anon;
grant execute on function public.admin_delete_user(uuid) to authenticated;
