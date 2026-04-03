import type { Exercise } from '../lib/types'
import { createId } from '../lib/id'
import { nowIso } from '../lib/time'

const defaults = [
  ['Bench Press', 'Chest', 'Barbell', 150],
  ['Squat', 'Legs', 'Barbell', 180],
  ['Deadlift', 'Back', 'Barbell', 210],
  ['Overhead Press', 'Shoulders', 'Barbell', 150],
  ['Barbell Row', 'Back', 'Barbell', 150],
  ['Pull-Up', 'Back', 'Bodyweight', 120],
  ['Incline Dumbbell Press', 'Chest', 'Dumbbell', 120],
  ['Romanian Deadlift', 'Legs', 'Barbell', 150],
] as const

export function createSeedExercises() {
  const timestamp = nowIso()

  return defaults.map<Exercise>(([name, muscleGroup, equipment, rest]) => ({
    id: createId('exercise'),
    name,
    muscleGroup,
    equipment,
    defaultRestSeconds: rest,
    isCustom: false,
    deletedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    syncStatus: 'synced',
  }))
}
