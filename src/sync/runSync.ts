import { db } from '../db/appDb'
import { getSupabaseClient } from './client'
import type { SyncQueueItem } from '../lib/types'

const entityTables = {
  exercise: 'exercises',
  workoutTemplate: 'workout_templates',
  templateExercise: 'template_exercises',
  templateSet: 'template_sets',
  workout: 'workouts',
  workoutExercise: 'workout_exercises',
  loggedSet: 'logged_sets',
} as const

const entityStores = {
  exercise: db.exercises,
  workoutTemplate: db.workoutTemplates,
  templateExercise: db.templateExercises,
  templateSet: db.templateSets,
  workout: db.workouts,
  workoutExercise: db.workoutExercises,
  loggedSet: db.loggedSets,
} as const

async function updateRecordSyncStatus(
  entity: keyof typeof entityStores,
  entityId: string,
  syncStatus: 'synced' | 'error',
) {
  const store = entityStores[entity]
  const record = await store.get(entityId)
  if (!record) {
    return
  }

  await store.update(entityId, {
    syncStatus,
    updatedAt: new Date().toISOString(),
  })
}

export async function runSync() {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return {
      ok: false,
      message: 'Sync is not configured. Add Supabase env vars to enable cloud backup.',
    }
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) {
    return {
      ok: false,
      message: 'Sign in is not wired yet. Local-first mode is active.',
    }
  }

  const queued = await db.syncQueue.where('status').anyOf('queued', 'failed').sortBy('createdAt')
  let syncedCount = 0

  for (const item of queued) {
    const table = entityTables[item.entity as keyof typeof entityTables]
    if (!table) {
      continue
    }

    await db.syncQueue.update(item.id, { status: 'processing', updatedAt: new Date().toISOString() })

    try {
      if (item.operation === 'delete') {
        const { error } = await supabase.from(table).delete().eq('id', item.entityId)
        if (error) {
          throw error
        }
      } else {
        const payload = {
          ...item.payload,
          user_id: session.user.id,
        }
        const { error } = await supabase.from(table).upsert(payload)
        if (error) {
          throw error
        }
      }

      await updateRecordSyncStatus(
        item.entity as keyof typeof entityStores,
        item.entityId,
        'synced',
      )
      await db.syncQueue.delete(item.id)
      syncedCount += 1
    } catch (error) {
      await updateRecordSyncStatus(
        item.entity as keyof typeof entityStores,
        item.entityId,
        'error',
      )
      await db.syncQueue.update(item.id, {
        status: 'failed',
        updatedAt: new Date().toISOString(),
        errorMessage: error instanceof Error ? error.message : 'Unknown sync error',
      } satisfies Partial<SyncQueueItem>)
    }
  }

  return {
    ok: true,
    message: syncedCount > 0 ? `Synced ${syncedCount} changes.` : 'Already up to date.',
  }
}
