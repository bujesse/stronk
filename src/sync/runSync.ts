import PocketBase, { ClientResponseError } from 'pocketbase'
import { db } from '../db/appDb'
import { BASELINE_DATA_TIMESTAMP, createSeedExercises } from '../db/seed'
import { getPocketBaseClient } from './client'
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

async function normalizeBaselineLocalRecords() {
  const seedExercises = createSeedExercises()
  const seedById = new Map(seedExercises.map((exercise) => [exercise.id, exercise]))
  const localExercises = await db.exercises.toArray()

  await db.transaction('rw', [db.exercises, db.preferences], async () => {
    for (const exercise of localExercises) {
      const seed = seedById.get(exercise.id)
      if (!seed) {
        continue
      }

      const isUntouchedSeedExercise =
        exercise.isCustom === false &&
        exercise.movementName === seed.movementName &&
        exercise.bodyRegion === seed.bodyRegion &&
        exercise.muscleGroup === seed.muscleGroup &&
        exercise.equipment === seed.equipment &&
        exercise.preferredWeightUnit == null &&
        exercise.trackingMode === seed.trackingMode &&
        exercise.defaultRestSeconds === seed.defaultRestSeconds &&
        exercise.deletedAt == null &&
        exercise.syncStatus === 'synced'

      if (!isUntouchedSeedExercise) {
        continue
      }

      if (new Date(exercise.updatedAt).getTime() > new Date(BASELINE_DATA_TIMESTAMP).getTime()) {
        await db.exercises.update(exercise.id, {
          createdAt: BASELINE_DATA_TIMESTAMP,
          updatedAt: BASELINE_DATA_TIMESTAMP,
        })
      }
    }

    const preferences = await db.preferences.get('preferences')
    const isUntouchedDefaultPreferences =
      preferences &&
      preferences.weightUnit === 'lb' &&
      preferences.defaultRestSeconds === 120 &&
      preferences.activeTimerEndAt == null

    if (
      isUntouchedDefaultPreferences &&
      new Date(preferences.updatedAt).getTime() > new Date(BASELINE_DATA_TIMESTAMP).getTime()
    ) {
      await db.preferences.update('preferences', {
        updatedAt: BASELINE_DATA_TIMESTAMP,
      })
    }
  })
}

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

function escapeFilterValue(value: string) {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')
}

async function findRemoteRecordId(
  pocketbase: PocketBase,
  entity: SyncEntityName,
  entityId: string,
) {
  try {
    const record = await pocketbase.collection(getRemoteTable(entity)).getFirstListItem(
      `app_id = "${escapeFilterValue(entityId)}"`,
    )

    return record.id
  } catch (error) {
    if (error instanceof ClientResponseError && error.status === 404) {
      return null
    }

    throw error
  }
}

async function pushQueuedChanges(userId: string) {
  const pocketbase = getPocketBaseClient()
  if (!pocketbase) {
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
      const recordId = await findRemoteRecordId(pocketbase, item.entity, item.entityId)

      if (recordId) {
        await pocketbase.collection(getRemoteTable(item.entity)).update(recordId, payload)
      } else {
        await pocketbase.collection(getRemoteTable(item.entity)).create(payload)
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

async function pullRemoteChanges() {
  const pocketbase = getPocketBaseClient()
  if (!pocketbase) {
    return { pulledCount: 0 }
  }

  let pulledCount = 0

  for (const entity of syncPullOrder) {
    const rows = await pocketbase.collection(getRemoteTable(entity)).getFullList({
      sort: 'updated_at',
    })

    for (const row of rows) {
      const remoteRecord = deserializeFromRemote(entity, row as Record<string, unknown>)
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
  try {
    const pocketbase = getPocketBaseClient()
    if (!pocketbase) {
      return {
        ok: false,
        message: 'Sync is not configured. Add a PocketBase URL to enable cloud backup.',
      }
    }

    const authRecord = pocketbase.authStore.record as { id?: string } | null
    if (!authRecord?.id) {
      return {
        ok: false,
        message: 'Sign in to sync this device.',
      }
    }

    await normalizeBaselineLocalRecords()
    const initialPull = await pullRemoteChanges()
    const { pushedCount, failedCount } = await pushQueuedChanges(authRecord.id)
    const finalPull = await pullRemoteChanges()
    const pulledCount = initialPull.pulledCount + finalPull.pulledCount

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
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Sync failed.',
    }
  }
}
