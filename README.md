# Stronk

Offline-first workout tracker PWA inspired by Strong. Core logging works entirely in IndexedDB first, with optional Supabase auth and cloud sync for using the same data on phone and desktop.

## Local run

```bash
pnpm install
pnpm dev
```

## Docker deploy

Build and run directly:

```bash
docker build -t stronk .
docker run -d \
  --name stronk \
  -p 4173:80 \
  -e VITE_SUPABASE_URL=... \
  -e VITE_SUPABASE_ANON_KEY=... \
  stronk
```

Or with Compose:

```bash
docker compose up -d --build
```

The container serves the built app with nginx and injects Supabase config at runtime through `config.js`, so you do not need to rebuild the image just to change those env vars.

## Deploy

### Home server from source

1. Clone the repo on the server.
2. Create a `.env` file in the repo root:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
SUPABASE_DB_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres?sslmode=require
```

3. Start it:

```bash
docker compose up -d --build
```

4. The app will be available on port `4173` on that machine.

With `SUPABASE_DB_URL` set, `docker compose up` also runs the SQL in [supabase/schema.sql](/home/bujesse/dev/stronk/supabase/schema.sql) automatically before the app starts. If you omit `SUPABASE_DB_URL`, the bootstrap step is skipped and the app still starts.

To update later:

```bash
git pull
docker compose up -d --build
```

### Home server from GHCR

If you use the GitHub Actions Docker workflow, each push to `main` publishes an image to:

```bash
ghcr.io/<your-github-user-or-org>/stronk
```

Example run command on the server:

```bash
docker run -d \
  --name stronk \
  --restart unless-stopped \
  -p 4173:80 \
  -e VITE_SUPABASE_URL=... \
  -e VITE_SUPABASE_ANON_KEY=... \
  ghcr.io/<your-github-user-or-org>/stronk:main
```

If you want automatic schema setup too, prefer `docker compose` over raw `docker run`, because the compose stack includes the one-shot schema bootstrap container.

To update later:

```bash
docker pull ghcr.io/<your-github-user-or-org>/stronk:main
docker rm -f stronk
docker run -d \
  --name stronk \
  --restart unless-stopped \
  -p 4173:80 \
  -e VITE_SUPABASE_URL=... \
  -e VITE_SUPABASE_ANON_KEY=... \
  ghcr.io/<your-github-user-or-org>/stronk:main
```

### Reverse proxy

If you already run Caddy, Nginx Proxy Manager, Traefik, or another reverse proxy on your home server, proxy your domain to `http://<server-ip>:4173`.

## Accounts and Cloud Sync

1. Create a Supabase project.
2. Copy [.env.example](/home/bujesse/dev/stronk/.env.example) to `.env` and set:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
SUPABASE_DB_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres?sslmode=require
```

3. Start the stack with `docker compose up -d --build`.
4. Open `Settings` in the app and use `Create account` or `Sign in`.

Account behavior:

- If Supabase email confirmation is disabled, `Create account` signs in immediately.
- If email confirmation is enabled, Supabase sends a confirmation email first.
- For reliable email delivery on a real deployment, configure SMTP in your Supabase project.

Current compose behavior:

- `stronk` is the web app container.
- `supabase-bootstrap` is a one-shot init container that applies [supabase/schema.sql](/home/bujesse/dev/stronk/supabase/schema.sql) through `psql` when `SUPABASE_DB_URL` is set.
- Supabase itself is still external; this repo does not run the full Supabase stack locally.

## GitHub Actions

- `.github/workflows/ci.yml`: installs dependencies, runs `pnpm lint`, and runs `pnpm build`.
- `.github/workflows/docker.yml`: builds the Docker image on pushes and PRs, and publishes it to GHCR on non-PR runs.

GitHub Actions note:

- The Docker workflow only builds and publishes the image.
- Runtime values like `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `SUPABASE_DB_URL` belong in your deploy environment on the server, not in the image build.

## Sync model

- Local Dexie data is the source of truth for UI reads and writes.
- Signed-in devices auto-push queued local mutations and can also run manual sync.
- Sync also pulls the full remote dataset and merges by `updatedAt` using last-write-wins.
- Deletes are soft deletes via `deletedAt` tombstones so they replicate across devices.
- Seed exercises use deterministic IDs so templates and workout history line up across devices.

## Current constraints

- This is a simple v1 sync model, not collaborative real-time replication.
- Background notifications for the rest timer are not guaranteed in a PWA.
- Local IndexedDB data is intentionally reset on schema changes during prelaunch development.
