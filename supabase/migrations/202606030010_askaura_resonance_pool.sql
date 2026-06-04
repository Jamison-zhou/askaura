create table if not exists public.askaura_resonance_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  record_id text not null,
  mode text not null check (mode in ('tarot', 'meihua', 'dual', 'daily')),
  theme text not null,
  action text not null,
  symbol text not null default '',
  category text not null default 'general',
  language text not null default 'zh',
  source_created_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, record_id)
);

create table if not exists public.askaura_resonance_reactions (
  submission_id uuid not null references public.askaura_resonance_submissions(id) on delete cascade,
  reaction text not null check (reaction in ('same', 'useful')),
  anon_fingerprint text not null,
  created_at timestamptz not null default now(),
  primary key (submission_id, reaction, anon_fingerprint)
);

create index if not exists resonance_submissions_public_idx
  on public.askaura_resonance_submissions (language, category, created_at desc)
  where revoked_at is null;

create index if not exists resonance_reactions_submission_idx
  on public.askaura_resonance_reactions (submission_id, reaction);

alter table public.askaura_resonance_submissions enable row level security;
alter table public.askaura_resonance_reactions enable row level security;

drop policy if exists "resonance_submissions_select_public_active" on public.askaura_resonance_submissions;
drop policy if exists "resonance_submissions_insert_own" on public.askaura_resonance_submissions;
drop policy if exists "resonance_submissions_update_own" on public.askaura_resonance_submissions;
drop policy if exists "resonance_submissions_delete_none" on public.askaura_resonance_submissions;
drop policy if exists "resonance_reactions_select_public" on public.askaura_resonance_reactions;
drop policy if exists "resonance_reactions_no_direct_insert" on public.askaura_resonance_reactions;
drop policy if exists "resonance_reactions_no_direct_update" on public.askaura_resonance_reactions;
drop policy if exists "resonance_reactions_no_direct_delete" on public.askaura_resonance_reactions;

create policy "resonance_submissions_select_public_active"
  on public.askaura_resonance_submissions
  for select
  using (revoked_at is null);

create policy "resonance_submissions_insert_own"
  on public.askaura_resonance_submissions
  for insert
  with check (auth.uid() = user_id);

create policy "resonance_submissions_update_own"
  on public.askaura_resonance_submissions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "resonance_submissions_delete_none"
  on public.askaura_resonance_submissions
  for delete
  using (false);

create policy "resonance_reactions_select_public"
  on public.askaura_resonance_reactions
  for select
  using (true);

create policy "resonance_reactions_no_direct_insert"
  on public.askaura_resonance_reactions
  for insert
  with check (false);

create policy "resonance_reactions_no_direct_update"
  on public.askaura_resonance_reactions
  for update
  using (false)
  with check (false);

create policy "resonance_reactions_no_direct_delete"
  on public.askaura_resonance_reactions
  for delete
  using (false);
