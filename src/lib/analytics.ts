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
        latestWeight: null,
        latestReps: null,
        personalBestWeight: null,
        personalBestVolume: null,
        totalSessions: 0,
        points: [],
      }

    const point = analytics.points.find((entry) => entry.workoutDate === workout.startedAt)
    const weight = set.weight ?? 0
    const reps = set.reps ?? 0
    const volume = weight * reps

    if (point) {
      point.maxWeight = Math.max(point.maxWeight, weight)
      point.totalVolume += volume
    } else {
      analytics.points.push({
        workoutDate: workout.startedAt,
        maxWeight: weight,
        totalVolume: volume,
      })
    }

    analytics.latestWeight = weight || analytics.latestWeight
    analytics.latestReps = reps || analytics.latestReps
    analytics.personalBestWeight = Math.max(analytics.personalBestWeight ?? 0, weight) || null
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
