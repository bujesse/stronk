import { describe, expect, it } from 'vitest'
import { buildWorkoutPersonalBestCandidates, summarizeWorkout } from './workoutResults'
import type { Exercise, WorkoutWithDetails } from './types'

function createExercise(id: string, movementName: string, equipment: string, trackingMode: Exercise['trackingMode']): Exercise {
  return {
    id,
    movementName,
    equipment,
    bodyRegion: 'Legs',
    muscleGroup: 'Hamstrings',
    preferredWeightUnit: null,
    trackingMode,
    defaultRestSeconds: 120,
    isCustom: false,
    deletedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    syncStatus: 'synced',
  }
}

function createWorkoutWithDetails(params: {
  id: string
  startedAt: string
  endedAt: string
  exercise: Exercise
  sets: Array<{
    reps?: number
    weight?: number
    assistanceWeight?: number
    durationSeconds?: number
    setKind?: 'normal' | 'warmup'
  }>
}): WorkoutWithDetails {
  return {
    workout: {
      id: params.id,
      templateId: null,
      name: 'Workout',
      notes: '',
      caloriesBurned: null,
      status: 'completed',
      startedAt: params.startedAt,
      endedAt: params.endedAt,
      deletedAt: null,
      createdAt: params.startedAt,
      updatedAt: params.endedAt,
      syncStatus: 'synced',
    },
    items: [
      {
        workoutExercise: {
          id: `${params.id}_exercise`,
          workoutId: params.id,
          exerciseId: params.exercise.id,
          notes: '',
          sortOrder: 0,
          deletedAt: null,
          createdAt: params.startedAt,
          updatedAt: params.endedAt,
          syncStatus: 'synced',
        },
        exercise: params.exercise,
        sets: params.sets.map((set, index) => ({
          id: `${params.id}_set_${index}`,
          workoutExerciseId: `${params.id}_exercise`,
          plannedSetId: null,
          sortOrder: index,
          setKind: set.setKind ?? 'normal',
          reps: set.reps ?? null,
          weight: set.weight ?? null,
          assistanceWeight: set.assistanceWeight ?? null,
          durationSeconds: set.durationSeconds ?? null,
          completedAt: params.endedAt,
          deletedAt: null,
          createdAt: params.startedAt,
          updatedAt: params.endedAt,
          syncStatus: 'synced',
        })),
      },
    ],
  }
}

describe('workoutResults', () => {
  it('summarizes working sets and workout volume', () => {
    const exercise = createExercise('rdl', 'Romanian Deadlift', 'Barbell', 'weight_reps')
    const workout = createWorkoutWithDetails({
      id: 'w1',
      startedAt: '2026-04-05T10:00:00.000Z',
      endedAt: '2026-04-05T10:45:00.000Z',
      exercise,
      sets: [{ reps: 5, weight: 100 }, { reps: 8, weight: 90 }],
    })

    expect(summarizeWorkout(workout)).toMatchObject({
      durationMinutes: 45,
      completedSetCount: 2,
      workingSetCount: 2,
      repsTotal: 13,
      volumeTotal: 1220,
    })
  })

  it('excludes warmup sets from summary totals and PR comparisons', () => {
    const exercise = createExercise('rdl', 'Romanian Deadlift', 'Barbell', 'weight_reps')
    const previous = createWorkoutWithDetails({
      id: 'prev',
      startedAt: '2026-04-01T10:00:00.000Z',
      endedAt: '2026-04-01T10:45:00.000Z',
      exercise,
      sets: [{ reps: 5, weight: 100 }],
    })
    const current = createWorkoutWithDetails({
      id: 'cur',
      startedAt: '2026-04-05T10:00:00.000Z',
      endedAt: '2026-04-05T10:45:00.000Z',
      exercise,
      sets: [
        { reps: 20, weight: 120, setKind: 'warmup' },
        { reps: 5, weight: 100 },
      ],
    })

    expect(summarizeWorkout(current)).toMatchObject({
      completedSetCount: 1,
      workingSetCount: 1,
      warmupCount: 1,
      repsTotal: 5,
      volumeTotal: 500,
    })

    const prs = buildWorkoutPersonalBestCandidates(current, [previous, current])
    expect(prs.some((entry) => entry.label === 'Heaviest load')).toBe(false)
    expect(prs.some((entry) => entry.label === 'Best set volume')).toBe(false)
    expect(prs.some((entry) => entry.label === 'Best workout volume')).toBe(false)
  })

  it('detects multiple weight-based PR categories against prior history', () => {
    const exercise = createExercise('rdl', 'Romanian Deadlift', 'Barbell', 'weight_reps')
    const previous = createWorkoutWithDetails({
      id: 'prev',
      startedAt: '2026-04-01T10:00:00.000Z',
      endedAt: '2026-04-01T10:45:00.000Z',
      exercise,
      sets: [{ reps: 5, weight: 100 }, { reps: 6, weight: 90 }],
    })
    const current = createWorkoutWithDetails({
      id: 'cur',
      startedAt: '2026-04-05T10:00:00.000Z',
      endedAt: '2026-04-05T10:45:00.000Z',
      exercise,
      sets: [{ reps: 6, weight: 100 }, { reps: 3, weight: 110 }],
    })

    const prs = buildWorkoutPersonalBestCandidates(current, [previous, current])
    expect(prs.some((entry) => entry.label === 'Heaviest load' && entry.value === 110)).toBe(true)
    expect(prs.some((entry) => entry.label === 'Estimated 1RM')).toBe(true)
    expect(prs.some((entry) => entry.label === 'Best set volume')).toBe(true)
    expect(prs.some((entry) => entry.label === 'Most reps at load' && entry.metricValue === 100 && entry.value === 6)).toBe(true)
  })

  it('detects duration session records', () => {
    const exercise = createExercise('run', 'Run', 'Outdoor', 'duration')
    const previous = createWorkoutWithDetails({
      id: 'prev',
      startedAt: '2026-04-01T10:00:00.000Z',
      endedAt: '2026-04-01T10:30:00.000Z',
      exercise,
      sets: [{ durationSeconds: 600 }],
    })
    const current = createWorkoutWithDetails({
      id: 'cur',
      startedAt: '2026-04-05T10:00:00.000Z',
      endedAt: '2026-04-05T10:45:00.000Z',
      exercise,
      sets: [{ durationSeconds: 900 }, { durationSeconds: 300 }],
    })

    const prs = buildWorkoutPersonalBestCandidates(current, [previous, current])
    expect(prs.some((entry) => entry.label === 'Longest duration' && entry.value === 900)).toBe(true)
    expect(prs.some((entry) => entry.label === 'Best workout duration' && entry.value === 1200)).toBe(true)
  })
})
