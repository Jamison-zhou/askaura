create table if not exists public.askaura_share_links (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  record_id text not null,
  payload jsonb not null,
  include_question boolean not null default false,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists askaura_share_links_user_record_idx
  on public.askaura_share_links (user_id, record_id);

create index if not exists askaura_share_links_token_hash_idx
  on public.askaura_share_links (token_hash)
  where revoked_at is null;

alter table public.askaura_share_links enable row level security;

drop policy if exists "askaura_share_links_no_direct_select" on public.askaura_share_links;
drop policy if exists "askaura_share_links_no_direct_insert" on public.askaura_share_links;
drop policy if exists "askaura_share_links_no_direct_update" on public.askaura_share_links;
drop policy if exists "askaura_share_links_no_direct_delete" on public.askaura_share_links;

create policy "askaura_share_links_no_direct_select"
  on public.askaura_share_links
  for select
  using (false);

create policy "askaura_share_links_no_direct_insert"
  on public.askaura_share_links
  for insert
  with check (false);

create policy "askaura_share_links_no_direct_update"
  on public.askaura_share_links
  for update
  using (false)
  with check (false);

create policy "askaura_share_links_no_direct_delete"
  on public.askaura_share_links
  for delete
  using (false);
