# AGENTS.md

## Cursor Cloud specific instructions

### What this project is
"Lilly's app" — a family chore & rewards web app.
- **Frontend:** React + Vite + Tailwind (see `package.json`). Dev server: `npm run dev` (Vite, http://localhost:5173).
- **Backend:** local Supabase stack (Postgres, Auth, Storage, Edge Functions) run via Docker. Schema lives in `supabase/migrations/`, local stack config in `supabase/config.toml`.

There is no automated test suite (no `test` script in `package.json`). Quality gates are `npm run lint` (ESLint), `npm run typecheck` (tsc), and `npm run build` (Vite). See `package.json` `scripts` for the canonical commands.

### Starting the services (not done by the update script)
The update script only refreshes npm deps. Services must be started manually each session:

1. **Docker** must be running (it backs the local Supabase stack). If `docker info` fails, start it: `sudo service docker start`. Docker here uses the `fuse-overlayfs` storage driver with the containerd snapshotter disabled (required for Docker-in-Docker on this VM); this is already configured in `/etc/docker/daemon.json`.
2. **Local Supabase:** `npx supabase start` (first run pulls images; subsequent runs are fast). This exposes: API/Kong `http://127.0.0.1:54321`, Postgres `54322`, Studio `54323`, Mailpit (email inbox) `54324`. Get URLs/keys anytime with `npx supabase status`.
3. **Frontend env:** the app reads `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` from `.env.local` (gitignored). For the local stack these are deterministic; if `.env.local` is missing, recreate it with:
   ```
   VITE_SUPABASE_URL=http://127.0.0.1:54321
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
   ```
   (This is the standard local Supabase demo anon key; verify against `npx supabase status` if it ever changes.)
4. **Dev server:** `npm run dev`. Note `vite.config.js` sets `logLevel: 'error'`, so Vite prints **no** startup banner/URL — it is still serving on the default port `5173`.

### Non-obvious gotchas
- **`auto_expose_new_tables = true` in `supabase/config.toml` is required.** The app talks to `public` tables directly through the Data API (PostgREST). With the newer Supabase default (setting unset/commented), the `anon`/`authenticated` roles get **no** table privileges, so every data call — including reading your own profile after login — fails with `403 permission denied for table ...`. This flag restores the legacy behavior of granting the API roles on public tables. After changing `config.toml` or any migration, run `npx supabase db reset` to re-apply.
- **Email confirmation is disabled** (`auth.email.enable_confirmations = false`), so a signed-up user can sign in immediately without confirming. Any emails the app would send are captured by Mailpit at `http://127.0.0.1:54324` (nothing is sent externally).
- **A new user's session becomes invalid after `npx supabase db reset`** (the DB — including `auth.users` — is wiped). Clear the browser's localStorage for `localhost:5173` or just sign up again.
- **Known pre-existing app bug (NOT an environment problem):** creating a family in Onboarding ("Create Family") and the kid "join family" flow fail under RLS. `apiClient` does `insert(...).select().single()` (PostgREST `return=representation`), but the `families_select` policy requires `id = my_profile().family_id`, which is `NULL` for a brand-new user. Postgres then rejects the insert's `RETURNING` with `42501 new row violates row-level security policy for table "families"`. A plain insert (`return=minimal`) succeeds, confirming the data layer works — the failure is the policy/readback pattern in the committed migration. This blocks the family/chore feature flows until the RLS policies (or the readback pattern) are fixed.
