import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { DropdownField } from '../../components/DropdownField'
import { SectionCard } from '../../components/SectionCard'
import { useAnimatedList } from '../../hooks/useAnimatedList'
import {
  fromStorageWeight,
  formatExerciseName,
  getExerciseDisplayWeightUnit,
  getExerciseTrackingMode,
  pluralize,
} from '../../lib/format'
import type {
  Exercise,
  TemplateSetDraft,
  TemplateWithDetails,
  WeightUnit,
} from '../../lib/types'

interface TemplatesScreenProps {
  exercises: Exercise[]
  templates: TemplateWithDetails[]
  editingTemplateId: string | null
  weightUnit: WeightUnit
  onCreateTemplate: (input: {
    name: string
    notes: string
    exerciseIds: string[]
    setDrafts: Record<string, TemplateSetDraft[]>
  }) => Promise<void>
  onUpdateTemplate: (
    templateId: string,
    input: {
      name: string
      notes: string
      exerciseIds: string[]
      setDrafts: Record<string, TemplateSetDraft[]>
    },
  ) => Promise<void>
  onCancelEditing: () => void
  onEditTemplate: (templateId: string) => void
  onStartTemplate: (templateId: string) => void
}

const emptySet = (): TemplateSetDraft => ({
  setKind: 'normal',
  reps: '',
  weight: '',
  assistanceWeight: '',
  durationMinutes: '',
})

export function TemplatesScreen({
  exercises,
  templates,
  editingTemplateId,
  weightUnit,
  onCreateTemplate,
  onUpdateTemplate,
  onCancelEditing,
  onEditTemplate,
  onStartTemplate,
}: TemplatesScreenProps) {
  const [exerciseListRef] = useAnimatedList()
  const editingTemplate = templates.find(({ template }) => template.id === editingTemplateId) ?? null
  const [name, setName] = useState(editingTemplate?.template.name ?? '')
  const [notes, setNotes] = useState(editingTemplate?.template.notes ?? '')
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>(
    editingTemplate?.items.map((item) => item.exercise.id) ?? [],
  )
  const [setDrafts, setSetDrafts] = useState<Record<string, TemplateSetDraft[]>>(
    editingTemplate
      ? Object.fromEntries(
          editingTemplate.items.map((item) => [
            item.exercise.id,
            item.sets.map((set) => {
              const displayWeightUnit = getExerciseDisplayWeightUnit(item.exercise, weightUnit)

              return {
                setKind: set.setKind,
                reps: set.targetReps != null ? String(set.targetReps) : '',
                weight:
                  set.targetWeight != null
                    ? String(fromStorageWeight(set.targetWeight, displayWeightUnit) ?? '')
                    : '',
                assistanceWeight:
                  set.targetAssistanceWeight != null
                    ? String(
                        fromStorageWeight(set.targetAssistanceWeight, displayWeightUnit) ?? '',
                      )
                    : '',
                durationMinutes:
                  set.targetDurationSeconds != null
                    ? String(Number((set.targetDurationSeconds / 60).toFixed(2)))
                    : '',
              }
            }),
          ]),
        )
      : {},
  )

  const availableExercises = useMemo(
    () => exercises.filter((exercise) => !selectedExerciseIds.includes(exercise.id)),
    [exercises, selectedExerciseIds],
  )

  function addExercise(exerciseId: string) {
    setSelectedExerciseIds((current) => [...current, exerciseId])
    setSetDrafts((current) => ({
      ...current,
      [exerciseId]: current[exerciseId] ?? [emptySet()],
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

  function moveExercise(exerciseId: string, direction: 'up' | 'down') {
    setSelectedExerciseIds((current) => {
      const next = [...current]
      const currentIndex = next.findIndex((id) => id === exerciseId)
      if (currentIndex < 0) {
        return current
      }

      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
      if (targetIndex < 0 || targetIndex >= next.length) {
        return current
      }

      ;[next[currentIndex], next[targetIndex]] = [next[targetIndex], next[currentIndex]]
      return next
    })
  }

  async function submit() {
    if (!name.trim() || selectedExerciseIds.length === 0) {
      return
    }

    const input = {
      name,
      notes,
      exerciseIds: selectedExerciseIds,
      setDrafts,
    }

    if (editingTemplate) {
      await onUpdateTemplate(editingTemplate.template.id, input)
      onCancelEditing()
      return
    }

    await onCreateTemplate(input)

    setName('')
    setNotes('')
    setSelectedExerciseIds([])
    setSetDrafts({})
  }

  return (
    <div className="stack">
      <SectionCard
        title={editingTemplate ? 'Edit template' : 'Build template'}
        description={
          editingTemplate
            ? 'Adjust the copied template before using it again.'
            : 'Assemble the session you repeat most often.'
        }
        action={
          editingTemplate ? (
            <button className="ghost-button" onClick={onCancelEditing}>
              Cancel
            </button>
          ) : undefined
        }
      >
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
                label: formatExerciseName(exercise),
              }))}
              onChange={addExercise}
            />
          ) : null}
        </div>

        <div className="stack compact" ref={exerciseListRef}>
          {selectedExerciseIds.map((exerciseId) => {
            const exercise = exercises.find((entry) => entry.id === exerciseId)
            if (!exercise) {
              return null
            }

            const trackingMode = getExerciseTrackingMode(exercise)

            return (
              <TemplateExerciseCard
                key={exerciseId}
                exercise={exercise}
                exerciseId={exerciseId}
                trackingMode={trackingMode}
                drafts={setDrafts[exerciseId] ?? []}
                weightUnit={weightUnit}
                onAddSet={addSet}
                onUpdateDraft={updateDraft}
                onMoveExercise={moveExercise}
                isFirst={selectedExerciseIds[0] === exerciseId}
                isLast={selectedExerciseIds[selectedExerciseIds.length - 1] === exerciseId}
              />
            )
          })}
        </div>

        <button className="primary-button" onClick={submit}>
          {editingTemplate ? 'Save changes' : 'Save template'}
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
              <div className="list-card-actions">
                <button className="ghost-button" onClick={() => onEditTemplate(template.id)}>
                  {editingTemplateId === template.id ? 'Editing' : 'Edit'}
                </button>
                <button className="ghost-button" onClick={() => onStartTemplate(template.id)}>
                  Start
                </button>
              </div>
            </article>
          ))}
          {templates.length === 0 ? <p className="empty-state">No templates yet.</p> : null}
        </div>
      </SectionCard>
    </div>
  )
}

interface TemplateExerciseCardProps {
  exercise: Exercise
  exerciseId: string
  trackingMode: ReturnType<typeof getExerciseTrackingMode>
  drafts: TemplateSetDraft[]
  weightUnit: WeightUnit
  onAddSet: (exerciseId: string) => void
  onMoveExercise: (exerciseId: string, direction: 'up' | 'down') => void
  isFirst: boolean
  isLast: boolean
  onUpdateDraft: (
    exerciseId: string,
    index: number,
    field: keyof TemplateSetDraft,
    value: string,
  ) => void
}

function TemplateExerciseCard({
  exercise,
  exerciseId,
  trackingMode,
  drafts,
  weightUnit,
  onAddSet,
  onMoveExercise,
  isFirst,
  isLast,
  onUpdateDraft,
}: TemplateExerciseCardProps) {
  const [setGridRef] = useAnimatedList()
  const displayWeightUnit = getExerciseDisplayWeightUnit(exercise, weightUnit)

  return (
    <div className="embedded-card">
      <div className="section-header">
        <strong>{formatExerciseName(exercise)}</strong>
        <div className="section-actions">
          <button
            className="ghost-button compact-icon-button"
            onClick={() => onMoveExercise(exerciseId, 'up')}
            disabled={isFirst}
            type="button"
            aria-label={`Move ${formatExerciseName(exercise)} up`}
            title="Move up"
          >
            <ChevronUp size={16} strokeWidth={2.2} />
          </button>
          <button
            className="ghost-button compact-icon-button"
            onClick={() => onMoveExercise(exerciseId, 'down')}
            disabled={isLast}
            type="button"
            aria-label={`Move ${formatExerciseName(exercise)} down`}
            title="Move down"
          >
            <ChevronDown size={16} strokeWidth={2.2} />
          </button>
          <button className="ghost-button" onClick={() => onAddSet(exerciseId)}>
            Add set
          </button>
        </div>
      </div>
      <div className="set-grid" ref={setGridRef}>
        {drafts.map((draft, index) => (
          <div className="set-row template-set-row" key={`${exerciseId}-${index}`}>
            <span>Set {index + 1}</span>
            <button
              className={draft.setKind === 'warmup' ? 'chip-button active warmup-toggle' : 'chip-button warmup-toggle'}
              onClick={() =>
                onUpdateDraft(
                  exerciseId,
                  index,
                  'setKind',
                  draft.setKind === 'warmup' ? 'normal' : 'warmup',
                )
              }
              type="button"
              aria-label={draft.setKind === 'warmup' ? 'Mark as working set' : 'Mark as warm-up set'}
              title={draft.setKind === 'warmup' ? 'Warm-up set' : 'Mark warm-up'}
            >
              WU
            </button>
            {trackingMode !== 'duration' ? (
              <input
                value={draft.reps}
                onChange={(event) => onUpdateDraft(exerciseId, index, 'reps', event.target.value)}
                placeholder="Reps"
                inputMode="numeric"
              />
            ) : null}
            {trackingMode === 'duration' ? (
              <input
                value={draft.durationMinutes}
                onChange={(event) =>
                  onUpdateDraft(exerciseId, index, 'durationMinutes', event.target.value)
                }
                placeholder="Minutes"
                inputMode="decimal"
              />
            ) : null}
            {trackingMode === 'weight_reps' ? (
              <input
                value={draft.weight}
                onChange={(event) => onUpdateDraft(exerciseId, index, 'weight', event.target.value)}
                placeholder={`Weight (${displayWeightUnit})`}
                inputMode="decimal"
              />
            ) : null}
            {trackingMode === 'assisted_bodyweight_reps' ? (
              <input
                value={draft.assistanceWeight}
                onChange={(event) =>
                  onUpdateDraft(exerciseId, index, 'assistanceWeight', event.target.value)
                }
                placeholder={`Assist (${displayWeightUnit})`}
                inputMode="decimal"
              />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}
