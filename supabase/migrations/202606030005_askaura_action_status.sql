alter table public.askaura_reflection_records
  add column if not exists action_status text not null default ''
  check (action_status in ('', 'done', 'not_done', 'skipped', 'not_fit'));
