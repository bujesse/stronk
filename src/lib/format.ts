import type { ExerciseAnalytics, Exercise, TrackingMode, WeightUnit } from './types'
export { formatExerciseMuscleLabel } from './muscles'

const KG_PER_LB = 0.45359237

export function toStorageWeight(weight: number | null, unit: WeightUnit) {
  if (weight == null) {
    return null
  }

  const normalized = unit === 'lb' ? weight * KG_PER_LB : weight
  return Number(normalized.toFixed(3))
}

export function fromStorageWeight(weight: number | null, unit: WeightUnit) {
  if (weight == null) {
    return null
  }

  const converted = unit === 'lb' ? weight / KG_PER_LB : weight
  return Number(converted.toFixed(1))
}

export function formatWeight(weight: number | null, unit: WeightUnit) {
  if (weight == null) {
    return '--'
  }

  const displayWeight = fromStorageWeight(weight, unit)
  if (displayWeight == null) {
    return '--'
  }

  const rounded = Number.isInteger(displayWeight)
    ? displayWeight.toFixed(0)
    : displayWeight.toFixed(1)
  return `${rounded} ${unit}`
}

export function getTrackingModeLabel(mode: TrackingMode) {
  switch (mode) {
    case 'weight_reps':
      return 'Load + reps'
    case 'bodyweight_reps':
      return 'Reps only'
    case 'assisted_bodyweight_reps':
      return 'Assisted reps'
  }
}

export function getExerciseTrackingMode(exercise: Pick<Exercise, 'trackingMode' | 'equipment'>) {
  if (exercise.trackingMode) {
    return exercise.trackingMode
  }

  return exercise.equipment === 'Bodyweight' ? 'bodyweight_reps' : 'weight_reps'
}

export function formatExerciseBest(analytics: ExerciseAnalytics, unit: WeightUnit) {
  switch (analytics.trackingMode) {
    case 'weight_reps':
      return analytics.personalBestWeight != null
        ? `${formatWeight(analytics.personalBestWeight, unit)} best load`
        : '--'
    case 'bodyweight_reps':
      return analytics.personalBestReps != null ? `${analytics.personalBestReps} reps best set` : '--'
    case 'assisted_bodyweight_reps':
      return analytics.leastAssistanceWeight != null
        ? `${formatWeight(analytics.leastAssistanceWeight, unit)} least assist`
        : '--'
  }
}

export function parseOptionalNumber(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  const number = Number(trimmed)
  return Number.isFinite(number) ? number : null
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}
