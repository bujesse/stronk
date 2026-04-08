import { useEffect, useState } from 'react'

export function useNow(intervalMs = 1000, enabled = true) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!enabled) {
      return
    }

    const interval = window.setInterval(() => {
      setNow(Date.now())
    }, intervalMs)

    return () => {
      window.clearInterval(interval)
    }
  }, [enabled, intervalMs])

  return now
}
