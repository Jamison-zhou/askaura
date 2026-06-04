create table if not exists public.askaura_companion_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  profile jsonb not null default '{}'::jsonb,
  quiet_flags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.askaura_companion_profiles enable row level security;

drop policy if exists "companion_profiles_select_own" on public.askaura_companion_profiles;
drop policy if exists "companion_profiles_insert_own" on public.askaura_companion_profiles;
drop policy if exists "companion_profiles_update_own" on public.askaura_companion_profiles;
drop policy if exists "companion_profiles_delete_own" on public.askaura_companion_profiles;

create policy "companion_profiles_select_own"
  on public.askaura_companion_profiles
  for select
  using (auth.uid() = user_id);

create policy "companion_profiles_insert_own"
  on public.askaura_companion_profiles
  for insert
  with check (auth.uid() = user_id);

create policy "companion_profiles_update_own"
  on public.askaura_companion_profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "companion_profiles_delete_own"
  on public.askaura_companion_profiles
  for delete
  using (auth.uid() = user_id);
