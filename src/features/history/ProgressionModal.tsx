import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  formatExerciseBest,
  formatExerciseRecordSummary,
  formatVolume,
  formatWeight,
  getTrackingModeLabel,
} from '../../lib/format'
import { formatShortDate } from '../../lib/time'
import type { ExerciseAnalytics, Preferences, WorkoutWithDetails } from '../../lib/types'

type MetricKey =
  | 'loadValue'
  | 'bestReps'
  | 'totalVolume'
  | 'assistanceValue'
  | 'sessionReps'
  | 'setDurationSeconds'
  | 'sessionDurationSeconds'

function ProgressChartDot(props: {
  cx?: number
  cy?: number
  index?: number
  activeIndex: number | null
  onPointEnter: (index: number) => void
}) {
  if (props.cx == null || props.cy == null || props.index == null) {
    return null
  }

  const isActive = props.activeIndex === props.index

  return (
    <g>
      <circle
        cx={props.cx}
        cy={props.cy}
        r={10}
        className="progress-point-hit"
        onMouseEnter={() => props.onPointEnter(props.index!)}
        onClick={() => props.onPointEnter(props.index!)}
      />
      <circle
        cx={props.cx}
        cy={props.cy}
        r={isActive ? 4.3 : 3.2}
        className={isActive ? 'progress-point active' : 'progress-point'}
        onMouseEnter={() => props.onPointEnter(props.index!)}
        onClick={() => props.onPointEnter(props.index!)}
      />
    </g>
  )
}

function ProgressChartTooltip({
  active,
  payload,
  label,
  formatPointValue,
}: {
  active?: boolean
  payload?: ReadonlyArray<{ value?: unknown }>
  label?: string | number
  formatPointValue: (value: number) => string
}) {
  if (!active || !payload?.length) {
    return null
  }

  const value = payload[0]?.value
  if (typeof value !== 'number') {
    return null
  }

  return (
    <div className="chart-tooltip">
      <strong>{formatPointValue(value)}</strong>
      <p>{String(label ?? '')}</p>
    </div>
  )
}

function MetricChart({
  data,
  invert,
  activeIndex,
  onPointEnter,
  formatPointValue,
}: {
  data: Array<{ label: string; value: number }>
  invert?: boolean
  activeIndex: number | null
  onPointEnter: (index: number) => void
  formatPointValue: (value: number) => string
}) {
  if (data.length === 0) {
    return <div className="sparkline-placeholder chart-placeholder">No data yet</div>
  }

  return (
    <div className="progress-chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 12, right: 12, left: 8, bottom: 8 }}
          onMouseMove={(state) => {
            if (typeof state.activeTooltipIndex === 'number') {
              onPointEnter(state.activeTooltipIndex)
            }
          }}
        >
          <XAxis dataKey="label" hide />
          <YAxis hide reversed={invert} domain={['dataMin', 'dataMax']} />
          <Tooltip
            content={(props) => <ProgressChartTooltip {...props} formatPointValue={formatPointValue} />}
            cursor={{ stroke: 'rgba(255, 154, 61, 0.18)', strokeWidth: 1 }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="currentColor"
            strokeWidth={3}
            dot={(props) => (
              <ProgressChartDot {...props} activeIndex={activeIndex} onPointEnter={onPointEnter} />
            )}
            activeDot={(props) => (
              <ProgressChartDot {...props} activeIndex={activeIndex} onPointEnter={onPointEnter} />
            )}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
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
      ]
    case 'duration':
      return [
        { value: 'setDurationSeconds' as const, label: 'Best set' },
        { value: 'sessionDurationSeconds' as const, label: 'Workout time' },
      ]
  }
}

function formatMetricValue(
  entry: ExerciseAnalytics,
  metric: MetricKey,
  value: number,
  fallbackUnit: 'lb' | 'kg',
) {
  const unit = entry.preferredWeightUnit ?? fallbackUnit

  switch (metric) {
    case 'loadValue':
    case 'assistanceValue':
      return formatWeight(value, unit)
    case 'totalVolume':
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

function formatSetLine(
  entry: ExerciseAnalytics,
  point: WorkoutWithDetails['items'][number]['sets'][number],
  fallbackUnit: 'lb' | 'kg',
) {
  const unit = entry.preferredWeightUnit ?? fallbackUnit

  switch (entry.trackingMode) {
    case 'weight_reps':
      return `${point.reps ?? 0} reps @ ${formatWeight(point.weight, unit)}`
    case 'bodyweight_reps':
      return `${point.reps ?? 0} reps`
    case 'assisted_bodyweight_reps':
      return `${point.reps ?? 0} reps @ ${formatWeight(point.assistanceWeight, unit)} assist`
    case 'duration': {
      const seconds = point.durationSeconds ?? 0
      const minutes = Math.floor(seconds / 60)
      const remainder = seconds % 60
      return `${minutes}:${String(remainder).padStart(2, '0')}`
    }
  }
}

function formatBestSetSummary(
  entry: ExerciseAnalytics,
  sets: WorkoutWithDetails['items'][number]['sets'],
  fallbackUnit: 'lb' | 'kg',
) {
  const completedSets = sets.filter((set) => set.completedAt != null && set.setKind !== 'warmup')
  if (completedSets.length === 0) {
    return '--'
  }

  switch (entry.trackingMode) {
    case 'weight_reps': {
      const best = completedSets.reduce((currentBest, set) =>
        (set.weight ?? 0) > (currentBest.weight ?? 0) ? set : currentBest,
      )
      return `${best.reps ?? 0} reps @ ${formatWeight(best.weight, entry.preferredWeightUnit ?? fallbackUnit)}`
    }
    case 'bodyweight_reps': {
      const best = Math.max(...completedSets.map((set) => set.reps ?? 0))
      return `${best} reps`
    }
    case 'assisted_bodyweight_reps': {
      const best = completedSets.reduce((currentBest, set) =>
        (set.reps ?? 0) > (currentBest.reps ?? 0) ? set : currentBest,
      )
      return `${best.reps ?? 0} reps @ ${formatWeight(best.assistanceWeight, entry.preferredWeightUnit ?? fallbackUnit)} assist`
    }
    case 'duration': {
      const best = Math.max(...completedSets.map((set) => set.durationSeconds ?? 0))
      const minutes = Math.floor(best / 60)
      const remainder = best % 60
      return `${minutes}:${String(remainder).padStart(2, '0')}`
    }
  }
}

function buildSessionAggregateCards(
  entry: ExerciseAnalytics,
  sets: WorkoutWithDetails['items'][number]['sets'],
  fallbackUnit: 'lb' | 'kg',
) {
  const completedSets = sets.filter((set) => set.completedAt != null && set.setKind !== 'warmup')
  const cards = [
    {
      label: 'Sets',
      value: `${completedSets.length}`,
      detail: `${sets.filter((set) => set.setKind === 'warmup').length} warm-up`,
    },
    {
      label: 'Best set',
      value: formatBestSetSummary(entry, sets, fallbackUnit),
      detail: 'top effort',
    },
  ]

  switch (entry.trackingMode) {
    case 'weight_reps':
      cards.push({
        label: 'Workout volume',
        value: formatVolume(
          completedSets.reduce((sum, set) => sum + (set.weight ?? 0) * (set.reps ?? 0), 0),
          entry.preferredWeightUnit ?? fallbackUnit,
        ),
        detail: `${completedSets.reduce((sum, set) => sum + (set.reps ?? 0), 0)} total reps`,
      })
      break
    case 'bodyweight_reps':
      cards.push({
        label: 'Workout reps',
        value: `${completedSets.reduce((sum, set) => sum + (set.reps ?? 0), 0)}`,
        detail: 'total reps',
      })
      break
    case 'assisted_bodyweight_reps': {
      const assistValues = completedSets
        .map((set) => set.assistanceWeight)
        .filter((value): value is number => value != null)
      cards.push({
        label: 'Workout reps',
        value: `${completedSets.reduce((sum, set) => sum + (set.reps ?? 0), 0)}`,
        detail:
          assistValues.length > 0
            ? `${formatWeight(Math.min(...assistValues), entry.preferredWeightUnit ?? fallbackUnit)} least assist`
            : 'assist tracked',
      })
      break
    }
    case 'duration': {
      const totalSeconds = completedSets.reduce((sum, set) => sum + (set.durationSeconds ?? 0), 0)
      const minutes = Math.floor(totalSeconds / 60)
      const remainder = totalSeconds % 60
      cards.push({
        label: 'Workout time',
        value: `${minutes}:${String(remainder).padStart(2, '0')}`,
        detail: 'total duration',
      })
      break
    }
  }

  return cards
}

interface ProgressionModalProps {
  entry: ExerciseAnalytics
  history: WorkoutWithDetails[]
  preferences: Preferences | null
  onClose: () => void
}

export function ProgressionModal({
  entry,
  history,
  preferences,
  onClose,
}: ProgressionModalProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('loadValue')
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null)

  const metricOptions = useMemo(() => getMetricOptions(entry), [entry])
  const effectiveSelectedMetric = metricOptions.some((option) => option.value === selectedMetric)
    ? selectedMetric
    : metricOptions[0]?.value ?? 'loadValue'
  const fallbackUnit = preferences?.weightUnit ?? 'lb'
  const latestPoint = entry.points[entry.points.length - 1] ?? null
  const chartData = entry.points.map((point) => ({
    label: formatShortDate(point.workoutDate),
    value: point[effectiveSelectedMetric],
  }))
  const effectivePointIndex =
    activePointIndex != null && activePointIndex < entry.points.length
      ? activePointIndex
      : entry.points.length - 1
  const activePoint = effectivePointIndex >= 0 ? entry.points[effectivePointIndex] : latestPoint
  const activeSessionItem =
    activePoint
      ? history
          .find((workout) => workout.workout.startedAt === activePoint.workoutDate)
          ?.items.find((item) => item.exercise.id === entry.exerciseId) ?? null
      : null
  const sessionAggregateCards =
    activeSessionItem ? buildSessionAggregateCards(entry, activeSessionItem.sets, fallbackUnit) : []

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal-card progress-modal-card"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="progression-modal-title"
      >
        <div className="modal-header">
          <div>
            <strong id="progression-modal-title">{entry.exerciseName}</strong>
            <p>{getTrackingModeLabel(entry.trackingMode)} • {entry.totalSessions} sessions</p>
          </div>
          <button
            className="ghost-button compact-icon-button modal-close-button"
            onClick={onClose}
            aria-label="Close progression details"
            title="Close"
          >
            <X size={16} strokeWidth={2.2} />
          </button>
        </div>
        <div className="progress-modal-summary">
          <div className="metric-card">
            <span>Best</span>
            <strong>{formatExerciseBest(entry, fallbackUnit)}</strong>
            <p>{formatExerciseRecordSummary(entry, fallbackUnit)}</p>
          </div>
          <div className="metric-card">
            <span>Latest</span>
            <strong>
              {latestPoint
                ? formatMetricValue(
                    entry,
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
          {chartData.length >= 2 ? (
            <MetricChart
              data={chartData}
              invert={isInvertedMetric(effectiveSelectedMetric)}
              activeIndex={effectivePointIndex}
              onPointEnter={setActivePointIndex}
              formatPointValue={(value) =>
                formatMetricValue(entry, effectiveSelectedMetric, value, fallbackUnit)
              }
            />
          ) : latestPoint ? (
            <div className="progress-single-point">
              <strong>
                {formatMetricValue(
                  entry,
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
              onClick={() => {
                setSelectedMetric(option.value)
                setActivePointIndex(null)
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
        {activePoint ? (
          <div className="embedded-card progress-active-point">
            <strong>
              {formatMetricValue(
                entry,
                effectiveSelectedMetric,
                activePoint[effectiveSelectedMetric],
                fallbackUnit,
              )}
            </strong>
            <p>{formatShortDate(activePoint.workoutDate)}</p>
          </div>
        ) : null}
        {activeSessionItem ? (
          <div className="stack compact">
            <div className="section-header">
              <div>
                <strong>Session details</strong>
                <p>{formatShortDate(activePoint?.workoutDate ?? activeSessionItem.workoutExercise.createdAt)}</p>
              </div>
            </div>
            <div className="grid-list compact-progress-points">
              {sessionAggregateCards.map((card) => (
                <div className="embedded-card" key={`${card.label}-${card.value}`}>
                  <strong>{card.value}</strong>
                  <p>{card.label}</p>
                  <p>{card.detail}</p>
                </div>
              ))}
            </div>
            <div className="stack compact">
              {activeSessionItem.sets.map((set, index) => (
                <div className="embedded-card progress-set-row" key={`${activeSessionItem.workoutExercise.id}-${set.id}`}>
                  <strong>{`Set ${index + 1}${set.setKind === 'warmup' ? ' • WU' : ''}`}</strong>
                  <p>{formatSetLine(entry, set, fallbackUnit)}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <div className="grid-list compact-progress-points">
          {entry.points.map((point) => (
            <div className="embedded-card" key={`${entry.exerciseId}-${point.workoutDate}`}>
              <strong>
                {formatMetricValue(
                  entry,
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
  )
}
