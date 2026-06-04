# AskAura

AskAura is a static web app for tarot-inspired and Meihua-style reflective readings. It is migrated from the old RiLL / cijing project, but this repository must deploy to AskAura-owned infrastructure only.

## Current Status

- Frontend: static `index.html`, `styles.css`, and native JS modules.
- Admin: `admin.html`.
- Backend: Supabase Edge Functions under `supabase/functions`.
- Supabase URL: `https://oeqekrlodqxjlakdjqpu.supabase.co`.
- Runtime provider: DeepSeek, verified through function smoke.
- Active data names: `askaura_reflection_records`, `askaura_daily_anchors`, `askaura_runtime_config`.
- Old cijing Supabase ref `icvegpfnpkyrebtojoca` is a legacy reference, not a deployment target.

## Local Development

Serve the repo explicitly so you do not accidentally open another project on the same port:

```powershell
python -m http.server 5174 --directory D:\CursorAgentChats\askaura
```

Open:

```text
http://127.0.0.1:5174/index.html
```

## Tests

```powershell
node --experimental-vm-modules tests/index-syntax.test.mjs
node tests/askaura-migration-static.test.mjs
node tests/clarify-contract.test.mjs
node tests/meihua.test.mjs
node tests/phase1-mobile-css.test.mjs
node tests/storage.test.mjs
node tests/sync.test.mjs
```

## Supabase Deployment Boundary

AskAura now uses a dedicated Supabase project. Keep frontend/admin configuration pointed at:

```text
https://oeqekrlodqxjlakdjqpu.supabase.co
the AskAura anon publishable key
```

Deploy only to the AskAura project:

```powershell
supabase db push --project-ref <ASKAURA_PROJECT_REF>
supabase functions deploy reading --project-ref <ASKAURA_PROJECT_REF> --no-verify-jwt
supabase functions deploy tarot-draw --project-ref <ASKAURA_PROJECT_REF> --no-verify-jwt
supabase functions deploy admin-config --project-ref <ASKAURA_PROJECT_REF> --no-verify-jwt
supabase functions deploy share-link --project-ref <ASKAURA_PROJECT_REF> --no-verify-jwt
supabase functions deploy resonance-pool --project-ref <ASKAURA_PROJECT_REF> --no-verify-jwt
```

Never deploy AskAura changes to `icvegpfnpkyrebtojoca`.

## Vercel Status

- Latest protected preview verified: `https://askaura-jukfa6xm8-jamison-zhous-projects.vercel.app`.
- Production URL verified: `https://askaura.vercel.app`.
