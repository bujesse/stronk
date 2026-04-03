import { useEffect, useState } from 'react'

export function useTicker(intervalMs = 1000) {
  const [, setTick] = useState(0)

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTick((value) => value + 1)
    }, intervalMs)

    return () => {
      window.clearInterval(interval)
    }
  }, [intervalMs])
}
