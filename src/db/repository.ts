import { db } from './appDb'
import { createId } from '../lib/id'
import { nowIso } from '../lib/time'
import { buildExerciseAnalytics } from '../lib/analytics'
import { toStorageWeight } from '../lib/format'
import type {
  ExerciseAnalytics,
  LoggedSet,
  Preferences,
  TemplateSetDraft,
  TemplateExercise,
  TemplateSet,
  TemplateWithDetails,
  Workout,
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
}

export async function createExercise(input: {
  name: string
  muscleGroup?: string
  equipment?: string
  defaultRestSeconds?: number | null
}) {
  const timestamp = nowIso()
  const exercise = {
    id: createId('exercise'),
    name: input.name.trim(),
    muscleGroup: input.muscleGroup?.trim() || null,
    equipment: input.equipment?.trim() || null,
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

export async function listExercises() {
  return (await db.exercises.toArray())
    .filter((exercise) => exercise.deletedAt == null)
    .sort((left, right) => left.name.localeCompare(right.name))
}

export async function createTemplate(input: {
  name: string
  notes: string
  exerciseIds: string[]
  setDrafts: Record<string, TemplateSetDraft[]>
}) {
  const timestamp = nowIso()
  const templateId = createId('template')
  const weightUnit = await getWeightUnit()

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

      for (const [index, exerciseId] of input.exerciseIds.entries()) {
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
            targetReps: draft.reps ? Number(draft.reps) : null,
            targetWeight: draft.weight ? toStorageWeight(Number(draft.weight), weightUnit) : null,
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
            reps: set.targetReps,
            weight: set.targetWeight,
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
          sortOrder: index,
          deletedAt: null,
          createdAt: timestamp,
          updatedAt: timestamp,
          syncStatus: 'pending',
        }
        await db.workoutExercises.put(workoutExercise)
        await queue('workoutExercise', workoutExercise.id, 'upsert', workoutExercise)

        for (let setIndex = 0; setIndex < 3; setIndex += 1) {
          const loggedSet: LoggedSet = {
            id: createId('loggedSet'),
            workoutExerciseId: workoutExercise.id,
            plannedSetId: null,
            sortOrder: setIndex,
            reps: null,
            weight: null,
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

export async function getActiveWorkout(): Promise<WorkoutWithDetails | null> {
  const workout = await db.workouts.where('status').equals('active').last()
  if (!workout || workout.deletedAt) {
    return null
  }

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

export async function listWorkoutHistory(limit = 12): Promise<WorkoutWithDetails[]> {
  const workouts = (await db.workouts.where('status').equals('completed').toArray())
    .filter((item) => item.deletedAt == null)
    .sort(
      (left, right) =>
        new Date(right.endedAt ?? right.startedAt).getTime() -
        new Date(left.endedAt ?? left.startedAt).getTime(),
    )
    .slice(0, limit)
  const workoutExercises = (await db.workoutExercises.toArray()).filter((item) => item.deletedAt == null)
  const loggedSets = (await db.loggedSets.toArray()).filter((item) => item.deletedAt == null)
  const exercises = (await db.exercises.toArray()).filter((item) => item.deletedAt == null)

  return workouts.map((workout) => ({
    workout,
    items: workoutExercises
      .filter((entry) => entry.workoutId === workout.id)
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((entry) => ({
        workoutExercise: entry,
        exercise: exercises.find((exercise) => exercise.id === entry.exerciseId)!,
        sets: loggedSets
          .filter((set) => set.workoutExerciseId === entry.id)
          .sort((left, right) => left.sortOrder - right.sortOrder),
      })),
  }))
}

export async function updateLoggedSet(
  loggedSetId: string,
  updates: Partial<Pick<LoggedSet, 'reps' | 'weight' | 'completedAt'>>,
) {
  const current = await db.loggedSets.get(loggedSetId)
  if (!current) {
    return
  }
  const weightUnit = await getWeightUnit()

  const next: LoggedSet = {
    ...current,
    ...updates,
    weight:
      updates.weight === undefined ? current.weight : toStorageWeight(updates.weight, weightUnit),
    updatedAt: nowIso(),
    syncStatus: 'pending',
  }

  await db.loggedSets.put(next)
  await queue('loggedSet', next.id, 'upsert', next)

  if (updates.completedAt) {
    const workoutExercise = await db.workoutExercises.get(current.workoutExerciseId)
    const exercise = workoutExercise ? await db.exercises.get(workoutExercise.exerciseId) : null
    const preferences = await getPreferences()
    const restSeconds =
      exercise?.defaultRestSeconds ?? preferences?.defaultRestSeconds ?? 120

    await savePreferences({
      activeTimerEndAt: new Date(Date.now() + restSeconds * 1000).toISOString(),
    })
  }
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
    reps: null,
    weight: null,
    completedAt: null,
    deletedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    syncStatus: 'pending',
  }

  await db.loggedSets.put(next)
  await queue('loggedSet', next.id, 'upsert', next)
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
  await queue('loggedSet', next.id, 'delete', { id: next.id })
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
    sortOrder: workoutExercises.length,
    deletedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    syncStatus: 'pending',
  }

  await db.workoutExercises.put(workoutExercise)
  await queue('workoutExercise', workoutExercise.id, 'upsert', workoutExercise)

  for (let setIndex = 0; setIndex < 3; setIndex += 1) {
    const loggedSet: LoggedSet = {
      id: createId('loggedSet'),
      workoutExerciseId: workoutExercise.id,
      plannedSetId: null,
      sortOrder: setIndex,
      reps: null,
      weight: null,
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
  await queue('workoutExercise', next.id, 'delete', { id: next.id })

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
    await queue('loggedSet', deletedSet.id, 'delete', { id: deletedSet.id })
  }
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
    .sort((left, right) => left.name.localeCompare(right.name))
}
