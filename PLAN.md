# Stronk Plan

## Goals

- Recreate the core Strong experience for progressive overload tracking.
- Work fully offline after first load.
- Support optional sign-in and server sync when Supabase credentials are configured.
- Feel native on phones first, while still working on larger screens.

## V1 Scope

- Exercise library with seeded defaults and custom exercises.
- Workout templates with ordered exercises and planned sets.
- Active workout logging with reps, weight, and completion state.
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

- `exercise`
- `workoutTemplate`
- `templateExercise`
- `templateSet`
- `workout`
- `workoutExercise`
- `loggedSet`
- `preferences`
- `syncQueueItem`

## Sync Policy

- All writes land locally first.
- User-created records use client UUIDs.
- Mutations enqueue for later sync.
- Deletes are soft deletes with tombstones.
- Conflict resolution is last-write-wins on `updatedAt`.
- If Supabase is not configured, the app remains fully local.

## Milestones

1. App shell, theme, and mobile navigation.
2. Dexie schema, seeding, repositories, and local state hooks.
3. Exercise management, template builder, active workout flow, and timer.
4. History, analytics, and settings.
5. Optional sync adapter and PWA polish.
