import type { BodyRegion } from './types'

export const BODY_REGION_OPTIONS: Record<BodyRegion, string[]> = {
  Chest: ['Upper Chest', 'Mid Chest', 'Lower Chest'],
  Back: ['Lats', 'Upper Back', 'Spinal Erectors'],
  Shoulders: ['Front Delts', 'Side Delts', 'Rear Delts'],
  Arms: ['Biceps', 'Triceps', 'Forearms'],
  Legs: ['Quads', 'Hamstrings', 'Glutes', 'Calves', 'Adductors'],
  Core: ['Abs', 'Obliques', 'Lower Back'],
  Cardio: ['Conditioning', 'Sprints', 'Steady State'],
}

const FLAT_GROUP_TO_REGION: Record<string, { bodyRegion: BodyRegion; muscleGroup: string }> = {
  Chest: { bodyRegion: 'Chest', muscleGroup: 'Mid Chest' },
  Back: { bodyRegion: 'Back', muscleGroup: 'Lats' },
  Shoulders: { bodyRegion: 'Shoulders', muscleGroup: 'Front Delts' },
  Legs: { bodyRegion: 'Legs', muscleGroup: 'Quads' },
  Arms: { bodyRegion: 'Arms', muscleGroup: 'Biceps' },
  Core: { bodyRegion: 'Core', muscleGroup: 'Abs' },
}

export function getDefaultMuscleGroup(bodyRegion: BodyRegion) {
  return BODY_REGION_OPTIONS[bodyRegion][0]
}

export function normalizeLegacyMuscleGroup(muscleGroup: string | null) {
  if (!muscleGroup) {
    return { bodyRegion: null, muscleGroup: null }
  }

  return FLAT_GROUP_TO_REGION[muscleGroup] ?? { bodyRegion: null, muscleGroup }
}

export function formatExerciseMuscleLabel(bodyRegion: BodyRegion | null, muscleGroup: string | null) {
  if (bodyRegion && muscleGroup) {
    return `${bodyRegion} > ${muscleGroup}`
  }

  return bodyRegion ?? muscleGroup ?? null
}
