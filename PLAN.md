# Stronk Plan

## Goals

- Recreate the core Strong experience for progressive overload tracking.
- Work fully offline after first load.
- Support optional sign-in and server sync when Supabase credentials are configured.
- Feel native on phones first, while still working on larger screens.

## V1 Scope

- Exercise library with seeded defaults and custom exercises.
- Hierarchical muscle targeting metadata on exercises (`Body Region > Muscle Group`) for future training suggestions.
- Exercise-specific tracking modes for standard load, bodyweight-only, and assisted bodyweight movements.
- Workout templates with ordered exercises and planned sets.
- Active workout logging with reps, load/assistance fields as appropriate, and completion state.
- Rest timer tied to set completion.
- Workout history and basic progression analytics.
- PWA installability and offline app shell caching.

## Non-Goals

- Supersets, RPE, coaching cues, or advanced programming logic.
- Social features, sharing, or collaboration.
- Multi-user workspaces.
- Manual conflict resolution UI.

## Architecture

- Frontend: React + Vite + TypeScript.
- Local data: Dexie over IndexedDB as the authoritative client store.
- Sync: optional Supabase Auth + Postgres sync adapter behind a repository/sync layer.
- PWA: Vite PWA plugin with cached shell and manifest.
- Design: mobile-first single-app shell with bottom navigation and persistent active workout surface.

## Domain Model

- `exercise` with `bodyRegion`, `muscleGroup`, and `trackingMode`
- `workoutTemplate`
- `templateExercise`
- `templateSet` with mode-specific target fields
- `workout`
- `workoutExercise`
- `loggedSet` with canonical stored load plus assistance where relevant
- `preferences`
- `syncQueueItem`

## Tracking Rules

- Supported v1 exercise tracking modes are `weight_reps`, `bodyweight_reps`, and `assisted_bodyweight_reps`.
- Weight-like values are stored in a canonical internal unit and converted only at input/output boundaries.
- `bodyweight_reps` exercises track reps without a required load field.
- `assisted_bodyweight_reps` exercises track assistance separately; do not model assistance as negative load.
- Analytics are mode-specific: load PRs for standard lifts, reps PRs for bodyweight movements, and least-assistance progression for assisted movements.

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
- Sync tables in Supabase use snake_case columns with per-user row ownership enforced by RLS.
- Preferences sync only the shared fields (`weightUnit`, `defaultRestSeconds`); active rest timers remain device-local.
- If Supabase is not configured, the app remains fully local.

## Milestones

1. App shell, theme, and mobile navigation.
2. Dexie schema, seeding, repositories, and local state hooks.
3. Exercise management, template builder, active workout flow, and timer.
4. History, analytics, and settings.
5. Optional sync adapter and PWA polish.
