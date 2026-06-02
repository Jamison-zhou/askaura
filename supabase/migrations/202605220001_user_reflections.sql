create table if not exists public.rill_reflection_records (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  mode text not null check (mode in ('tarot', 'meihua', 'daily')),
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

create index if not exists rill_reflection_records_user_created_idx
  on public.rill_reflection_records (user_id, created_at desc);

alter table public.rill_reflection_records enable row level security;

drop policy if exists "Users can read own reflection records" on public.rill_reflection_records;
create policy "Users can read own reflection records"
  on public.rill_reflection_records
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own reflection records" on public.rill_reflection_records;
create policy "Users can insert own reflection records"
  on public.rill_reflection_records
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own reflection records" on public.rill_reflection_records;
create policy "Users can update own reflection records"
  on public.rill_reflection_records
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.rill_daily_anchors (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  date_key date not null,
  record_id text not null,
  record jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, date_key)
);

alter table public.rill_daily_anchors enable row level security;

drop policy if exists "Users can read own daily anchors" on public.rill_daily_anchors;
create policy "Users can read own daily anchors"
  on public.rill_daily_anchors
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own daily anchors" on public.rill_daily_anchors;
create policy "Users can insert own daily anchors"
  on public.rill_daily_anchors
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own daily anchors" on public.rill_daily_anchors;
create policy "Users can update own daily anchors"
  on public.rill_daily_anchors
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
