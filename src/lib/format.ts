import type { ExerciseAnalytics, Exercise, TrackingMode, WeightUnit } from './types'
import { formatDurationSeconds } from './time'
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

export function formatVolume(volume: number | null, unit: WeightUnit) {
  if (volume == null) {
    return '--'
  }

  const converted = unit === 'lb' ? volume / KG_PER_LB : volume
  const rounded = converted >= 100 ? converted.toFixed(0) : converted.toFixed(1)
  return `${rounded} ${unit}-reps`
}

export function formatExerciseName(exercise: Pick<Exercise, 'movementName' | 'equipment'>) {
  return exercise.equipment ? `${exercise.movementName} • ${exercise.equipment}` : exercise.movementName
}

export function getExerciseDisplayWeightUnit(
  exercise: Pick<Exercise, 'preferredWeightUnit'> | null | undefined,
  fallbackUnit: WeightUnit,
) {
  return exercise?.preferredWeightUnit ?? fallbackUnit
}

export function getTrackingModeLabel(mode: TrackingMode) {
  switch (mode) {
    case 'weight_reps':
      return 'Load + reps'
    case 'bodyweight_reps':
      return 'Reps only'
    case 'assisted_bodyweight_reps':
      return 'Assisted reps'
    case 'duration':
      return 'Duration'
  }
}

export function getExerciseTrackingMode(exercise: Pick<Exercise, 'trackingMode' | 'equipment'>) {
  if (exercise.trackingMode) {
    return exercise.trackingMode
  }

  return exercise.equipment === 'Bodyweight' ? 'bodyweight_reps' : 'weight_reps'
}

export function formatExerciseBest(analytics: ExerciseAnalytics, unit: WeightUnit) {
  const displayUnit = analytics.preferredWeightUnit ?? unit
  switch (analytics.trackingMode) {
    case 'weight_reps':
      return analytics.personalBestWeight != null
        ? `${formatWeight(analytics.personalBestWeight, displayUnit)} best load`
        : '--'
    case 'bodyweight_reps':
      return analytics.personalBestReps != null ? `${analytics.personalBestReps} reps best set` : '--'
    case 'assisted_bodyweight_reps':
      return analytics.leastAssistanceWeight != null
        ? `${formatWeight(analytics.leastAssistanceWeight, displayUnit)} least assist`
        : '--'
    case 'duration':
      return analytics.longestDurationSeconds != null
        ? `${formatDurationSeconds(analytics.longestDurationSeconds)} longest`
        : '--'
  }
}

export function formatExerciseRecordSummary(analytics: ExerciseAnalytics, unit: WeightUnit) {
  const displayUnit = analytics.preferredWeightUnit ?? unit
  switch (analytics.trackingMode) {
    case 'weight_reps':
      return [
        analytics.estimatedOneRepMax != null ? `1RM ~ ${formatWeight(analytics.estimatedOneRepMax, displayUnit)}` : null,
        analytics.personalBestSetVolume != null ? `best set ${formatVolume(analytics.personalBestSetVolume, displayUnit)}` : null,
        analytics.personalBestSessionVolume != null
          ? `best workout ${formatVolume(analytics.personalBestSessionVolume, displayUnit)}`
          : null,
      ].filter(Boolean).join(' • ') || '--'
    case 'bodyweight_reps':
      return [
        analytics.personalBestReps != null ? `${analytics.personalBestReps} best set reps` : null,
        analytics.personalBestSessionReps != null ? `${analytics.personalBestSessionReps} best workout reps` : null,
      ].filter(Boolean).join(' • ') || '--'
    case 'assisted_bodyweight_reps':
      return [
        analytics.leastAssistanceWeight != null ? `${formatWeight(analytics.leastAssistanceWeight, displayUnit)} least assist` : null,
        analytics.personalBestSessionReps != null ? `${analytics.personalBestSessionReps} best workout reps` : null,
      ].filter(Boolean).join(' • ') || '--'
    case 'duration':
      return [
        analytics.longestDurationSeconds != null ? `${formatDurationSeconds(analytics.longestDurationSeconds)} longest set` : null,
        analytics.personalBestSessionDurationSeconds != null
          ? `${formatDurationSeconds(analytics.personalBestSessionDurationSeconds)} best workout`
          : null,
      ].filter(Boolean).join(' • ') || '--'
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
