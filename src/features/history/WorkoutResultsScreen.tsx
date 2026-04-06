import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { SectionCard } from '../../components/SectionCard'
import {
  fromStorageWeight,
  formatExerciseName,
  formatVolume,
  formatWeight,
  getExerciseDisplayWeightUnit,
  getExerciseTrackingMode,
  pluralize,
} from '../../lib/format'
import {
  formatDateTime,
  formatDurationSeconds,
  fromDateTimeLocalValue,
  toDateTimeLocalValue,
} from '../../lib/time'
import { buildWorkoutPersonalBestCandidates, summarizeWorkout } from '../../lib/workoutResults'
import type { LoggedSet, Preferences, TrackingMode, Workout, WorkoutWithDetails } from '../../lib/types'

interface WorkoutResultsScreenProps {
  workout: WorkoutWithDetails | null
  history: WorkoutWithDetails[]
  preferences: Preferences | null
  onRepeatWorkout: (workoutId: string) => Promise<void>
  onSaveAsTemplate: (workoutId: string) => Promise<void>
  onUpdateWorkout: (
    workoutId: string,
    updates: Partial<Pick<Workout, 'name' | 'notes' | 'caloriesBurned' | 'startedAt' | 'endedAt'>>,
  ) => Promise<void>
  onUpdateWorkoutExerciseNotes: (workoutExerciseId: string, notes: string) => Promise<void>
  onUpdateLoggedSet: (
    setId: string,
    updates: Partial<
      Pick<
        LoggedSet,
        'reps' | 'weight' | 'assistanceWeight' | 'durationSeconds' | 'completedAt' | 'setKind'
      >
    >,
  ) => Promise<void>
}

function buildWorkoutDraft(workout: Workout | null) {
  if (!workout) {
    return {
      name: '',
      notes: '',
      caloriesBurned: '',
      startedAt: '',
      endedAt: '',
    }
  }

  return {
    name: workout.name,
    notes: workout.notes,
    caloriesBurned: workout.caloriesBurned != null ? String(workout.caloriesBurned) : '',
    startedAt: toDateTimeLocalValue(workout.startedAt),
    endedAt: toDateTimeLocalValue(workout.endedAt),
  }
}

function getCurrentMarker(
  trackingMode: TrackingMode,
  item: WorkoutWithDetails['items'][number],
  unit: 'lb' | 'kg',
) {
  const completedSets = item.sets.filter((set) => set.completedAt != null && set.setKind !== 'warmup')
  if (completedSets.length === 0) {
    return 'No completed sets'
  }

  switch (trackingMode) {
    case 'weight_reps': {
      const best = completedSets.reduce(
        (bestSet, set) => ((set.weight ?? 0) >= (bestSet.weight ?? 0) ? set : bestSet),
        completedSets[0],
      )
      return `${formatWeight(best.weight, unit)} x ${best.reps ?? 0}`
    }
    case 'bodyweight_reps':
      return `${Math.max(...completedSets.map((set) => set.reps ?? 0))} reps`
    case 'assisted_bodyweight_reps': {
      const values = completedSets
        .map((set) => set.assistanceWeight)
        .filter((value): value is number => value != null)
      if (values.length === 0) {
        return 'No assist logged'
      }

      return `${formatWeight(Math.min(...values), unit)} assist`
    }
    case 'duration':
      return formatDurationSeconds(Math.max(...completedSets.map((set) => set.durationSeconds ?? 0)))
  }
}

function formatPersonalBestValue(
  kind: ReturnType<typeof buildWorkoutPersonalBestCandidates>[number]['kind'],
  value: number,
  unit: 'lb' | 'kg',
  metricValue?: number,
) {
  if (kind === 'weight' || kind === 'estimatedOneRepMax' || kind === 'assistance') {
    return formatWeight(value, unit)
  }

  if (kind === 'setVolume' || kind === 'sessionVolume') {
    return formatVolume(value, unit)
  }

  if (kind === 'duration' || kind === 'sessionDuration') {
    return formatDurationSeconds(value)
  }

  if (metricValue != null) {
    return `${value} reps @ ${formatWeight(metricValue, unit)}`
  }

  return `${value} reps`
}

export function WorkoutResultsScreen({
  workout,
  history,
  preferences,
  onRepeatWorkout,
  onSaveAsTemplate,
  onUpdateWorkout,
  onUpdateWorkoutExerciseNotes,
  onUpdateLoggedSet,
}: WorkoutResultsScreenProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(() => buildWorkoutDraft(workout?.workout ?? null))

  if (!workout) {
    return <p className="empty-state">Workout results not found.</p>
  }

  const currentWorkout = workout.workout
  const unit = preferences?.weightUnit ?? 'lb'
  const summary = summarizeWorkout(workout)
  const personalBests = buildWorkoutPersonalBestCandidates(workout, history)
  const hasInvalidDateRange =
    draft.startedAt.trim() !== '' &&
    draft.endedAt.trim() !== '' &&
    new Date(draft.startedAt).getTime() > new Date(draft.endedAt).getTime()

  async function saveWorkoutDetails() {
    if (hasInvalidDateRange) {
      return
    }

    await onUpdateWorkout(currentWorkout.id, {
      name: draft.name.trim() || currentWorkout.name,
      notes: draft.notes,
      caloriesBurned: draft.caloriesBurned.trim() ? Number(draft.caloriesBurned) : null,
      startedAt: draft.startedAt ? fromDateTimeLocalValue(draft.startedAt) : currentWorkout.startedAt,
      endedAt: draft.endedAt ? fromDateTimeLocalValue(draft.endedAt) : currentWorkout.endedAt,
    })
    setDraft(buildWorkoutDraft(currentWorkout))
    setIsEditing(false)
  }

  return (
    <div className="stack">
      <SectionCard
        title={currentWorkout.name}
        titleClassName="results-workout-title"
        description={formatDateTime(currentWorkout.startedAt)}
        action={
          <div className="section-actions">
            {!isEditing ? (
              <>
                <button className="primary-button" onClick={() => void onRepeatWorkout(currentWorkout.id)}>
                  Do this workout again
                </button>
                <button className="ghost-button" onClick={() => void onSaveAsTemplate(currentWorkout.id)}>
                  Save as template
                </button>
              </>
            ) : null}
            {isEditing ? (
              <>
                <button
                  className="ghost-button compact-icon-button"
                  onClick={() => {
                    setDraft(buildWorkoutDraft(currentWorkout))
                    setIsEditing(false)
                  }}
                  aria-label="Cancel workout edits"
                  title="Cancel"
                >
                  <X size={16} strokeWidth={2.2} />
                </button>
                <button
                  className="primary-button compact-icon-button"
                  onClick={() => void saveWorkoutDetails()}
                  disabled={hasInvalidDateRange}
                  aria-label="Save workout edits"
                  title="Save"
                >
                  <Check size={16} strokeWidth={2.2} />
                </button>
              </>
            ) : (
              <button className="ghost-button" onClick={() => setIsEditing(true)}>
                Edit
              </button>
            )}
          </div>
        }
      >
        {isEditing ? (
          <div className="form-grid workout-edit-grid">
            <label className="field-label">
              Name
              <input
                value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                placeholder="Workout name"
              />
            </label>
            <label className="field-label">
              Start
              <input
                type="datetime-local"
                value={draft.startedAt}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, startedAt: event.target.value }))
                }
              />
            </label>
            <label className="field-label">
              End
              <input
                type="datetime-local"
                value={draft.endedAt}
                onChange={(event) => setDraft((current) => ({ ...current, endedAt: event.target.value }))}
              />
            </label>
            <label className="field-label">
              Calories
              <input
                value={draft.caloriesBurned}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, caloriesBurned: event.target.value }))
                }
                placeholder="Calories"
                inputMode="numeric"
              />
            </label>
            <label className="field-label workout-edit-notes">
              Notes
              <textarea
                value={draft.notes}
                rows={4}
                onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Workout notes"
              />
            </label>
            {hasInvalidDateRange ? (
              <p className="info-callout">End time needs to be after the start time.</p>
            ) : null}
          </div>
        ) : null}
        <div className="stats-grid">
          <div className="metric-card">
            <span>Total time</span>
            <strong>{summary.durationMinutes}</strong>
            <p>minutes</p>
          </div>
          <div className="metric-card">
            <span>Exercises</span>
            <strong>{summary.exerciseCount}</strong>
            <p>{summary.completedSetCount}/{summary.workingSetCount} working sets finished</p>
          </div>
          <div className="metric-card">
            <span>Reps</span>
            <strong>{summary.repsTotal}</strong>
            <p>working reps</p>
          </div>
          <div className="metric-card">
            <span>Warm-ups</span>
            <strong>{summary.warmupCount}</strong>
            <p>separate sets</p>
          </div>
          {summary.durationTotal > 0 ? (
            <div className="metric-card">
              <span>Cardio time</span>
              <strong>{formatDurationSeconds(summary.durationTotal)}</strong>
              <p>completed duration</p>
            </div>
          ) : null}
          {summary.volumeTotal > 0 ? (
            <div className="metric-card">
              <span>Total volume</span>
              <strong>{formatVolume(summary.volumeTotal, unit)}</strong>
              <p>load x reps</p>
            </div>
          ) : null}
          {currentWorkout.caloriesBurned != null ? (
            <div className="metric-card">
              <span>Calories</span>
              <strong>{currentWorkout.caloriesBurned}</strong>
              <p>kcal</p>
            </div>
          ) : null}
        </div>
        {currentWorkout.notes.trim() ? (
          <div className="embedded-card">
            <strong>Workout note</strong>
            <p>{currentWorkout.notes.trim()}</p>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard title="Exercise summary" description="Best completed marker for each movement in this session.">
        <div className="stack compact">
          {workout.items.map((item) => {
            const trackingMode = getExerciseTrackingMode(item.exercise)
            const displayWeightUnit = getExerciseDisplayWeightUnit(item.exercise, unit)

            return (
              <div className="embedded-card results-exercise-card" key={item.workoutExercise.id}>
                <div className="results-exercise-summary">
                  <div>
                    <strong>{formatExerciseName(item.exercise)}</strong>
                    <p>
                      {item.workoutExercise.notes.trim()
                        ? item.workoutExercise.notes.trim()
                        : `${pluralize(item.sets.length, 'set')} logged`}
                    </p>
                  </div>
                  <div className="right-align">
                    <strong>{getCurrentMarker(trackingMode, item, unit)}</strong>
                    <p>{trackingMode.replaceAll('_', ' ')}</p>
                  </div>
                </div>
                {isEditing ? (
                  <div className="stack compact">
                    <label className="field-label">
                      Exercise note
                      <textarea
                        defaultValue={item.workoutExercise.notes}
                        rows={2}
                        placeholder="Exercise note"
                        onBlur={(event) =>
                          void onUpdateWorkoutExerciseNotes(item.workoutExercise.id, event.target.value)
                        }
                      />
                    </label>
                    <div className="set-grid">
                      {item.sets.map((set, index) => (
                        <div
                          className={
                            set.completedAt
                              ? set.setKind === 'warmup'
                                ? 'set-row done warmup'
                                : 'set-row done'
                              : set.setKind === 'warmup'
                                ? 'set-row warmup'
                                : 'set-row'
                          }
                          key={`${item.workoutExercise.id}-${set.id}`}
                        >
                          <span>Set {index + 1}</span>
                          {trackingMode !== 'duration' ? (
                            <input
                              defaultValue={set.reps ?? ''}
                              placeholder="Reps"
                              inputMode="numeric"
                              onBlur={(event) =>
                                void onUpdateLoggedSet(set.id, {
                                  reps: event.target.value ? Number(event.target.value) : null,
                                })
                              }
                            />
                          ) : null}
                          {trackingMode === 'duration' ? (
                            <div className="input-with-suffix wide-input">
                              <input
                                defaultValue={
                                  set.durationSeconds != null ? Number((set.durationSeconds / 60).toFixed(2)) : ''
                                }
                                placeholder="Minutes"
                                inputMode="decimal"
                                onBlur={(event) =>
                                  void onUpdateLoggedSet(set.id, {
                                    durationSeconds: event.target.value
                                      ? Math.round(Number(event.target.value) * 60)
                                      : null,
                                  })
                                }
                              />
                              <span className="field-suffix">min</span>
                            </div>
                          ) : null}
                          {trackingMode === 'weight_reps' ? (
                            <div className="input-with-suffix">
                              <input
                                defaultValue={fromStorageWeight(set.weight, displayWeightUnit) ?? ''}
                                placeholder="Weight"
                                inputMode="decimal"
                                onBlur={(event) =>
                                  void onUpdateLoggedSet(set.id, {
                                    weight: event.target.value ? Number(event.target.value) : null,
                                  })
                                }
                              />
                              <span className="field-suffix">{displayWeightUnit}</span>
                            </div>
                          ) : null}
                          {trackingMode === 'assisted_bodyweight_reps' ? (
                            <div className="input-with-suffix">
                              <input
                                defaultValue={
                                  fromStorageWeight(set.assistanceWeight, displayWeightUnit) ?? ''
                                }
                                placeholder="Assist"
                                inputMode="decimal"
                                onBlur={(event) =>
                                  void onUpdateLoggedSet(set.id, {
                                    assistanceWeight: event.target.value ? Number(event.target.value) : null,
                                  })
                                }
                              />
                              <span className="field-suffix">{displayWeightUnit}</span>
                            </div>
                          ) : null}
                          <div className="set-actions">
                            <button
                              className={
                                set.setKind === 'warmup'
                                  ? 'chip-button active warmup-toggle'
                                  : 'chip-button warmup-toggle'
                              }
                              onClick={() =>
                                void onUpdateLoggedSet(set.id, {
                                  setKind: set.setKind === 'warmup' ? 'normal' : 'warmup',
                                })
                              }
                              aria-label={
                                set.setKind === 'warmup' ? 'Mark as working set' : 'Mark as warm-up set'
                              }
                              title={set.setKind === 'warmup' ? 'Warm-up set' : 'Mark warm-up'}
                            >
                              WU
                            </button>
                            <button
                              className={
                                set.completedAt
                                  ? 'chip-button active compact-icon-button'
                                  : 'chip-button compact-icon-button'
                              }
                              onClick={() =>
                                void onUpdateLoggedSet(set.id, {
                                  completedAt: set.completedAt ? null : new Date().toISOString(),
                                })
                              }
                              aria-label={set.completedAt ? 'Mark set not done' : 'Finish set'}
                              title={set.completedAt ? 'Done' : 'Finish'}
                            >
                              <Check size={16} strokeWidth={2.4} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </SectionCard>

      <SectionCard
        title="PRs"
        description={
          personalBests.length > 0
            ? `${pluralize(personalBests.length, 'personal best')} this session.`
            : 'No new personal bests this time.'
        }
      >
        <div className="stack compact">
          {personalBests.map((entry) => (
            <div className="insight-row" key={`${entry.exerciseId}-${entry.label}`}>
              <div>
                <strong>{entry.exerciseName}</strong>
                <p>{entry.label}</p>
              </div>
              <div className="right-align">
                <strong>{formatPersonalBestValue(entry.kind, entry.value, unit, entry.metricValue)}</strong>
                <p>new best</p>
              </div>
            </div>
          ))}
          {personalBests.length === 0 ? <p className="empty-state">No PRs this session.</p> : null}
        </div>
      </SectionCard>
    </div>
  )
}
