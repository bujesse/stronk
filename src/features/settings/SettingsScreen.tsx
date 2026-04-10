import { useState } from 'react'
import { ExercisesScreen } from '../exercises/ExercisesScreen'
import { DropdownField } from '../../components/DropdownField'
import { SectionCard } from '../../components/SectionCard'
import type { AuthSessionInfo, BodyRegion, Exercise, TrackingMode, WeightUnit } from '../../lib/types'

interface SettingsScreenProps {
  exercises: Exercise[]
  syncConfigured: boolean
  authReady: boolean
  authSession: AuthSessionInfo | null
  weightUnit: 'lb' | 'kg'
  defaultRestSeconds: number
  pendingSyncCount: number
  syncMessage: string | null
  authMessage: string | null
  onSignIn: (email: string, password: string) => Promise<void>
  onSignUp: (email: string, password: string) => Promise<void>
  onSignOut: () => Promise<void>
  onWeightUnitChange: (unit: 'lb' | 'kg') => Promise<void>
  onDefaultRestChange: (seconds: number) => Promise<void>
  onRunSync: () => Promise<void>
  onCreateExercise: (input: {
    movementName: string
    bodyRegion?: BodyRegion | null
    muscleGroup?: string
    equipment?: string
    preferredWeightUnit?: WeightUnit | null
    trackingMode: TrackingMode
    defaultRestSeconds?: number | null
  }) => Promise<void>
  onUpdateExercise: (
    exerciseId: string,
    input: {
      movementName: string
      bodyRegion?: BodyRegion | null
      muscleGroup?: string
      equipment?: string
      preferredWeightUnit?: WeightUnit | null
      trackingMode: TrackingMode
      defaultRestSeconds?: number | null
    },
  ) => Promise<void>
}

export function SettingsScreen({
  exercises,
  syncConfigured,
  authReady,
  authSession,
  weightUnit,
  defaultRestSeconds,
  pendingSyncCount,
  syncMessage,
  authMessage,
  onSignIn,
  onSignUp,
  onSignOut,
  onWeightUnitChange,
  onDefaultRestChange,
  onRunSync,
  onCreateExercise,
  onUpdateExercise,
}: SettingsScreenProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false)

  async function handleSignIn() {
    setIsSubmittingAuth(true)
    try {
      await onSignIn(email, password)
    } finally {
      setIsSubmittingAuth(false)
    }
  }

  async function handleSignUp() {
    setIsSubmittingAuth(true)
    try {
      await onSignUp(email, password)
    } finally {
      setIsSubmittingAuth(false)
    }
  }

  return (
    <div className="stack">
      <SectionCard title="Preferences">
        <div className="form-grid">
          <DropdownField
            label="Weight unit"
            value={weightUnit}
            placeholder="Choose unit"
            options={[
              { value: 'lb', label: 'Pounds' },
              { value: 'kg', label: 'Kilograms' },
            ]}
            onChange={(value) => onWeightUnitChange(value as 'lb' | 'kg')}
          />
          <label className="field-label">
            Default rest
            <input
              defaultValue={defaultRestSeconds}
              inputMode="numeric"
              onBlur={(event) => onDefaultRestChange(Number(event.target.value) || 120)}
            />
          </label>
        </div>
      </SectionCard>

      <SectionCard title="Account">
        {!syncConfigured ? (
          <p className="info-callout">Set `VITE_POCKETBASE_URL`.</p>
        ) : !authReady ? (
          <p className="info-callout">Checking session…</p>
        ) : authSession ? (
          <div className="stack compact">
            <p className="info-callout">Signed in as {authSession.email ?? authSession.userId}.</p>
            <button className="ghost-button" onClick={onSignOut}>
              Sign out
            </button>
          </div>
        ) : (
          <div className="stack compact">
            {authMessage ? <p className="info-callout">{authMessage}</p> : null}
            <label className="field-label">
              Email
              <input
                value={email}
                type="email"
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label className="field-label">
              Password
              <input
                value={password}
                type="password"
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <div className="inline-actions">
              <button
                className="primary-button"
                onClick={() => void handleSignIn()}
                disabled={isSubmittingAuth}
              >
                {isSubmittingAuth ? 'Signing in…' : 'Sign in'}
              </button>
              <button
                className="ghost-button"
                onClick={() => void handleSignUp()}
                disabled={isSubmittingAuth}
              >
                Create account
              </button>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Sync">
        <div className="sync-panel">
          <div className="sync-status-line">
            <strong>{pendingSyncCount}</strong>
            <span>{pendingSyncCount === 1 ? 'queued change' : 'queued changes'}</span>
            {syncMessage ? <span className="sync-inline-message">{syncMessage}</span> : null}
          </div>
          <button className="primary-button" onClick={onRunSync} disabled={!syncConfigured || !authSession}>
            Run sync
          </button>
        </div>
      </SectionCard>

      <ExercisesScreen
        exercises={exercises}
        onCreateExercise={onCreateExercise}
        onUpdateExercise={onUpdateExercise}
      />
    </div>
  )
}
