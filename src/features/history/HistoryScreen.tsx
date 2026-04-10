import { useMemo, useState } from 'react'
import { DropdownField } from '../../components/DropdownField'
import { SectionCard } from '../../components/SectionCard'
import {
  formatExerciseBest,
  formatExerciseRecordSummary,
} from '../../lib/format'
import { formatShortDate, minutesBetween } from '../../lib/time'
import type { ExerciseAnalytics, Preferences, WorkoutWithDetails } from '../../lib/types'
import { ProgressionModal } from './ProgressionModal'

interface HistoryScreenProps {
  history: WorkoutWithDetails[]
  analytics: ExerciseAnalytics[]
  preferences: Preferences | null
  onOpenWorkout: (workoutId: string) => void
}

export function HistoryScreen({
  history,
  analytics,
  preferences,
  onOpenWorkout,
}: HistoryScreenProps) {
  const [query, setQuery] = useState('')
  const [trackingFilter, setTrackingFilter] = useState<'all' | ExerciseAnalytics['trackingMode']>('all')
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null)

  const filteredAnalytics = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return analytics.filter((entry) => {
      if (trackingFilter !== 'all' && entry.trackingMode !== trackingFilter) {
        return false
      }

      if (!normalizedQuery) {
        return true
      }

      return entry.exerciseName.toLowerCase().includes(normalizedQuery)
    })
  }, [analytics, query, trackingFilter])

  const selectedEntry =
    selectedExerciseId != null
      ? filteredAnalytics.find((entry) => entry.exerciseId === selectedExerciseId) ??
        analytics.find((entry) => entry.exerciseId === selectedExerciseId) ??
        null
      : null

  return (
    <div className="stack">
      <SectionCard title="Recent workouts">
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

      <SectionCard title="Progression">
        <div className="form-grid progression-filters">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search exercises"
          />
          <DropdownField
            label="Filter"
            value={trackingFilter}
            placeholder="All types"
            options={[
              { value: 'all', label: 'All types' },
              { value: 'weight_reps', label: 'Load + reps' },
              { value: 'bodyweight_reps', label: 'Bodyweight reps' },
              { value: 'assisted_bodyweight_reps', label: 'Assisted reps' },
              { value: 'duration', label: 'Duration' },
            ]}
            onChange={(value) => setTrackingFilter(value as typeof trackingFilter)}
          />
        </div>
        <div className="stack compact">
          {filteredAnalytics.map((entry) => (
            <button
              className="analytic-card analytic-card-list interactive left-align"
              key={entry.exerciseId}
              onClick={() => {
                setSelectedExerciseId(entry.exerciseId)
              }}
            >
              <div className="analytic-card-summary">
                <div>
                  <strong>{entry.exerciseName}</strong>
                  <p>{entry.totalSessions} logged sessions</p>
                </div>
                <div className="analytic-card-meta">
                  <strong>{formatExerciseBest(entry, preferences?.weightUnit ?? 'lb')}</strong>
                  <p>{formatExerciseRecordSummary(entry, preferences?.weightUnit ?? 'lb')}</p>
                </div>
              </div>
            </button>
          ))}
          {filteredAnalytics.length === 0 ? <p className="empty-state">No matches.</p> : null}
        </div>
      </SectionCard>

      {selectedEntry ? (
        <ProgressionModal
          entry={selectedEntry}
          history={history}
          preferences={preferences}
          onClose={() => setSelectedExerciseId(null)}
        />
      ) : null}
    </div>
  )
}
