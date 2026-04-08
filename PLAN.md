# Stronk Plan

## Goals

- Recreate the core Strong experience for progressive overload tracking.
- Work fully offline after first load.
- Support optional sign-in and server sync when a PocketBase server is configured.
- Feel native on phones first, while still working on larger screens.

## V1 Scope

- Exercise library with seeded defaults and custom exercises.
- Exercise library remains fully browsable and filterable in settings, while create/edit/clone flows use a shared modal editor.
- Hierarchical muscle targeting metadata on exercises (`Body Region > Muscle Group`) for future training suggestions.
- Exercise-specific tracking modes for standard load, bodyweight-only, assisted bodyweight, and duration-based work such as cardio.
- Workout templates with ordered exercises and planned sets.
- Workout templates with ordered exercises and planned sets, including warmup sets.
- Active workout logging with reps, load/assistance fields as appropriate, and completion state.
- Workout-level session notes, plus exercise-specific notes inside each logged movement, each with recent-note recall and browsable history.
- Rest timer tied to set completion.
- Workout history, editable workout results, and progression analytics.
- PWA installability and offline app shell caching.

## Non-Goals

- Supersets, RPE, coaching cues, or advanced programming logic.
- Social features, sharing, or collaboration.
- Multi-user workspaces.
- Manual conflict resolution UI.

## Architecture

- Frontend: React + Vite + TypeScript.
- Local data: Dexie over IndexedDB as the authoritative client store.
- Sync: optional PocketBase auth + collection sync adapter behind a repository/sync layer.
- PWA: Vite PWA plugin with cached shell and manifest.
- Deployment: Dockerized static build served by nginx, with runtime config injection for PocketBase env vars.
- Self-hosted backend: Docker Compose runs PocketBase, a one-shot collection bootstrap, and the Stronk web app together.
- Design: mobile-first single-app shell with bottom navigation and persistent active workout surface.
- Secondary create/edit flows outside live logging may use modals, but active set entry should stay inline and fast.

## Domain Model

- `exercise` with `bodyRegion`, `muscleGroup`, `trackingMode`, and default rest
- `workoutTemplate`
- `templateExercise`
- `templateSet` with `setKind` plus mode-specific target fields
- `workout` with workout-level notes
- `workoutExercise` with exercise-specific notes inside a workout
- `loggedSet` with `setKind` and canonical stored load/time fields as relevant
- `preferences`
- `syncQueueItem`

## Tracking Rules

- Supported v1 exercise tracking modes are `weight_reps`, `bodyweight_reps`, `assisted_bodyweight_reps`, and `duration`.
- Weight-like values are stored in a canonical internal unit and converted only at input/output boundaries.
- Exercises may override the global weight unit preference with their own saved preferred unit.
- `bodyweight_reps` exercises track reps without a required load field.
- `assisted_bodyweight_reps` exercises track assistance separately; do not model assistance as negative load.
- `duration` exercises store time in seconds internally and render as minutes/seconds in the UI.
- Analytics are mode-specific: load PRs for standard lifts, reps PRs for bodyweight movements, and least-assistance progression for assisted movements.
- Warmup sets are logged and preserved, but excluded from progression analytics and PR calculations.

## Exercise Taxonomy

- Exercises use a two-level muscle taxonomy, not a flat body-part string.
- `bodyRegion` is the broad grouping (for example `Arms`), and `muscleGroup` is the more specific target (for example `Triceps`).
- Seeded and custom exercises should use the structured taxonomy so future recommendation logic can reason over training distribution.

## Sync Policy

- All writes land locally first.
- User-created records use client UUIDs.
- Seed exercises use deterministic IDs so templates and workout history resolve consistently across devices.
- Mutations enqueue for later sync.
- Signed-in devices push queued local mutations and pull the full remote dataset into Dexie.
- Deletes are soft deletes with tombstones locally and remotely.
- Conflict resolution is last-write-wins on `updatedAt`.
- Sync collections in PocketBase use snake_case fields with per-user ownership enforced by collection rules.
- PocketBase remote records use server-generated IDs plus stable client `app_id` fields so Dexie IDs remain unchanged across sync.
- Preferences sync only the shared fields (`weightUnit`, `defaultRestSeconds`); active rest timers remain device-local.
- If PocketBase is not configured, the app remains fully local.

## Prelaunch Data Policy

- The app is prelaunch and does not preserve local data across schema changes.
- Dexie schema upgrades should reset local IndexedDB state and reseed defaults instead of carrying migration logic.
- Do not add backward-compatibility transforms for old local schemas unless explicitly requested later.

## Milestones

1. App shell, theme, and mobile navigation.
2. Dexie schema, seeding, repositories, and local state hooks.
3. Exercise management, template builder, active workout flow, and timer.
4. History, editable results, analytics, and settings.
5. Optional sync adapter and PWA polish.
