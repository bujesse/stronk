import { useMemo, useState } from 'react'
import { PencilLine, X } from 'lucide-react'
import { DropdownField } from '../../components/DropdownField'
import { SectionCard } from '../../components/SectionCard'
import {
  formatExerciseName,
  formatExerciseMuscleLabel,
  getTrackingModeLabel,
  pluralize,
} from '../../lib/format'
import { BODY_REGION_OPTIONS, getDefaultMuscleGroup } from '../../lib/muscles'
import type { BodyRegion, Exercise, TrackingMode, WeightUnit } from '../../lib/types'

interface ExercisesScreenProps {
  exercises: Exercise[]
  onCreateExercise: (input: {
    movementName: string
    bodyRegion?: BodyRegion | null
    muscleGroup?: string
    equipment?: string
    preferredWeightUnit?: WeightUnit | null
    trackingMode: TrackingMode
    defaultRestSeconds?: number | null
  }) => Promise<void>
  onUpdateExercise: (
    exerciseId: string,
    input: {
      movementName: string
      bodyRegion?: BodyRegion | null
      muscleGroup?: string
      equipment?: string
      preferredWeightUnit?: WeightUnit | null
      trackingMode: TrackingMode
      defaultRestSeconds?: number | null
    },
  ) => Promise<void>
}

export function ExercisesScreen({
  exercises,
  onCreateExercise,
  onUpdateExercise,
}: ExercisesScreenProps) {
  const [movementName, setMovementName] = useState('')
  const [bodyRegion, setBodyRegion] = useState<BodyRegion>('Chest')
  const [muscleGroup, setMuscleGroup] = useState(getDefaultMuscleGroup('Chest'))
  const [equipment, setEquipment] = useState('')
  const [preferredWeightUnit, setPreferredWeightUnit] = useState<'default' | WeightUnit>('default')
  const [trackingMode, setTrackingMode] = useState<TrackingMode>('weight_reps')
  const [rest, setRest] = useState('')
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [trackingFilter, setTrackingFilter] = useState<'all' | TrackingMode>('all')

  const filteredExercises = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return exercises.filter((exercise) => {
      if (trackingFilter !== 'all' && exercise.trackingMode !== trackingFilter) {
        return false
      }

      if (!normalizedQuery) {
        return true
      }

      const haystack = [
        formatExerciseName(exercise),
        formatExerciseMuscleLabel(exercise.bodyRegion, exercise.muscleGroup),
        exercise.equipment,
        getTrackingModeLabel(exercise.trackingMode),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(normalizedQuery)
    })
  }, [exercises, query, trackingFilter])

  function resetForm() {
    setMovementName('')
    setBodyRegion('Chest')
    setMuscleGroup(getDefaultMuscleGroup('Chest'))
    setEquipment('')
    setPreferredWeightUnit('default')
    setTrackingMode('weight_reps')
    setRest('')
    setEditingExerciseId(null)
    setIsEditorOpen(false)
  }

  function openCreateModal() {
    setMovementName('')
    setBodyRegion('Chest')
    setMuscleGroup(getDefaultMuscleGroup('Chest'))
    setEquipment('')
    setPreferredWeightUnit('default')
    setTrackingMode('weight_reps')
    setRest('')
    setEditingExerciseId(null)
    setIsEditorOpen(true)
  }

  function startEditing(exercise: Exercise) {
    setEditingExerciseId(exercise.id)
    setMovementName(exercise.movementName)
    setBodyRegion(exercise.bodyRegion ?? 'Chest')
    setMuscleGroup(exercise.muscleGroup ?? getDefaultMuscleGroup(exercise.bodyRegion ?? 'Chest'))
    setEquipment(exercise.equipment ?? '')
    setPreferredWeightUnit(exercise.preferredWeightUnit ?? 'default')
    setTrackingMode(exercise.trackingMode)
    setRest(exercise.defaultRestSeconds != null ? String(exercise.defaultRestSeconds) : '')
    setIsEditorOpen(true)
  }

  function cloneEditingExercise() {
    setEditingExerciseId(null)
  }

  async function submit() {
    if (!movementName.trim()) {
      return
    }

    const input = {
      movementName,
      bodyRegion,
      muscleGroup,
      equipment,
      preferredWeightUnit: preferredWeightUnit === 'default' ? null : preferredWeightUnit,
      trackingMode,
      defaultRestSeconds: rest ? Number(rest) : null,
    }

    if (editingExerciseId) {
      await onUpdateExercise(editingExerciseId, input)
    } else {
      await onCreateExercise(input)
    }

    resetForm()
  }

  return (
    <div className="stack">
      <SectionCard
        title="Library"
        description={`${pluralize(exercises.length, 'exercise')} ready to use.`}
        action={
          <button className="primary-button" onClick={openCreateModal}>
            Add exercise
          </button>
        }
      >
        <div className="stack compact">
          <div className="form-grid progression-filters">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search exercises"
            />
            <DropdownField
              label="Filter"
              value={trackingFilter}
              placeholder="All tracking"
              options={[
                { value: 'all', label: 'All tracking' },
                { value: 'weight_reps', label: 'Load + reps' },
                { value: 'bodyweight_reps', label: 'Bodyweight reps' },
                { value: 'assisted_bodyweight_reps', label: 'Assisted reps' },
                { value: 'duration', label: 'Duration' },
              ]}
              onChange={(value) => setTrackingFilter(value as 'all' | TrackingMode)}
            />
          </div>

          {filteredExercises.length ? (
            filteredExercises.map((exercise) => {
              const isEditing = exercise.id === editingExerciseId

              return (
                <article
                  className="list-card interactive left-align"
                  key={exercise.id}
                  onClick={() => startEditing(exercise)}
                >
                  <div>
                    <strong>{formatExerciseName(exercise)}</strong>
                    <p>
                      {[
                        formatExerciseMuscleLabel(exercise.bodyRegion, exercise.muscleGroup),
                        exercise.equipment,
                      ]
                        .filter(Boolean)
                        .join(' • ') || 'Custom movement'}
                    </p>
                    <p>{getTrackingModeLabel(exercise.trackingMode)}</p>
                  </div>
                  <div className="list-card-actions">
                    <span>{`${exercise.preferredWeightUnit == null ? 'Global' : 'Fixed'} • ${exercise.defaultRestSeconds ?? 120}s`}</span>
                    <button
                      className={`ghost-button compact-icon-button${isEditing ? ' is-active' : ''}`}
                      onClick={(event) => {
                        event.stopPropagation()
                        startEditing(exercise)
                      }}
                      aria-label={`Edit ${formatExerciseName(exercise)}`}
                      title={isEditing ? 'Editing exercise' : 'Edit exercise'}
                    >
                      <PencilLine size={16} strokeWidth={2.1} />
                    </button>
                  </div>
                </article>
              )
            })
          ) : (
            <p className="empty-state">No exercises match that filter.</p>
          )}
        </div>
      </SectionCard>

      {isEditorOpen ? (
        <div className="modal-backdrop" onClick={resetForm} role="presentation">
          <div
            className="modal-card"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="exercise-editor-title"
          >
            <div className="modal-header">
              <div>
                <strong id="exercise-editor-title">
                  {editingExerciseId ? 'Edit exercise' : 'Add exercise'}
                </strong>
                <p className="modal-copy">
                  {editingExerciseId
                    ? 'Seeded and custom exercises can both be reconfigured here.'
                    : 'Keep custom movement names short and obvious.'}
                </p>
              </div>
              <button
                className="ghost-button compact-icon-button modal-close-button"
                onClick={resetForm}
                aria-label="Close exercise editor"
                title="Close"
              >
                <X size={16} strokeWidth={2.2} />
              </button>
            </div>

            <div className="form-grid">
              <input
                value={movementName}
                onChange={(event) => setMovementName(event.target.value)}
                placeholder="Movement name"
              />
              <DropdownField
                label="Body region"
                value={bodyRegion}
                placeholder="Choose body region"
                options={Object.keys(BODY_REGION_OPTIONS).map((region) => ({
                  value: region,
                  label: region,
                }))}
                onChange={(value) => {
                  const nextBodyRegion = value as BodyRegion
                  setBodyRegion(nextBodyRegion)
                  setMuscleGroup(getDefaultMuscleGroup(nextBodyRegion))
                }}
              />
              <DropdownField
                label="Muscle group"
                value={muscleGroup}
                placeholder="Choose muscle group"
                options={BODY_REGION_OPTIONS[bodyRegion].map((group) => ({
                  value: group,
                  label: group,
                }))}
                onChange={setMuscleGroup}
              />
              <input
                value={equipment}
                onChange={(event) => setEquipment(event.target.value)}
                placeholder="Implement / equipment"
              />
              <DropdownField
                label="Weight unit"
                value={preferredWeightUnit}
                placeholder="Choose weight unit"
                options={[
                  { value: 'default', label: 'Use global default' },
                  { value: 'lb', label: 'Always pounds' },
                  { value: 'kg', label: 'Always kilograms' },
                ]}
                onChange={(value) => setPreferredWeightUnit(value as 'default' | WeightUnit)}
              />
              <DropdownField
                label="Tracking"
                value={trackingMode}
                placeholder="Choose tracking"
                options={[
                  { value: 'weight_reps', label: 'Load + reps' },
                  { value: 'bodyweight_reps', label: 'Bodyweight reps' },
                  { value: 'assisted_bodyweight_reps', label: 'Assisted reps' },
                  { value: 'duration', label: 'Duration' },
                ]}
                onChange={(value) => setTrackingMode(value as TrackingMode)}
              />
              <input
                value={rest}
                onChange={(event) => setRest(event.target.value)}
                placeholder="Rest seconds"
                inputMode="numeric"
              />
            </div>

            <div className="modal-actions">
              <button className="ghost-button" onClick={resetForm}>
                Cancel
              </button>
              {editingExerciseId ? (
                <button className="ghost-button" onClick={cloneEditingExercise}>
                  Clone
                </button>
              ) : null}
              <button className="primary-button" onClick={() => void submit()}>
                {editingExerciseId ? 'Save changes' : 'Save exercise'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
