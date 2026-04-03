import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { AppShell } from './app/AppShell'
import { DashboardScreen } from './features/dashboard/DashboardScreen'
import { ExercisesScreen } from './features/exercises/ExercisesScreen'
import { HistoryScreen } from './features/history/HistoryScreen'
import { SettingsScreen } from './features/settings/SettingsScreen'
import { TemplatesScreen } from './features/templates/TemplatesScreen'
import { WorkoutScreen } from './features/workouts/WorkoutScreen'
import {
  addExerciseToWorkout,
  addSetToWorkoutExercise,
  cancelRestTimer,
  completeWorkout,
  createExercise,
  createQuickWorkout,
  createTemplate,
  getActiveWorkout,
  getAnalytics,
  getPreferences,
  getSyncQueueCount,
  listAllExercises,
  listTemplates,
  listWorkoutHistory,
  removeExerciseFromWorkout,
  removeSetFromWorkout,
  savePreferences,
  startWorkoutFromTemplate,
  updateLoggedSet,
} from './db/repository'
import { runSync } from './sync/runSync'
import './index.css'

type TabId = 'dashboard' | 'workout' | 'templates' | 'exercises' | 'history' | 'settings'

const tabs: Array<{ id: TabId; label: string }> = [
  { id: 'dashboard', label: 'Home' },
  { id: 'workout', label: 'Log' },
  { id: 'templates', label: 'Plans' },
  { id: 'history', label: 'PRs' },
]

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard')
  const [isMoreOpen, setIsMoreOpen] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const exercises = useLiveQuery(() => listAllExercises(), [refreshKey], [])
  const templates = useLiveQuery(() => listTemplates(), [refreshKey], [])
  const activeWorkout = useLiveQuery(() => getActiveWorkout(), [refreshKey], null)
  const history = useLiveQuery(() => listWorkoutHistory(), [refreshKey], [])
  const preferencesQuery = useLiveQuery(() => getPreferences(), [refreshKey], null)
  const analytics = useLiveQuery(() => getAnalytics(), [refreshKey], [])
  const pendingSyncCountQuery = useLiveQuery(() => getSyncQueueCount(), [refreshKey], 0)
  const preferences = preferencesQuery ?? null
  const pendingSyncCount = pendingSyncCountQuery ?? 0

  useEffect(() => {
    const interval = window.setInterval(() => {
      setRefreshKey((value) => value + 1)
    }, 1000)

    return () => window.clearInterval(interval)
  }, [])

  const status = useMemo(() => {
    if (activeWorkout) {
      return 'Workout live'
    }

    if (pendingSyncCount > 0) {
      return `${pendingSyncCount} pending`
    }

    return 'Offline-first'
  }, [activeWorkout, pendingSyncCount])

  async function refresh() {
    setRefreshKey((value) => value + 1)
  }

  async function handleRunSync() {
    const result = await runSync()
    setSyncMessage(result.message)
    await refresh()
  }

  const content = (() => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardScreen
            activeWorkout={activeWorkout}
            templates={templates}
            history={history}
            analytics={analytics}
            preferences={preferences}
            onStartTemplate={async (templateId) => {
              await startWorkoutFromTemplate(templateId)
              setActiveTab('workout')
              await refresh()
            }}
          />
        )
      case 'workout':
        return (
          <WorkoutScreen
            activeWorkout={activeWorkout}
            exercises={exercises}
            preferences={preferences}
            timerEndAt={preferences?.activeTimerEndAt ?? null}
            onCreateQuickWorkout={async (name, exerciseIds) => {
              await createQuickWorkout(name, exerciseIds)
              await refresh()
            }}
            onUpdateLoggedSet={async (setId, updates) => {
              await updateLoggedSet(setId, updates)
              await refresh()
            }}
            onAddSet={async (workoutExerciseId) => {
              await addSetToWorkoutExercise(workoutExerciseId)
              await refresh()
            }}
            onRemoveSet={async (setId) => {
              await removeSetFromWorkout(setId)
              await refresh()
            }}
            onAddExerciseToWorkout={async (workoutId, exerciseId) => {
              await addExerciseToWorkout(workoutId, exerciseId)
              await refresh()
            }}
            onRemoveExerciseFromWorkout={async (workoutExerciseId) => {
              await removeExerciseFromWorkout(workoutExerciseId)
              await refresh()
            }}
            onCompleteWorkout={async (workoutId) => {
              await completeWorkout(workoutId)
              setActiveTab('history')
              await refresh()
            }}
            onCancelRestTimer={async () => {
              await cancelRestTimer()
              await refresh()
            }}
          />
        )
      case 'templates':
        return (
          <TemplatesScreen
            exercises={exercises}
            templates={templates}
            onCreateTemplate={async (input) => {
              await createTemplate(input)
              await refresh()
            }}
            onStartTemplate={async (templateId) => {
              await startWorkoutFromTemplate(templateId)
              setActiveTab('workout')
              await refresh()
            }}
          />
        )
      case 'history':
        return <HistoryScreen history={history} analytics={analytics} preferences={preferences} />
      case 'exercises':
        return (
          <ExercisesScreen
            exercises={exercises}
            onCreateExercise={async (input) => {
              await createExercise(input)
              await refresh()
            }}
          />
        )
      case 'settings':
        return (
          <SettingsScreen
            weightUnit={preferences?.weightUnit ?? 'lb'}
            defaultRestSeconds={preferences?.defaultRestSeconds ?? 120}
            pendingSyncCount={pendingSyncCount}
            syncMessage={syncMessage}
            onWeightUnitChange={async (unit) => {
              await savePreferences({ weightUnit: unit })
              await refresh()
            }}
            onDefaultRestChange={async (seconds) => {
              await savePreferences({ defaultRestSeconds: seconds })
              await refresh()
            }}
            onRunSync={handleRunSync}
          />
        )
      default:
        return null
    }
  })()

  return (
    <AppShell
      title={activeTab === 'dashboard' ? 'Train harder, log faster.' : tabs.find((tab) => tab.id === activeTab)?.label ?? 'Stronk'}
      subtitle="Offline-first workout tracking for simple progressive overload."
      status={status}
      onStatusClick={activeWorkout ? () => setActiveTab('workout') : undefined}
      footer={
        <>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={activeTab === tab.id ? 'nav-button active' : 'nav-button'}
              onClick={() => {
                setActiveTab(tab.id)
                setIsMoreOpen(false)
              }}
            >
              <span className="nav-icon" aria-hidden="true">
                {tab.id === 'dashboard' ? 'O' : tab.id === 'workout' ? '+' : tab.id === 'templates' ? '=' : '^'}
              </span>
              <span className="nav-label">{tab.label}</span>
            </button>
          ))}
          <button
            className={isMoreOpen ? 'nav-button active' : 'nav-button'}
            onClick={() => setIsMoreOpen((value) => !value)}
          >
            <span className="nav-icon" aria-hidden="true">
              *
            </span>
            <span className="nav-label">More</span>
          </button>
        </>
      }
    >
      {isMoreOpen ? (
        <div className="more-sheet">
          <button
            className={activeTab === 'exercises' ? 'ghost-button active-sheet' : 'ghost-button'}
            onClick={() => {
              setActiveTab('exercises')
              setIsMoreOpen(false)
            }}
          >
            Exercise library
          </button>
          <button
            className={activeTab === 'settings' ? 'ghost-button active-sheet' : 'ghost-button'}
            onClick={() => {
              setActiveTab('settings')
              setIsMoreOpen(false)
            }}
          >
            Settings & sync
          </button>
        </div>
      ) : null}
      {content}
    </AppShell>
  )
}

export default App
