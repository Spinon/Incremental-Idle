import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Attributes } from '../types/hero'
import { getDerivedStats, STAMINA_DRAIN } from '../formulas/derived'
import type { Speed } from './battleStore'

interface HeroStore {
  name: string
  level: number
  xp: number
  xpToNext: number
  freePoints: number
  attributes: Attributes
  stamina: number
  mana: number

  spendPoint(attr: keyof Attributes): void
  gainXp(amount: number): void
  tickResources(deltaMs: number, speed: Speed): void
}

function xpForLevel(level: number): number {
  return level * 15 + Math.floor(level ** 1.8) * 5
}

const INITIAL_ATTRS: Attributes = {
  forca: 0, agilidade: 0, destreza: 0, vitalidade: 0,
  inteligencia: 0, sabedoria: 0, carisma: 0,
}

export const useHeroStore = create<HeroStore>()(
  immer((set) => ({
    name: 'Hero',
    level: 1,
    xp: 0,
    xpToNext: xpForLevel(1),
    freePoints: 7,
    attributes: { ...INITIAL_ATTRS },
    stamina: 100,
    mana: 50,

    spendPoint: (attr) => set((st) => {
      if (st.freePoints <= 0) return
      st.attributes[attr] += 1
      st.freePoints -= 1
      // Cap current resources to new max when stats change
      const derived = getDerivedStats(st.attributes)
      if (st.stamina > derived.maxStamina) st.stamina = derived.maxStamina
      if (st.mana > derived.maxMana) st.mana = derived.maxMana
    }),

    gainXp: (amount) => set((st) => {
      st.xp += amount
      while (st.xp >= st.xpToNext) {
        st.xp -= st.xpToNext
        st.level += 1
        st.freePoints += 3
        st.xpToNext = xpForLevel(st.level)
      }
    }),

    tickResources: (deltaMs, speed) => set((st) => {
      const derived = getDerivedStats(st.attributes)
      const deltaS = deltaMs / 1000

      if (speed === 1) {
        st.stamina = Math.min(derived.maxStamina, st.stamina + derived.staminaRegen * deltaS)
      } else {
        st.stamina = Math.max(0, st.stamina - STAMINA_DRAIN[speed] * deltaS)
      }

      st.mana = Math.min(derived.maxMana, st.mana + derived.manaRegen * deltaS)
    }),
  }))
)
