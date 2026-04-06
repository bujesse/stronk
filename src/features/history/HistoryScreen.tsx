import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { DropdownField } from '../../components/DropdownField'
import { SectionCard } from '../../components/SectionCard'
import {
  formatExerciseBest,
  formatExerciseRecordSummary,
  formatVolume,
  formatWeight,
  getTrackingModeLabel,
} from '../../lib/format'
import { formatShortDate, minutesBetween } from '../../lib/time'
import type { ExerciseAnalytics, Preferences, WorkoutWithDetails } from '../../lib/types'

interface HistoryScreenProps {
  history: WorkoutWithDetails[]
  analytics: ExerciseAnalytics[]
  preferences: Preferences | null
  onOpenWorkout: (workoutId: string) => void
}

type MetricKey =
  | 'loadValue'
  | 'bestReps'
  | 'totalVolume'
  | 'assistanceValue'
  | 'assistanceVolume'
  | 'sessionReps'
  | 'setDurationSeconds'
  | 'sessionDurationSeconds'

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) {
    return null
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

function MetricChart({
  values,
  colorClassName,
  invert,
}: {
  values: number[]
  colorClassName?: string
  invert?: boolean
}) {
  if (values.length === 0) {
    return <div className="sparkline-placeholder chart-placeholder">No data yet</div>
  }

  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = Math.max(max - min, 1)
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100
      const normalized = ((value - min) / range) * 100
      const y = invert ? normalized : 100 - normalized
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg className={colorClassName ? `progress-chart ${colorClassName}` : 'progress-chart'} viewBox="0 0 100 100" preserveAspectRatio="none">
      <polyline fill="none" stroke="currentColor" strokeWidth="3" points={points} />
    </svg>
  )
}

function getMetricOptions(entry: ExerciseAnalytics) {
  switch (entry.trackingMode) {
    case 'weight_reps':
      return [
        { value: 'loadValue' as const, label: 'Load' },
        { value: 'bestReps' as const, label: 'Best reps' },
        { value: 'totalVolume' as const, label: 'Workout volume' },
      ]
    case 'bodyweight_reps':
      return [
        { value: 'bestReps' as const, label: 'Best reps' },
        { value: 'sessionReps' as const, label: 'Workout reps' },
      ]
    case 'assisted_bodyweight_reps':
      return [
        { value: 'bestReps' as const, label: 'Best reps' },
        { value: 'sessionReps' as const, label: 'Workout reps' },
        { value: 'assistanceValue' as const, label: 'Assist' },
        { value: 'assistanceVolume' as const, label: 'Assist volume' },
      ]
    case 'duration':
      return [
        { value: 'setDurationSeconds' as const, label: 'Best set' },
        { value: 'sessionDurationSeconds' as const, label: 'Workout time' },
      ]
  }
}

function formatMetricValue(entry: ExerciseAnalytics, metric: MetricKey, value: number, fallbackUnit: 'lb' | 'kg') {
  const unit = entry.preferredWeightUnit ?? fallbackUnit

  switch (metric) {
    case 'loadValue':
    case 'assistanceValue':
      return formatWeight(value, unit)
    case 'totalVolume':
    case 'assistanceVolume':
      return formatVolume(value, unit)
    case 'setDurationSeconds':
    case 'sessionDurationSeconds': {
      const minutes = Math.floor(value / 60)
      const seconds = Math.round(value % 60)
      return `${minutes}:${String(seconds).padStart(2, '0')}`
    }
    default:
      return `${Math.round(value)}`
  }
}

function getMetricLabel(metric: MetricKey) {
  switch (metric) {
    case 'loadValue':
      return 'Load'
    case 'bestReps':
      return 'Best reps'
    case 'totalVolume':
      return 'Workout volume'
    case 'assistanceValue':
      return 'Assist'
    case 'assistanceVolume':
      return 'Assist volume'
    case 'sessionReps':
      return 'Workout reps'
    case 'setDurationSeconds':
      return 'Best set'
    case 'sessionDurationSeconds':
      return 'Workout time'
  }
}

function isInvertedMetric(metric: MetricKey) {
  return metric === 'assistanceValue'
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
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('loadValue')

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
      ? filteredAnalytics.find((entry) => entry.exerciseId === selectedExerciseId) ?? null
      : null
  const metricOptions = useMemo(() => (selectedEntry ? getMetricOptions(selectedEntry) : []), [selectedEntry])
  const effectiveSelectedMetric = metricOptions.some((option) => option.value === selectedMetric)
    ? selectedMetric
    : metricOptions[0]?.value ?? 'loadValue'
  const chartValues = selectedEntry?.points.map((point) => point[effectiveSelectedMetric]) ?? []
  const fallbackUnit = preferences?.weightUnit ?? 'lb'
  const latestPoint = selectedEntry?.points[selectedEntry.points.length - 1] ?? null

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
              onClick={() => setSelectedExerciseId(entry.exerciseId)}
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
              <Sparkline values={entry.points.map((point) => point.metricValue)} />
            </button>
          ))}
          {filteredAnalytics.length === 0 ? <p className="empty-state">No exercises match that filter yet.</p> : null}
        </div>
      </SectionCard>
      {selectedEntry ? (
        <div className="modal-backdrop" onClick={() => setSelectedExerciseId(null)} role="presentation">
          <div
            className="modal-card progress-modal-card"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="progression-modal-title"
          >
            <div className="modal-header">
              <div>
                <strong id="progression-modal-title">{selectedEntry.exerciseName}</strong>
                <p>{getTrackingModeLabel(selectedEntry.trackingMode)} • {selectedEntry.totalSessions} sessions</p>
              </div>
              <button
                className="ghost-button compact-icon-button modal-close-button"
                onClick={() => setSelectedExerciseId(null)}
                aria-label="Close progression details"
                title="Close"
              >
                <X size={16} strokeWidth={2.2} />
              </button>
            </div>
            <div className="progress-modal-summary">
              <div className="metric-card">
                <span>Best</span>
                <strong>{formatExerciseBest(selectedEntry, fallbackUnit)}</strong>
                <p>{formatExerciseRecordSummary(selectedEntry, fallbackUnit)}</p>
              </div>
              <div className="metric-card">
                <span>Latest</span>
                <strong>
                  {latestPoint
                    ? formatMetricValue(
                        selectedEntry,
                        effectiveSelectedMetric,
                        latestPoint[effectiveSelectedMetric],
                        fallbackUnit,
                      )
                    : '--'}
                </strong>
                <p>
                  {latestPoint
                    ? `${getMetricLabel(effectiveSelectedMetric)} • ${formatShortDate(latestPoint.workoutDate)}`
                    : 'No sessions yet'}
                </p>
              </div>
            </div>
            <div className="embedded-card progress-chart-card">
              <div className="section-header">
                <div>
                  <strong>Trend</strong>
                  <p>{getMetricLabel(effectiveSelectedMetric)} over time</p>
                </div>
              </div>
              {chartValues.length >= 2 ? (
                <MetricChart values={chartValues} invert={isInvertedMetric(effectiveSelectedMetric)} />
              ) : latestPoint ? (
                <div className="progress-single-point">
                  <strong>
                    {formatMetricValue(
                      selectedEntry,
                      effectiveSelectedMetric,
                      latestPoint[effectiveSelectedMetric],
                      fallbackUnit,
                    )}
                  </strong>
                  <p>{formatShortDate(latestPoint.workoutDate)} • log one more session to see a trend line</p>
                </div>
              ) : (
                <div className="sparkline-placeholder chart-placeholder">No data yet</div>
              )}
            </div>
            <div className="progress-metric-row">
              {metricOptions.map((option) => (
                <button
                  key={option.value}
                  className={effectiveSelectedMetric === option.value ? 'chip-button active' : 'chip-button'}
                  onClick={() => setSelectedMetric(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="grid-list compact-progress-points">
              {selectedEntry.points.map((point) => (
                <div className="embedded-card" key={`${selectedEntry.exerciseId}-${point.workoutDate}`}>
                  <strong>
                    {formatMetricValue(
                      selectedEntry,
                      effectiveSelectedMetric,
                      point[effectiveSelectedMetric],
                      fallbackUnit,
                    )}
                  </strong>
                  <p>{formatShortDate(point.workoutDate)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
