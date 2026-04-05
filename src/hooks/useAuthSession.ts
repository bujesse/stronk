import { useEffect, useState } from 'react'
import type { AuthSessionInfo } from '../lib/types'
import { getAuthSession, subscribeToAuthStateChange } from '../sync/client'

export function useAuthSession() {
  const [session, setSession] = useState<AuthSessionInfo | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let isMounted = true

    getAuthSession().then((nextSession) => {
      if (!isMounted) {
        return
      }

      setSession(nextSession)
      setReady(true)
    })

    const unsubscribe = subscribeToAuthStateChange((nextSession) => {
      if (!isMounted) {
        return
      }

      setSession(nextSession)
      setReady(true)
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [])

  return { session, ready }
}
