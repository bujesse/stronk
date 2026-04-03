import { useEffect, useMemo, useRef, useState } from 'react'
import { SectionCard } from '../../components/SectionCard'
import { fromStorageWeight, getExerciseTrackingMode } from '../../lib/format'
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
    updates: {
      reps?: number | null
      weight?: number | null
      assistanceWeight?: number | null
      completedAt?: string | null
    },
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
  const quickSelectFieldRef = useRef<HTMLLabelElement | null>(null)
  const selectFieldRef = useRef<HTMLLabelElement | null>(null)
  const [quickName, setQuickName] = useState('')
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([])
  const [quickExerciseToAdd, setQuickExerciseToAdd] = useState('')
  const [isQuickExercisePickerOpen, setIsQuickExercisePickerOpen] = useState(false)
  const [quickExerciseQuery, setQuickExerciseQuery] = useState('')
  const [exerciseToAdd, setExerciseToAdd] = useState('')
  const [isExercisePickerOpen, setIsExercisePickerOpen] = useState(false)
  const [exerciseQuery, setExerciseQuery] = useState('')

  const selectedQuickExerciseName = useMemo(
    () => exercises.find((exercise) => exercise.id === quickExerciseToAdd)?.name ?? 'Choose exercise',
    [quickExerciseToAdd, exercises],
  )
  const selectedExerciseName = useMemo(
    () => exercises.find((exercise) => exercise.id === exerciseToAdd)?.name ?? 'Choose exercise',
    [exerciseToAdd, exercises],
  )
  const filteredQuickExercises = useMemo(() => {
    const query = quickExerciseQuery.trim().toLowerCase()
    return exercises.filter((exercise) => {
      if (selectedExerciseIds.includes(exercise.id)) {
        return false
      }

      if (!query) {
        return true
      }

      return exercise.name.toLowerCase().includes(query)
    })
  }, [quickExerciseQuery, exercises, selectedExerciseIds])
  const filteredExercises = useMemo(() => {
    const query = exerciseQuery.trim().toLowerCase()
    if (!query) {
      return exercises
    }

    return exercises.filter((exercise) => exercise.name.toLowerCase().includes(query))
  }, [exerciseQuery, exercises])

  useEffect(() => {
    if (!isQuickExercisePickerOpen) {
      return
    }

    function handlePointerDown(event: PointerEvent) {
      if (!quickSelectFieldRef.current?.contains(event.target as Node)) {
        setIsQuickExercisePickerOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [isQuickExercisePickerOpen])

  useEffect(() => {
    if (!isExercisePickerOpen) {
      return
    }

    function handlePointerDown(event: PointerEvent) {
      if (!selectFieldRef.current?.contains(event.target as Node)) {
        setIsExercisePickerOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [isExercisePickerOpen])

  async function startQuickWorkout() {
    if (selectedExerciseIds.length === 0) {
      return
    }

    await onCreateQuickWorkout(quickName, selectedExerciseIds)
    setQuickName('')
    setSelectedExerciseIds([])
    setQuickExerciseToAdd('')
    setQuickExerciseQuery('')
    setIsQuickExercisePickerOpen(false)
  }

  if (!activeWorkout) {
    return (
      <div className="stack">
        <SectionCard title="Quick workout" description="Build an ad hoc session without making a template.">
          <div className="form-grid">
            <input value={quickName} onChange={(event) => setQuickName(event.target.value)} placeholder="Upper body" />
            <div className="inline-actions">
              <label className="select-field" ref={quickSelectFieldRef}>
                <span className="select-label">Exercise</span>
                <button
                  type="button"
                  className={isQuickExercisePickerOpen ? 'styled-select trigger-open' : 'styled-select'}
                  onClick={() => setIsQuickExercisePickerOpen((value) => !value)}
                >
                  <span className={quickExerciseToAdd ? 'selected-value' : 'placeholder-value'}>
                    {selectedQuickExerciseName}
                  </span>
                </button>
                {isQuickExercisePickerOpen ? (
                  <div className="select-menu">
                    <input
                      className="typeahead-input"
                      value={quickExerciseQuery}
                      onChange={(event) => setQuickExerciseQuery(event.target.value)}
                      placeholder="Search exercises"
                      autoFocus
                    />
                    {filteredQuickExercises.map((exercise) => (
                      <button
                        key={exercise.id}
                        type="button"
                        className={
                          exercise.id === quickExerciseToAdd
                            ? 'select-option active-option'
                            : 'select-option'
                        }
                        onClick={() => {
                          setQuickExerciseToAdd(exercise.id)
                          setQuickExerciseQuery('')
                          setIsQuickExercisePickerOpen(false)
                        }}
                      >
                        {exercise.name}
                      </button>
                    ))}
                    {filteredQuickExercises.length === 0 ? (
                      <div className="select-empty">No exercises match that search.</div>
                    ) : null}
                  </div>
                ) : null}
              </label>
              <button
                className="primary-button"
                onClick={() => {
                  if (!quickExerciseToAdd || selectedExerciseIds.includes(quickExerciseToAdd)) {
                    return
                  }

                  setSelectedExerciseIds((current) => [...current, quickExerciseToAdd])
                  setQuickExerciseToAdd('')
                  setQuickExerciseQuery('')
                  setIsQuickExercisePickerOpen(false)
                }}
              >
                Add
              </button>
            </div>
            {selectedExerciseIds.length > 0 ? (
              <div className="chip-row">
                {selectedExerciseIds.map((exerciseId) => {
                  const exercise = exercises.find((entry) => entry.id === exerciseId)
                  if (!exercise) {
                    return null
                  }

                  return (
                    <button
                      key={exercise.id}
                      className="chip-button active"
                      onClick={() =>
                        setSelectedExerciseIds((current) => current.filter((id) => id !== exercise.id))
                      }
                    >
                      {exercise.name}
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="empty-state">Add exercises to build your quick workout.</p>
            )}
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

      <div className="floating-select-card">
        <SectionCard title="Add exercise" description="Drop movements into the current session without leaving the workout.">
          <div className="inline-actions">
            <label className="select-field" ref={selectFieldRef}>
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
                  <input
                    className="typeahead-input"
                    value={exerciseQuery}
                    onChange={(event) => setExerciseQuery(event.target.value)}
                    placeholder="Search exercises"
                    autoFocus
                  />
                  {filteredExercises.map((exercise) => (
                    <button
                      key={exercise.id}
                      type="button"
                      className={
                        exercise.id === exerciseToAdd ? 'select-option active-option' : 'select-option'
                      }
                      onClick={() => {
                        setExerciseToAdd(exercise.id)
                        setExerciseQuery('')
                        setIsExercisePickerOpen(false)
                      }}
                    >
                      {exercise.name}
                    </button>
                  ))}
                  {filteredExercises.length === 0 ? (
                    <div className="select-empty">No exercises match that search.</div>
                  ) : null}
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
                setExerciseQuery('')
                setIsExercisePickerOpen(false)
              }}
            >
              Add
            </button>
          </div>
        </SectionCard>
      </div>

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
                {(() => {
                  const trackingMode = getExerciseTrackingMode(exercise)

                  return (
                    <>
                <input
                  key={`${set.id}-reps-${set.updatedAt}`}
                  defaultValue={set.reps ?? ''}
                  placeholder="Reps"
                  inputMode="numeric"
                  onBlur={(event) =>
                    onUpdateLoggedSet(set.id, {
                      reps: event.target.value ? Number(event.target.value) : null,
                    })
                  }
                />
                {trackingMode === 'weight_reps' ? (
                  <input
                    key={`${set.id}-weight-${preferences?.weightUnit ?? 'lb'}-${set.updatedAt}`}
                    defaultValue={fromStorageWeight(set.weight, preferences?.weightUnit ?? 'lb') ?? ''}
                    placeholder={`Weight (${preferences?.weightUnit ?? 'lb'})`}
                    inputMode="decimal"
                    onBlur={(event) =>
                      onUpdateLoggedSet(set.id, {
                        weight: event.target.value ? Number(event.target.value) : null,
                      })
                    }
                  />
                ) : null}
                {trackingMode === 'assisted_bodyweight_reps' ? (
                  <input
                    key={`${set.id}-assist-${preferences?.weightUnit ?? 'lb'}-${set.updatedAt}`}
                    defaultValue={
                      fromStorageWeight(
                        set.assistanceWeight,
                        preferences?.weightUnit ?? 'lb',
                      ) ?? ''
                    }
                    placeholder={`Assist (${preferences?.weightUnit ?? 'lb'})`}
                    inputMode="decimal"
                    onBlur={(event) =>
                      onUpdateLoggedSet(set.id, {
                        assistanceWeight: event.target.value ? Number(event.target.value) : null,
                      })
                    }
                  />
                ) : null}
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
                    </>
                  )
                })()}
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
