import Dexie, { type Table } from 'dexie'
import { createSeedExercises } from './seed'
import type {
  Exercise,
  LoggedSet,
  Preferences,
  SyncQueueItem,
  TemplateExercise,
  TemplateSet,
  Workout,
  WorkoutExercise,
  WorkoutTemplate,
} from '../lib/types'

export class StronkDb extends Dexie {
  exercises!: Table<Exercise, string>
  workoutTemplates!: Table<WorkoutTemplate, string>
  templateExercises!: Table<TemplateExercise, string>
  templateSets!: Table<TemplateSet, string>
  workouts!: Table<Workout, string>
  workoutExercises!: Table<WorkoutExercise, string>
  loggedSets!: Table<LoggedSet, string>
  preferences!: Table<Preferences, string>
  syncQueue!: Table<SyncQueueItem, string>

  constructor() {
    super('stronk-db')

    this.version(1).stores({
      exercises: 'id, movementName, bodyRegion, muscleGroup, equipment, preferredWeightUnit, updatedAt, deletedAt, isCustom',
      workoutTemplates: 'id, name, updatedAt, deletedAt',
      templateExercises: 'id, templateId, exerciseId, sortOrder, deletedAt',
      templateSets: 'id, templateExerciseId, sortOrder, deletedAt',
      workouts: 'id, templateId, status, startedAt, updatedAt, deletedAt',
      workoutExercises: 'id, workoutId, exerciseId, sortOrder, deletedAt',
      loggedSets: 'id, workoutExerciseId, sortOrder, completedAt, deletedAt',
      preferences: 'id',
      syncQueue: 'id, entity, entityId, status, updatedAt',
    })

    this.version(11)
      .stores({
        exercises: 'id, movementName, bodyRegion, muscleGroup, equipment, preferredWeightUnit, updatedAt, deletedAt, isCustom',
        workoutTemplates: 'id, name, updatedAt, deletedAt',
        templateExercises: 'id, templateId, exerciseId, sortOrder, deletedAt',
        templateSets: 'id, templateExerciseId, sortOrder, deletedAt',
        workouts: 'id, templateId, status, startedAt, updatedAt, deletedAt',
        workoutExercises: 'id, workoutId, exerciseId, sortOrder, deletedAt',
        loggedSets: 'id, workoutExerciseId, sortOrder, completedAt, deletedAt',
        preferences: 'id',
        syncQueue: 'id, entity, entityId, status, updatedAt',
      })
      .upgrade(async (tx) => {
        await tx.table('templateSets').clear()
        await tx.table('templateExercises').clear()
        await tx.table('workoutExercises').clear()
        await tx.table('loggedSets').clear()
        await tx.table('workoutTemplates').clear()
        await tx.table('workouts').clear()
        await tx.table('syncQueue').clear()
        await tx.table('exercises').clear()
        await tx.table('preferences').clear()

        await tx.table('exercises').bulkAdd(createSeedExercises())
        await tx.table('preferences').add({
          id: 'preferences',
          weightUnit: 'lb',
          defaultRestSeconds: 120,
          activeTimerEndAt: null,
          updatedAt: new Date().toISOString(),
        })
      })
  }
}

export const db = new StronkDb()

async function ensureBaseData() {
  const seedExercises = createSeedExercises()

  await db.transaction('rw', [db.exercises, db.preferences], async () => {
    const existingExerciseIds = new Set((await db.exercises.toArray()).map((exercise) => exercise.id))
    const missingSeedExercises = seedExercises.filter((exercise) => !existingExerciseIds.has(exercise.id))

    if (missingSeedExercises.length > 0) {
      await db.exercises.bulkPut(missingSeedExercises)
    }

    const preferences = await db.preferences.get('preferences')
    if (!preferences) {
      await db.preferences.put({
        id: 'preferences',
        weightUnit: 'lb',
        defaultRestSeconds: 120,
        activeTimerEndAt: null,
        updatedAt: new Date().toISOString(),
      })
    }
  })
}

db.on('populate', async () => {
  await db.exercises.bulkAdd(createSeedExercises())
  await db.preferences.add({
    id: 'preferences',
    weightUnit: 'lb',
    defaultRestSeconds: 120,
    activeTimerEndAt: null,
    updatedAt: new Date().toISOString(),
  })
})

db.on('ready', () => ensureBaseData())
