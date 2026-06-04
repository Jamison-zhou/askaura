alter table public.askaura_reflection_records
  add column if not exists followups jsonb not null default '[]'::jsonb;
