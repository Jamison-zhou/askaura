create table if not exists public.askaura_quality_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  request_id text not null default gen_random_uuid()::text,
  prompt_version text not null default 'default',
  mode text not null default '',
  entry text not null default '',
  tier text not null default 'basic',
  provider text not null default '',
  model text not null default '',
  thinking text not null default 'disabled',
  token_ok boolean not null default true,
  missing_tokens text[] not null default '{}'::text[],
  safety_flags text[] not null default '{}'::text[],
  output_chars integer not null default 0,
  latency_ms integer not null default 0,
  status text not null default 'ok' check (status in ('ok', 'warning', 'error')),
  created_at timestamptz not null default now()
);

create index if not exists askaura_quality_events_created_idx
  on public.askaura_quality_events (created_at desc);

create index if not exists askaura_quality_events_prompt_idx
  on public.askaura_quality_events (prompt_version, created_at desc);

create index if not exists askaura_quality_events_route_idx
  on public.askaura_quality_events (mode, entry, tier, model);

alter table public.askaura_quality_events enable row level security;

drop policy if exists "askaura_quality_events_no_direct_select" on public.askaura_quality_events;
drop policy if exists "askaura_quality_events_no_direct_insert" on public.askaura_quality_events;
drop policy if exists "askaura_quality_events_no_direct_update" on public.askaura_quality_events;
drop policy if exists "askaura_quality_events_no_direct_delete" on public.askaura_quality_events;

create policy "askaura_quality_events_no_direct_select"
  on public.askaura_quality_events
  for select
  using (false);

create policy "askaura_quality_events_no_direct_insert"
  on public.askaura_quality_events
  for insert
  with check (false);

create policy "askaura_quality_events_no_direct_update"
  on public.askaura_quality_events
  for update
  using (false)
  with check (false);

create policy "askaura_quality_events_no_direct_delete"
  on public.askaura_quality_events
  for delete
  using (false);
