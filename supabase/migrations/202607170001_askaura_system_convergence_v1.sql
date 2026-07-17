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

create index if not exists askaura_records_journey_idx
  on public.askaura_reflection_records (user_id, lifecycle_state, updated_at desc);
