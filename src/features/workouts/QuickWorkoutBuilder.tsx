import { DropdownField } from '../../components/DropdownField'
import { SectionCard } from '../../components/SectionCard'
import { useAnimatedList } from '../../hooks/useAnimatedList'
import { formatExerciseName } from '../../lib/format'
import type { Exercise } from '../../lib/types'

interface QuickWorkoutBuilderProps {
  exercises: Exercise[]
  quickName: string
  selectedExerciseIds: string[]
  quickExerciseToAdd: string
  onQuickNameChange: (value: string) => void
  onQuickExerciseToAddChange: (value: string) => void
  onAddExercise: () => void
  onRemoveExercise: (exerciseId: string) => void
  onStart: () => Promise<void>
}

export function QuickWorkoutBuilder({
  exercises,
  quickName,
  selectedExerciseIds,
  quickExerciseToAdd,
  onQuickNameChange,
  onQuickExerciseToAddChange,
  onAddExercise,
  onRemoveExercise,
  onStart,
}: QuickWorkoutBuilderProps) {
  const [quickExerciseListRef] = useAnimatedList()

  return (
    <div className="stack">
      <SectionCard title="Quick workout" description="Build an ad hoc session without making a template.">
        <div className="form-grid">
          <input value={quickName} onChange={(event) => onQuickNameChange(event.target.value)} placeholder="Upper body" />
          <div className="inline-actions align-end add-exercise-row">
            <DropdownField
              label="Exercise"
              value={quickExerciseToAdd}
              placeholder="Choose exercise"
              searchable
              emptyMessage="No exercises match that search."
              options={exercises
                .filter((exercise) => !selectedExerciseIds.includes(exercise.id))
                .map((exercise) => ({
                  value: exercise.id,
                  label: formatExerciseName(exercise),
                }))}
              onChange={onQuickExerciseToAddChange}
            />
            <button className="primary-button" onClick={onAddExercise}>
              Add
            </button>
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
          ) : (
            <p className="empty-state">Add exercises to build your quick workout.</p>
          )}
          <button className="primary-button" onClick={() => void onStart()}>
            Start quick workout
          </button>
        </div>
      </SectionCard>
    </div>
  )
}
