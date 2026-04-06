# Stronk

Offline-first workout tracker PWA inspired by Strong. Core logging works entirely in IndexedDB first, with optional PocketBase auth and cloud sync for using the same data on phone and desktop.

## Local run

```bash
pnpm install
pnpm dev
```

This runs the web app only. Auth and sync will remain disabled unless `VITE_POCKETBASE_URL` points at a running PocketBase server.

## Docker deploy

Build and run directly:

```bash
docker build -t stronk .
docker run -d \
  --name stronk \
  -p 4173:80 \
  -e VITE_POCKETBASE_URL=http://localhost:8090 \
  stronk
```

Or with Compose:

```bash
docker compose up -d --build
```

The container serves the built app with nginx and injects the PocketBase URL at runtime through `config.js`, so you do not need to rebuild the image just to change that env var.

## Full self-hosted setup

This repo now expects PocketBase to be self-hosted alongside the app.

The compose stack contains:

- `pocketbase`: auth, sync API, and SQLite data store
- `pocketbase-bootstrap`: one-shot collection importer
- `stronk`: the PWA served by nginx

### Environment variables

Copy `.env.example` to `.env` and set:

```bash
VITE_POCKETBASE_URL=http://localhost:8090
PB_SUPERUSER_EMAIL=admin@example.com
PB_SUPERUSER_PASSWORD=changeme12345
```

What each variable does:

- `VITE_POCKETBASE_URL`: the PocketBase URL the browser should call
- `PB_SUPERUSER_EMAIL`: PocketBase admin login used for bootstrapping collections
- `PB_SUPERUSER_PASSWORD`: PocketBase admin password

If you want to use the app from your phone on the same LAN, `localhost` is wrong. Use your server IP or domain instead, for example:

```bash
VITE_POCKETBASE_URL=http://192.168.1.50:8090
```

## Run it

From the repo root:

```bash
cp .env.example .env
docker compose up -d --build
```

Then open:

- app: `http://<server-ip>:4173`
- PocketBase admin: `http://<server-ip>:8090/_/`

What happens on startup:

1. PocketBase starts and opens its SQLite database in the `pocketbase_data` volume.
2. The PocketBase superuser is created or updated from `PB_SUPERUSER_EMAIL` and `PB_SUPERUSER_PASSWORD`.
3. The `pocketbase-bootstrap` container waits for PocketBase health, then imports the required Stronk collections.
4. The web app starts and injects `VITE_POCKETBASE_URL` into `config.js`.

### Create your first account

1. Open the app at `http://<server-ip>:4173`
2. Go to `Settings`
3. Click `Create account`
4. Sign in on your other device with the same email/password

### PocketBase admin access

To inspect the backend directly:

1. Open `http://<server-ip>:8090/_/`
2. Sign in with `PB_SUPERUSER_EMAIL` / `PB_SUPERUSER_PASSWORD`

You should see the Stronk collections already created.

## Deploy

### Home server from source

1. Clone the repo on the server.
2. Create a `.env` file in the repo root:

```bash
VITE_POCKETBASE_URL=http://<server-ip>:8090
PB_SUPERUSER_EMAIL=<your-admin-email>
PB_SUPERUSER_PASSWORD=<your-strong-password>
```

3. Start it:

```bash
docker compose up -d --build
```

4. The app will be available on port `4173` and PocketBase on `8090`.

`docker compose up` starts PocketBase, creates or updates the PocketBase superuser, imports the required collections, and then starts the app.

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
  -e VITE_POCKETBASE_URL=http://<server-ip>:8090 \
  ghcr.io/<your-github-user-or-org>/stronk:main
```

If you want the full self-hosted stack, prefer `docker compose`, because the compose stack includes PocketBase and the one-shot collection bootstrap container.

To update later:

```bash
docker pull ghcr.io/<your-github-user-or-org>/stronk:main
docker rm -f stronk
docker run -d \
  --name stronk \
  --restart unless-stopped \
  -p 4173:80 \
  -e VITE_POCKETBASE_URL=http://<server-ip>:8090 \
  ghcr.io/<your-github-user-or-org>/stronk:main
```

### Reverse proxy

If you already run Caddy, Nginx Proxy Manager, Traefik, or another reverse proxy on your home server, proxy your domain to `http://<server-ip>:4173`.

## Accounts and Cloud Sync

1. Copy [.env.example](/home/bujesse/dev/stronk/.env.example) to `.env` and set:

```bash
VITE_POCKETBASE_URL=http://<server-ip>:8090
PB_SUPERUSER_EMAIL=<your-admin-email>
PB_SUPERUSER_PASSWORD=<your-strong-password>
```

2. Start the stack with `docker compose up -d --build`.
3. Open `Settings` in the app and use `Create account` or `Sign in`.

Account behavior:

- `Create account` signs in immediately.
- PocketBase is self-hosted in the compose stack.
- For phone access on your LAN, set `VITE_POCKETBASE_URL` to your server IP or domain instead of `localhost`.

Current compose behavior:

- `stronk` is the web app container.
- `pocketbase` is the self-hosted backend and SQLite data store.
- `pocketbase-bootstrap` is a one-shot init container that imports the required PocketBase collections.

## GitHub Actions

- `.github/workflows/ci.yml`: installs dependencies, runs `pnpm lint`, and runs `pnpm build`.
- `.github/workflows/docker.yml`: builds the Docker image on pushes and PRs, and publishes it to GHCR on non-PR runs.

GitHub Actions note:

- The Docker workflow only builds and publishes the image.
- Runtime values like `VITE_POCKETBASE_URL`, `PB_SUPERUSER_EMAIL`, and `PB_SUPERUSER_PASSWORD` belong in your deploy environment on the server, not in the image build.

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
