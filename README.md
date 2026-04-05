# Stronk

Offline-first workout tracker PWA inspired by Strong. Core logging works entirely in IndexedDB first, with optional Supabase auth and cloud sync for using the same data on phone and desktop.

## Local run

```bash
pnpm install
pnpm dev
```

## Cloud sync setup

1. Create a Supabase project.
2. Run [supabase/schema.sql](/home/bujesse/dev/stronk/supabase/schema.sql) in the Supabase SQL editor.
3. Copy [.env.example](/home/bujesse/dev/stronk/.env.example) to `.env` and set:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

4. Start the app and use `Settings` to create an account or sign in.

## Sync model

- Local Dexie data is the source of truth for UI reads and writes.
- Signed-in devices auto-push queued local mutations and can also run manual sync.
- Sync also pulls the full remote dataset and merges by `updatedAt` using last-write-wins.
- Deletes are soft deletes via `deletedAt` tombstones so they replicate across devices.
- Seed exercises use deterministic IDs so templates and workout history line up across devices.

## Current constraints

- This is a simple v1 sync model, not collaborative real-time replication.
- Background notifications for the rest timer are not guaranteed in a PWA.
- The current IndexedDB schema version resets local data because seed exercise IDs changed for sync correctness.
