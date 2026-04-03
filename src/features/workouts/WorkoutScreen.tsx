import { useMemo, useState } from 'react'
import { SectionCard } from '../../components/SectionCard'
import { formatDurationFromNow, formatShortDate } from '../../lib/time'
import type { Exercise, Preferences, WorkoutWithDetails } from '../../lib/types'

interface WorkoutScreenProps {
  activeWorkout: WorkoutWithDetails | null
  exercises: Exercise[]
  preferences: Preferences | null
  timerEndAt: string | null
  onCreateQuickWorkout: (name: string, exerciseIds: string[]) => Promise<void>
  onUpdateLoggedSet: (
    setId: string,
    updates: { reps?: number | null; weight?: number | null; completedAt?: string | null },
  ) => Promise<void>
  onAddSet: (workoutExerciseId: string) => Promise<void>
  onRemoveSet: (setId: string) => Promise<void>
  onAddExerciseToWorkout: (workoutId: string, exerciseId: string) => Promise<void>
  onRemoveExerciseFromWorkout: (workoutExerciseId: string) => Promise<void>
  onCompleteWorkout: (workoutId: string) => Promise<void>
  onCancelRestTimer: () => Promise<void>
}

export function WorkoutScreen({
  activeWorkout,
  exercises,
  preferences,
  timerEndAt,
  onCreateQuickWorkout,
  onUpdateLoggedSet,
  onAddSet,
  onRemoveSet,
  onAddExerciseToWorkout,
  onRemoveExerciseFromWorkout,
  onCompleteWorkout,
  onCancelRestTimer,
}: WorkoutScreenProps) {
  const [quickName, setQuickName] = useState('')
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([])
  const [exerciseToAdd, setExerciseToAdd] = useState('')
  const [isExercisePickerOpen, setIsExercisePickerOpen] = useState(false)

  const selectedExerciseName = useMemo(
    () => exercises.find((exercise) => exercise.id === exerciseToAdd)?.name ?? 'Choose exercise',
    [exerciseToAdd, exercises],
  )

  async function startQuickWorkout() {
    if (selectedExerciseIds.length === 0) {
      return
    }

    await onCreateQuickWorkout(quickName, selectedExerciseIds)
    setQuickName('')
    setSelectedExerciseIds([])
  }

  if (!activeWorkout) {
    return (
      <div className="stack">
        <SectionCard title="Quick workout" description="Build an ad hoc session without making a template.">
          <div className="form-grid">
            <input value={quickName} onChange={(event) => setQuickName(event.target.value)} placeholder="Upper body" />
            <div className="chip-row">
              {exercises.slice(0, 12).map((exercise) => {
                const active = selectedExerciseIds.includes(exercise.id)
                return (
                  <button
                    key={exercise.id}
                    className={active ? 'chip-button active' : 'chip-button'}
                    onClick={() =>
                      setSelectedExerciseIds((current) =>
                        active ? current.filter((id) => id !== exercise.id) : [...current, exercise.id],
                      )
                    }
                  >
                    {exercise.name}
                  </button>
                )
              })}
            </div>
            <button className="primary-button" onClick={startQuickWorkout}>
              Start quick workout
            </button>
          </div>
        </SectionCard>
      </div>
    )
  }

  return (
    <div className="stack">
      <SectionCard title={activeWorkout.workout.name} description={`Started ${formatShortDate(activeWorkout.workout.startedAt)}`}>
        <div className="hero-card">
          <div>
            <strong>Rest timer</strong>
            <p>
              Default {preferences?.defaultRestSeconds ?? 120}s between completed sets
            </p>
          </div>
          <div className="timer-chip">{formatDurationFromNow(timerEndAt)}</div>
        </div>
        {timerEndAt ? (
          <button className="ghost-button" onClick={onCancelRestTimer}>
            Clear timer
          </button>
        ) : null}
      </SectionCard>

      <SectionCard title="Add exercise" description="Drop movements into the current session without leaving the workout.">
        <div className="inline-actions">
          <label className="select-field">
            <span className="select-label">Exercise</span>
            <button
              type="button"
              className={isExercisePickerOpen ? 'styled-select trigger-open' : 'styled-select'}
              onClick={() => setIsExercisePickerOpen((value) => !value)}
            >
              <span className={exerciseToAdd ? 'selected-value' : 'placeholder-value'}>
                {selectedExerciseName}
              </span>
            </button>
            {isExercisePickerOpen ? (
              <div className="select-menu">
                <button
                  type="button"
                  className={!exerciseToAdd ? 'select-option active-option' : 'select-option'}
                  onClick={() => {
                    setExerciseToAdd('')
                    setIsExercisePickerOpen(false)
                  }}
                >
                  Choose exercise
                </button>
                {exercises.map((exercise) => (
                  <button
                    key={exercise.id}
                    type="button"
                    className={
                      exercise.id === exerciseToAdd ? 'select-option active-option' : 'select-option'
                    }
                    onClick={() => {
                      setExerciseToAdd(exercise.id)
                      setIsExercisePickerOpen(false)
                    }}
                  >
                    {exercise.name}
                  </button>
                ))}
              </div>
            ) : null}
          </label>
          <button
            className="primary-button"
            onClick={async () => {
              if (!exerciseToAdd) {
                return
              }

              await onAddExerciseToWorkout(activeWorkout.workout.id, exerciseToAdd)
              setExerciseToAdd('')
              setIsExercisePickerOpen(false)
            }}
          >
            Add
          </button>
        </div>
      </SectionCard>

      {activeWorkout.items.map(({ workoutExercise, exercise, sets }) => (
        <SectionCard
          key={workoutExercise.id}
          title={exercise.name}
          description={`${sets.length} planned sets`}
          action={<div className="section-actions">
            <button className="ghost-button" onClick={() => onAddSet(workoutExercise.id)}>
              Add set
            </button>
            <button className="ghost-button danger" onClick={() => onRemoveExerciseFromWorkout(workoutExercise.id)}>
              Remove
            </button>
          </div>}
        >
          <div className="set-grid">
            {sets.map((set, index) => (
              <div className={set.completedAt ? 'set-row done' : 'set-row'} key={set.id}>
                <span>Set {index + 1}</span>
                <input
                  defaultValue={set.reps ?? ''}
                  placeholder="Reps"
                  inputMode="numeric"
                  onBlur={(event) =>
                    onUpdateLoggedSet(set.id, {
                      reps: event.target.value ? Number(event.target.value) : null,
                    })
                  }
                />
                <input
                  defaultValue={set.weight ?? ''}
                  placeholder={`Weight (${preferences?.weightUnit ?? 'lb'})`}
                  inputMode="decimal"
                  onBlur={(event) =>
                    onUpdateLoggedSet(set.id, {
                      weight: event.target.value ? Number(event.target.value) : null,
                    })
                  }
                />
                <button
                  className={set.completedAt ? 'chip-button active' : 'chip-button'}
                  onClick={() =>
                    onUpdateLoggedSet(set.id, {
                      completedAt: set.completedAt ? null : new Date().toISOString(),
                    })
                  }
                >
                  {set.completedAt ? 'Done' : 'Finish'}
                </button>
                <button className="ghost-button danger compact-button" onClick={() => onRemoveSet(set.id)}>
                  Remove set
                </button>
              </div>
            ))}
          </div>
        </SectionCard>
      ))}

      <button className="primary-button large" onClick={() => onCompleteWorkout(activeWorkout.workout.id)}>
        Finish workout
      </button>
    </div>
  )
}
