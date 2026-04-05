import { useAutoAnimate } from '@formkit/auto-animate/react'

export function useAnimatedList() {
  return useAutoAnimate<HTMLDivElement>({
    duration: 180,
    easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
    disrespectUserMotionPreference: false,
  })
}
