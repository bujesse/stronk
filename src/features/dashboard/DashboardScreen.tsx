import { useState } from 'react'
import { WorkoutTimelineGrid } from '../../components/WorkoutTimelineGrid'
import { SectionCard } from '../../components/SectionCard'
import { ProgressionModal } from '../history/ProgressionModal'
import { formatDateTime, formatShortDate } from '../../lib/time'
import { formatExerciseBest, pluralize } from '../../lib/format'
import type { ExerciseAnalytics, Preferences, TemplateWithDetails, WorkoutWithDetails } from '../../lib/types'

interface DashboardScreenProps {
  activeWorkout: WorkoutWithDetails | null
  templates: TemplateWithDetails[]
  history: WorkoutWithDetails[]
  analytics: ExerciseAnalytics[]
  preferences: Preferences | null
  onStartTemplate: (templateId: string) => void
  onOpenWorkout: (workoutId: string) => void
}

export function DashboardScreen({
  activeWorkout,
  templates,
  history,
  analytics,
  preferences,
  onStartTemplate,
  onOpenWorkout,
}: DashboardScreenProps) {
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null)
  const recent = history[0]
  const leaders = analytics.slice(0, 3)
  const selectedEntry =
    selectedExerciseId != null
      ? analytics.find((entry) => entry.exerciseId === selectedExerciseId) ?? null
      : null

  return (
    <div className="stack">
      {activeWorkout ? (
        <SectionCard title="Active workout">
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

      <SectionCard title="Templates">
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
          {templates.length === 0 ? <p className="empty-state">No templates yet.</p> : null}
        </div>
      </SectionCard>

      <SectionCard title="Momentum">
        <div className="stats-grid">
          <div className="metric-card">
            <span>Completed</span>
            <strong>{history.length}</strong>
          </div>
          <div className="metric-card">
            <span>PRs tracked</span>
            <strong>{leaders.filter((entry) => entry.personalBestWeight != null).length}</strong>
          </div>
          <div className="metric-card">
            <span>Last session</span>
            <strong>{recent ? formatDateTime(recent.workout.startedAt) : 'None yet'}</strong>
          </div>
        </div>
        <WorkoutTimelineGrid history={history} onOpenWorkout={onOpenWorkout} />
        <div className="stack compact">
          {leaders.map((entry) => (
            <button
              className="insight-row interactive left-align"
              key={entry.exerciseId}
              onClick={() => setSelectedExerciseId(entry.exerciseId)}
            >
              <div>
                <strong>{entry.exerciseName}</strong>
                <p>{pluralize(entry.totalSessions, 'session')}</p>
              </div>
              <div className="right-align">
                <strong>{formatExerciseBest(entry, preferences?.weightUnit ?? 'lb')}</strong>
                <p>best marker</p>
              </div>
            </button>
          ))}
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
