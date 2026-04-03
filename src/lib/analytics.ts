import { getExerciseTrackingMode } from './format'
import type { ExerciseAnalytics, Exercise, LoggedSet, Workout, WorkoutExercise } from './types'

interface AnalyticsInput {
  exercises: Exercise[]
  workouts: Workout[]
  workoutExercises: WorkoutExercise[]
  loggedSets: LoggedSet[]
}

export function buildExerciseAnalytics({
  exercises,
  workouts,
  workoutExercises,
  loggedSets,
}: AnalyticsInput): ExerciseAnalytics[] {
  const completedWorkouts = new Map(
    workouts.filter((workout) => workout.status === 'completed').map((workout) => [workout.id, workout]),
  )

  const workoutExerciseMap = new Map(workoutExercises.map((item) => [item.id, item]))
  const byExercise = new Map<string, ExerciseAnalytics>()

  for (const set of loggedSets) {
    if (set.completedAt == null) {
      continue
    }

    const workoutExercise = workoutExerciseMap.get(set.workoutExerciseId)
    if (!workoutExercise) {
      continue
    }

    const workout = completedWorkouts.get(workoutExercise.workoutId)
    if (!workout) {
      continue
    }

    const exercise = exercises.find((entry) => entry.id === workoutExercise.exerciseId)
    if (!exercise) {
      continue
    }

    const analytics =
      byExercise.get(exercise.id) ??
      {
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        trackingMode: getExerciseTrackingMode(exercise),
        latestWeight: null,
        latestReps: null,
        latestAssistanceWeight: null,
        personalBestWeight: null,
        personalBestReps: null,
        leastAssistanceWeight: null,
        personalBestVolume: null,
        totalSessions: 0,
        points: [],
      }

    const point = analytics.points.find((entry) => entry.workoutDate === workout.startedAt)
    const weight = set.weight ?? 0
    const assistanceWeight = set.assistanceWeight ?? 0
    const reps = set.reps ?? 0
    const volume = weight * reps
    const metricValue =
      analytics.trackingMode === 'bodyweight_reps'
        ? reps
        : analytics.trackingMode === 'assisted_bodyweight_reps'
          ? assistanceWeight
          : weight

    if (point) {
      point.metricValue =
        analytics.trackingMode === 'assisted_bodyweight_reps'
          ? Math.min(point.metricValue, metricValue)
          : Math.max(point.metricValue, metricValue)
      point.totalVolume += volume
    } else {
      analytics.points.push({
        workoutDate: workout.startedAt,
        metricValue,
        totalVolume: volume,
      })
    }

    analytics.latestWeight = weight || analytics.latestWeight
    analytics.latestReps = reps || analytics.latestReps
    analytics.latestAssistanceWeight = assistanceWeight || analytics.latestAssistanceWeight
    analytics.personalBestWeight = Math.max(analytics.personalBestWeight ?? 0, weight) || null
    analytics.personalBestReps = Math.max(analytics.personalBestReps ?? 0, reps) || null
    analytics.leastAssistanceWeight =
      analytics.leastAssistanceWeight == null
        ? (assistanceWeight || null)
        : assistanceWeight > 0
          ? Math.min(analytics.leastAssistanceWeight, assistanceWeight)
          : analytics.leastAssistanceWeight
    analytics.personalBestVolume =
      Math.max(analytics.personalBestVolume ?? 0, volume) || null

    byExercise.set(exercise.id, analytics)
  }

  for (const analytics of byExercise.values()) {
    analytics.points.sort(
      (left, right) =>
        new Date(left.workoutDate).getTime() - new Date(right.workoutDate).getTime(),
    )
    analytics.totalSessions = analytics.points.length
  }

  return Array.from(byExercise.values()).sort(
    (left, right) => right.totalSessions - left.totalSessions,
  )
}
