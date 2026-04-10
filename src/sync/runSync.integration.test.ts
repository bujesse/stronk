import 'fake-indexeddb/auto'
import PocketBase from 'pocketbase'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Preferences } from '../lib/types'
import {
  completeWorkout,
  createExercise,
  createQuickWorkout,
  getActiveWorkout,
  getPreferences,
  listExercises,
  listWorkoutHistory,
  savePreferences,
  updateExercise,
  updateLoggedSet,
} from '../db/repository'
import { db } from '../db/appDb'
import { BASELINE_DATA_TIMESTAMP, createSeedExercises } from '../db/seed'
import { nowIso } from '../lib/time'
import { signInWithPassword, signUpWithPassword, resetPocketBaseClient } from './client'
import { runSync } from './runSync'

const pocketbaseUrl = 'http://127.0.0.1:8090'

async function resetLocalDevice() {
  const preferences: Preferences = {
    id: 'preferences',
    weightUnit: 'lb',
    defaultRestSeconds: 120,
    activeTimerEndAt: null,
    updatedAt: BASELINE_DATA_TIMESTAMP,
  }

  await db.transaction(
    'rw',
    [
      db.exercises,
      db.workoutTemplates,
      db.templateExercises,
      db.templateSets,
      db.workouts,
      db.workoutExercises,
      db.loggedSets,
      db.preferences,
      db.syncQueue,
    ],
    async () => {
      await db.syncQueue.clear()
      await db.loggedSets.clear()
      await db.workoutExercises.clear()
      await db.workouts.clear()
      await db.templateSets.clear()
      await db.templateExercises.clear()
      await db.workoutTemplates.clear()
      await db.exercises.clear()
      await db.preferences.clear()
      await db.exercises.bulkPut(createSeedExercises())
      await db.preferences.put(preferences)
    },
  )
}

describe('runSync integration', () => {
  beforeAll(() => {
    // @ts-expect-error test-only window shim
    globalThis.window = {
      __STRONK_CONFIG__: {
        pocketbaseUrl,
      },
    }
  })

  afterAll(async () => {
    resetPocketBaseClient()
    db.close()
  })

  it('pulls workouts, custom exercises, exercise edits, and preferences onto a fresh device', async () => {
    const email = `sync-${crypto.randomUUID()}@example.com`
    const password = 'testpass123456'

    await resetLocalDevice()
    resetPocketBaseClient()

    const signUpResult = await signUpWithPassword(email, password)
    expect(signUpResult.ok).toBe(true)

    const initialExercises = await listExercises()
    const bench = initialExercises.find((exercise) => exercise.id === createSeedExercises()[0].id)
    expect(bench).toBeTruthy()

    const customExercise = await createExercise({
      movementName: 'Test Curl',
      bodyRegion: 'Arms',
      muscleGroup: 'Biceps',
      equipment: 'Cable',
      trackingMode: 'weight_reps',
      preferredWeightUnit: 'kg',
      defaultRestSeconds: 75,
    })

    await updateExercise(bench!.id, {
      movementName: bench!.movementName,
      bodyRegion: bench!.bodyRegion,
      muscleGroup: bench!.muscleGroup ?? undefined,
      equipment: bench!.equipment ?? undefined,
      preferredWeightUnit: 'kg',
      trackingMode: bench!.trackingMode,
      defaultRestSeconds: bench!.defaultRestSeconds,
    })

    await savePreferences({ weightUnit: 'kg' })
    await createQuickWorkout('Sync Test Workout', [bench!.id, customExercise.id])

    const activeWorkout = await getActiveWorkout()
    expect(activeWorkout).toBeTruthy()

    const firstSet = activeWorkout!.items[0].sets[0]
    await updateLoggedSet(firstSet.id, {
      reps: 8,
      weight: 60,
      completedAt: nowIso(),
    })

    const secondSet = activeWorkout!.items[1].sets[0]
    await updateLoggedSet(secondSet.id, {
      reps: 12,
      weight: 18,
      completedAt: nowIso(),
    })

    await completeWorkout(activeWorkout!.workout.id)

    const firstSync = await runSync()
    expect(firstSync.ok).toBe(true)

    const remoteClient = new PocketBase(pocketbaseUrl)
    await remoteClient.collection('users').authWithPassword(email, password)
    const remoteExercises = await remoteClient.collection('exercises').getFullList()
    const remoteWorkouts = await remoteClient.collection('workouts').getFullList()
    const remotePreferences = await remoteClient.collection('preferences').getFullList()

    expect(remoteExercises.some((exercise) => exercise.app_id === customExercise.id)).toBe(true)
    expect(remoteExercises.some((exercise) => exercise.app_id === bench!.id && exercise.preferred_weight_unit === 'kg')).toBe(true)
    expect(remoteWorkouts.some((workout) => workout.app_id === activeWorkout!.workout.id)).toBe(true)
    expect(remotePreferences.some((preference) => preference.app_id === 'preferences' && preference.weight_unit === 'kg')).toBe(true)

    await resetLocalDevice()
    resetPocketBaseClient()

    const signInResult = await signInWithPassword(email, password)
    expect(signInResult.ok).toBe(true)

    const secondSync = await runSync()
    expect(secondSync.ok).toBe(true)

    const syncedExercises = await listExercises()
    const syncedPreferences = await getPreferences()
    const syncedHistory = await listWorkoutHistory(20)

    const syncedCustomExercise = syncedExercises.find((exercise) => exercise.id === customExercise.id)
    const syncedBench = syncedExercises.find((exercise) => exercise.id === bench!.id)
    const syncedWorkout = syncedHistory.find((entry) => entry.workout.id === activeWorkout!.workout.id)

    expect(syncedCustomExercise?.movementName).toBe('Test Curl')
    expect(syncedCustomExercise?.preferredWeightUnit).toBe('kg')
    expect(syncedBench?.preferredWeightUnit).toBe('kg')
    expect(syncedPreferences?.weightUnit).toBe('kg')
    expect(syncedWorkout?.workout.name).toBe('Sync Test Workout')
    expect(syncedWorkout?.items).toHaveLength(2)
    expect(syncedWorkout?.items[0]?.sets[0]?.reps).toBe(8)
    expect(syncedWorkout?.items[1]?.sets[0]?.reps).toBe(12)
  }, 30000)
})
