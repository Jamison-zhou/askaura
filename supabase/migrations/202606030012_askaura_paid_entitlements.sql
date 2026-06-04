create table if not exists public.askaura_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'trial', 'pro')),
  status text not null default 'inactive' check (status in ('inactive', 'trialing', 'active', 'past_due', 'canceled', 'refunded')),
  provider text not null default 'manual' check (provider in ('manual', 'stripe', 'paddle', 'lemonsqueezy', 'other')),
  provider_customer_id text not null default '',
  provider_subscription_id text not null default '',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.askaura_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('reading', 'followup', 'weekly', 'export', 'share', 'portal')),
  entry text not null default '',
  tier text not null default 'basic' check (tier in ('basic', 'pro')),
  model text not null default '',
  max_tokens integer not null default 0,
  status text not null default 'ok' check (status in ('ok', 'blocked', 'error')),
  record_id text not null default '',
  request_id text not null default gen_random_uuid()::text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.askaura_billing_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('manual', 'stripe', 'paddle', 'lemonsqueezy', 'other')),
  provider_event_id text not null,
  event_type text not null default '',
  user_id uuid references auth.users(id) on delete set null,
  provider_customer_id text not null default '',
  provider_subscription_id text not null default '',
  status text not null default 'received' check (status in ('received', 'processed', 'ignored', 'error')),
  error text not null default '',
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  payload_summary jsonb not null default '{}'::jsonb,
  unique (provider, provider_event_id)
);

create index if not exists askaura_entitlements_status_idx
  on public.askaura_entitlements (status, plan);

create index if not exists askaura_usage_events_user_created_idx
  on public.askaura_usage_events (user_id, created_at desc);

create index if not exists askaura_billing_events_user_received_idx
  on public.askaura_billing_events (user_id, received_at desc);

alter table public.askaura_entitlements enable row level security;
alter table public.askaura_usage_events enable row level security;
alter table public.askaura_billing_events enable row level security;

drop policy if exists "askaura_entitlements_select_own" on public.askaura_entitlements;
drop policy if exists "askaura_entitlements_no_direct_insert" on public.askaura_entitlements;
drop policy if exists "askaura_entitlements_no_direct_update" on public.askaura_entitlements;
drop policy if exists "askaura_entitlements_no_direct_delete" on public.askaura_entitlements;

create policy "askaura_entitlements_select_own"
  on public.askaura_entitlements
  for select
  using (auth.uid() = user_id);

create policy "askaura_entitlements_no_direct_insert"
  on public.askaura_entitlements
  for insert
  with check (false);

create policy "askaura_entitlements_no_direct_update"
  on public.askaura_entitlements
  for update
  using (false)
  with check (false);

create policy "askaura_entitlements_no_direct_delete"
  on public.askaura_entitlements
  for delete
  using (false);

drop policy if exists "askaura_usage_events_select_own" on public.askaura_usage_events;
drop policy if exists "askaura_usage_events_no_direct_insert" on public.askaura_usage_events;
drop policy if exists "askaura_usage_events_no_direct_update" on public.askaura_usage_events;
drop policy if exists "askaura_usage_events_no_direct_delete" on public.askaura_usage_events;

create policy "askaura_usage_events_select_own"
  on public.askaura_usage_events
  for select
  using (auth.uid() = user_id);

create policy "askaura_usage_events_no_direct_insert"
  on public.askaura_usage_events
  for insert
  with check (false);

create policy "askaura_usage_events_no_direct_update"
  on public.askaura_usage_events
  for update
  using (false)
  with check (false);

create policy "askaura_usage_events_no_direct_delete"
  on public.askaura_usage_events
  for delete
  using (false);

drop policy if exists "askaura_billing_events_no_direct_select" on public.askaura_billing_events;
drop policy if exists "askaura_billing_events_no_direct_insert" on public.askaura_billing_events;
drop policy if exists "askaura_billing_events_no_direct_update" on public.askaura_billing_events;
drop policy if exists "askaura_billing_events_no_direct_delete" on public.askaura_billing_events;

create policy "askaura_billing_events_no_direct_select"
  on public.askaura_billing_events
  for select
  using (false);

create policy "askaura_billing_events_no_direct_insert"
  on public.askaura_billing_events
  for insert
  with check (false);

create policy "askaura_billing_events_no_direct_update"
  on public.askaura_billing_events
  for update
  using (false)
  with check (false);

create policy "askaura_billing_events_no_direct_delete"
  on public.askaura_billing_events
  for delete
  using (false);
