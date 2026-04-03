import { useEffect, useState } from 'react'

export function useTicker(intervalMs = 1000, enabled = true) {
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!enabled) {
      return
    }

    const interval = window.setInterval(() => {
      setTick((value) => value + 1)
    }, intervalMs)

    return () => {
      window.clearInterval(interval)
    }
  }, [enabled, intervalMs])
}
