# AskAura Supabase Backend

This folder contains AskAura Edge Functions and migrations. It must be linked only to the dedicated AskAura Supabase project.

## Functions

- `reading`: SSE reading generation.
- `tarot-draw`: draw event logging, returns `{ ok: true }`.
- `admin-config`: admin login and runtime config read/write.

## Tables

- `askaura_runtime_config`
- `askaura_reflection_records`
- `askaura_daily_anchors`

The old `rill_*` migrations were removed from the active migration path so a fresh AskAura `db push` does not create legacy cijing tables.

## Secrets

Set secrets on the AskAura project only:

```powershell
supabase secrets set --project-ref <ASKAURA_PROJECT_REF> SUPABASE_URL=https://<ASKAURA_PROJECT_REF>.supabase.co
supabase secrets set --project-ref <ASKAURA_PROJECT_REF> SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY>
supabase secrets set --project-ref <ASKAURA_PROJECT_REF> AI_PROVIDER=xiaomi
supabase secrets set --project-ref <ASKAURA_PROJECT_REF> XIAOMI_API_KEY=<XIAOMI_API_KEY>
supabase secrets set --project-ref <ASKAURA_PROJECT_REF> XIAOMI_BASE_URL=https://token-plan-cn.xiaomimimo.com/v1
supabase secrets set --project-ref <ASKAURA_PROJECT_REF> XIAOMI_MODEL=mimo-v2.5-pro
supabase secrets set --project-ref <ASKAURA_PROJECT_REF> ADMIN_USERNAME=<ADMIN_USERNAME>
supabase secrets set --project-ref <ASKAURA_PROJECT_REF> ADMIN_PASSWORD_HASH=<SHA256_USERNAME_COLON_PASSWORD>
supabase secrets set --project-ref <ASKAURA_PROJECT_REF> ADMIN_SESSION_SECRET=<RANDOM_SECRET>
```

Do not commit `.env.local`, service role keys, provider keys, or admin secrets.

## Deploy

```powershell
supabase db push --project-ref <ASKAURA_PROJECT_REF>
supabase functions deploy reading --project-ref <ASKAURA_PROJECT_REF> --no-verify-jwt
supabase functions deploy tarot-draw --project-ref <ASKAURA_PROJECT_REF> --no-verify-jwt
supabase functions deploy admin-config --project-ref <ASKAURA_PROJECT_REF> --no-verify-jwt
```

## Local Function Contract

`reading` expects current request modes from `_shared/types.ts`: `reading`, `advice`, `anchor`, `meihua-reading`, and `clarify`.

`language` is `zh` or `en`.

`tarot-draw` does not return a server-selected card.

