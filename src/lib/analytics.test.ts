import { describe, expect, it } from 'vitest'
import { buildExerciseAnalytics } from './analytics'
import type { Exercise, LoggedSet, Workout, WorkoutExercise } from './types'

function createExercise(): Exercise {
  return {
    id: 'pullup_band',
    movementName: 'Pull-Up',
    equipment: 'Band',
    bodyRegion: 'Back',
    muscleGroup: 'Lats',
    preferredWeightUnit: null,
    trackingMode: 'assisted_bodyweight_reps',
    defaultRestSeconds: 120,
    isCustom: false,
    deletedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    syncStatus: 'synced',
  }
}

describe('analytics', () => {
  it('excludes warmup sets from session reps and assisted progression metrics', () => {
    const exercise = createExercise()
    const workout: Workout = {
      id: 'w1',
      templateId: null,
      name: 'Pull day',
      notes: '',
      caloriesBurned: null,
      status: 'completed',
      startedAt: '2026-04-08T12:00:00.000Z',
      endedAt: '2026-04-08T12:45:00.000Z',
      deletedAt: null,
      createdAt: '2026-04-08T12:00:00.000Z',
      updatedAt: '2026-04-08T12:45:00.000Z',
      syncStatus: 'synced',
    }

    const workoutExercise: WorkoutExercise = {
      id: 'we1',
      workoutId: workout.id,
      exerciseId: exercise.id,
      notes: '',
      sortOrder: 0,
      deletedAt: null,
      createdAt: workout.startedAt,
      updatedAt: workout.endedAt!,
      syncStatus: 'synced',
    }

    const loggedSets: LoggedSet[] = [
      {
        id: 'warmup',
        workoutExerciseId: workoutExercise.id,
        plannedSetId: null,
        sortOrder: 0,
        setKind: 'warmup',
        reps: 12,
        weight: null,
        assistanceWeight: 65,
        durationSeconds: null,
        completedAt: workout.endedAt,
        deletedAt: null,
        createdAt: workout.startedAt,
        updatedAt: workout.endedAt!,
        syncStatus: 'synced',
      },
      {
        id: 'working',
        workoutExerciseId: workoutExercise.id,
        plannedSetId: null,
        sortOrder: 1,
        setKind: 'normal',
        reps: 10,
        weight: null,
        assistanceWeight: 50,
        durationSeconds: null,
        completedAt: workout.endedAt,
        deletedAt: null,
        createdAt: workout.startedAt,
        updatedAt: workout.endedAt!,
        syncStatus: 'synced',
      },
    ]

    const [analytics] = buildExerciseAnalytics({
      exercises: [exercise],
      workouts: [workout],
      workoutExercises: [workoutExercise],
      loggedSets,
    })

    expect(analytics.personalBestReps).toBe(10)
    expect(analytics.leastAssistanceWeight).toBe(50)
    expect(analytics.personalBestSessionReps).toBe(10)
    expect(analytics.points[0]?.bestReps).toBe(10)
    expect(analytics.points[0]?.sessionReps).toBe(10)
    expect(analytics.points[0]?.assistanceValue).toBe(50)
  })
})
