import { DropdownField } from '../../components/DropdownField'
import { SectionCard } from '../../components/SectionCard'
import { useAnimatedList } from '../../hooks/useAnimatedList'
import { formatExerciseName } from '../../lib/format'
import type { Exercise } from '../../lib/types'

interface QuickWorkoutBuilderProps {
  exercises: Exercise[]
  quickName: string
  selectedExerciseIds: string[]
  onQuickNameChange: (value: string) => void
  onAddExercise: (exerciseId: string) => void
  onRemoveExercise: (exerciseId: string) => void
  onStart: () => Promise<void>
}

export function QuickWorkoutBuilder({
  exercises,
  quickName,
  selectedExerciseIds,
  onQuickNameChange,
  onAddExercise,
  onRemoveExercise,
  onStart,
}: QuickWorkoutBuilderProps) {
  const [quickExerciseListRef] = useAnimatedList()

  return (
    <div className="stack">
      <SectionCard title="Quick workout">
        <div className="form-grid">
          <input value={quickName} onChange={(event) => onQuickNameChange(event.target.value)} placeholder="Upper body" />
          <div className="inline-actions align-end add-exercise-row">
            <DropdownField
              label="Exercise"
              value=""
              placeholder="Choose exercise"
              searchable
              emptyMessage="No exercises match that search."
              options={exercises
                .filter((exercise) => !selectedExerciseIds.includes(exercise.id))
                .map((exercise) => ({
                  value: exercise.id,
                  label: formatExerciseName(exercise),
                }))}
              onChange={onAddExercise}
            />
          </div>
          {selectedExerciseIds.length > 0 ? (
            <div className="chip-row" ref={quickExerciseListRef}>
              {selectedExerciseIds.map((exerciseId) => {
                const exercise = exercises.find((entry) => entry.id === exerciseId)
                if (!exercise) {
                  return null
                }

                return (
                  <button
                    key={exercise.id}
                    className="chip-button active"
                    onClick={() => onRemoveExercise(exercise.id)}
                  >
                    {formatExerciseName(exercise)}
                  </button>
                )
              })}
            </div>
          ) : null}
          <button className="primary-button" onClick={() => void onStart()}>
            Start quick workout
          </button>
        </div>
      </SectionCard>
    </div>
  )
}
