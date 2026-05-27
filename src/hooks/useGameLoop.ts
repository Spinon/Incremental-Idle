import { useEffect } from 'react'
import { useBattleStore } from '../store/battleStore'
import { useHeroStore } from '../store/heroStore'

const TICK_MS = 200

export function useGameLoop() {
  const setSpeed = useBattleStore((s) => s.setSpeed)
  const tickResources = useHeroStore((s) => s.tickResources)

  useEffect(() => {
    const id = setInterval(() => {
      const speed = useBattleStore.getState().speed
      tickResources(TICK_MS, speed)
      // Auto-drop speed when stamina is depleted
      const { stamina } = useHeroStore.getState()
      if (stamina <= 0 && speed > 1) setSpeed(1)
    }, TICK_MS)

    return () => clearInterval(id)
  }, [tickResources, setSpeed])
}
