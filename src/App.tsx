import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useLocation, useNavigate } from 'react-router-dom'
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
import { useAuthSession } from './hooks/useAuthSession'
import {
  isSupabaseConfigured,
  signInWithPassword,
  signOut,
  signUpWithPassword,
} from './sync/client'
import './index.css'

type TabId = 'dashboard' | 'workout' | 'templates' | 'exercises' | 'history' | 'settings'

const routes: Record<
  TabId,
  { title: string; path: string; navLabel?: string; moreMenu?: boolean; navIcon?: string }
> = {
  dashboard: { title: 'Home', path: '/', navLabel: 'Home', navIcon: 'O' },
  workout: { title: 'Log', path: '/workout', navLabel: 'Log', navIcon: '+' },
  templates: { title: 'Plans', path: '/templates', navLabel: 'Plans', navIcon: '=' },
  history: { title: 'PRs', path: '/history', navLabel: 'PRs', navIcon: '^' },
  exercises: { title: 'Exercises', path: '/exercises', moreMenu: true },
  settings: { title: 'Settings', path: '/settings', moreMenu: true },
}

const primaryTabs: TabId[] = ['dashboard', 'workout', 'templates', 'history']
const moreMenuTabs: TabId[] = ['exercises', 'settings']

const routeToTab: Array<{ path: string; id: TabId }> = [
  { path: routes.workout.path, id: 'workout' },
  { path: routes.templates.path, id: 'templates' },
  { path: routes.history.path, id: 'history' },
  { path: routes.exercises.path, id: 'exercises' },
  { path: routes.settings.path, id: 'settings' },
  { path: routes.dashboard.path, id: 'dashboard' },
]

function App() {
  const [isMoreOpen, setIsMoreOpen] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const { session, ready: authReady } = useAuthSession()
  const lastAutoSyncedUserIdRef = useRef<string | null>(null)
  const isAutoSyncingRef = useRef(false)

  const exercises = useLiveQuery(() => listAllExercises(), [], [])
  const templates = useLiveQuery(() => listTemplates(), [], [])
  const activeWorkout = useLiveQuery(() => getActiveWorkout(), [], null)
  const history = useLiveQuery(() => listWorkoutHistory(), [], [])
  const preferencesQuery = useLiveQuery(() => getPreferences(), [], null)
  const analytics = useLiveQuery(() => getAnalytics(), [], [])
  const pendingSyncCountQuery = useLiveQuery(() => getSyncQueueCount(), [], 0)
  const preferences = preferencesQuery ?? null
  const pendingSyncCount = pendingSyncCountQuery ?? 0
  const syncConfigured = isSupabaseConfigured()

  const activeTab = useMemo<TabId>(() => {
    const match = routeToTab.find(({ path }) =>
      path === '/' ? location.pathname === '/' : location.pathname.startsWith(path),
    )

    return match?.id ?? 'dashboard'
  }, [location.pathname])

  const status = useMemo(() => {
    if (activeWorkout) {
      return 'Workout live'
    }

    if (pendingSyncCount > 0) {
      return `${pendingSyncCount} pending`
    }

    return null
  }, [activeWorkout, pendingSyncCount])

  async function handleRunSync() {
    const result = await runSync()
    setSyncMessage(result.message)
  }

  useEffect(() => {
    if (!authReady) {
      return
    }

    if (!session?.userId) {
      lastAutoSyncedUserIdRef.current = null
      return
    }

    if (lastAutoSyncedUserIdRef.current === session.userId) {
      return
    }

    lastAutoSyncedUserIdRef.current = session.userId
    void runSync().then((result) => {
      setSyncMessage(result.message)
    })
  }, [authReady, session?.userId])

  useEffect(() => {
    if (!syncConfigured || !session || pendingSyncCount === 0 || isAutoSyncingRef.current) {
      return
    }

    isAutoSyncingRef.current = true
    const timeoutId = window.setTimeout(() => {
      void runSync()
        .then((result) => {
          setSyncMessage(result.message)
        })
        .finally(() => {
          isAutoSyncingRef.current = false
        })
    }, 1200)

    return () => {
      window.clearTimeout(timeoutId)
      isAutoSyncingRef.current = false
    }
  }, [pendingSyncCount, session, syncConfigured])

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
              navigate(routes.workout.path)
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
            }}
            onUpdateLoggedSet={async (setId, updates) => {
              await updateLoggedSet(setId, updates)
            }}
            onAddSet={async (workoutExerciseId) => {
              await addSetToWorkoutExercise(workoutExerciseId)
            }}
            onRemoveSet={async (setId) => {
              await removeSetFromWorkout(setId)
            }}
            onAddExerciseToWorkout={async (workoutId, exerciseId) => {
              await addExerciseToWorkout(workoutId, exerciseId)
            }}
            onRemoveExerciseFromWorkout={async (workoutExerciseId) => {
              await removeExerciseFromWorkout(workoutExerciseId)
            }}
            onCompleteWorkout={async (workoutId) => {
              await completeWorkout(workoutId)
              navigate(routes.history.path)
            }}
            onCancelRestTimer={async () => {
              await cancelRestTimer()
            }}
          />
        )
      case 'templates':
        return (
          <TemplatesScreen
            exercises={exercises}
            templates={templates}
            weightUnit={preferences?.weightUnit ?? 'lb'}
            onCreateTemplate={async (input) => {
              await createTemplate(input)
            }}
            onStartTemplate={async (templateId) => {
              await startWorkoutFromTemplate(templateId)
              navigate(routes.workout.path)
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
            }}
          />
        )
      case 'settings':
        return (
          <SettingsScreen
            syncConfigured={syncConfigured}
            authReady={authReady}
            authSession={session}
            weightUnit={preferences?.weightUnit ?? 'lb'}
            defaultRestSeconds={preferences?.defaultRestSeconds ?? 120}
            pendingSyncCount={pendingSyncCount}
            syncMessage={syncMessage}
            onSignIn={async (email, password) => {
              const result = await signInWithPassword(email, password)
              setSyncMessage(result.message)
            }}
            onSignUp={async (email, password) => {
              const result = await signUpWithPassword(email, password)
              setSyncMessage(result.message)
            }}
            onSignOut={async () => {
              const result = await signOut()
              setSyncMessage(result.message)
            }}
            onWeightUnitChange={async (unit) => {
              await savePreferences({ weightUnit: unit })
            }}
            onDefaultRestChange={async (seconds) => {
              await savePreferences({ defaultRestSeconds: seconds })
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
      title={routes[activeTab].title}
      status={status}
      onStatusClick={activeWorkout ? () => navigate(routes.workout.path) : undefined}
      footer={
        <>
          {primaryTabs.map((tabId) => (
            <button
              key={tabId}
              className={activeTab === tabId ? 'nav-button active' : 'nav-button'}
              onClick={() => {
                navigate(routes[tabId].path)
                setIsMoreOpen(false)
              }}
            >
              <span className="nav-icon" aria-hidden="true">
                {routes[tabId].navIcon}
              </span>
              <span className="nav-label">{routes[tabId].navLabel}</span>
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
          {moreMenuTabs.map((tabId) => (
            <button
              key={tabId}
              className={activeTab === tabId ? 'ghost-button active-sheet' : 'ghost-button'}
              onClick={() => {
                navigate(routes[tabId].path)
                setIsMoreOpen(false)
              }}
            >
              {tabId === 'exercises' ? 'Exercise library' : 'Settings & sync'}
            </button>
          ))}
        </div>
      ) : null}
      {content}
    </AppShell>
  )
}

export default App
