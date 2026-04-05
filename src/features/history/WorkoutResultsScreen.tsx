import { SectionCard } from '../../components/SectionCard'
import {
  formatExerciseName,
  formatVolume,
  formatWeight,
  getExerciseTrackingMode,
  pluralize,
} from '../../lib/format'
import { formatDateTime, formatDurationSeconds } from '../../lib/time'
import { buildWorkoutPersonalBestCandidates, summarizeWorkout } from '../../lib/workoutResults'
import type { Preferences, TrackingMode, WorkoutWithDetails } from '../../lib/types'

interface WorkoutResultsScreenProps {
  workout: WorkoutWithDetails | null
  history: WorkoutWithDetails[]
  preferences: Preferences | null
}

function getCurrentMarker(
  trackingMode: TrackingMode,
  item: WorkoutWithDetails['items'][number],
  unit: 'lb' | 'kg',
) {
  const completedSets = item.sets.filter((set) => set.completedAt != null && set.setKind !== 'warmup')
  if (completedSets.length === 0) {
    return 'No completed sets'
  }

  switch (trackingMode) {
    case 'weight_reps': {
      const best = completedSets.reduce(
        (bestSet, set) => ((set.weight ?? 0) >= (bestSet.weight ?? 0) ? set : bestSet),
        completedSets[0],
      )
      return `${formatWeight(best.weight, unit)} x ${best.reps ?? 0}`
    }
    case 'bodyweight_reps':
      return `${Math.max(...completedSets.map((set) => set.reps ?? 0))} reps`
    case 'assisted_bodyweight_reps': {
      const values = completedSets
        .map((set) => set.assistanceWeight)
        .filter((value): value is number => value != null)
      if (values.length === 0) {
        return 'No assist logged'
      }

      return `${formatWeight(Math.min(...values), unit)} assist`
    }
    case 'duration':
      return formatDurationSeconds(Math.max(...completedSets.map((set) => set.durationSeconds ?? 0)))
  }
}

function formatPersonalBestValue(
  kind: ReturnType<typeof buildWorkoutPersonalBestCandidates>[number]['kind'],
  value: number,
  unit: 'lb' | 'kg',
  metricValue?: number,
) {
  if (kind === 'weight' || kind === 'estimatedOneRepMax' || kind === 'assistance') {
    return formatWeight(value, unit)
  }

  if (kind === 'setVolume' || kind === 'sessionVolume') {
    return formatVolume(value, unit)
  }

  if (kind === 'duration' || kind === 'sessionDuration') {
    return formatDurationSeconds(value)
  }

  if (metricValue != null) {
    return `${value} reps @ ${formatWeight(metricValue, unit)}`
  }

  return `${value} reps`
}

export function WorkoutResultsScreen({
  workout,
  history,
  preferences,
}: WorkoutResultsScreenProps) {
  if (!workout) {
    return <p className="empty-state">Workout results not found.</p>
  }

  const unit = preferences?.weightUnit ?? 'lb'
  const summary = summarizeWorkout(workout)
  const personalBests = buildWorkoutPersonalBestCandidates(workout, history)

  return (
    <div className="stack">
      <SectionCard title={workout.workout.name} description={formatDateTime(workout.workout.startedAt)}>
        <div className="stats-grid">
          <div className="metric-card">
            <span>Total time</span>
            <strong>{summary.durationMinutes}</strong>
            <p>minutes</p>
          </div>
          <div className="metric-card">
            <span>Exercises</span>
            <strong>{summary.exerciseCount}</strong>
            <p>{summary.completedSetCount}/{summary.workingSetCount} working sets finished</p>
          </div>
          <div className="metric-card">
            <span>Reps</span>
            <strong>{summary.repsTotal}</strong>
            <p>working reps</p>
          </div>
          <div className="metric-card">
            <span>Warm-ups</span>
            <strong>{summary.warmupCount}</strong>
            <p>separate sets</p>
          </div>
          {summary.durationTotal > 0 ? (
            <div className="metric-card">
              <span>Cardio time</span>
              <strong>{formatDurationSeconds(summary.durationTotal)}</strong>
              <p>completed duration</p>
            </div>
          ) : null}
          {summary.volumeTotal > 0 ? (
            <div className="metric-card">
              <span>Total volume</span>
              <strong>{formatVolume(summary.volumeTotal, unit)}</strong>
              <p>load x reps</p>
            </div>
          ) : null}
          {workout.workout.caloriesBurned != null ? (
            <div className="metric-card">
              <span>Calories</span>
              <strong>{workout.workout.caloriesBurned}</strong>
              <p>kcal</p>
            </div>
          ) : null}
        </div>
        {workout.workout.notes.trim() ? (
          <div className="embedded-card">
            <strong>Workout note</strong>
            <p>{workout.workout.notes.trim()}</p>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard
        title="PRs"
        description={
          personalBests.length > 0
            ? `${pluralize(personalBests.length, 'personal best')} this session.`
            : 'No new personal bests this time.'
        }
      >
        <div className="stack compact">
          {personalBests.map((entry) => (
            <div className="insight-row" key={`${entry.exerciseId}-${entry.label}`}>
              <div>
                <strong>{entry.exerciseName}</strong>
                <p>{entry.label}</p>
              </div>
              <div className="right-align">
                <strong>{formatPersonalBestValue(entry.kind, entry.value, unit, entry.metricValue)}</strong>
                <p>new best</p>
              </div>
            </div>
          ))}
          {personalBests.length === 0 ? <p className="empty-state">No PRs this session.</p> : null}
        </div>
      </SectionCard>

      <SectionCard title="Exercise summary" description="Best completed marker for each movement in this session.">
        <div className="stack compact">
          {workout.items.map((item) => {
            const trackingMode = getExerciseTrackingMode(item.exercise)

            return (
              <div className="insight-row" key={item.workoutExercise.id}>
                <div>
                  <strong>{formatExerciseName(item.exercise)}</strong>
                  <p>
                    {item.workoutExercise.notes.trim()
                      ? item.workoutExercise.notes.trim()
                      : `${pluralize(item.sets.length, 'set')} logged`}
                  </p>
                </div>
                <div className="right-align">
                  <strong>{getCurrentMarker(trackingMode, item, unit)}</strong>
                  <p>{trackingMode.replaceAll('_', ' ')}</p>
                </div>
              </div>
            )
          })}
        </div>
      </SectionCard>
    </div>
  )
}
