export type SyncStatus = 'synced' | 'pending' | 'error'

export type WeightUnit = 'lb' | 'kg'
export type BodyRegion =
  | 'Chest'
  | 'Back'
  | 'Shoulders'
  | 'Arms'
  | 'Legs'
  | 'Core'
  | 'Cardio'
export type TrackingMode =
  | 'weight_reps'
  | 'bodyweight_reps'
  | 'assisted_bodyweight_reps'
  | 'duration'
export type SetKind = 'normal' | 'warmup'

export interface Exercise {
  id: string
  movementName: string
  bodyRegion: BodyRegion | null
  muscleGroup: string | null
  equipment: string | null
  preferredWeightUnit: WeightUnit | null
  trackingMode: TrackingMode
  defaultRestSeconds: number | null
  isCustom: boolean
  deletedAt: string | null
  createdAt: string
  updatedAt: string
  syncStatus: SyncStatus
}

export interface WorkoutTemplate {
  id: string
  name: string
  notes: string
  deletedAt: string | null
  createdAt: string
  updatedAt: string
  syncStatus: SyncStatus
}

export interface TemplateExercise {
  id: string
  templateId: string
  exerciseId: string
  sortOrder: number
  deletedAt: string | null
  createdAt: string
  updatedAt: string
  syncStatus: SyncStatus
}

export interface TemplateSet {
  id: string
  templateExerciseId: string
  sortOrder: number
  setKind: SetKind
  targetReps: number | null
  targetWeight: number | null
  targetAssistanceWeight: number | null
  targetDurationSeconds: number | null
  deletedAt: string | null
  createdAt: string
  updatedAt: string
  syncStatus: SyncStatus
}

export interface Workout {
  id: string
  templateId: string | null
  name: string
  notes: string
  caloriesBurned: number | null
  status: 'active' | 'completed'
  startedAt: string
  endedAt: string | null
  deletedAt: string | null
  createdAt: string
  updatedAt: string
  syncStatus: SyncStatus
}

export interface WorkoutExercise {
  id: string
  workoutId: string
  exerciseId: string
  notes: string
  sortOrder: number
  deletedAt: string | null
  createdAt: string
  updatedAt: string
  syncStatus: SyncStatus
}

export interface LoggedSet {
  id: string
  workoutExerciseId: string
  plannedSetId: string | null
  sortOrder: number
  setKind: SetKind
  reps: number | null
  weight: number | null
  assistanceWeight: number | null
  durationSeconds: number | null
  completedAt: string | null
  deletedAt: string | null
  createdAt: string
  updatedAt: string
  syncStatus: SyncStatus
}

export interface Preferences {
  id: 'preferences'
  weightUnit: WeightUnit
  defaultRestSeconds: number
  activeTimerEndAt: string | null
  updatedAt: string
}

export interface Profile {
  id: 'profile'
  heightCm: number | null
  targetBodyWeightKg: number | null
  updatedAt: string
  syncStatus: SyncStatus
}

export interface BodyWeightEntry {
  id: string
  weightKg: number
  recordedAt: string
  deletedAt: string | null
  createdAt: string
  updatedAt: string
  syncStatus: SyncStatus
}

export interface AuthSessionInfo {
  userId: string
  email: string | null
}

export interface SyncQueueItem {
  id: string
  entity: string
  entityId: string
  operation: 'upsert' | 'delete'
  payload: object
  createdAt: string
  updatedAt: string
  status: 'queued' | 'processing' | 'failed'
  errorMessage: string | null
}

export interface TemplateSetDraft {
  setKind: SetKind
  reps: string
  weight: string
  assistanceWeight: string
  durationMinutes: string
}

export interface TemplateExerciseWithSets {
  templateExercise: TemplateExercise
  exercise: Exercise
  sets: TemplateSet[]
}

export interface WorkoutExerciseWithSets {
  workoutExercise: WorkoutExercise
  exercise: Exercise
  sets: LoggedSet[]
}

export interface TemplateWithDetails {
  template: WorkoutTemplate
  items: TemplateExerciseWithSets[]
}

export interface WorkoutWithDetails {
  workout: Workout
  items: WorkoutExerciseWithSets[]
}

export interface WorkoutNoteEntry {
  workoutId: string
  workoutName: string
  note: string
  startedAt: string
  endedAt: string | null
}

export interface ExerciseNoteEntry {
  workoutExerciseId: string
  workoutId: string
  exerciseId: string
  exerciseName: string
  workoutName: string
  note: string
  startedAt: string
  endedAt: string | null
}

export interface ExerciseAnalytics {
  exerciseId: string
  exerciseName: string
  preferredWeightUnit: WeightUnit | null
  trackingMode: TrackingMode
  latestWeight: number | null
  latestReps: number | null
  latestAssistanceWeight: number | null
  latestDurationSeconds: number | null
  personalBestWeight: number | null
  estimatedOneRepMax: number | null
  personalBestReps: number | null
  leastAssistanceWeight: number | null
  longestDurationSeconds: number | null
  personalBestSetVolume: number | null
  personalBestSessionVolume: number | null
  personalBestSessionReps: number | null
  personalBestSessionDurationSeconds: number | null
  totalSessions: number
  points: Array<{
    workoutDate: string
    metricValue: number
    totalVolume: number
  }>
}
