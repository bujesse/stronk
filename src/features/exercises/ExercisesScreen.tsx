import { useState } from 'react'
import { PencilLine } from 'lucide-react'
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

  function resetForm() {
    setMovementName('')
    setBodyRegion('Chest')
    setMuscleGroup(getDefaultMuscleGroup('Chest'))
    setEquipment('')
    setPreferredWeightUnit('default')
    setTrackingMode('weight_reps')
    setRest('')
    setEditingExerciseId(null)
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
        title={editingExerciseId ? 'Edit exercise' : 'Add exercise'}
        description={
          editingExerciseId
            ? 'Seeded and custom exercises can both be reconfigured here.'
            : 'Keep custom movement names short and obvious.'
        }
      >
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
          <input value={equipment} onChange={(event) => setEquipment(event.target.value)} placeholder="Implement / equipment" />
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
          <button className="primary-button" onClick={submit}>
            {editingExerciseId ? 'Save changes' : 'Save exercise'}
          </button>
          {editingExerciseId ? (
            <button className="ghost-button" onClick={resetForm}>
              Cancel
            </button>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard
        title="Library"
        description={`${pluralize(exercises.length, 'exercise')} ready to use.`}
      >
        <div className="grid-list">
          {exercises.map((exercise) => (
            <article className="list-card" key={exercise.id}>
              <div>
                <strong>{formatExerciseName(exercise)}</strong>
                <p>
                  {[formatExerciseMuscleLabel(exercise.bodyRegion, exercise.muscleGroup), exercise.equipment]
                    .filter(Boolean)
                    .join(' • ') || 'Custom movement'}
                </p>
                <p>{getTrackingModeLabel(exercise.trackingMode)}</p>
              </div>
              <div className="list-card-actions">
                <span>{`${exercise.preferredWeightUnit?.toUpperCase() ?? 'GLOBAL'} • ${exercise.defaultRestSeconds ?? 120}s`}</span>
                <button
                  className="ghost-button compact-icon-button"
                  onClick={() => startEditing(exercise)}
                  aria-label={`Edit ${formatExerciseName(exercise)}`}
                  title="Edit exercise"
                >
                  <PencilLine size={16} strokeWidth={2.1} />
                </button>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}
