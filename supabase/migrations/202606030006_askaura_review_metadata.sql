alter table public.askaura_reflection_records
  add column if not exists review_at timestamptz,
  add column if not exists review_note text not null default '';
