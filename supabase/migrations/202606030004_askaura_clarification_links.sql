alter table public.askaura_reflection_records
  add column if not exists clarification_of jsonb;
