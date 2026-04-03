import { SectionCard } from '../../components/SectionCard'
import { formatShortDate, minutesBetween } from '../../lib/time'
import { formatExerciseBest, pluralize } from '../../lib/format'
import type { ExerciseAnalytics, Preferences, TemplateWithDetails, WorkoutWithDetails } from '../../lib/types'

interface DashboardScreenProps {
  activeWorkout: WorkoutWithDetails | null
  templates: TemplateWithDetails[]
  history: WorkoutWithDetails[]
  analytics: ExerciseAnalytics[]
  preferences: Preferences | null
  onStartTemplate: (templateId: string) => void
}

export function DashboardScreen({
  activeWorkout,
  templates,
  history,
  analytics,
  preferences,
  onStartTemplate,
}: DashboardScreenProps) {
  const recent = history[0]
  const leaders = analytics.slice(0, 3)

  return (
    <div className="stack">
      {activeWorkout ? (
        <SectionCard title="Active workout" description="Resume exactly where you left off.">
          <div className="hero-card">
            <div>
              <strong>{activeWorkout.workout.name}</strong>
              <p>
                {pluralize(activeWorkout.items.length, 'exercise')} in progress since{' '}
                {formatShortDate(activeWorkout.workout.startedAt)}
              </p>
            </div>
            <div className="stat-chip accent">Live</div>
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title="Templates" description="Start fast from your saved sessions.">
        <div className="grid-list">
          {templates.slice(0, 3).map(({ template, items }) => (
            <button
              key={template.id}
              className="list-card interactive"
              onClick={() => onStartTemplate(template.id)}
            >
              <div>
                <strong>{template.name}</strong>
                <p>{pluralize(items.length, 'exercise')}</p>
              </div>
              <span>Start</span>
            </button>
          ))}
          {templates.length === 0 ? (
            <p className="empty-state">Create a template to start logging in two taps.</p>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard title="Momentum" description="Basic progression cues from completed workouts.">
        <div className="stats-grid">
          <div className="metric-card">
            <span>Completed</span>
            <strong>{history.length}</strong>
            <p>tracked workouts</p>
          </div>
          <div className="metric-card">
            <span>PRs tracked</span>
            <strong>{leaders.filter((entry) => entry.personalBestWeight != null).length}</strong>
            <p>top lifts</p>
          </div>
          <div className="metric-card">
            <span>Last session</span>
            <strong>{recent ? minutesBetween(recent.workout.startedAt, recent.workout.endedAt) : 0}</strong>
            <p>minutes</p>
          </div>
        </div>
        {leaders.map((entry) => (
          <div className="insight-row" key={entry.exerciseId}>
            <div>
              <strong>{entry.exerciseName}</strong>
              <p>{pluralize(entry.totalSessions, 'session')}</p>
            </div>
            <div className="right-align">
              <strong>{formatExerciseBest(entry, preferences?.weightUnit ?? 'lb')}</strong>
              <p>best marker</p>
            </div>
          </div>
        ))}
      </SectionCard>
    </div>
  )
}
