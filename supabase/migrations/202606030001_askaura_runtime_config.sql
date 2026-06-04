create table if not exists public.askaura_runtime_config (
  id text primary key,
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.askaura_runtime_config enable row level security;

drop policy if exists "askaura_runtime_config_no_public_access" on public.askaura_runtime_config;

create policy "askaura_runtime_config_no_public_access"
  on public.askaura_runtime_config
  for all
  using (false)
  with check (false);

insert into public.askaura_runtime_config (id, config)
values (
  'default',
  '{
    "llm": {
      "provider": "deepseek",
      "model": "deepseek-v4-flash",
      "baseUrl": "https://api.deepseek.com/v1",
      "apiKey": "",
      "temperature": 0.7,
      "maxTokens": 2048
    },
    "translations": {}
  }'::jsonb
)
on conflict (id) do nothing;
