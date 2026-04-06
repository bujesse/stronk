import { db } from '../db/appDb'
import type {
  Exercise,
  LoggedSet,
  Preferences,
  TemplateExercise,
  TemplateSet,
  Workout,
  WorkoutExercise,
  WorkoutTemplate,
} from '../lib/types'

type SyncableLocalRecord =
  | Exercise
  | WorkoutTemplate
  | TemplateExercise
  | TemplateSet
  | Workout
  | WorkoutExercise
  | LoggedSet

type SyncEntityName =
  | 'exercise'
  | 'workoutTemplate'
  | 'templateExercise'
  | 'templateSet'
  | 'workout'
  | 'workoutExercise'
  | 'loggedSet'
  | 'preferences'

type RemoteBaseRow = {
  id?: string
  app_id: string
  user_id: string
  updated_at: string
}

type RemoteExerciseRow = RemoteBaseRow & {
  movement_name: string
  body_region: Exercise['bodyRegion']
  muscle_group: string | null
  equipment: string | null
  preferred_weight_unit: Exercise['preferredWeightUnit']
  tracking_mode: Exercise['trackingMode']
  default_rest_seconds: number | null
  is_custom: boolean
  deleted_at: string | null
  created_at: string
}

type RemoteWorkoutTemplateRow = RemoteBaseRow & {
  name: string
  notes: string
  deleted_at: string | null
  created_at: string
}

type RemoteTemplateExerciseRow = RemoteBaseRow & {
  template_id: string
  exercise_id: string
  sort_order: number
  deleted_at: string | null
  created_at: string
}

type RemoteTemplateSetRow = RemoteBaseRow & {
  template_exercise_id: string
  sort_order: number
  set_kind: TemplateSet['setKind']
  target_reps: number | null
  target_weight: number | null
  target_assistance_weight: number | null
  target_duration_seconds: number | null
  deleted_at: string | null
  created_at: string
}

type RemoteWorkoutRow = RemoteBaseRow & {
  template_id: string | null
  name: string
  notes: string
  calories_burned: number | null
  status: Workout['status']
  started_at: string
  ended_at: string | null
  deleted_at: string | null
  created_at: string
}

type RemoteWorkoutExerciseRow = RemoteBaseRow & {
  workout_id: string
  exercise_id: string
  notes: string
  sort_order: number
  deleted_at: string | null
  created_at: string
}

type RemoteLoggedSetRow = RemoteBaseRow & {
  workout_exercise_id: string
  planned_set_id: string | null
  sort_order: number
  set_kind: LoggedSet['setKind']
  reps: number | null
  weight: number | null
  assistance_weight: number | null
  duration_seconds: number | null
  completed_at: string | null
  deleted_at: string | null
  created_at: string
}

type RemotePreferencesRow = RemoteBaseRow & {
  weight_unit: Preferences['weightUnit']
  default_rest_seconds: number
}

export const entityTables: Record<SyncEntityName, string> = {
  exercise: 'exercises',
  workoutTemplate: 'workout_templates',
  templateExercise: 'template_exercises',
  templateSet: 'template_sets',
  workout: 'workouts',
  workoutExercise: 'workout_exercises',
  loggedSet: 'logged_sets',
  preferences: 'preferences',
}

export const entityStores = {
  exercise: db.exercises,
  workoutTemplate: db.workoutTemplates,
  templateExercise: db.templateExercises,
  templateSet: db.templateSets,
  workout: db.workouts,
  workoutExercise: db.workoutExercises,
  loggedSet: db.loggedSets,
} as const

const syncEntityConfigs = {
  exercise: {
    table: entityTables.exercise,
    listLocal: () => db.exercises.toArray(),
    getLocal: (id: string) => db.exercises.get(id),
    putLocal: (record: Exercise) => db.exercises.put(record),
    serialize: (record: Exercise, userId: string): RemoteExerciseRow => ({
      app_id: record.id,
      user_id: userId,
      movement_name: record.movementName,
      body_region: record.bodyRegion,
      muscle_group: record.muscleGroup,
      equipment: record.equipment,
      preferred_weight_unit: record.preferredWeightUnit,
      tracking_mode: record.trackingMode,
      default_rest_seconds: record.defaultRestSeconds,
      is_custom: record.isCustom,
      deleted_at: record.deletedAt,
      created_at: record.createdAt,
      updated_at: record.updatedAt,
    }),
    deserialize: (row: RemoteExerciseRow): Exercise => ({
      id: row.app_id,
      movementName: row.movement_name,
      bodyRegion: row.body_region,
      muscleGroup: row.muscle_group,
      equipment: row.equipment,
      preferredWeightUnit: row.preferred_weight_unit,
      trackingMode: row.tracking_mode,
      defaultRestSeconds: row.default_rest_seconds,
      isCustom: row.is_custom,
      deletedAt: row.deleted_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      syncStatus: 'synced',
    }),
  },
  workoutTemplate: {
    table: entityTables.workoutTemplate,
    listLocal: () => db.workoutTemplates.toArray(),
    getLocal: (id: string) => db.workoutTemplates.get(id),
    putLocal: (record: WorkoutTemplate) => db.workoutTemplates.put(record),
    serialize: (record: WorkoutTemplate, userId: string): RemoteWorkoutTemplateRow => ({
      app_id: record.id,
      user_id: userId,
      name: record.name,
      notes: record.notes,
      deleted_at: record.deletedAt,
      created_at: record.createdAt,
      updated_at: record.updatedAt,
    }),
    deserialize: (row: RemoteWorkoutTemplateRow): WorkoutTemplate => ({
      id: row.app_id,
      name: row.name,
      notes: row.notes,
      deletedAt: row.deleted_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      syncStatus: 'synced',
    }),
  },
  templateExercise: {
    table: entityTables.templateExercise,
    listLocal: () => db.templateExercises.toArray(),
    getLocal: (id: string) => db.templateExercises.get(id),
    putLocal: (record: TemplateExercise) => db.templateExercises.put(record),
    serialize: (record: TemplateExercise, userId: string): RemoteTemplateExerciseRow => ({
      app_id: record.id,
      user_id: userId,
      template_id: record.templateId,
      exercise_id: record.exerciseId,
      sort_order: record.sortOrder,
      deleted_at: record.deletedAt,
      created_at: record.createdAt,
      updated_at: record.updatedAt,
    }),
    deserialize: (row: RemoteTemplateExerciseRow): TemplateExercise => ({
      id: row.app_id,
      templateId: row.template_id,
      exerciseId: row.exercise_id,
      sortOrder: row.sort_order,
      deletedAt: row.deleted_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      syncStatus: 'synced',
    }),
  },
  templateSet: {
    table: entityTables.templateSet,
    listLocal: () => db.templateSets.toArray(),
    getLocal: (id: string) => db.templateSets.get(id),
    putLocal: (record: TemplateSet) => db.templateSets.put(record),
    serialize: (record: TemplateSet, userId: string): RemoteTemplateSetRow => ({
      app_id: record.id,
      user_id: userId,
      template_exercise_id: record.templateExerciseId,
      sort_order: record.sortOrder,
      set_kind: record.setKind,
      target_reps: record.targetReps,
      target_weight: record.targetWeight,
      target_assistance_weight: record.targetAssistanceWeight,
      target_duration_seconds: record.targetDurationSeconds,
      deleted_at: record.deletedAt,
      created_at: record.createdAt,
      updated_at: record.updatedAt,
    }),
    deserialize: (row: RemoteTemplateSetRow): TemplateSet => ({
      id: row.app_id,
      templateExerciseId: row.template_exercise_id,
      sortOrder: row.sort_order,
      setKind: row.set_kind,
      targetReps: row.target_reps,
      targetWeight: row.target_weight,
      targetAssistanceWeight: row.target_assistance_weight,
      targetDurationSeconds: row.target_duration_seconds,
      deletedAt: row.deleted_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      syncStatus: 'synced',
    }),
  },
  workout: {
    table: entityTables.workout,
    listLocal: () => db.workouts.toArray(),
    getLocal: (id: string) => db.workouts.get(id),
    putLocal: (record: Workout) => db.workouts.put(record),
    serialize: (record: Workout, userId: string): RemoteWorkoutRow => ({
      app_id: record.id,
      user_id: userId,
      template_id: record.templateId,
      name: record.name,
      notes: record.notes,
      calories_burned: record.caloriesBurned,
      status: record.status,
      started_at: record.startedAt,
      ended_at: record.endedAt,
      deleted_at: record.deletedAt,
      created_at: record.createdAt,
      updated_at: record.updatedAt,
    }),
    deserialize: (row: RemoteWorkoutRow): Workout => ({
      id: row.app_id,
      templateId: row.template_id,
      name: row.name,
      notes: row.notes,
      caloriesBurned: row.calories_burned,
      status: row.status,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      deletedAt: row.deleted_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      syncStatus: 'synced',
    }),
  },
  workoutExercise: {
    table: entityTables.workoutExercise,
    listLocal: () => db.workoutExercises.toArray(),
    getLocal: (id: string) => db.workoutExercises.get(id),
    putLocal: (record: WorkoutExercise) => db.workoutExercises.put(record),
    serialize: (record: WorkoutExercise, userId: string): RemoteWorkoutExerciseRow => ({
      app_id: record.id,
      user_id: userId,
      workout_id: record.workoutId,
      exercise_id: record.exerciseId,
      notes: record.notes,
      sort_order: record.sortOrder,
      deleted_at: record.deletedAt,
      created_at: record.createdAt,
      updated_at: record.updatedAt,
    }),
    deserialize: (row: RemoteWorkoutExerciseRow): WorkoutExercise => ({
      id: row.app_id,
      workoutId: row.workout_id,
      exerciseId: row.exercise_id,
      notes: row.notes,
      sortOrder: row.sort_order,
      deletedAt: row.deleted_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      syncStatus: 'synced',
    }),
  },
  loggedSet: {
    table: entityTables.loggedSet,
    listLocal: () => db.loggedSets.toArray(),
    getLocal: (id: string) => db.loggedSets.get(id),
    putLocal: (record: LoggedSet) => db.loggedSets.put(record),
    serialize: (record: LoggedSet, userId: string): RemoteLoggedSetRow => ({
      app_id: record.id,
      user_id: userId,
      workout_exercise_id: record.workoutExerciseId,
      planned_set_id: record.plannedSetId,
      sort_order: record.sortOrder,
      set_kind: record.setKind,
      reps: record.reps,
      weight: record.weight,
      assistance_weight: record.assistanceWeight,
      duration_seconds: record.durationSeconds,
      completed_at: record.completedAt,
      deleted_at: record.deletedAt,
      created_at: record.createdAt,
      updated_at: record.updatedAt,
    }),
    deserialize: (row: RemoteLoggedSetRow): LoggedSet => ({
      id: row.app_id,
      workoutExerciseId: row.workout_exercise_id,
      plannedSetId: row.planned_set_id,
      sortOrder: row.sort_order,
      setKind: row.set_kind,
      reps: row.reps,
      weight: row.weight,
      assistanceWeight: row.assistance_weight,
      durationSeconds: row.duration_seconds,
      completedAt: row.completed_at,
      deletedAt: row.deleted_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      syncStatus: 'synced',
    }),
  },
  preferences: {
    table: entityTables.preferences,
    listLocal: async () => {
      const preferences = await db.preferences.get('preferences')
      return preferences ? [preferences] : []
    },
    getLocal: (id: string) => db.preferences.get(id),
    putLocal: async (record: Preferences) => {
      const current = await db.preferences.get(record.id)
      await db.preferences.put({
        ...(current ?? {}),
        ...record,
      })
    },
    serialize: (record: Preferences, userId: string): RemotePreferencesRow => ({
      app_id: record.id,
      user_id: userId,
      weight_unit: record.weightUnit,
      default_rest_seconds: record.defaultRestSeconds,
      updated_at: record.updatedAt,
    }),
    deserialize: (row: RemotePreferencesRow): Preferences => ({
      id: 'preferences',
      weightUnit: row.weight_unit,
      defaultRestSeconds: row.default_rest_seconds,
      activeTimerEndAt: null,
      updatedAt: row.updated_at,
    }),
  },
} as const

export function isSyncEntityName(value: string): value is SyncEntityName {
  return value in syncEntityConfigs
}

export function listLocalRecords(entity: SyncEntityName) {
  return syncEntityConfigs[entity].listLocal()
}

export function getLocalRecord(entity: SyncEntityName, id: string) {
  return syncEntityConfigs[entity].getLocal(id)
}

export function putLocalRecord(entity: SyncEntityName, record: SyncableLocalRecord | Preferences) {
  return syncEntityConfigs[entity].putLocal(record as never)
}

export function serializeForRemote(
  entity: SyncEntityName,
  record: SyncableLocalRecord | Preferences,
  userId: string,
) {
  return syncEntityConfigs[entity].serialize(record as never, userId)
}

export function deserializeFromRemote(entity: SyncEntityName, row: Record<string, unknown>) {
  return syncEntityConfigs[entity].deserialize(row as never)
}

export function getRemoteTable(entity: SyncEntityName) {
  return syncEntityConfigs[entity].table
}
