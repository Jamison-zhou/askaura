alter table public.askaura_reflection_records
  add column if not exists lifecycle_state text not null default 'legacy'
    check (lifecycle_state in ('temporary', 'saved', 'active', 'paused', 'closed', 'legacy')),
  add column if not exists selected_insight text not null default '',
  add column if not exists action_theme text not null default '',
  add column if not exists echo_due_at timestamptz,
  add column if not exists echo_status text not null default ''
    check (echo_status in ('', 'changed', 'unchanged', 'not_done', 'passed')),
  add column if not exists echo_note text not null default '',
  add column if not exists temporary_expires_at timestamptz,
  add column if not exists source_version text not null default 'legacy';

alter table public.askaura_resonance_submissions
  add column if not exists echo_status text not null default '';

create index if not exists askaura_records_journey_idx
  on public.askaura_reflection_records (user_id, lifecycle_state, updated_at desc);

create table if not exists public.askaura_product_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  anonymous_id text not null default '',
  event_name text not null check (event_name in (
    'observation_started', 'observation_completed', 'insight_confirmed',
    'action_confirmed', 'echo_recorded', 'journey_reopened',
    'temporary_expired', 'flow_failed'
  )),
  mode text not null default '',
  lifecycle_state text not null default '',
  duration_bucket text not null default '',
  error_code text not null default '',
  created_at timestamptz not null default now()
);

alter table public.askaura_product_events enable row level security;

drop policy if exists "askaura_events_select_own" on public.askaura_product_events;
create policy "askaura_events_select_own"
  on public.askaura_product_events for select
  using (auth.uid() = user_id);
