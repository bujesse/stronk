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
- All user-created entities must carry `id`, `updatedAt`, and `syncStatus`.
- Use soft deletes for synced entities.
- Keep queue metadata separate from domain records.
- Exercise records must declare a `trackingMode`; do not assume every movement is load-based.
- Exercise records should store a broad `bodyRegion` plus a more specific `muscleGroup`; do not collapse this back into one free-text field.
- Store load values in the canonical internal unit, then convert at the UI boundary based on preferences.
- Assisted movements must use a dedicated assistance field, not negative numbers in the main load field.

## UX Rules

- The active workout must recover after refresh.
- The rest timer must continue counting based on timestamps, not intervals alone.
- Keep forms short and inline on mobile.
- Use pounds by default; support kilograms as a preference.
- Render only the fields relevant to the exercise tracking mode in templates and live workout logging.
- Progression views must stay mode-aware; do not compare bodyweight, assisted, and loaded movements with one generic “best weight” rule.
- When creating or seeding exercises, prefer the structured taxonomy format such as `Arms > Triceps` or `Back > Lats` in display terms, backed by separate stored fields.

## Quality

- Keep modules focused and typed at boundaries.
- Prefer explicit repository methods over ad hoc DB calls from UI.
- Add tests for pure logic that changes behavior.
- Keep comments sparse and only where logic is not obvious.
