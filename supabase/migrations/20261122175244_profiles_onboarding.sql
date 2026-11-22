-- Welcome tour: remember (per user, across devices) that the tour was seen.
alter table public.profiles add column onboarded_at timestamptz;

-- Users may set it on their own row (profiles_update policy limits rows to auth.uid()).
grant update (onboarded_at) on public.profiles to authenticated;
