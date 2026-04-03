import { SectionCard } from '../../components/SectionCard'
import { formatShortDate, minutesBetween } from '../../lib/time'
import { formatWeight } from '../../lib/format'
import type { ExerciseAnalytics, Preferences, WorkoutWithDetails } from '../../lib/types'

interface HistoryScreenProps {
  history: WorkoutWithDetails[]
  analytics: ExerciseAnalytics[]
  preferences: Preferences | null
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
}: HistoryScreenProps) {
  return (
    <div className="stack">
      <SectionCard title="Recent workouts" description="Completed sessions stay on-device and sync when configured.">
        <div className="grid-list">
          {history.map(({ workout, items }) => (
            <article className="list-card" key={workout.id}>
              <div>
                <strong>{workout.name}</strong>
                <p>
                  {formatShortDate(workout.startedAt)} • {items.length} exercises • {minutesBetween(workout.startedAt, workout.endedAt)} min
                </p>
              </div>
            </article>
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
                  <strong>{formatWeight(entry.personalBestWeight, preferences?.weightUnit ?? 'lb')}</strong>
                  <p>best load</p>
                </div>
              </div>
              <Sparkline values={entry.points.map((point) => point.maxWeight)} />
            </article>
          ))}
          {analytics.length === 0 ? <p className="empty-state">Complete a workout to unlock analytics.</p> : null}
        </div>
      </SectionCard>
    </div>
  )
}
