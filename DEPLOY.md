# AskAura Deployment

AskAura has no frontend build step. Deploy the repository root as a static site after the AskAura Supabase project has been isolated.

## Required Before Preview Or Production

- Dedicated AskAura Supabase project exists: `https://oeqekrlodqxjlakdjqpu.supabase.co`.
- `index.html`, `admin.html`, and `_headers` use the real AskAura Supabase URL and anon publishable key.
- Supabase secrets are set on the AskAura project only.
- `supabase db push` has been run against the AskAura project.
- `reading`, `tarot-draw`, `admin-config`, `share-link`, and `resonance-pool` have been deployed with `--no-verify-jwt` where applicable.
- Current runtime provider is DeepSeek.

## Supabase Commands

```powershell
supabase link --project-ref <ASKAURA_PROJECT_REF>
supabase db push --project-ref <ASKAURA_PROJECT_REF>
supabase functions deploy reading --project-ref <ASKAURA_PROJECT_REF> --no-verify-jwt
supabase functions deploy tarot-draw --project-ref <ASKAURA_PROJECT_REF> --no-verify-jwt
supabase functions deploy admin-config --project-ref <ASKAURA_PROJECT_REF> --no-verify-jwt
supabase functions deploy share-link --project-ref <ASKAURA_PROJECT_REF> --no-verify-jwt
supabase functions deploy resonance-pool --project-ref <ASKAURA_PROJECT_REF> --no-verify-jwt
```

Do not use the old cijing project ref for any AskAura deployment.

## Vercel

Use a static deployment:

- Framework preset: `Other`.
- Build command: empty.
- Output directory: empty or repository root.

After preview deploy, add the preview URL to Supabase Auth redirect URLs if auth is tested on preview.

Current protected preview verified by Vercel access link:

```text
https://askaura-jukfa6xm8-jamison-zhous-projects.vercel.app
```

Production URL verified:

```text
https://askaura.vercel.app
```

## Post-Deploy Smoke

- Open the deployed homepage.
- Confirm the page title and visible brand are 象问 / AskAura.
- Confirm tarot, Meihua, dual, and daily entry points render.
- Confirm no network request goes to the old cijing Supabase project.
- Confirm logged-in sync writes to `askaura_reflection_records` and `askaura_daily_anchors`.
- Confirm admin config reads/writes `askaura_runtime_config`.
