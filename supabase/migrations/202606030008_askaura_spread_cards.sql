alter table public.askaura_reflection_records
  add column if not exists spread_type text not null default 'single',
  add column if not exists cards jsonb not null default '[]'::jsonb,
  add column if not exists gua jsonb;
