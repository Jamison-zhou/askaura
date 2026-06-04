create table if not exists public.askaura_reflection_records (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  mode text not null check (mode in ('tarot', 'meihua', 'dual', 'daily')),
  title text not null default '',
  question text not null default '',
  answer text not null default '',
  action text not null default '',
  image_src text not null default '',
  image_alt text not null default '',
  anchor jsonb,
  language text not null default 'zh',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.askaura_daily_anchors (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  date_key date not null,
  record_id text not null,
  record jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, date_key)
);

alter table public.askaura_reflection_records enable row level security;
alter table public.askaura_daily_anchors enable row level security;

drop policy if exists "askaura_records_select_own" on public.askaura_reflection_records;
drop policy if exists "askaura_records_insert_own" on public.askaura_reflection_records;
drop policy if exists "askaura_records_update_own" on public.askaura_reflection_records;
drop policy if exists "askaura_records_delete_own" on public.askaura_reflection_records;
drop policy if exists "askaura_daily_select_own" on public.askaura_daily_anchors;
drop policy if exists "askaura_daily_insert_own" on public.askaura_daily_anchors;
drop policy if exists "askaura_daily_update_own" on public.askaura_daily_anchors;
drop policy if exists "askaura_daily_delete_own" on public.askaura_daily_anchors;

create policy "askaura_records_select_own"
  on public.askaura_reflection_records
  for select
  using (auth.uid() = user_id);

create policy "askaura_records_insert_own"
  on public.askaura_reflection_records
  for insert
  with check (auth.uid() = user_id);

create policy "askaura_records_update_own"
  on public.askaura_reflection_records
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "askaura_records_delete_own"
  on public.askaura_reflection_records
  for delete
  using (auth.uid() = user_id);

create policy "askaura_daily_select_own"
  on public.askaura_daily_anchors
  for select
  using (auth.uid() = user_id);

create policy "askaura_daily_insert_own"
  on public.askaura_daily_anchors
  for insert
  with check (auth.uid() = user_id);

create policy "askaura_daily_update_own"
  on public.askaura_daily_anchors
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "askaura_daily_delete_own"
  on public.askaura_daily_anchors
  for delete
  using (auth.uid() = user_id);
