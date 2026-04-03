import { SectionCard } from '../../components/SectionCard'

interface SettingsScreenProps {
  weightUnit: 'lb' | 'kg'
  defaultRestSeconds: number
  pendingSyncCount: number
  syncMessage: string | null
  onWeightUnitChange: (unit: 'lb' | 'kg') => Promise<void>
  onDefaultRestChange: (seconds: number) => Promise<void>
  onRunSync: () => Promise<void>
}

export function SettingsScreen({
  weightUnit,
  defaultRestSeconds,
  pendingSyncCount,
  syncMessage,
  onWeightUnitChange,
  onDefaultRestChange,
  onRunSync,
}: SettingsScreenProps) {
  return (
    <div className="stack">
      <SectionCard title="Preferences" description="Local settings sync once cloud backup is configured.">
        <div className="form-grid">
          <label className="field-label">
            Weight unit
            <select value={weightUnit} onChange={(event) => onWeightUnitChange(event.target.value as 'lb' | 'kg')}>
              <option value="lb">Pounds</option>
              <option value="kg">Kilograms</option>
            </select>
          </label>
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

      <SectionCard title="Sync" description="Offline-first remains fully usable without cloud credentials.">
        <div className="sync-panel">
          <div>
            <strong>{pendingSyncCount}</strong>
            <p>queued local changes</p>
          </div>
          <button className="primary-button" onClick={onRunSync}>
            Run sync
          </button>
        </div>
        {syncMessage ? <p className="info-callout">{syncMessage}</p> : null}
      </SectionCard>
    </div>
  )
}
