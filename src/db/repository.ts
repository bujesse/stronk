import { db } from './appDb'
import { createId } from '../lib/id'
import { nowIso } from '../lib/time'
import { buildExerciseAnalytics } from '../lib/analytics'
import { formatExerciseName, getExerciseTrackingMode, toStorageWeight } from '../lib/format'
import type {
  BodyRegion,
  ExerciseNoteEntry,
  ExerciseAnalytics,
  LoggedSet,
  Preferences,
  TrackingMode,
  TemplateSetDraft,
  TemplateExercise,
  TemplateSet,
  TemplateWithDetails,
  Workout,
  WorkoutNoteEntry,
  WorkoutExercise,
  WorkoutTemplate,
  WorkoutWithDetails,
} from '../lib/types'

async function queue(entity: string, entityId: string, operation: 'upsert' | 'delete', payload: object) {
  const timestamp = nowIso()
  await db.syncQueue.put({
    id: createId('sync'),
    entity,
    entityId,
    operation,
    payload,
    createdAt: timestamp,
    updatedAt: timestamp,
    status: 'queued',
    errorMessage: null,
  })
}

export async function getPreferences() {
  return db.preferences.get('preferences')
}

async function getWeightUnit() {
  const preferences = await getPreferences()
  return preferences?.weightUnit ?? 'lb'
}

async function getExerciseWeightUnit(exerciseId: string) {
  const [exercise, fallbackUnit] = await Promise.all([db.exercises.get(exerciseId), getWeightUnit()])
  return exercise?.preferredWeightUnit ?? fallbackUnit
}

export async function savePreferences(updates: Partial<Preferences>) {
  const current = await db.preferences.get('preferences')
  if (!current) {
    return
  }

  const next = {
    ...current,
    ...updates,
    updatedAt: nowIso(),
  }

  await db.preferences.put(next)

  const syncableUpdates = Object.keys(updates).filter((key) => key !== 'activeTimerEndAt')
  if (syncableUpdates.length > 0) {
    await queue('preferences', next.id, 'upsert', {
      id: next.id,
      weightUnit: next.weightUnit,
      defaultRestSeconds: next.defaultRestSeconds,
      updatedAt: next.updatedAt,
    })
  }
}

export async function createExercise(input: {
  movementName: string
  bodyRegion?: BodyRegion | null
  muscleGroup?: string
  equipment?: string
  preferredWeightUnit?: Preferences['weightUnit'] | null
  trackingMode: TrackingMode
  defaultRestSeconds?: number | null
}) {
  const timestamp = nowIso()
  const exercise = {
    id: createId('exercise'),
    movementName: input.movementName.trim(),
    bodyRegion: input.bodyRegion ?? null,
    muscleGroup: input.muscleGroup?.trim() || null,
    equipment: input.equipment?.trim() || null,
    preferredWeightUnit: input.preferredWeightUnit ?? null,
    trackingMode: input.trackingMode,
    defaultRestSeconds: input.defaultRestSeconds ?? null,
    isCustom: true,
    deletedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    syncStatus: 'pending',
  } satisfies Parameters<typeof db.exercises.put>[0]

  await db.exercises.put(exercise)
  await queue('exercise', exercise.id, 'upsert', exercise)
  return exercise
}

export async function updateExercise(
  exerciseId: string,
  updates: {
    movementName: string
    bodyRegion?: BodyRegion | null
    muscleGroup?: string
    equipment?: string
    preferredWeightUnit?: Preferences['weightUnit'] | null
    trackingMode: TrackingMode
    defaultRestSeconds?: number | null
  },
) {
  const current = await db.exercises.get(exerciseId)
  if (!current) {
    return null
  }

  const next = {
    ...current,
    movementName: updates.movementName.trim(),
    bodyRegion: updates.bodyRegion ?? null,
    muscleGroup: updates.muscleGroup?.trim() || null,
    equipment: updates.equipment?.trim() || null,
    preferredWeightUnit: updates.preferredWeightUnit ?? null,
    trackingMode: updates.trackingMode,
    defaultRestSeconds: updates.defaultRestSeconds ?? null,
    updatedAt: nowIso(),
    syncStatus: 'pending' as const,
  }

  await db.exercises.put(next)
  await queue('exercise', next.id, 'upsert', next)
  return next
}

export async function listExercises() {
  return (await db.exercises.toArray())
    .filter((exercise) => exercise.deletedAt == null)
    .sort((left, right) => formatExerciseName(left).localeCompare(formatExerciseName(right)))
}

export async function createTemplate(input: {
  name: string
  notes: string
  exerciseIds: string[]
  setDrafts: Record<string, TemplateSetDraft[]>
}) {
  const timestamp = nowIso()
  const templateId = createId('template')

  await db.transaction(
    'rw',
    [db.workoutTemplates, db.templateExercises, db.templateSets, db.syncQueue],
    async () => {
      const template: WorkoutTemplate = {
        id: templateId,
        name: input.name.trim(),
        notes: input.notes.trim(),
        deletedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
        syncStatus: 'pending',
      }

      await db.workoutTemplates.put(template)
      await queue('workoutTemplate', template.id, 'upsert', template)

      await insertTemplateItems(templateId, input, timestamp)
    },
  )

  return templateId
}

async function insertTemplateItems(
  templateId: string,
  input: {
    exerciseIds: string[]
    setDrafts: Record<string, TemplateSetDraft[]>
  },
  timestamp: string,
) {
  for (const [index, exerciseId] of input.exerciseIds.entries()) {
    const exercise = await db.exercises.get(exerciseId)
    const trackingMode = exercise ? getExerciseTrackingMode(exercise) : 'weight_reps'
    const weightUnit = exercise?.preferredWeightUnit ?? (await getWeightUnit())
    const templateExercise: TemplateExercise = {
      id: createId('templateExercise'),
      templateId,
      exerciseId,
      sortOrder: index,
      deletedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      syncStatus: 'pending',
    }

    await db.templateExercises.put(templateExercise)
    await queue('templateExercise', templateExercise.id, 'upsert', templateExercise)

    const drafts = input.setDrafts[exerciseId] ?? []
    for (const [setIndex, draft] of drafts.entries()) {
      const templateSet: TemplateSet = {
        id: createId('templateSet'),
        templateExerciseId: templateExercise.id,
        sortOrder: setIndex,
        setKind: draft.setKind,
        targetReps: draft.reps ? Number(draft.reps) : null,
        targetWeight:
          trackingMode === 'weight_reps' && draft.weight
            ? toStorageWeight(Number(draft.weight), weightUnit)
            : null,
        targetAssistanceWeight:
          trackingMode === 'assisted_bodyweight_reps' && draft.assistanceWeight
            ? toStorageWeight(Number(draft.assistanceWeight), weightUnit)
            : null,
        targetDurationSeconds:
          trackingMode === 'duration' && draft.durationMinutes
            ? Math.round(Number(draft.durationMinutes) * 60)
            : null,
        deletedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
        syncStatus: 'pending',
      }

      await db.templateSets.put(templateSet)
      await queue('templateSet', templateSet.id, 'upsert', templateSet)
    }
  }
}

export async function updateTemplate(
  templateId: string,
  input: {
    name: string
    notes: string
    exerciseIds: string[]
    setDrafts: Record<string, TemplateSetDraft[]>
  },
) {
  const current = await db.workoutTemplates.get(templateId)
  if (!current) {
    return null
  }

  const timestamp = nowIso()
  await db.transaction(
    'rw',
    [db.workoutTemplates, db.templateExercises, db.templateSets, db.syncQueue],
    async () => {
      const template: WorkoutTemplate = {
        ...current,
        name: input.name.trim(),
        notes: input.notes.trim(),
        updatedAt: timestamp,
        syncStatus: 'pending',
      }

      await db.workoutTemplates.put(template)
      await queue('workoutTemplate', template.id, 'upsert', template)

      const existingTemplateExercises = (await db.templateExercises.where({ templateId }).toArray()).filter(
        (item) => item.deletedAt == null,
      )
      const existingTemplateExerciseIds = new Set(existingTemplateExercises.map((item) => item.id))
      const existingTemplateSets = (await db.templateSets.toArray()).filter(
        (item) => item.deletedAt == null && existingTemplateExerciseIds.has(item.templateExerciseId),
      )

      for (const existingSet of existingTemplateSets) {
        const deletedSet: TemplateSet = {
          ...existingSet,
          deletedAt: timestamp,
          updatedAt: timestamp,
          syncStatus: 'pending',
        }

        await db.templateSets.put(deletedSet)
        await queue('templateSet', deletedSet.id, 'delete', deletedSet)
      }

      for (const existingTemplateExercise of existingTemplateExercises) {
        const deletedTemplateExercise: TemplateExercise = {
          ...existingTemplateExercise,
          deletedAt: timestamp,
          updatedAt: timestamp,
          syncStatus: 'pending',
        }

        await db.templateExercises.put(deletedTemplateExercise)
        await queue('templateExercise', deletedTemplateExercise.id, 'delete', deletedTemplateExercise)
      }

      await insertTemplateItems(templateId, input, timestamp)
    },
  )

  return templateId
}

export async function createTemplateFromWorkout(workoutId: string) {
  const workout = await getWorkoutById(workoutId)
  if (!workout) {
    return null
  }

  const timestamp = nowIso()
  const templateId = createId('template')

  await db.transaction(
    'rw',
    [db.workoutTemplates, db.templateExercises, db.templateSets, db.syncQueue],
    async () => {
      const template: WorkoutTemplate = {
        id: templateId,
        name: workout.workout.name,
        notes: workout.workout.notes.trim(),
        deletedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
        syncStatus: 'pending',
      }

      await db.workoutTemplates.put(template)
      await queue('workoutTemplate', template.id, 'upsert', template)

      for (const item of workout.items) {
        const templateExercise: TemplateExercise = {
          id: createId('templateExercise'),
          templateId,
          exerciseId: item.exercise.id,
          sortOrder: item.workoutExercise.sortOrder,
          deletedAt: null,
          createdAt: timestamp,
          updatedAt: timestamp,
          syncStatus: 'pending',
        }

        await db.templateExercises.put(templateExercise)
        await queue('templateExercise', templateExercise.id, 'upsert', templateExercise)

        for (const set of item.sets) {
          const templateSet: TemplateSet = {
            id: createId('templateSet'),
            templateExerciseId: templateExercise.id,
            sortOrder: set.sortOrder,
            setKind: set.setKind,
            targetReps: set.reps,
            targetWeight: set.weight,
            targetAssistanceWeight: set.assistanceWeight,
            targetDurationSeconds: set.durationSeconds,
            deletedAt: null,
            createdAt: timestamp,
            updatedAt: timestamp,
            syncStatus: 'pending',
          }

          await db.templateSets.put(templateSet)
          await queue('templateSet', templateSet.id, 'upsert', templateSet)
        }
      }
    },
  )

  return templateId
}

export async function listTemplates(): Promise<TemplateWithDetails[]> {
  const templates = (await db.workoutTemplates.toArray()).filter((item) => item.deletedAt == null)
  const templateExercises = (await db.templateExercises.toArray()).filter((item) => item.deletedAt == null)
  const templateSets = (await db.templateSets.toArray()).filter((item) => item.deletedAt == null)
  const exercises = (await db.exercises.toArray()).filter((item) => item.deletedAt == null)

  return templates
    .map((template) => {
      const items = templateExercises
        .filter((entry) => entry.templateId === template.id)
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((entry) => ({
          templateExercise: entry,
          exercise: exercises.find((exercise) => exercise.id === entry.exerciseId)!,
          sets: templateSets
            .filter((set) => set.templateExerciseId === entry.id)
            .sort((left, right) => left.sortOrder - right.sortOrder),
        }))

      return { template, items }
    })
    .sort(
      (left, right) =>
        new Date(right.template.updatedAt).getTime() -
        new Date(left.template.updatedAt).getTime(),
    )
}

export async function startWorkoutFromTemplate(templateId: string) {
  const timestamp = nowIso()
  const template = await db.workoutTemplates.get(templateId)
  if (!template) {
    return null
  }

  const templateExercises = (await db.templateExercises.where({ templateId }).toArray()).sort(
    (left, right) => left.sortOrder - right.sortOrder,
  )
  const templateSets = await db.templateSets.toArray()

  const workoutId = createId('workout')

  await db.transaction(
    'rw',
    [db.workouts, db.workoutExercises, db.loggedSets, db.preferences, db.syncQueue],
    async () => {
      const workout: Workout = {
        id: workoutId,
        templateId: template.id,
        name: template.name,
        notes: '',
        caloriesBurned: null,
        status: 'active' as const,
        startedAt: timestamp,
        endedAt: null,
        deletedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
        syncStatus: 'pending',
      }

      await db.workouts.put(workout)
      await queue('workout', workout.id, 'upsert', workout)

      for (const [index, templateExercise] of templateExercises.entries()) {
        const workoutExercise: WorkoutExercise = {
          id: createId('workoutExercise'),
          workoutId,
          exerciseId: templateExercise.exerciseId,
          notes: '',
          sortOrder: index,
          deletedAt: null,
          createdAt: timestamp,
          updatedAt: timestamp,
          syncStatus: 'pending',
        }

        await db.workoutExercises.put(workoutExercise)
        await queue('workoutExercise', workoutExercise.id, 'upsert', workoutExercise)

        const sets = templateSets
          .filter((set) => set.templateExerciseId === templateExercise.id)
          .sort((left, right) => left.sortOrder - right.sortOrder)

        for (const [setIndex, set] of sets.entries()) {
          const loggedSet: LoggedSet = {
            id: createId('loggedSet'),
            workoutExerciseId: workoutExercise.id,
            plannedSetId: set.id,
            sortOrder: setIndex,
            setKind: set.setKind,
            reps: set.targetReps,
            weight: set.targetWeight,
            assistanceWeight: set.targetAssistanceWeight,
            durationSeconds: set.targetDurationSeconds,
            completedAt: null,
            deletedAt: null,
            createdAt: timestamp,
            updatedAt: timestamp,
            syncStatus: 'pending',
          }

          await db.loggedSets.put(loggedSet)
          await queue('loggedSet', loggedSet.id, 'upsert', loggedSet)
        }
      }
    },
  )

  return workoutId
}

export async function createQuickWorkout(name: string, exerciseIds: string[]) {
  const timestamp = nowIso()
  const workoutId = createId('workout')

  await db.transaction(
    'rw',
    [db.workouts, db.workoutExercises, db.loggedSets, db.syncQueue],
    async () => {
      const workout: Workout = {
        id: workoutId,
        templateId: null,
        name: name.trim() || 'Quick workout',
        notes: '',
        caloriesBurned: null,
        status: 'active' as const,
        startedAt: timestamp,
        endedAt: null,
        deletedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
        syncStatus: 'pending',
      }
      await db.workouts.put(workout)
      await queue('workout', workout.id, 'upsert', workout)

      for (const [index, exerciseId] of exerciseIds.entries()) {
        const workoutExercise: WorkoutExercise = {
          id: createId('workoutExercise'),
          workoutId,
          exerciseId,
          notes: '',
          sortOrder: index,
          deletedAt: null,
          createdAt: timestamp,
          updatedAt: timestamp,
          syncStatus: 'pending',
        }
        await db.workoutExercises.put(workoutExercise)
        await queue('workoutExercise', workoutExercise.id, 'upsert', workoutExercise)

        for (let setIndex = 0; setIndex < 1; setIndex += 1) {
          const loggedSet: LoggedSet = {
            id: createId('loggedSet'),
            workoutExerciseId: workoutExercise.id,
            plannedSetId: null,
            sortOrder: setIndex,
            setKind: 'normal',
            reps: null,
            weight: null,
            assistanceWeight: null,
            durationSeconds: null,
            completedAt: null,
            deletedAt: null,
            createdAt: timestamp,
            updatedAt: timestamp,
            syncStatus: 'pending',
          }

          await db.loggedSets.put(loggedSet)
          await queue('loggedSet', loggedSet.id, 'upsert', loggedSet)
        }
      }
    },
  )

  return workoutId
}

export async function repeatWorkout(workoutId: string) {
  const original = await db.workouts.get(workoutId)
  if (!original || original.deletedAt != null) {
    return null
  }

  const timestamp = nowIso()
  const nextWorkoutId = createId('workout')
  const workoutExercises = (await db.workoutExercises.where({ workoutId }).toArray())
    .filter((item) => item.deletedAt == null)
    .sort((left, right) => left.sortOrder - right.sortOrder)
  const loggedSets = (await db.loggedSets.toArray()).filter((item) => item.deletedAt == null)

  await db.transaction(
    'rw',
    [db.workouts, db.workoutExercises, db.loggedSets, db.preferences, db.syncQueue],
    async () => {
      const workout: Workout = {
        id: nextWorkoutId,
        templateId: original.templateId,
        name: original.name,
        notes: '',
        caloriesBurned: null,
        status: 'active',
        startedAt: timestamp,
        endedAt: null,
        deletedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
        syncStatus: 'pending',
      }

      await db.workouts.put(workout)
      await queue('workout', workout.id, 'upsert', workout)

      for (const originalWorkoutExercise of workoutExercises) {
        const workoutExercise: WorkoutExercise = {
          id: createId('workoutExercise'),
          workoutId: nextWorkoutId,
          exerciseId: originalWorkoutExercise.exerciseId,
          notes: originalWorkoutExercise.notes,
          sortOrder: originalWorkoutExercise.sortOrder,
          deletedAt: null,
          createdAt: timestamp,
          updatedAt: timestamp,
          syncStatus: 'pending',
        }

        await db.workoutExercises.put(workoutExercise)
        await queue('workoutExercise', workoutExercise.id, 'upsert', workoutExercise)

        const sets = loggedSets
          .filter((set) => set.workoutExerciseId === originalWorkoutExercise.id)
          .sort((left, right) => left.sortOrder - right.sortOrder)

        for (const originalSet of sets) {
          const loggedSet: LoggedSet = {
            id: createId('loggedSet'),
            workoutExerciseId: workoutExercise.id,
            plannedSetId: originalSet.plannedSetId,
            sortOrder: originalSet.sortOrder,
            setKind: originalSet.setKind,
            reps: originalSet.reps,
            weight: originalSet.weight,
            assistanceWeight: originalSet.assistanceWeight,
            durationSeconds: originalSet.durationSeconds,
            completedAt: null,
            deletedAt: null,
            createdAt: timestamp,
            updatedAt: timestamp,
            syncStatus: 'pending',
          }

          await db.loggedSets.put(loggedSet)
          await queue('loggedSet', loggedSet.id, 'upsert', loggedSet)
        }
      }

      await savePreferences({ activeTimerEndAt: null })
    },
  )

  return nextWorkoutId
}

export async function getActiveWorkout(): Promise<WorkoutWithDetails | null> {
  const workout = await db.workouts.where('status').equals('active').last()
  if (!workout || workout.deletedAt) {
    return null
  }

  return buildWorkoutWithDetails(workout)
}

async function buildWorkoutWithDetails(workout: Workout): Promise<WorkoutWithDetails> {
  const workoutExercises = (await db.workoutExercises.where({ workoutId: workout.id }).toArray())
    .filter((item) => item.deletedAt == null)
    .sort((left, right) => left.sortOrder - right.sortOrder)
  const loggedSets = (await db.loggedSets.toArray()).filter((item) => item.deletedAt == null)
  const exercises = (await db.exercises.toArray()).filter((item) => item.deletedAt == null)

  return {
    workout,
    items: workoutExercises.map((workoutExercise) => ({
      workoutExercise,
      exercise: exercises.find((exercise) => exercise.id === workoutExercise.exerciseId)!,
      sets: loggedSets
        .filter((set) => set.workoutExerciseId === workoutExercise.id)
        .sort((left, right) => left.sortOrder - right.sortOrder),
      })),
  }
}

export async function getWorkoutById(workoutId: string): Promise<WorkoutWithDetails | null> {
  const workout = await db.workouts.get(workoutId)
  if (!workout || workout.deletedAt != null || workout.status !== 'completed') {
    return null
  }

  return buildWorkoutWithDetails(workout)
}

export async function listWorkoutHistory(limit = 12): Promise<WorkoutWithDetails[]> {
  const workouts = (await db.workouts.where('status').equals('completed').toArray())
    .filter((item) => item.deletedAt == null)
    .sort(
      (left, right) =>
        new Date(right.endedAt ?? right.startedAt).getTime() -
        new Date(left.endedAt ?? left.startedAt).getTime(),
    )
    .slice(0, limit)
  return Promise.all(workouts.map((workout) => buildWorkoutWithDetails(workout)))
}

export async function updateLoggedSet(
  loggedSetId: string,
  updates: Partial<
    Pick<
      LoggedSet,
      'reps' | 'weight' | 'assistanceWeight' | 'durationSeconds' | 'completedAt' | 'setKind'
    >
  >,
) {
  const current = await db.loggedSets.get(loggedSetId)
  if (!current) {
    return
  }
  const workoutExercise = await db.workoutExercises.get(current.workoutExerciseId)
  const weightUnit = workoutExercise ? await getExerciseWeightUnit(workoutExercise.exerciseId) : await getWeightUnit()

  const next: LoggedSet = {
    ...current,
    ...updates,
    weight:
      updates.weight === undefined ? current.weight : toStorageWeight(updates.weight, weightUnit),
    assistanceWeight:
      updates.assistanceWeight === undefined
        ? current.assistanceWeight
        : toStorageWeight(updates.assistanceWeight, weightUnit),
    durationSeconds:
      updates.durationSeconds === undefined ? current.durationSeconds : updates.durationSeconds,
    updatedAt: nowIso(),
    syncStatus: 'pending',
  }

  await db.loggedSets.put(next)
  await queue('loggedSet', next.id, 'upsert', next)

  if (updates.completedAt) {
    const exercise = workoutExercise ? await db.exercises.get(workoutExercise.exerciseId) : null
    const preferences = await getPreferences()
    const restSeconds =
      exercise?.defaultRestSeconds ?? preferences?.defaultRestSeconds ?? 120

    await savePreferences({
      activeTimerEndAt: new Date(Date.now() + restSeconds * 1000).toISOString(),
    })
  }
}

export async function updateWorkoutNotes(workoutId: string, notes: string) {
  await updateWorkout(workoutId, { notes: notes.trim() })
}

export async function updateWorkout(
  workoutId: string,
  updates: Partial<Pick<Workout, 'name' | 'notes' | 'caloriesBurned' | 'startedAt' | 'endedAt'>>,
) {
  const current = await db.workouts.get(workoutId)
  if (!current) {
    return
  }

  const next: Workout = {
    ...current,
    ...updates,
    updatedAt: nowIso(),
    syncStatus: 'pending',
  }

  await db.workouts.put(next)
  await queue('workout', next.id, 'upsert', next)
}

export async function updateWorkoutExerciseNotes(workoutExerciseId: string, notes: string) {
  const current = await db.workoutExercises.get(workoutExerciseId)
  if (!current) {
    return
  }

  const next: WorkoutExercise = {
    ...current,
    notes: notes.trim(),
    updatedAt: nowIso(),
    syncStatus: 'pending',
  }

  await db.workoutExercises.put(next)
  await queue('workoutExercise', next.id, 'upsert', next)
}

export async function addSetToWorkoutExercise(workoutExerciseId: string) {
  const sets = (await db.loggedSets.where({ workoutExerciseId }).toArray()).sort(
    (left, right) => left.sortOrder - right.sortOrder,
  )
  const timestamp = nowIso()
  const next: LoggedSet = {
    id: createId('loggedSet'),
    workoutExerciseId,
    plannedSetId: null,
    sortOrder: sets.length,
    setKind: 'normal',
    reps: null,
    weight: null,
    assistanceWeight: null,
    durationSeconds: null,
    completedAt: null,
    deletedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    syncStatus: 'pending',
  }

  await db.loggedSets.put(next)
  await queue('loggedSet', next.id, 'upsert', next)
}

export async function duplicateSetInWorkout(setId: string) {
  const current = await db.loggedSets.get(setId)
  if (!current || current.deletedAt != null) {
    return
  }

  const siblingSets = (await db.loggedSets.where({ workoutExerciseId: current.workoutExerciseId }).toArray())
    .filter((set) => set.deletedAt == null)
    .sort((left, right) => left.sortOrder - right.sortOrder)

  const insertionIndex = siblingSets.findIndex((set) => set.id === setId)
  const nextSortOrder = insertionIndex >= 0 ? siblingSets[insertionIndex].sortOrder + 1 : siblingSets.length
  const timestamp = nowIso()

  await db.transaction('rw', [db.loggedSets, db.syncQueue], async () => {
    for (const set of siblingSets) {
      if (set.sortOrder < nextSortOrder) {
        continue
      }

      const shifted: LoggedSet = {
        ...set,
        sortOrder: set.sortOrder + 1,
        updatedAt: timestamp,
        syncStatus: 'pending',
      }

      await db.loggedSets.put(shifted)
      await queue('loggedSet', shifted.id, 'upsert', shifted)
    }

    const duplicate: LoggedSet = {
      ...current,
      id: createId('loggedSet'),
      sortOrder: nextSortOrder,
      createdAt: timestamp,
      updatedAt: timestamp,
      syncStatus: 'pending',
    }

    await db.loggedSets.put(duplicate)
    await queue('loggedSet', duplicate.id, 'upsert', duplicate)
  })
}

export async function moveExerciseInWorkout(workoutExerciseId: string, direction: 'up' | 'down') {
  const current = await db.workoutExercises.get(workoutExerciseId)
  if (!current || current.deletedAt != null) {
    return
  }

  const siblingExercises = (await db.workoutExercises.where({ workoutId: current.workoutId }).toArray())
    .filter((item) => item.deletedAt == null)
    .sort((left, right) => left.sortOrder - right.sortOrder)

  const currentIndex = siblingExercises.findIndex((item) => item.id === workoutExerciseId)
  if (currentIndex < 0) {
    return
  }

  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
  if (targetIndex < 0 || targetIndex >= siblingExercises.length) {
    return
  }

  const target = siblingExercises[targetIndex]
  const timestamp = nowIso()

  await db.transaction('rw', [db.workoutExercises, db.syncQueue], async () => {
    const movedCurrent: WorkoutExercise = {
      ...current,
      sortOrder: target.sortOrder,
      updatedAt: timestamp,
      syncStatus: 'pending',
    }
    const movedTarget: WorkoutExercise = {
      ...target,
      sortOrder: current.sortOrder,
      updatedAt: timestamp,
      syncStatus: 'pending',
    }

    await db.workoutExercises.put(movedCurrent)
    await queue('workoutExercise', movedCurrent.id, 'upsert', movedCurrent)
    await db.workoutExercises.put(movedTarget)
    await queue('workoutExercise', movedTarget.id, 'upsert', movedTarget)
  })
}

export async function removeSetFromWorkout(setId: string) {
  const current = await db.loggedSets.get(setId)
  if (!current) {
    return
  }

  const next: LoggedSet = {
    ...current,
    deletedAt: nowIso(),
    updatedAt: nowIso(),
    syncStatus: 'pending',
  }

  await db.loggedSets.put(next)
  await queue('loggedSet', next.id, 'delete', next)
}

export async function addExerciseToWorkout(workoutId: string, exerciseId: string) {
  const timestamp = nowIso()
  const workoutExercises = (await db.workoutExercises.where({ workoutId }).toArray())
    .filter((item) => item.deletedAt == null)
    .sort((left, right) => left.sortOrder - right.sortOrder)

  const workoutExercise: WorkoutExercise = {
    id: createId('workoutExercise'),
    workoutId,
    exerciseId,
    notes: '',
    sortOrder: workoutExercises.length,
    deletedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    syncStatus: 'pending',
  }

  await db.workoutExercises.put(workoutExercise)
  await queue('workoutExercise', workoutExercise.id, 'upsert', workoutExercise)

  for (let setIndex = 0; setIndex < 1; setIndex += 1) {
    const loggedSet: LoggedSet = {
      id: createId('loggedSet'),
      workoutExerciseId: workoutExercise.id,
      plannedSetId: null,
      sortOrder: setIndex,
      setKind: 'normal',
      reps: null,
      weight: null,
      assistanceWeight: null,
      durationSeconds: null,
      completedAt: null,
      deletedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      syncStatus: 'pending',
    }

    await db.loggedSets.put(loggedSet)
    await queue('loggedSet', loggedSet.id, 'upsert', loggedSet)
  }
}

export async function listExerciseNoteHistoryForWorkout(
  workoutId: string,
): Promise<Record<string, ExerciseNoteEntry[]>> {
  const [currentWorkoutExercises, workouts, allWorkoutExercises, exercises] = await Promise.all([
    db.workoutExercises.where({ workoutId }).toArray(),
    db.workouts.toArray(),
    db.workoutExercises.toArray(),
    db.exercises.toArray(),
  ])

  const completedWorkoutMap = new Map(
    workouts
      .filter((workout) => workout.deletedAt == null && workout.status === 'completed')
      .map((workout) => [workout.id, workout]),
  )
  const exerciseMap = new Map(
    exercises.filter((exercise) => exercise.deletedAt == null).map((exercise) => [exercise.id, exercise]),
  )

  const historyByCurrentWorkoutExerciseId: Record<string, ExerciseNoteEntry[]> = {}

  for (const current of currentWorkoutExercises.filter((item) => item.deletedAt == null)) {
    const history = allWorkoutExercises
      .filter((item) => {
        if (item.deletedAt != null || item.id === current.id || item.exerciseId !== current.exerciseId) {
          return false
        }

        if (!item.notes.trim()) {
          return false
        }

        return completedWorkoutMap.has(item.workoutId)
      })
      .map((item) => {
        const workout = completedWorkoutMap.get(item.workoutId)!
        const exercise = exerciseMap.get(item.exerciseId)

        return {
          workoutExerciseId: item.id,
          workoutId: workout.id,
          exerciseId: item.exerciseId,
          exerciseName: exercise ? formatExerciseName(exercise) : 'Exercise',
          workoutName: workout.name,
          note: item.notes.trim(),
          startedAt: workout.startedAt,
          endedAt: workout.endedAt,
        }
      })
      .sort(
        (left, right) =>
          new Date(right.endedAt ?? right.startedAt).getTime() -
          new Date(left.endedAt ?? left.startedAt).getTime(),
      )

    historyByCurrentWorkoutExerciseId[current.id] = history
  }

  return historyByCurrentWorkoutExerciseId
}

export async function removeExerciseFromWorkout(workoutExerciseId: string) {
  const timestamp = nowIso()
  const current = await db.workoutExercises.get(workoutExerciseId)
  if (!current) {
    return
  }

  const next: WorkoutExercise = {
    ...current,
    deletedAt: timestamp,
    updatedAt: timestamp,
    syncStatus: 'pending',
  }

  await db.workoutExercises.put(next)
  await queue('workoutExercise', next.id, 'delete', next)

  const sets = await db.loggedSets.where({ workoutExerciseId }).toArray()
  for (const set of sets) {
    if (set.deletedAt) {
      continue
    }

    const deletedSet: LoggedSet = {
      ...set,
      deletedAt: timestamp,
      updatedAt: timestamp,
      syncStatus: 'pending',
    }

    await db.loggedSets.put(deletedSet)
    await queue('loggedSet', deletedSet.id, 'delete', deletedSet)
  }
}

export async function removeWorkout(workoutId: string) {
  const workout = await db.workouts.get(workoutId)
  if (!workout) {
    return
  }

  const timestamp = nowIso()
  const workoutExercises = (await db.workoutExercises.where({ workoutId }).toArray()).filter(
    (item) => item.deletedAt == null,
  )
  const workoutExerciseIds = new Set(workoutExercises.map((item) => item.id))
  const loggedSets = (await db.loggedSets.toArray()).filter(
    (set) => set.deletedAt == null && workoutExerciseIds.has(set.workoutExerciseId),
  )

  await db.transaction(
    'rw',
    [db.workouts, db.workoutExercises, db.loggedSets, db.preferences, db.syncQueue],
    async () => {
      const deletedWorkout: Workout = {
        ...workout,
        deletedAt: timestamp,
        updatedAt: timestamp,
        syncStatus: 'pending',
      }

      await db.workouts.put(deletedWorkout)
      await queue('workout', deletedWorkout.id, 'delete', deletedWorkout)

      for (const workoutExercise of workoutExercises) {
        const deletedWorkoutExercise: WorkoutExercise = {
          ...workoutExercise,
          deletedAt: timestamp,
          updatedAt: timestamp,
          syncStatus: 'pending',
        }

        await db.workoutExercises.put(deletedWorkoutExercise)
        await queue('workoutExercise', deletedWorkoutExercise.id, 'delete', deletedWorkoutExercise)
      }

      for (const loggedSet of loggedSets) {
        const deletedLoggedSet: LoggedSet = {
          ...loggedSet,
          deletedAt: timestamp,
          updatedAt: timestamp,
          syncStatus: 'pending',
        }

        await db.loggedSets.put(deletedLoggedSet)
        await queue('loggedSet', deletedLoggedSet.id, 'delete', deletedLoggedSet)
      }

      if (workout.status === 'active') {
        await savePreferences({ activeTimerEndAt: null })
      }
    },
  )
}

export async function completeWorkout(workoutId: string) {
  const workout = await db.workouts.get(workoutId)
  if (!workout) {
    return
  }

  const next: Workout = {
    ...workout,
    status: 'completed' as const,
    endedAt: nowIso(),
    updatedAt: nowIso(),
    syncStatus: 'pending',
  }

  await db.workouts.put(next)
  await queue('workout', next.id, 'upsert', next)
  await savePreferences({ activeTimerEndAt: null })
}

export async function listWorkoutNoteHistory(workoutId: string): Promise<WorkoutNoteEntry[]> {
  const current = await db.workouts.get(workoutId)
  if (!current) {
    return []
  }

  const workouts = (await db.workouts.toArray())
    .filter((workout) => {
      if (workout.deletedAt != null || workout.status !== 'completed' || workout.id === workoutId) {
        return false
      }

      if (!workout.notes.trim()) {
        return false
      }

      if (current.templateId) {
        return workout.templateId === current.templateId
      }

      return workout.templateId == null && workout.name.trim() === current.name.trim()
    })
    .sort(
      (left, right) =>
        new Date(right.endedAt ?? right.startedAt).getTime() -
        new Date(left.endedAt ?? left.startedAt).getTime(),
    )

  return workouts.map((workout) => ({
    workoutId: workout.id,
    workoutName: workout.name,
    note: workout.notes.trim(),
    startedAt: workout.startedAt,
    endedAt: workout.endedAt,
  }))
}

export async function cancelRestTimer() {
  await savePreferences({ activeTimerEndAt: null })
}

export async function getAnalytics(): Promise<ExerciseAnalytics[]> {
  const [exercises, workouts, workoutExercises, loggedSets] = await Promise.all([
    db.exercises.toArray(),
    db.workouts.toArray(),
    db.workoutExercises.toArray(),
    db.loggedSets.toArray(),
  ])

  return buildExerciseAnalytics({
    exercises: exercises.filter((item) => item.deletedAt == null),
    workouts: workouts.filter((item) => item.deletedAt == null),
    workoutExercises: workoutExercises.filter((item) => item.deletedAt == null),
    loggedSets: loggedSets.filter((item) => item.deletedAt == null),
  })
}

export async function getSyncQueueCount() {
  return db.syncQueue.where('status').anyOf('queued', 'failed').count()
}

export async function listAllExercises() {
  return (await db.exercises.toArray())
    .filter((item) => item.deletedAt == null)
    .sort((left, right) => formatExerciseName(left).localeCompare(formatExerciseName(right)))
}
