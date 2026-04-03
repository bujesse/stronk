import { useState } from 'react'
import { SectionCard } from '../../components/SectionCard'
import { pluralize } from '../../lib/format'
import type { Exercise } from '../../lib/types'

interface ExercisesScreenProps {
  exercises: Exercise[]
  onCreateExercise: (input: {
    name: string
    muscleGroup?: string
    equipment?: string
    defaultRestSeconds?: number | null
  }) => Promise<void>
}

export function ExercisesScreen({
  exercises,
  onCreateExercise,
}: ExercisesScreenProps) {
  const [name, setName] = useState('')
  const [muscleGroup, setMuscleGroup] = useState('')
  const [equipment, setEquipment] = useState('')
  const [rest, setRest] = useState('')

  async function submit() {
    if (!name.trim()) {
      return
    }

    await onCreateExercise({
      name,
      muscleGroup,
      equipment,
      defaultRestSeconds: rest ? Number(rest) : null,
    })

    setName('')
    setMuscleGroup('')
    setEquipment('')
    setRest('')
  }

  return (
    <div className="stack">
      <SectionCard title="Add exercise" description="Keep custom movement names short and obvious.">
        <div className="form-grid">
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Exercise name" />
          <input value={muscleGroup} onChange={(event) => setMuscleGroup(event.target.value)} placeholder="Muscle group" />
          <input value={equipment} onChange={(event) => setEquipment(event.target.value)} placeholder="Equipment" />
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
                  {[exercise.muscleGroup, exercise.equipment].filter(Boolean).join(' • ') || 'Custom movement'}
                </p>
              </div>
              <span>{exercise.defaultRestSeconds ?? 120}s</span>
            </article>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}
