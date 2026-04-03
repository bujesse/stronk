import { useMemo, useState } from 'react'
import { DropdownField } from '../../components/DropdownField'
import { SectionCard } from '../../components/SectionCard'
import { getExerciseTrackingMode, pluralize } from '../../lib/format'
import type {
  Exercise,
  TemplateSetDraft,
  TemplateWithDetails,
  WeightUnit,
} from '../../lib/types'

interface TemplatesScreenProps {
  exercises: Exercise[]
  templates: TemplateWithDetails[]
  weightUnit: WeightUnit
  onCreateTemplate: (input: {
    name: string
    notes: string
    exerciseIds: string[]
    setDrafts: Record<string, TemplateSetDraft[]>
  }) => Promise<void>
  onStartTemplate: (templateId: string) => void
}

const emptySet = (): TemplateSetDraft => ({ reps: '', weight: '', assistanceWeight: '' })

export function TemplatesScreen({
  exercises,
  templates,
  weightUnit,
  onCreateTemplate,
  onStartTemplate,
}: TemplatesScreenProps) {
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([])
  const [setDrafts, setSetDrafts] = useState<Record<string, TemplateSetDraft[]>>({})

  const availableExercises = useMemo(
    () => exercises.filter((exercise) => !selectedExerciseIds.includes(exercise.id)),
    [exercises, selectedExerciseIds],
  )

  function addExercise(exerciseId: string) {
    setSelectedExerciseIds((current) => [...current, exerciseId])
    setSetDrafts((current) => ({
      ...current,
      [exerciseId]: current[exerciseId] ?? [emptySet(), emptySet(), emptySet()],
    }))
  }

  function updateDraft(
    exerciseId: string,
    index: number,
    field: keyof TemplateSetDraft,
    value: string,
  ) {
    setSetDrafts((current) => ({
      ...current,
      [exerciseId]: (current[exerciseId] ?? []).map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, [field]: value } : entry,
      ),
    }))
  }

  function addSet(exerciseId: string) {
    setSetDrafts((current) => ({
      ...current,
      [exerciseId]: [...(current[exerciseId] ?? []), emptySet()],
    }))
  }

  async function submit() {
    if (!name.trim() || selectedExerciseIds.length === 0) {
      return
    }

    await onCreateTemplate({
      name,
      notes,
      exerciseIds: selectedExerciseIds,
      setDrafts,
    })

    setName('')
    setNotes('')
    setSelectedExerciseIds([])
    setSetDrafts({})
  }

  return (
    <div className="stack">
      <SectionCard title="Build template" description="Assemble the session you repeat most often.">
        <div className="form-grid">
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Push day" />
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional notes"
            rows={3}
          />
          {availableExercises.length > 0 ? (
            <DropdownField
              label="Add exercise"
              value=""
              placeholder="Add exercise"
              options={availableExercises.map((exercise) => ({
                value: exercise.id,
                label: exercise.name,
              }))}
              onChange={addExercise}
            />
          ) : null}
        </div>

        <div className="stack compact">
          {selectedExerciseIds.map((exerciseId) => {
            const exercise = exercises.find((entry) => entry.id === exerciseId)
            if (!exercise) {
              return null
            }

            const trackingMode = getExerciseTrackingMode(exercise)

            return (
              <div className="embedded-card" key={exerciseId}>
                <div className="section-header">
                  <strong>{exercise.name}</strong>
                  <button className="ghost-button" onClick={() => addSet(exerciseId)}>
                    Add set
                  </button>
                </div>
                <div className="set-grid">
                  {(setDrafts[exerciseId] ?? []).map((draft, index) => (
                    <div className="set-row" key={`${exerciseId}-${index}`}>
                      <span>Set {index + 1}</span>
                      <input
                        value={draft.reps}
                        onChange={(event) => updateDraft(exerciseId, index, 'reps', event.target.value)}
                        placeholder="Reps"
                        inputMode="numeric"
                      />
                      {trackingMode === 'weight_reps' ? (
                        <input
                          value={draft.weight}
                          onChange={(event) => updateDraft(exerciseId, index, 'weight', event.target.value)}
                          placeholder={`Weight (${weightUnit})`}
                          inputMode="decimal"
                        />
                      ) : null}
                      {trackingMode === 'assisted_bodyweight_reps' ? (
                        <input
                          value={draft.assistanceWeight}
                          onChange={(event) =>
                            updateDraft(exerciseId, index, 'assistanceWeight', event.target.value)
                          }
                          placeholder={`Assist (${weightUnit})`}
                          inputMode="decimal"
                        />
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <button className="primary-button" onClick={submit}>
          Save template
        </button>
      </SectionCard>

      <SectionCard title="Saved templates" description={`${pluralize(templates.length, 'template')} ready.`}>
        <div className="grid-list">
          {templates.map(({ template, items }) => (
            <article className="list-card" key={template.id}>
              <div>
                <strong>{template.name}</strong>
                <p>{pluralize(items.length, 'exercise')}</p>
              </div>
              <button className="ghost-button" onClick={() => onStartTemplate(template.id)}>
                Start
              </button>
            </article>
          ))}
          {templates.length === 0 ? <p className="empty-state">No templates yet.</p> : null}
        </div>
      </SectionCard>
    </div>
  )
}
