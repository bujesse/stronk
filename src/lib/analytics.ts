import { formatExerciseName, getExerciseTrackingMode } from './format'
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
  const sessionAggregates = new Map<
    string,
    { exerciseId: string; workoutDate: string; volume: number; reps: number; durationSeconds: number }
  >()

  for (const set of loggedSets) {
    if (set.completedAt == null || set.setKind === 'warmup') {
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
        exerciseName: formatExerciseName(exercise),
        preferredWeightUnit: exercise.preferredWeightUnit,
        trackingMode: getExerciseTrackingMode(exercise),
        latestWeight: null,
        latestReps: null,
        latestAssistanceWeight: null,
        latestDurationSeconds: null,
        personalBestWeight: null,
        estimatedOneRepMax: null,
        personalBestReps: null,
        leastAssistanceWeight: null,
        longestDurationSeconds: null,
        personalBestSetVolume: null,
        personalBestSessionVolume: null,
        personalBestSessionReps: null,
        personalBestSessionDurationSeconds: null,
        totalSessions: 0,
        points: [],
      }

    const point = analytics.points.find((entry) => entry.workoutDate === workout.startedAt)
    const weight = set.weight ?? 0
    const assistanceWeight = set.assistanceWeight ?? 0
    const durationSeconds = set.durationSeconds ?? 0
    const reps = set.reps ?? 0
    const volume = weight * reps
    const estimatedOneRepMax = weight > 0 && reps > 0 ? weight * (1 + reps / 30) : 0
    const metricValue =
      analytics.trackingMode === 'bodyweight_reps'
        ? reps
        : analytics.trackingMode === 'assisted_bodyweight_reps'
          ? assistanceWeight
          : analytics.trackingMode === 'duration'
            ? durationSeconds
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
    analytics.latestDurationSeconds = durationSeconds || analytics.latestDurationSeconds
    analytics.personalBestWeight = Math.max(analytics.personalBestWeight ?? 0, weight) || null
    analytics.estimatedOneRepMax = Math.max(analytics.estimatedOneRepMax ?? 0, estimatedOneRepMax) || null
    analytics.personalBestReps = Math.max(analytics.personalBestReps ?? 0, reps) || null
    analytics.leastAssistanceWeight =
      analytics.leastAssistanceWeight == null
        ? (assistanceWeight || null)
        : assistanceWeight > 0
          ? Math.min(analytics.leastAssistanceWeight, assistanceWeight)
          : analytics.leastAssistanceWeight
    analytics.longestDurationSeconds =
      Math.max(analytics.longestDurationSeconds ?? 0, durationSeconds) || null
    analytics.personalBestSetVolume =
      Math.max(analytics.personalBestSetVolume ?? 0, volume) || null

    const sessionKey = `${exercise.id}:${workout.id}`
    const currentSession =
      sessionAggregates.get(sessionKey) ?? {
        exerciseId: exercise.id,
        workoutDate: workout.startedAt,
        volume: 0,
        reps: 0,
        durationSeconds: 0,
      }
    currentSession.volume += volume
    currentSession.reps += reps
    currentSession.durationSeconds += durationSeconds
    sessionAggregates.set(sessionKey, currentSession)

    byExercise.set(exercise.id, analytics)
  }

  for (const session of sessionAggregates.values()) {
    const analytics = byExercise.get(session.exerciseId)
    if (!analytics) {
      continue
    }

    analytics.personalBestSessionVolume =
      Math.max(analytics.personalBestSessionVolume ?? 0, session.volume) || null
    analytics.personalBestSessionReps =
      Math.max(analytics.personalBestSessionReps ?? 0, session.reps) || null
    analytics.personalBestSessionDurationSeconds =
      Math.max(analytics.personalBestSessionDurationSeconds ?? 0, session.durationSeconds) || null
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
