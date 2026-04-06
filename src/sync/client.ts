import PocketBase from 'pocketbase'
import type { AuthSessionInfo } from '../lib/types'
import { getPocketBaseUrl } from '../lib/config'

let cachedClient: PocketBase | null = null

export function isPocketBaseConfigured() {
  return Boolean(getPocketBaseUrl())
}

export function getPocketBaseClient() {
  const url = getPocketBaseUrl()
  if (!url) {
    return null
  }

  if (!cachedClient) {
    cachedClient = new PocketBase(url)
    cachedClient.autoCancellation(false)
  }

  return cachedClient
}

export function toAuthSessionInfo(
  record: { id: string; email?: string | null } | null | undefined,
): AuthSessionInfo | null {
  if (!record) {
    return null
  }

  return {
    userId: record.id,
    email: record.email ?? null,
  }
}

export async function getAuthSession() {
  const pocketbase = getPocketBaseClient()
  if (!pocketbase) {
    return null
  }

  return toAuthSessionInfo(
    pocketbase.authStore.record as { id: string; email?: string | null } | null,
  )
}

export function subscribeToAuthStateChange(
  callback: (session: AuthSessionInfo | null) => void,
) {
  const pocketbase = getPocketBaseClient()
  if (!pocketbase) {
    return () => undefined
  }

  return pocketbase.authStore.onChange((_token, record) => {
    callback(toAuthSessionInfo(record as { id: string; email?: string | null } | null))
  })
}

export async function signInWithPassword(email: string, password: string) {
  const pocketbase = getPocketBaseClient()
  if (!pocketbase) {
    return {
      ok: false,
      message: 'Add a PocketBase URL to enable sign in.',
    }
  }

  try {
    await pocketbase.collection('users').authWithPassword(email, password)
    return {
      ok: true,
      message: 'Signed in.',
    }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Unable to sign in.',
    }
  }
}

export async function signUpWithPassword(email: string, password: string) {
  const pocketbase = getPocketBaseClient()
  if (!pocketbase) {
    return {
      ok: false,
      message: 'Add a PocketBase URL to enable sign up.',
    }
  }

  try {
    await pocketbase.collection('users').create({
      email,
      password,
      passwordConfirm: password,
    })
    await pocketbase.collection('users').authWithPassword(email, password)

    return {
      ok: true,
      message: 'Account created and signed in.',
    }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Unable to create account.',
    }
  }
}

export async function signOut() {
  const pocketbase = getPocketBaseClient()
  if (!pocketbase) {
    return {
      ok: false,
      message: 'Sync is not configured.',
    }
  }

  pocketbase.authStore.clear()

  return {
    ok: true,
    message: 'Signed out.',
  }
}
