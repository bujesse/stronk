import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Cog,
  Dumbbell,
  Gauge,
  House,
  NotebookTabs,
  type LucideIcon,
} from 'lucide-react'
import { AppShell } from './app/AppShell'
import { DashboardScreen } from './features/dashboard/DashboardScreen'
import { HistoryScreen } from './features/history/HistoryScreen'
import { WorkoutResultsScreen } from './features/history/WorkoutResultsScreen'
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
  duplicateSetInWorkout,
  getActiveWorkout,
  getAnalytics,
  getPreferences,
  getSyncQueueCount,
  getWorkoutById,
  listAllExercises,
  listTemplates,
  listExerciseNoteHistoryForWorkout,
  listWorkoutNoteHistory,
  listWorkoutHistory,
  moveExerciseInWorkout,
  removeExerciseFromWorkout,
  removeSetFromWorkout,
  savePreferences,
  startWorkoutFromTemplate,
  updateExercise,
  updateWorkoutExerciseNotes,
  updateWorkoutNotes,
  updateLoggedSet,
} from './db/repository'
import { runSync } from './sync/runSync'
import { useAuthSession } from './hooks/useAuthSession'
import {
  isPocketBaseConfigured,
  signInWithPassword,
  signOut,
  signUpWithPassword,
} from './sync/client'
import './index.css'

type TabId = 'dashboard' | 'workout' | 'templates' | 'history' | 'settings'

const routes: Record<
  TabId,
  { title: string; path: string; navLabel: string; navIcon: LucideIcon }
> = {
  dashboard: { title: 'Home', path: '/', navLabel: 'Home', navIcon: House },
  workout: { title: 'Log', path: '/workout', navLabel: 'Log', navIcon: Dumbbell },
  templates: { title: 'Plans', path: '/templates', navLabel: 'Plans', navIcon: NotebookTabs },
  history: { title: 'PRs', path: '/history', navLabel: 'PRs', navIcon: Gauge },
  settings: { title: 'Settings', path: '/settings', navLabel: 'Settings', navIcon: Cog },
}

const primaryTabs: TabId[] = ['dashboard', 'workout', 'templates', 'history', 'settings']

const routeToTab: Array<{ path: string; id: TabId }> = [
  { path: routes.workout.path, id: 'workout' },
  { path: routes.templates.path, id: 'templates' },
  { path: routes.history.path, id: 'history' },
  { path: routes.settings.path, id: 'settings' },
  { path: '/exercises', id: 'settings' },
  { path: routes.dashboard.path, id: 'dashboard' },
]

function App() {
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const { session, ready: authReady } = useAuthSession()
  const lastAutoSyncedUserIdRef = useRef<string | null>(null)
  const isAutoSyncingRef = useRef(false)

  const activeTab = useMemo<TabId>(() => {
    const match = routeToTab.find(({ path }) =>
      path === '/' ? location.pathname === '/' : location.pathname.startsWith(path),
    )

    return match?.id ?? 'dashboard'
  }, [location.pathname])

  const workoutResultId = useMemo(() => {
    if (!location.pathname.startsWith(`${routes.history.path}/`)) {
      return null
    }

    return decodeURIComponent(location.pathname.slice(routes.history.path.length + 1))
  }, [location.pathname])

  const exercises = useLiveQuery(() => listAllExercises(), [], [])
  const templates = useLiveQuery(() => listTemplates(), [], [])
  const activeWorkout = useLiveQuery(() => getActiveWorkout(), [], null)
  const history = useLiveQuery(
    () => (activeTab === 'dashboard' || activeTab === 'history' ? listWorkoutHistory() : Promise.resolve([])),
    [activeTab],
    [],
  )
  const fullHistory = useLiveQuery(
    () => (workoutResultId ? listWorkoutHistory(500) : Promise.resolve([])),
    [workoutResultId],
    [],
  )
  const preferencesQuery = useLiveQuery(() => getPreferences(), [], null)
  const analytics = useLiveQuery(() => getAnalytics(), [], [])
  const pendingSyncCountQuery = useLiveQuery(() => getSyncQueueCount(), [], 0)
  const workoutNoteHistory = useLiveQuery(
    () => (activeWorkout ? listWorkoutNoteHistory(activeWorkout.workout.id) : Promise.resolve([])),
    [activeWorkout?.workout.id],
    [],
  )
  const exerciseNoteHistory = useLiveQuery(
    () =>
      activeWorkout
        ? listExerciseNoteHistoryForWorkout(activeWorkout.workout.id)
        : Promise.resolve({}),
    [activeWorkout?.workout.id],
    {},
  )
  const preferences = preferencesQuery ?? null
  const pendingSyncCount = pendingSyncCountQuery ?? 0
  const syncConfigured = isPocketBaseConfigured()

  const workoutResult = useLiveQuery(
    () => (workoutResultId ? getWorkoutById(workoutResultId) : Promise.resolve(null)),
    [workoutResultId],
    null,
  )

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
            noteHistory={workoutNoteHistory}
            exerciseNoteHistory={exerciseNoteHistory}
            onCreateQuickWorkout={async (name, exerciseIds) => {
              await createQuickWorkout(name, exerciseIds)
            }}
            onUpdateWorkoutExerciseNotes={async (workoutExerciseId, notes) => {
              await updateWorkoutExerciseNotes(workoutExerciseId, notes)
            }}
            onUpdateWorkoutNotes={async (workoutId, notes) => {
              await updateWorkoutNotes(workoutId, notes)
            }}
            onUpdateLoggedSet={async (setId, updates) => {
              await updateLoggedSet(setId, updates)
            }}
            onAddSet={async (workoutExerciseId) => {
              await addSetToWorkoutExercise(workoutExerciseId)
            }}
            onDuplicateSet={async (setId) => {
              await duplicateSetInWorkout(setId)
            }}
            onRemoveSet={async (setId) => {
              await removeSetFromWorkout(setId)
            }}
            onMoveExercise={async (workoutExerciseId, direction) => {
              await moveExerciseInWorkout(workoutExerciseId, direction)
            }}
            onAddExerciseToWorkout={async (workoutId, exerciseId) => {
              await addExerciseToWorkout(workoutId, exerciseId)
            }}
            onRemoveExerciseFromWorkout={async (workoutExerciseId) => {
              await removeExerciseFromWorkout(workoutExerciseId)
            }}
            onCompleteWorkout={async (workoutId) => {
              await completeWorkout(workoutId)
              navigate(`${routes.history.path}/${encodeURIComponent(workoutId)}`)
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
        return workoutResultId ? (
          <WorkoutResultsScreen workout={workoutResult} history={fullHistory} preferences={preferences} />
        ) : (
          <HistoryScreen
            history={history}
            analytics={analytics}
            preferences={preferences}
            onOpenWorkout={(workoutId) => {
              navigate(`${routes.history.path}/${encodeURIComponent(workoutId)}`)
            }}
          />
        )
      case 'settings':
        return (
          <SettingsScreen
            exercises={exercises}
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
            onCreateExercise={async (input) => {
              await createExercise(input)
            }}
            onUpdateExercise={async (exerciseId, input) => {
              await updateExercise(exerciseId, input)
            }}
          />
        )
      default:
        return null
    }
  })()

  return (
    <AppShell
      title={workoutResultId ? 'Results' : routes[activeTab].title}
      status={status}
      onStatusClick={activeWorkout ? () => navigate(routes.workout.path) : undefined}
      footer={
        <>
          {primaryTabs.map((tabId) => {
            const Icon = routes[tabId].navIcon

            return (
              <button
                key={tabId}
                className={activeTab === tabId ? 'nav-button active' : 'nav-button'}
                onClick={() => {
                  navigate(routes[tabId].path)
                }}
              >
                <span className="nav-icon" aria-hidden="true">
                  <Icon size={16} strokeWidth={2.2} />
                </span>
                <span className="nav-label">{routes[tabId].navLabel}</span>
              </button>
            )
          })}
        </>
      }
    >
      {content}
    </AppShell>
  )
}

export default App
