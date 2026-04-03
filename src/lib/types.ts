export type SyncStatus = 'synced' | 'pending' | 'error'

export type WeightUnit = 'lb' | 'kg'

export interface Exercise {
  id: string
  name: string
  muscleGroup: string | null
  equipment: string | null
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
  targetReps: number | null
  targetWeight: number | null
  deletedAt: string | null
  createdAt: string
  updatedAt: string
  syncStatus: SyncStatus
}

export interface Workout {
  id: string
  templateId: string | null
  name: string
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
  reps: number | null
  weight: number | null
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
  reps: string
  weight: string
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

export interface ExerciseAnalytics {
  exerciseId: string
  exerciseName: string
  latestWeight: number | null
  latestReps: number | null
  personalBestWeight: number | null
  personalBestVolume: number | null
  totalSessions: number
  points: Array<{
    workoutDate: string
    maxWeight: number
    totalVolume: number
  }>
}
