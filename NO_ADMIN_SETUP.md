# No-Admin Development Setup

This repo can run without administrator rights or machine-level installs.

## What Already Works Without Admin

- Portable Node is expected at `%LOCALAPPDATA%\CodexTools\node-v24.16.0-win-x64`.
- npm dependencies live in this repo's `node_modules/`.
- Supabase CLI can run from the user npm folder through `tools\supabase.cmd`.
- The React app can run with `tools\dev.cmd`.

## Commands

Run these from the repo root:

```bat
tools\dev.cmd
tools\test.cmd
tools\build.cmd
tools\supabase.cmd --version
```

The app will run at:

```text
http://127.0.0.1:5173/
```

## Supabase Without Docker Desktop

Local Supabase (`supabase db reset --local`, `supabase start`, and `supabase test db --local`) requires Docker Desktop. If company security policy blocks Docker Desktop, use a hosted Supabase project instead:

1. Create or open a Supabase cloud project in the browser.
2. In Supabase SQL Editor, run `supabase/migrations/20260616143116_init_connection_master_v3.sql`.
3. In SQL Editor, run `supabase/seed.sql`.
4. In Project Settings, copy the project URL and publishable key.
5. Create `.env.local` from `.env.example`:

```text
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

6. Run `tools\dev.cmd`.

Do not put service-role or secret keys in `.env.local`; the browser app only needs the publishable key.

## Optional Supabase CLI Cloud Path

If browser login is allowed and the CLI can authenticate, this path avoids Docker too:

```bat
tools\supabase.cmd login
tools\supabase.cmd link --project-ref your-project-ref
tools\supabase.cmd db push --linked
```

The SQL Editor path above is the fallback when CLI auth or linking is blocked.

