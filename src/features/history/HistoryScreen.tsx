import { SectionCard } from '../../components/SectionCard'
import { formatShortDate, minutesBetween } from '../../lib/time'
import { formatExerciseBest, formatExerciseRecordSummary } from '../../lib/format'
import type { ExerciseAnalytics, Preferences, WorkoutWithDetails } from '../../lib/types'

interface HistoryScreenProps {
  history: WorkoutWithDetails[]
  analytics: ExerciseAnalytics[]
  preferences: Preferences | null
  onOpenWorkout: (workoutId: string) => void
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length === 0) {
    return <div className="sparkline-placeholder">No data yet</div>
  }

  const max = Math.max(...values, 1)
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100
      const y = 100 - (value / max) * 100
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg className="sparkline" viewBox="0 0 100 100" preserveAspectRatio="none">
      <polyline fill="none" stroke="currentColor" strokeWidth="5" points={points} />
    </svg>
  )
}

export function HistoryScreen({
  history,
  analytics,
  preferences,
  onOpenWorkout,
}: HistoryScreenProps) {
  return (
    <div className="stack">
      <SectionCard title="Recent workouts" description="Completed sessions stay on-device and sync when configured.">
        <div className="grid-list">
          {history.map(({ workout, items }) => (
            <button className="list-card interactive left-align" key={workout.id} onClick={() => onOpenWorkout(workout.id)}>
              <div>
                <strong>{workout.name}</strong>
                <p>
                  {formatShortDate(workout.startedAt)} • {items.length} exercises • {minutesBetween(workout.startedAt, workout.endedAt)} min
                </p>
                {workout.notes.trim() ? <p>{workout.notes.trim()}</p> : null}
              </div>
              <span>View</span>
            </button>
          ))}
          {history.length === 0 ? <p className="empty-state">No completed workouts yet.</p> : null}
        </div>
      </SectionCard>

      <SectionCard title="Progression" description="Simple exercise trends for load and volume.">
        <div className="stack compact">
          {analytics.map((entry) => (
            <article className="analytic-card" key={entry.exerciseId}>
              <div className="section-header">
                <div>
                  <strong>{entry.exerciseName}</strong>
                  <p>{entry.totalSessions} logged sessions</p>
                </div>
                <div className="right-align">
                  <strong>{formatExerciseBest(entry, preferences?.weightUnit ?? 'lb')}</strong>
                  <p>{formatExerciseRecordSummary(entry, preferences?.weightUnit ?? 'lb')}</p>
                </div>
              </div>
              <Sparkline values={entry.points.map((point) => point.metricValue)} />
            </article>
          ))}
          {analytics.length === 0 ? <p className="empty-state">Complete a workout to unlock analytics.</p> : null}
        </div>
      </SectionCard>
    </div>
  )
}
