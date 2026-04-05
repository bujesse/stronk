import {
  createClient,
  type Session,
  type SupabaseClient,
  type User,
} from '@supabase/supabase-js'
import type { AuthSessionInfo } from '../lib/types'
import { getSupabaseAnonKey, getSupabaseUrl } from '../lib/config'

let cachedClient: SupabaseClient | null = null

export function isSupabaseConfigured() {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey())
}

export function getSupabaseClient() {
  const url = getSupabaseUrl()
  const anonKey = getSupabaseAnonKey()

  if (!url || !anonKey) {
    return null
  }

  if (!cachedClient) {
    cachedClient = createClient(url, anonKey)
  }

  return cachedClient
}

export function toAuthSessionInfo(user: User | null | undefined): AuthSessionInfo | null {
  if (!user) {
    return null
  }

  return {
    userId: user.id,
    email: user.email ?? null,
  }
}

export async function getAuthSession() {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return null
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  return toAuthSessionInfo(session?.user)
}

export function subscribeToAuthStateChange(
  callback: (session: AuthSessionInfo | null) => void,
) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return () => undefined
  }

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session: Session | null) => {
    callback(toAuthSessionInfo(session?.user))
  })

  return () => {
    subscription.unsubscribe()
  }
}

export async function signInWithPassword(email: string, password: string) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return {
      ok: false,
      message: 'Add Supabase env vars to enable sign in.',
    }
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    return {
      ok: false,
      message: error.message,
    }
  }

  return {
    ok: true,
    message: 'Signed in.',
  }
}

export async function signUpWithPassword(email: string, password: string) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return {
      ok: false,
      message: 'Add Supabase env vars to enable sign up.',
    }
  }

  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) {
    return {
      ok: false,
      message: error.message,
    }
  }

  return {
    ok: true,
    message: data.session ? 'Account created and signed in.' : 'Account created. Check your email to confirm sign in.',
  }
}

export async function signOut() {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return {
      ok: false,
      message: 'Sync is not configured.',
    }
  }

  const { error } = await supabase.auth.signOut()
  if (error) {
    return {
      ok: false,
      message: error.message,
    }
  }

  return {
    ok: true,
    message: 'Signed out.',
  }
}
