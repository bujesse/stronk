import { useState } from 'react'
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  NotebookPen,
  Trash2,
} from 'lucide-react'
import { DropdownField } from '../../components/DropdownField'
import { SectionCard } from '../../components/SectionCard'
import { useAnimatedList } from '../../hooks/useAnimatedList'
import { useTicker } from '../../hooks/useTicker'
import { NoteModal } from './NoteModal'
import { QuickWorkoutBuilder } from './QuickWorkoutBuilder'
import {
  formatExerciseName,
  fromStorageWeight,
  getExerciseDisplayWeightUnit,
  getExerciseTrackingMode,
} from '../../lib/format'
import { formatDurationFromNow, formatShortDate } from '../../lib/time'
import type {
  Exercise,
  ExerciseNoteEntry,
  Preferences,
  WorkoutNoteEntry,
  WorkoutWithDetails,
} from '../../lib/types'

interface WorkoutScreenProps {
  activeWorkout: WorkoutWithDetails | null
  exercises: Exercise[]
  preferences: Preferences | null
  timerEndAt: string | null
  noteHistory: WorkoutNoteEntry[]
  exerciseNoteHistory: Record<string, ExerciseNoteEntry[]>
  onCreateQuickWorkout: (name: string, exerciseIds: string[]) => Promise<void>
  onUpdateWorkoutExerciseNotes: (workoutExerciseId: string, notes: string) => Promise<void>
  onUpdateWorkoutNotes: (workoutId: string, notes: string) => Promise<void>
  onUpdateLoggedSet: (
    setId: string,
    updates: {
      reps?: number | null
      weight?: number | null
      assistanceWeight?: number | null
      durationSeconds?: number | null
      setKind?: 'normal' | 'warmup'
      completedAt?: string | null
    },
  ) => Promise<void>
  onAddSet: (workoutExerciseId: string) => Promise<void>
  onDuplicateSet: (setId: string) => Promise<void>
  onRemoveSet: (setId: string) => Promise<void>
  onMoveExercise: (workoutExerciseId: string, direction: 'up' | 'down') => Promise<void>
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
  noteHistory,
  exerciseNoteHistory,
  onCreateQuickWorkout,
  onUpdateWorkoutExerciseNotes,
  onUpdateWorkoutNotes,
  onUpdateLoggedSet,
  onAddSet,
  onDuplicateSet,
  onRemoveSet,
  onMoveExercise,
  onAddExerciseToWorkout,
  onRemoveExerciseFromWorkout,
  onCompleteWorkout,
  onCancelRestTimer,
}: WorkoutScreenProps) {
  useTicker(1000, timerEndAt != null)
  const [workoutExerciseListRef] = useAnimatedList()

  const [quickName, setQuickName] = useState('')
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([])
  const [quickExerciseToAdd, setQuickExerciseToAdd] = useState('')
  const [exerciseToAdd, setExerciseToAdd] = useState('')
  const [editingExerciseNote, setEditingExerciseNote] = useState<{
    workoutExerciseId: string
    exerciseName: string
  } | null>(null)
  const [exerciseNoteDraft, setExerciseNoteDraft] = useState('')
  const [isWorkoutNoteOpen, setIsWorkoutNoteOpen] = useState(false)
  const [workoutNoteDraft, setWorkoutNoteDraft] = useState('')

  async function startQuickWorkout() {
    if (selectedExerciseIds.length === 0) {
      return
    }

    await onCreateQuickWorkout(quickName, selectedExerciseIds)
    setQuickName('')
    setSelectedExerciseIds([])
    setQuickExerciseToAdd('')
  }

  if (!activeWorkout) {
    return (
      <QuickWorkoutBuilder
        exercises={exercises}
        quickName={quickName}
        selectedExerciseIds={selectedExerciseIds}
        quickExerciseToAdd={quickExerciseToAdd}
        onQuickNameChange={setQuickName}
        onQuickExerciseToAddChange={setQuickExerciseToAdd}
        onAddExercise={() => {
          if (!quickExerciseToAdd || selectedExerciseIds.includes(quickExerciseToAdd)) {
            return
          }

          setSelectedExerciseIds((current) => [...current, quickExerciseToAdd])
          setQuickExerciseToAdd('')
        }}
        onRemoveExercise={(exerciseId) =>
          setSelectedExerciseIds((current) => current.filter((id) => id !== exerciseId))
        }
        onStart={startQuickWorkout}
      />
    )
  }

  return (
    <div className="stack">
      <SectionCard
        title={activeWorkout.workout.name}
        description={`Started ${formatShortDate(activeWorkout.workout.startedAt)}`}
        action={
          <div className="section-actions">
            <button
              className={activeWorkout.workout.notes.trim() ? 'ghost-button compact-icon-button active-note-button' : 'ghost-button compact-icon-button'}
              onClick={() => {
                setWorkoutNoteDraft(activeWorkout.workout.notes)
                setIsWorkoutNoteOpen(true)
              }}
              aria-label="Edit workout note"
              title="Workout note"
            >
              <NotebookPen size={16} strokeWidth={2.2} />
            </button>
          </div>
        }
      >
        <div className="hero-card">
          <div>
            <strong>Rest timer</strong>
            <p>
              Default {preferences?.defaultRestSeconds ?? 120}s between completed sets
            </p>
          </div>
          <div className="hero-card-actions">
            <div className="timer-chip">{formatDurationFromNow(timerEndAt)}</div>
            {timerEndAt ? (
              <button className="ghost-button compact-button" onClick={onCancelRestTimer}>
                Clear
              </button>
            ) : null}
          </div>
        </div>
        {noteHistory[0] ? (
          <div className="embedded-card workout-note-preview">
            <strong>Last note from this workout</strong>
            <p>{formatShortDate(noteHistory[0].startedAt)} • {noteHistory[0].note}</p>
          </div>
        ) : null}
      </SectionCard>

      <div className="floating-select-card">
        <SectionCard title="Add exercise" description="Drop movements into the current session without leaving the workout.">
          <div className="inline-actions align-end add-exercise-row">
            <DropdownField
              label="Exercise"
              value={exerciseToAdd}
              placeholder="Choose exercise"
              searchable
              emptyMessage="No exercises match that search."
              options={exercises.map((exercise) => ({
                value: exercise.id,
                label: formatExerciseName(exercise),
              }))}
              onChange={setExerciseToAdd}
            />
            <button
              className="primary-button"
              onClick={async () => {
                if (!exerciseToAdd) {
                  return
                }

                await onAddExerciseToWorkout(activeWorkout.workout.id, exerciseToAdd)
                setExerciseToAdd('')
              }}
            >
              Add
            </button>
          </div>
        </SectionCard>
      </div>

      <div className="stack" ref={workoutExerciseListRef}>
        {activeWorkout.items.map(({ workoutExercise, exercise, sets }, index) => (
          <WorkoutExerciseCard
            key={workoutExercise.id}
            workoutExercise={workoutExercise}
            exercise={exercise}
            sets={sets}
            preferences={preferences}
            noteEntry={exerciseNoteHistory[workoutExercise.id]?.[0] ?? null}
            isFirst={workoutExercise.sortOrder === 0}
            isLast={index === activeWorkout.items.length - 1}
            onEditNote={() => {
              setEditingExerciseNote({
                workoutExerciseId: workoutExercise.id,
                exerciseName: formatExerciseName(exercise),
              })
              setExerciseNoteDraft(workoutExercise.notes)
            }}
            onAddSet={onAddSet}
            onRemoveExerciseFromWorkout={onRemoveExerciseFromWorkout}
            onUpdateLoggedSet={onUpdateLoggedSet}
            onDuplicateSet={onDuplicateSet}
            onRemoveSet={onRemoveSet}
            onMoveExercise={onMoveExercise}
          />
        ))}
      </div>

      <button className="primary-button large" onClick={() => onCompleteWorkout(activeWorkout.workout.id)}>
        Finish workout
      </button>

      {editingExerciseNote ? (
        <NoteModal
          title={`${editingExerciseNote.exerciseName} note`}
          value={exerciseNoteDraft}
          placeholder="Band color, machine setting, grip width, setup cue..."
          onChange={setExerciseNoteDraft}
          onClose={() => setEditingExerciseNote(null)}
          onSave={async () => {
            await onUpdateWorkoutExerciseNotes(editingExerciseNote.workoutExerciseId, exerciseNoteDraft)
            setEditingExerciseNote(null)
          }}
        />
      ) : null}

      {isWorkoutNoteOpen ? (
        <NoteModal
          title="Workout note"
          value={workoutNoteDraft}
          placeholder="Session-level notes, energy, pain, cues..."
          onChange={setWorkoutNoteDraft}
          onClose={() => setIsWorkoutNoteOpen(false)}
          onSave={async () => {
            await onUpdateWorkoutNotes(activeWorkout.workout.id, workoutNoteDraft)
            setIsWorkoutNoteOpen(false)
          }}
        />
      ) : null}
    </div>
  )
}

interface WorkoutExerciseCardProps {
  workoutExercise: WorkoutWithDetails['items'][number]['workoutExercise']
  exercise: Exercise
  sets: WorkoutWithDetails['items'][number]['sets']
  preferences: Preferences | null
  noteEntry: ExerciseNoteEntry | null
  isFirst: boolean
  isLast: boolean
  onEditNote: () => void
  onAddSet: (workoutExerciseId: string) => Promise<void>
  onRemoveExerciseFromWorkout: (workoutExerciseId: string) => Promise<void>
  onUpdateLoggedSet: WorkoutScreenProps['onUpdateLoggedSet']
  onDuplicateSet: WorkoutScreenProps['onDuplicateSet']
  onRemoveSet: WorkoutScreenProps['onRemoveSet']
  onMoveExercise: WorkoutScreenProps['onMoveExercise']
}

function WorkoutExerciseCard({
  workoutExercise,
  exercise,
  sets,
  preferences,
  noteEntry,
  isFirst,
  isLast,
  onEditNote,
  onAddSet,
  onRemoveExerciseFromWorkout,
  onUpdateLoggedSet,
  onDuplicateSet,
  onRemoveSet,
  onMoveExercise,
}: WorkoutExerciseCardProps) {
  const [setGridRef] = useAnimatedList()
  const displayWeightUnit = getExerciseDisplayWeightUnit(exercise, preferences?.weightUnit ?? 'lb')

  return (
    <SectionCard
      title={formatExerciseName(exercise)}
      description={`${sets.length} planned sets`}
      action={<div className="section-actions exercise-card-actions">
        <button
          className="ghost-button compact-icon-button"
          onClick={() => onMoveExercise(workoutExercise.id, 'up')}
          aria-label={`Move ${formatExerciseName(exercise)} up`}
          title="Move up"
          disabled={isFirst}
        >
          <ChevronUp size={16} strokeWidth={2.2} />
        </button>
        <button
          className="ghost-button compact-icon-button"
          onClick={() => onMoveExercise(workoutExercise.id, 'down')}
          aria-label={`Move ${formatExerciseName(exercise)} down`}
          title="Move down"
          disabled={isLast}
        >
          <ChevronDown size={16} strokeWidth={2.2} />
        </button>
        <button
          className={workoutExercise.notes.trim() ? 'ghost-button compact-icon-button active-note-button' : 'ghost-button compact-icon-button'}
          onClick={onEditNote}
          aria-label={`Edit note for ${formatExerciseName(exercise)}`}
          title="Exercise note"
        >
          <NotebookPen size={16} strokeWidth={2.2} />
        </button>
        <button className="ghost-button" onClick={() => onAddSet(workoutExercise.id)}>
          Add set
        </button>
        <button className="ghost-button danger" onClick={() => onRemoveExerciseFromWorkout(workoutExercise.id)}>
          Remove
        </button>
      </div>}
    >
      {workoutExercise.notes.trim() ? (
        <div className="embedded-card exercise-note-preview">
          <strong>Current note</strong>
          <p>{workoutExercise.notes.trim()}</p>
        </div>
      ) : noteEntry ? (
        <div className="embedded-card exercise-note-preview">
          <strong>Last note for {formatExerciseName(exercise)}</strong>
          <p>
            {formatShortDate(noteEntry.startedAt)} • {noteEntry.note}
          </p>
        </div>
      ) : null}
      <div className="set-grid" ref={setGridRef}>
        {sets.map((set, index) => (
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
            key={set.id}
          >
            <span>Set {index + 1}</span>
            {(() => {
              const trackingMode = getExerciseTrackingMode(exercise)

              return (
                <>
                  {trackingMode !== 'duration' ? (
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
                  ) : null}
                  {trackingMode === 'duration' ? (
                    <label className="input-with-suffix wide-input">
                      <input
                        defaultValue={
                          set.durationSeconds != null ? Number((set.durationSeconds / 60).toFixed(2)) : ''
                        }
                        placeholder="Minutes"
                        inputMode="decimal"
                        onBlur={(event) =>
                          onUpdateLoggedSet(set.id, {
                            durationSeconds: event.target.value
                              ? Math.round(Number(event.target.value) * 60)
                              : null,
                          })
                        }
                      />
                      <span className="field-suffix">min</span>
                    </label>
                  ) : null}
                  {trackingMode === 'weight_reps' ? (
                    <label className="input-with-suffix">
                      <input
                        defaultValue={fromStorageWeight(set.weight, displayWeightUnit) ?? ''}
                        placeholder="Weight"
                        inputMode="decimal"
                        onBlur={(event) =>
                          onUpdateLoggedSet(set.id, {
                            weight: event.target.value ? Number(event.target.value) : null,
                          })
                        }
                      />
                      <span className="field-suffix">{displayWeightUnit}</span>
                    </label>
                  ) : null}
                  {trackingMode === 'assisted_bodyweight_reps' ? (
                    <label className="input-with-suffix">
                      <input
                        defaultValue={
                          fromStorageWeight(set.assistanceWeight, displayWeightUnit) ?? ''
                        }
                        placeholder="Assist"
                        inputMode="decimal"
                        onBlur={(event) =>
                          onUpdateLoggedSet(set.id, {
                            assistanceWeight: event.target.value ? Number(event.target.value) : null,
                          })
                        }
                      />
                      <span className="field-suffix">{displayWeightUnit}</span>
                    </label>
                  ) : null}
                  <div className="set-actions">
                    <button
                      className={set.setKind === 'warmup' ? 'chip-button active warmup-toggle' : 'chip-button warmup-toggle'}
                      onClick={() =>
                        onUpdateLoggedSet(set.id, {
                          setKind: set.setKind === 'warmup' ? 'normal' : 'warmup',
                        })
                      }
                      aria-label={set.setKind === 'warmup' ? 'Mark as working set' : 'Mark as warm-up set'}
                      title={set.setKind === 'warmup' ? 'Warm-up set' : 'Mark warm-up'}
                    >
                      WU
                    </button>
                    <button
                      className={set.completedAt ? 'chip-button active compact-icon-button' : 'chip-button compact-icon-button'}
                      onClick={() =>
                        onUpdateLoggedSet(set.id, {
                          completedAt: set.completedAt ? null : new Date().toISOString(),
                        })
                      }
                      aria-label={set.completedAt ? 'Mark set not done' : 'Finish set'}
                      title={set.completedAt ? 'Done' : 'Finish'}
                    >
                      <Check size={16} strokeWidth={2.4} />
                    </button>
                    <button
                      className="ghost-button compact-icon-button"
                      onClick={() => onDuplicateSet(set.id)}
                      aria-label="Copy set"
                      title="Copy"
                    >
                      <Copy size={16} strokeWidth={2.2} />
                    </button>
                    <button
                      className="ghost-button danger compact-icon-button"
                      onClick={() => onRemoveSet(set.id)}
                      aria-label="Remove set"
                      title="Remove"
                    >
                      <Trash2 size={16} strokeWidth={2.1} />
                    </button>
                  </div>
                </>
              )
            })()}
          </div>
        ))}
      </div>
    </SectionCard>
  )
}
