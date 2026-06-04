alter table public.askaura_reflection_records
  add column if not exists is_favorite boolean not null default false;
