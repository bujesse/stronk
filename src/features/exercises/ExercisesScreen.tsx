import { useState } from 'react'
import { DropdownField } from '../../components/DropdownField'
import { SectionCard } from '../../components/SectionCard'
import {
  formatExerciseMuscleLabel,
  getTrackingModeLabel,
  pluralize,
} from '../../lib/format'
import { BODY_REGION_OPTIONS, getDefaultMuscleGroup } from '../../lib/muscles'
import type { BodyRegion, Exercise, TrackingMode } from '../../lib/types'

interface ExercisesScreenProps {
  exercises: Exercise[]
  onCreateExercise: (input: {
    name: string
    bodyRegion?: BodyRegion | null
    muscleGroup?: string
    equipment?: string
    trackingMode: TrackingMode
    defaultRestSeconds?: number | null
  }) => Promise<void>
}

export function ExercisesScreen({
  exercises,
  onCreateExercise,
}: ExercisesScreenProps) {
  const [name, setName] = useState('')
  const [bodyRegion, setBodyRegion] = useState<BodyRegion>('Chest')
  const [muscleGroup, setMuscleGroup] = useState(getDefaultMuscleGroup('Chest'))
  const [equipment, setEquipment] = useState('')
  const [trackingMode, setTrackingMode] = useState<TrackingMode>('weight_reps')
  const [rest, setRest] = useState('')

  async function submit() {
    if (!name.trim()) {
      return
    }

    await onCreateExercise({
      name,
      bodyRegion,
      muscleGroup,
      equipment,
      trackingMode,
      defaultRestSeconds: rest ? Number(rest) : null,
    })

    setName('')
    setBodyRegion('Chest')
    setMuscleGroup(getDefaultMuscleGroup('Chest'))
    setEquipment('')
    setTrackingMode('weight_reps')
    setRest('')
  }

  return (
    <div className="stack">
      <SectionCard title="Add exercise" description="Keep custom movement names short and obvious.">
        <div className="form-grid">
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Exercise name" />
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
          <input value={equipment} onChange={(event) => setEquipment(event.target.value)} placeholder="Equipment" />
          <DropdownField
            label="Tracking"
            value={trackingMode}
            placeholder="Choose tracking"
            options={[
              { value: 'weight_reps', label: 'Load + reps' },
              { value: 'bodyweight_reps', label: 'Bodyweight reps' },
              { value: 'assisted_bodyweight_reps', label: 'Assisted reps' },
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
            Save exercise
          </button>
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
                <strong>{exercise.name}</strong>
                <p>
                  {[formatExerciseMuscleLabel(exercise.bodyRegion, exercise.muscleGroup), exercise.equipment]
                    .filter(Boolean)
                    .join(' • ') || 'Custom movement'}
                </p>
                <p>{getTrackingModeLabel(exercise.trackingMode)}</p>
              </div>
              <span>{exercise.defaultRestSeconds ?? 120}s</span>
            </article>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}
