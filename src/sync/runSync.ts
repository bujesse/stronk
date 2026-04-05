import { db } from '../db/appDb'
import { getSupabaseClient } from './client'
import {
  deserializeFromRemote,
  entityStores,
  getLocalRecord,
  getRemoteTable,
  isSyncEntityName,
  putLocalRecord,
  serializeForRemote,
} from './schema'
import type { Preferences, SyncQueueItem } from '../lib/types'

const syncPullOrder = [
  'exercise',
  'workoutTemplate',
  'templateExercise',
  'templateSet',
  'workout',
  'workoutExercise',
  'loggedSet',
  'preferences',
] as const

type SyncEntityName = (typeof syncPullOrder)[number]

async function updateRecordSyncStatus(
  entity: Exclude<SyncEntityName, 'preferences'>,
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
  })
}

function isRemoteNewer(localUpdatedAt: string, remoteUpdatedAt: string) {
  return new Date(remoteUpdatedAt).getTime() > new Date(localUpdatedAt).getTime()
}

async function pushQueuedChanges(userId: string) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return { pushedCount: 0, failedCount: 0 }
  }

  const queued = await db.syncQueue.where('status').anyOf('queued', 'failed').sortBy('createdAt')
  let pushedCount = 0
  let failedCount = 0

  for (const item of queued) {
    if (!isSyncEntityName(item.entity)) {
      continue
    }

    await db.syncQueue.update(item.id, {
      status: 'processing',
      updatedAt: new Date().toISOString(),
      errorMessage: null,
    })

    try {
      const payload = serializeForRemote(item.entity, item.payload as never, userId)
      const { error } = await supabase.from(getRemoteTable(item.entity)).upsert(payload)
      if (error) {
        throw error
      }

      if (item.entity !== 'preferences') {
        await updateRecordSyncStatus(item.entity, item.entityId, 'synced')
      }

      await db.syncQueue.delete(item.id)
      pushedCount += 1
    } catch (error) {
      if (item.entity !== 'preferences') {
        await updateRecordSyncStatus(item.entity, item.entityId, 'error')
      }

      await db.syncQueue.update(item.id, {
        status: 'failed',
        updatedAt: new Date().toISOString(),
        errorMessage: error instanceof Error ? error.message : 'Unknown sync error',
      } satisfies Partial<SyncQueueItem>)
      failedCount += 1
    }
  }

  return { pushedCount, failedCount }
}

async function pullRemoteChanges(userId: string) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return { pulledCount: 0 }
  }

  let pulledCount = 0

  for (const entity of syncPullOrder) {
    const { data, error } = await supabase
      .from(getRemoteTable(entity))
      .select('*')
      .eq('user_id', userId)

    if (error) {
      throw error
    }

    for (const row of data ?? []) {
      const remoteRecord = deserializeFromRemote(entity, row)
      const localRecord = await getLocalRecord(entity, remoteRecord.id)

      if (!localRecord) {
        await putLocalRecord(entity, remoteRecord)
        pulledCount += 1
        continue
      }

      if (isRemoteNewer(localRecord.updatedAt, remoteRecord.updatedAt)) {
        if (entity === 'preferences') {
          const localPreferences = localRecord as Preferences
          const remotePreferences = remoteRecord as Preferences
          await putLocalRecord(entity, {
            ...remotePreferences,
            activeTimerEndAt: localPreferences.activeTimerEndAt,
          })
        } else {
          await putLocalRecord(entity, remoteRecord)
        }
        pulledCount += 1
      }
    }
  }

  return { pulledCount }
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
      message: 'Sign in to sync this device.',
    }
  }

  const { pushedCount, failedCount } = await pushQueuedChanges(session.user.id)
  const { pulledCount } = await pullRemoteChanges(session.user.id)

  if (failedCount > 0) {
    return {
      ok: false,
      message: `Synced ${pushedCount} changes, pulled ${pulledCount}, ${failedCount} failed.`,
    }
  }

  if (pushedCount === 0 && pulledCount === 0) {
    return {
      ok: true,
      message: 'Already up to date.',
    }
  }

  return {
    ok: true,
    message: `Synced ${pushedCount} changes and pulled ${pulledCount}.`,
  }
}
