import { useMemo, useState } from 'react'
import { formatDateTime, formatShortDate, minutesBetween } from '../lib/time'
import type { WorkoutWithDetails } from '../lib/types'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function startOfWeek(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  next.setDate(next.getDate() - next.getDay())
  return next
}

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

interface WorkoutTimelineGridProps {
  history: WorkoutWithDetails[]
  onOpenWorkout: (workoutId: string) => void
}

export function WorkoutTimelineGrid({
  history,
  onOpenWorkout,
}: WorkoutTimelineGridProps) {
  const [previewWorkoutId, setPreviewWorkoutId] = useState<string | null>(history[0]?.workout.id ?? null)
  const previewWorkout =
    history.find((entry) => entry.workout.id === previewWorkoutId) ?? history[0] ?? null

  const weeks = useMemo(() => {
    const completed = [...history].sort(
      (left, right) =>
        new Date(right.workout.endedAt ?? right.workout.startedAt).getTime() -
        new Date(left.workout.endedAt ?? left.workout.startedAt).getTime(),
    )

    const latestDate = completed[0]
      ? startOfDay(new Date(completed[0].workout.endedAt ?? completed[0].workout.startedAt))
      : startOfDay(new Date())
    const currentWeekStart = startOfWeek(latestDate)

    return Array.from({ length: 10 }, (_entry, weekIndex) => {
      const weekStart = addDays(currentWeekStart, -weekIndex * 7)
      const days = Array.from({ length: 7 }, (_day, dayIndex) => {
        const dayDate = addDays(weekStart, dayIndex)
        const dayKey = dayDate.toDateString()
        const workouts = completed.filter((entry) => {
          const workoutDate = startOfDay(
            new Date(entry.workout.endedAt ?? entry.workout.startedAt),
          )
          return workoutDate.toDateString() === dayKey
        })

        return {
          date: dayDate,
          workouts,
        }
      })

      return {
        weekStart,
        days,
      }
    })
  }, [history])

  return (
    <div className="workout-timeline">
      <div className="workout-timeline-header">
        <strong>Workout map</strong>
        <p>One dot per completed workout. Hover for a preview, click to open the results.</p>
      </div>

      <div className="workout-timeline-day-labels" aria-hidden="true">
        <span />
        {DAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="workout-timeline-grid">
        {weeks.map((week) => (
          <div className="workout-timeline-row" key={week.weekStart.toISOString()}>
            <div className="workout-timeline-week-label">{formatShortDate(week.weekStart.toISOString())}</div>
            {week.days.map((day) => (
              <div className="workout-timeline-cell" key={day.date.toISOString()}>
                {day.workouts.length === 0 ? (
                  <div className="workout-timeline-empty" />
                ) : (
                  day.workouts.map((entry) => (
                    <button
                      key={entry.workout.id}
                      className={
                        previewWorkoutId === entry.workout.id
                          ? 'workout-dot workout-dot-active'
                          : 'workout-dot'
                      }
                      onMouseEnter={() => setPreviewWorkoutId(entry.workout.id)}
                      onFocus={() => setPreviewWorkoutId(entry.workout.id)}
                      onClick={() => onOpenWorkout(entry.workout.id)}
                      title={`${entry.workout.name} • ${formatDateTime(entry.workout.startedAt)}`}
                      aria-label={`Open ${entry.workout.name} from ${formatDateTime(entry.workout.startedAt)}`}
                    />
                  ))
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {previewWorkout ? (
        <div className="embedded-card workout-timeline-preview">
          <div>
            <strong>{previewWorkout.workout.name}</strong>
            <p>{formatDateTime(previewWorkout.workout.startedAt)}</p>
          </div>
          <div className="right-align">
            <strong>{previewWorkout.items.length} exercises</strong>
            <p>{minutesBetween(previewWorkout.workout.startedAt, previewWorkout.workout.endedAt)} min</p>
          </div>
        </div>
      ) : (
        <p className="empty-state">Finish a workout to start filling the grid.</p>
      )}
    </div>
  )
}
