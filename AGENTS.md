# AGENTS

## Product Principles

- Keep the app mobile-first and thumb-friendly.
- Treat IndexedDB as the primary read/write source.
- Keep workout logging fast; avoid modal-heavy flows for core set entry.
- Preserve template intent during logging; active workout edits should not mutate the source template.

## Structure

- `src/app`: top-level app shell and navigation.
- `src/features`: feature-owned UI and orchestration.
- `src/components`: reusable display primitives.
- `src/db`: Dexie schema, seeds, and repositories.
- `src/lib`: pure helpers and formatting utilities.
- `src/hooks`: shared React hooks.
- `src/sync`: sync adapter and environment-based backend wiring.
- `src/styles`: design tokens and global styling.

## Data Rules

- UI components do not write directly to Supabase.
- All persistence flows through repository functions.
- This repo is prelaunch: prefer destructive local schema resets over compatibility migrations.
- Keep the local schema simple and current; do not preserve legacy fields or migration branches once the latest shape is decided.
- All user-created entities must carry `id`, `updatedAt`, and `syncStatus`.
- Use soft deletes for synced entities.
- Keep queue metadata separate from domain records.
- Preferences are the exception to per-record `syncStatus`; they sync through queued payloads but keep device-local timer state out of the cloud copy.
- Deploy-time env should be runtime-injected where possible; do not reintroduce a Docker flow that requires rebuilding the image just to change Supabase keys.
- Exercise records must declare a `trackingMode`; do not assume every movement is load-based.
- Duration-based exercises such as cardio should use the `duration` tracking mode and store time canonically in seconds.
- Set records must carry an explicit `setKind`; warmups are not inferred from load, reps, or position.
- Exercise records should store a broad `bodyRegion` plus a more specific `muscleGroup`; do not collapse this back into one free-text field.
- Store load values in the canonical internal unit, then convert at the UI boundary based on preferences.
- Assisted movements must use a dedicated assistance field, not negative numbers in the main load field.
- Seed exercise IDs must stay deterministic across installs; do not revert to random IDs for seeded records.
- When the local Dexie schema changes, bump the DB version and reset/reseed rather than preserving old IndexedDB data.

## UX Rules

- The active workout must recover after refresh.
- The rest timer must continue counting based on timestamps, not intervals alone.
- Keep forms short and inline on mobile.
- On desktop, prefer single-row set entry where practical; on mobile, compress controls without hiding finish/copy/remove.
- Use pounds by default; support kilograms as a preference.
- Render only the fields relevant to the exercise tracking mode in templates and live workout logging.
- Duration exercises should not force reps or load fields in template or workout entry UIs.
- Warmup sets are first-class set records, not transient UI tags; preserve them in templates and logged workouts, but exclude them from progression metrics.
- Workout notes belong to the workout session record; use them for context like bands, pain notes, or setup cues, and surface the most recent prior note for recurring workouts.
- Exercise-specific setup cues belong on the workout-exercise record so each logged movement can carry its own last-note recall and note history.
- Progression views must stay mode-aware; do not compare bodyweight, assisted, and loaded movements with one generic “best weight” rule.
- When creating or seeding exercises, prefer the structured taxonomy format such as `Arms > Triceps` or `Back > Lats` in display terms, backed by separate stored fields.
- Signed-in users should not have to manually export or import data between devices; sync should remain local-first but converge through push + pull.

## Quality

- Keep modules focused and typed at boundaries.
- Prefer explicit repository methods over ad hoc DB calls from UI.
- Add tests for pure logic that changes behavior.
- Keep comments sparse and only where logic is not obvious.
