import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { Attributes } from '../types/hero'
import { getDerivedStats, staminaDrainAt } from '../formulas/derived'
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
  skipCharges: number
  maxSkipCharges: number
  gold: number
  lastXpGain: number
  xpGainVersion: number
  lastGoldGain: number
  goldGainVersion: number

  spendPoint(attr: keyof Attributes): void
  optimizePoints(): void
  applyPreset(preset: 'combat' | 'explorer' | 'mage'): void
  gainXp(amount: number): void
  earnGold(amount: number): void
  spendGold(amount: number): boolean
  restoreStamina(amount: number): void
  restoreMana(amount: number): void
  consumeMana(amount: number): void
  gainSkipCharge(): void
  tickResources(deltaMs: number, speed: Speed): void
  consumeSkipCharge(): void
}

function xpForLevel(level: number): number {
  // Steep curve: ~100 XP at L1, ~5k at L10, ~32k at L20, ~110k at L30
  return Math.floor(level * 80 + level ** 2.4 * 22)
}

const INITIAL_ATTRS: Attributes = {
  forca: 0, agilidade: 0, destreza: 0, vitalidade: 0,
  inteligencia: 0, sabedoria: 0, carisma: 0,
}

export const useHeroStore = create<HeroStore>()(
  persist(
  immer((set) => ({
    name: 'Hero',
    level: 1,
    xp: 0,
    xpToNext: xpForLevel(1),
    freePoints: 7,
    attributes: { ...INITIAL_ATTRS },
    stamina: 100,
    mana: 50,
    skipCharges: 3,
    maxSkipCharges: 3,
    gold: 0,
    lastXpGain: 0,
    xpGainVersion: 0,
    lastGoldGain: 0,
    goldGainVersion: 0,

    optimizePoints: () => set((st) => {
      if (st.freePoints <= 0) return
      const order: (keyof Attributes)[] = [
        'forca', 'vitalidade', 'agilidade', 'destreza', 'inteligencia', 'sabedoria', 'carisma',
      ]
      const base = Math.floor(st.freePoints / order.length)
      const rem  = st.freePoints % order.length
      order.forEach((attr, i) => {
        st.attributes[attr] += base + (i < rem ? 1 : 0)
      })
      st.freePoints = 0
      const derived = getDerivedStats(st.attributes)
      if (st.stamina > derived.maxStamina) st.stamina = derived.maxStamina
      if (st.mana    > derived.maxMana)    st.mana    = derived.maxMana
    }),

    /**
     * Spend all free attribute points according to a role preset:
     *   combat   — 45 % Força + 55 % Vitalidade  (ATK / HP / DEF)
     *   explorer — 50 % Agilidade + 50 % Destreza (speed / dodge / efficiency)
     *   mage     — 50 % Inteligência + 50 % Sabedoria (magic dmg / mana / vision)
     */
    applyPreset: (preset) => set((st) => {
      if (st.freePoints <= 0) return
      const pts = st.freePoints
      let a = 0, b = 0

      if (preset === 'combat') {
        a = Math.round(pts * 0.45)
        b = pts - a
        st.attributes.forca      += a
        st.attributes.vitalidade += b
      } else if (preset === 'explorer') {
        a = Math.floor(pts / 2)
        b = pts - a
        st.attributes.agilidade += a
        st.attributes.destreza  += b
      } else {
        a = Math.floor(pts / 2)
        b = pts - a
        st.attributes.inteligencia += a
        st.attributes.sabedoria    += b
      }

      st.freePoints = 0
      const derived = getDerivedStats(st.attributes)
      if (st.stamina > derived.maxStamina) st.stamina = derived.maxStamina
      if (st.mana    > derived.maxMana)    st.mana    = derived.maxMana
    }),

    spendPoint: (attr) => set((st) => {
      if (st.freePoints <= 0) return
      st.attributes[attr] += 1
      st.freePoints -= 1
      // Cap current resources to new max when stats change
      const derived = getDerivedStats(st.attributes)
      if (st.stamina > derived.maxStamina) st.stamina = derived.maxStamina
      if (st.mana > derived.maxMana) st.mana = derived.maxMana
    }),

    earnGold: (amount) => set((st) => {
      st.gold += amount
      st.lastGoldGain = amount
      st.goldGainVersion += 1
    }),

    spendGold: (amount) => {
      let ok = false
      set((st) => { if (st.gold >= amount) { st.gold -= amount; ok = true } })
      return ok
    },

    restoreStamina: (amount) => set((st) => {
      const derived = getDerivedStats(st.attributes)
      st.stamina = Math.min(derived.maxStamina, st.stamina + amount)
    }),

    restoreMana: (amount) => set((st) => {
      const derived = getDerivedStats(st.attributes)
      st.mana = Math.min(derived.maxMana, st.mana + amount)
    }),

    consumeMana: (amount) => set((st) => {
      st.mana = Math.max(0, st.mana - amount)
    }),

    gainSkipCharge: () => set((st) => {
      st.skipCharges = Math.min(st.maxSkipCharges + 1, st.skipCharges + 1)
      st.maxSkipCharges = Math.max(st.maxSkipCharges, Math.ceil(st.skipCharges))
    }),

    gainXp: (amount) => set((st) => {
      const derived = getDerivedStats(st.attributes)
      const actual = Math.round(amount * derived.xpBonus)
      st.lastXpGain = actual
      st.xpGainVersion += 1
      st.xp += actual
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

      // Net stamina change: positive = regenerating, negative = draining.
      // Regen is always active; drain subtracts from it.
      // At baseSpeed the net is ≥ 0 by definition, so stamina only grows there.
      const rawDrain  = staminaDrainAt(speed) / derived.staminaEfficiency
      const netChange = derived.staminaRegen - rawDrain
      st.stamina = Math.max(0, Math.min(derived.maxStamina, st.stamina + netChange * deltaS))

      st.mana = Math.min(derived.maxMana, st.mana + derived.manaRegen * deltaS)

      // Skip charges regen: level charges per hour = level/3600 per second
      const regenRate = st.level / 3600
      st.skipCharges = Math.min(st.maxSkipCharges, st.skipCharges + regenRate * deltaS)
    }),

    consumeSkipCharge: () => set((st) => {
      if (st.skipCharges >= 1) st.skipCharges -= 1
    }),
  })),
  { name: 'incremental-idle-hero' }
  )
)
