import { formatExerciseName, getExerciseTrackingMode } from './format'
import { minutesBetween } from './time'
import type { TrackingMode, WorkoutWithDetails } from './types'

export interface WorkoutPersonalBest {
  exerciseId: string
  exerciseName: string
  label: string
  value: string
}

export interface WorkoutSummary {
  durationMinutes: number
  exerciseCount: number
  completedSetCount: number
  workingSetCount: number
  warmupCount: number
  repsTotal: number
  durationTotal: number
  volumeTotal: number
}

export function estimateOneRepMax(weight: number | null, reps: number | null) {
  if (!weight || !reps) {
    return null
  }

  return weight * (1 + reps / 30)
}

export function summarizeWorkout(workout: WorkoutWithDetails): WorkoutSummary {
  const allSets = workout.items.flatMap((item) => item.sets)
  const workingSets = allSets.filter((set) => set.setKind !== 'warmup')
  const completedWorkingSets = workingSets.filter((set) => set.completedAt != null)

  return {
    durationMinutes: minutesBetween(workout.workout.startedAt, workout.workout.endedAt),
    exerciseCount: workout.items.length,
    completedSetCount: completedWorkingSets.length,
    workingSetCount: workingSets.length,
    warmupCount: allSets.filter((set) => set.setKind === 'warmup').length,
    repsTotal: completedWorkingSets.reduce((sum, set) => sum + (set.reps ?? 0), 0),
    durationTotal: completedWorkingSets.reduce((sum, set) => sum + (set.durationSeconds ?? 0), 0),
    volumeTotal: completedWorkingSets.reduce((sum, set) => sum + (set.weight ?? 0) * (set.reps ?? 0), 0),
  }
}

function listCompletedWorkingSets(workout: WorkoutWithDetails['items'][number]) {
  return workout.sets.filter((set) => set.completedAt != null && set.setKind !== 'warmup')
}

function buildExerciseHistoryMap(history: WorkoutWithDetails[]) {
  const byExerciseId = new Map<string, Array<WorkoutWithDetails['items'][number]>>()

  for (const workout of history) {
    for (const item of workout.items) {
      const current = byExerciseId.get(item.exercise.id) ?? []
      current.push(item)
      byExerciseId.set(item.exercise.id, current)
    }
  }

  return byExerciseId
}

function buildRepsAtMetricMap(
  trackingMode: TrackingMode,
  items: Array<WorkoutWithDetails['items'][number]>,
) {
  const repsAtMetric = new Map<number, number>()

  for (const item of items) {
    for (const set of listCompletedWorkingSets(item)) {
      const metric =
        trackingMode === 'assisted_bodyweight_reps'
          ? set.assistanceWeight
          : set.weight

      if (metric == null) {
        continue
      }

      repsAtMetric.set(metric, Math.max(repsAtMetric.get(metric) ?? 0, set.reps ?? 0))
    }
  }

  return repsAtMetric
}

function buildSessionValues(items: Array<WorkoutWithDetails['items'][number]>, field: 'reps' | 'durationSeconds' | 'volume') {
  return items.map((item) => {
    return listCompletedWorkingSets(item).reduce((sum, set) => {
      if (field === 'reps') {
        return sum + (set.reps ?? 0)
      }

      if (field === 'durationSeconds') {
        return sum + (set.durationSeconds ?? 0)
      }

      return sum + (set.weight ?? 0) * (set.reps ?? 0)
    }, 0)
  })
}

export function buildWorkoutPersonalBestCandidates(workout: WorkoutWithDetails, history: WorkoutWithDetails[]) {
  const previousHistory = history.filter((entry) => entry.workout.id !== workout.workout.id)
  const historyByExerciseId = buildExerciseHistoryMap(previousHistory)
  const personalBests: Array<{
    exerciseId: string
    exerciseName: string
    label: string
    kind:
      | 'weight'
      | 'estimatedOneRepMax'
      | 'setVolume'
      | 'sessionVolume'
      | 'reps'
      | 'sessionReps'
      | 'assistance'
      | 'duration'
      | 'sessionDuration'
    value: number
    metricValue?: number
  }> = []

  for (const item of workout.items) {
    const trackingMode = getExerciseTrackingMode(item.exercise)
    const currentSets = listCompletedWorkingSets(item)
    if (currentSets.length === 0) {
      continue
    }

    const previousItems = historyByExerciseId.get(item.exercise.id) ?? []
    const previousSets = previousItems.flatMap((entry) => listCompletedWorkingSets(entry))

    switch (trackingMode) {
      case 'weight_reps': {
        const currentBest = Math.max(...currentSets.map((set) => set.weight ?? 0))
        const previousBest = previousSets.length > 0 ? Math.max(...previousSets.map((set) => set.weight ?? 0)) : null
        if (currentBest > 0 && (previousBest == null || currentBest > previousBest)) {
          personalBests.push({
            exerciseId: item.exercise.id,
            exerciseName: formatExerciseName(item.exercise),
            label: 'Heaviest load',
            kind: 'weight',
            value: currentBest,
          })
        }

        const currentOneRepMax = Math.max(...currentSets.map((set) => estimateOneRepMax(set.weight, set.reps) ?? 0))
        const previousOneRepMax =
          previousSets.length > 0
            ? Math.max(...previousSets.map((set) => estimateOneRepMax(set.weight, set.reps) ?? 0))
            : null
        if (currentOneRepMax > 0 && (previousOneRepMax == null || currentOneRepMax > previousOneRepMax)) {
          personalBests.push({
            exerciseId: item.exercise.id,
            exerciseName: formatExerciseName(item.exercise),
            label: 'Estimated 1RM',
            kind: 'estimatedOneRepMax',
            value: currentOneRepMax,
          })
        }

        const currentBestSetVolume = Math.max(...currentSets.map((set) => (set.weight ?? 0) * (set.reps ?? 0)))
        const previousBestSetVolume =
          previousSets.length > 0 ? Math.max(...previousSets.map((set) => (set.weight ?? 0) * (set.reps ?? 0))) : null
        if (currentBestSetVolume > 0 && (previousBestSetVolume == null || currentBestSetVolume > previousBestSetVolume)) {
          personalBests.push({
            exerciseId: item.exercise.id,
            exerciseName: formatExerciseName(item.exercise),
            label: 'Best set volume',
            kind: 'setVolume',
            value: currentBestSetVolume,
          })
        }

        const currentSessionVolume = currentSets.reduce((sum, set) => sum + (set.weight ?? 0) * (set.reps ?? 0), 0)
        const previousSessionVolume = buildSessionValues(previousItems, 'volume')
        const bestPreviousSessionVolume = previousSessionVolume.length > 0 ? Math.max(...previousSessionVolume) : null
        if (currentSessionVolume > 0 && (bestPreviousSessionVolume == null || currentSessionVolume > bestPreviousSessionVolume)) {
          personalBests.push({
            exerciseId: item.exercise.id,
            exerciseName: formatExerciseName(item.exercise),
            label: 'Best workout volume',
            kind: 'sessionVolume',
            value: currentSessionVolume,
          })
        }

        const previousRepsAtWeight = buildRepsAtMetricMap(trackingMode, previousItems)
        const currentRepsAtWeight = buildRepsAtMetricMap(trackingMode, [item])
        for (const [weight, reps] of currentRepsAtWeight.entries()) {
          const previousReps = previousRepsAtWeight.get(weight)
          if (reps > 0 && (previousReps == null || reps > previousReps)) {
            personalBests.push({
              exerciseId: item.exercise.id,
              exerciseName: formatExerciseName(item.exercise),
              label: 'Most reps at load',
              kind: 'reps',
              value: reps,
              metricValue: weight,
            })
          }
        }
        break
      }
      case 'bodyweight_reps': {
        const currentBest = Math.max(...currentSets.map((set) => set.reps ?? 0))
        const previousBest = previousSets.length > 0 ? Math.max(...previousSets.map((set) => set.reps ?? 0)) : null
        if (currentBest > 0 && (previousBest == null || currentBest > previousBest)) {
          personalBests.push({
            exerciseId: item.exercise.id,
            exerciseName: formatExerciseName(item.exercise),
            label: 'Best reps',
            kind: 'reps',
            value: currentBest,
          })
        }

        const currentSessionReps = currentSets.reduce((sum, set) => sum + (set.reps ?? 0), 0)
        const previousSessionReps = buildSessionValues(previousItems, 'reps')
        const bestPreviousSessionReps = previousSessionReps.length > 0 ? Math.max(...previousSessionReps) : null
        if (currentSessionReps > 0 && (bestPreviousSessionReps == null || currentSessionReps > bestPreviousSessionReps)) {
          personalBests.push({
            exerciseId: item.exercise.id,
            exerciseName: formatExerciseName(item.exercise),
            label: 'Best workout reps',
            kind: 'sessionReps',
            value: currentSessionReps,
          })
        }
        break
      }
      case 'assisted_bodyweight_reps': {
        const currentValues = currentSets
          .map((set) => set.assistanceWeight)
          .filter((value): value is number => value != null)
        const previousValues = previousSets
          .map((set) => set.assistanceWeight)
          .filter((value): value is number => value != null)

        if (currentValues.length > 0) {
          const currentBest = Math.min(...currentValues)
          const previousBest = previousValues.length > 0 ? Math.min(...previousValues) : null
          if (previousBest == null || currentBest < previousBest) {
            personalBests.push({
              exerciseId: item.exercise.id,
              exerciseName: formatExerciseName(item.exercise),
              label: 'Least assist',
              kind: 'assistance',
              value: currentBest,
            })
          }
        }

        const previousRepsAtAssist = buildRepsAtMetricMap(trackingMode, previousItems)
        const currentRepsAtAssist = buildRepsAtMetricMap(trackingMode, [item])
        for (const [assist, reps] of currentRepsAtAssist.entries()) {
          const previousReps = previousRepsAtAssist.get(assist)
          if (reps > 0 && (previousReps == null || reps > previousReps)) {
            personalBests.push({
              exerciseId: item.exercise.id,
              exerciseName: formatExerciseName(item.exercise),
              label: 'Most reps at assist',
              kind: 'reps',
              value: reps,
              metricValue: assist,
            })
          }
        }

        const currentSessionReps = currentSets.reduce((sum, set) => sum + (set.reps ?? 0), 0)
        const previousSessionReps = buildSessionValues(previousItems, 'reps')
        const bestPreviousSessionReps = previousSessionReps.length > 0 ? Math.max(...previousSessionReps) : null
        if (currentSessionReps > 0 && (bestPreviousSessionReps == null || currentSessionReps > bestPreviousSessionReps)) {
          personalBests.push({
            exerciseId: item.exercise.id,
            exerciseName: formatExerciseName(item.exercise),
            label: 'Best workout reps',
            kind: 'sessionReps',
            value: currentSessionReps,
          })
        }
        break
      }
      case 'duration': {
        const currentBest = Math.max(...currentSets.map((set) => set.durationSeconds ?? 0))
        const previousBest =
          previousSets.length > 0 ? Math.max(...previousSets.map((set) => set.durationSeconds ?? 0)) : null
        if (currentBest > 0 && (previousBest == null || currentBest > previousBest)) {
          personalBests.push({
            exerciseId: item.exercise.id,
            exerciseName: formatExerciseName(item.exercise),
            label: 'Longest duration',
            kind: 'duration',
            value: currentBest,
          })
        }

        const currentSessionDuration = currentSets.reduce((sum, set) => sum + (set.durationSeconds ?? 0), 0)
        const previousSessionDurations = buildSessionValues(previousItems, 'durationSeconds')
        const bestPreviousSessionDuration =
          previousSessionDurations.length > 0 ? Math.max(...previousSessionDurations) : null
        if (
          currentSessionDuration > 0 &&
          (bestPreviousSessionDuration == null || currentSessionDuration > bestPreviousSessionDuration)
        ) {
          personalBests.push({
            exerciseId: item.exercise.id,
            exerciseName: formatExerciseName(item.exercise),
            label: 'Best workout duration',
            kind: 'sessionDuration',
            value: currentSessionDuration,
          })
        }
        break
      }
    }
  }

  return personalBests
}
