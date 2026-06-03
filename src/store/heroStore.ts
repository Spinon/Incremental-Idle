import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { Attributes, DerivedStats, HeroConfig } from '../types/hero'
import { DEFAULT_HERO_CONFIG } from '../types/hero'
import { getDerivedStats, staminaDrainAt } from '../formulas/derived'
import type { Speed } from './battleStore'
import { SAVE_KEYS, SAVE_SCHEMA_VERSION, mergeSave, migrateSave } from './save'

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
  heroConfig: HeroConfig

  spendPoint(attr: keyof Attributes): void
  setHeroConfig(config: HeroConfig): void
  optimizePoints(): void
  applyPreset(preset: 'combat' | 'explorer' | 'mage'): void
  gainXp(amount: number, xpBonusOverride?: number): void
  earnGold(amount: number): void
  spendGold(amount: number): boolean
  restoreStamina(amount: number, maxOverride?: number): void
  restoreMana(amount: number, maxOverride?: number): void
  consumeMana(amount: number): void
  gainSkipCharge(): void
  tickResources(deltaMs: number, speed: Speed, derivedOverride?: DerivedStats): void
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
    mana: 150,
    skipCharges: 3,
    maxSkipCharges: 3,
    gold: 0,
    lastXpGain: 0,
    xpGainVersion: 0,
    lastGoldGain: 0,
    goldGainVersion: 0,
    heroConfig: { ...DEFAULT_HERO_CONFIG },

    setHeroConfig: (config) => set((st) => { st.heroConfig = config }),

    optimizePoints: () => set((st) => {
      if (st.freePoints <= 0) return

      // Target weights for a well-rounded combat-sustain build.
      // Order reflects priority when there are fewer points than targets.
      const WEIGHTS: Record<keyof Attributes, number> = {
        vitalidade:   0.28,  // DEF ratio + HP — highest return
        agilidade:    0.20,  // atkSpeed, dodge, exploration
        forca:        0.15,  // damage + stamina
        sabedoria:    0.15,  // mana sustain (threshold ≈ 6 pts at Lv10)
        inteligencia: 0.10,  // magic DEF + magic damage
        destreza:     0.07,  // crit chance + damage reduction
        carisma:      0.05,  // drop rate + gold efficiency
      }
      const attrs = Object.keys(WEIGHTS) as (keyof Attributes)[]

      // Total points in play (already spent + free)
      const totalPoints = attrs.reduce((s, k) => s + st.attributes[k], 0) + st.freePoints

      // Ideal per attribute — never less than what's already invested
      const ideal = {} as Record<keyof Attributes, number>
      for (const k of attrs) {
        ideal[k] = Math.max(st.attributes[k], Math.round(totalPoints * WEIGHTS[k]))
      }

      // Deficit: how many more points each attr needs (≥ 0)
      // Sort highest deficit first; break ties by weight (prefer priority attrs)
      const deficits = attrs
        .map(k => ({ k, d: ideal[k] - st.attributes[k] }))
        .filter(x => x.d > 0)
        .sort((a, b) => b.d !== a.d ? b.d - a.d : WEIGHTS[b.k] - WEIGHTS[a.k])

      let remaining = st.freePoints
      for (const { k, d } of deficits) {
        if (remaining <= 0) break
        const add = Math.min(d, remaining)
        st.attributes[k] += add
        remaining -= add
      }
      // If every attr already exceeds its ideal, overflow → vitalidade
      if (remaining > 0) st.attributes.vitalidade += remaining

      st.freePoints = 0
      const derived = getDerivedStats(st.attributes, undefined, st.level)
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
      const derived = getDerivedStats(st.attributes, undefined, st.level)
      if (st.stamina > derived.maxStamina) st.stamina = derived.maxStamina
      if (st.mana    > derived.maxMana)    st.mana    = derived.maxMana
    }),

    spendPoint: (attr) => set((st) => {
      if (st.freePoints <= 0) return
      st.attributes[attr] += 1
      st.freePoints -= 1
      // Cap current resources to new max when stats change
      const derived = getDerivedStats(st.attributes, undefined, st.level)
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

    restoreStamina: (amount, maxOverride) => set((st) => {
      const derived = getDerivedStats(st.attributes, undefined, st.level)
      st.stamina = Math.min(maxOverride ?? derived.maxStamina, st.stamina + amount)
    }),

    restoreMana: (amount, maxOverride) => set((st) => {
      const derived = getDerivedStats(st.attributes, undefined, st.level)
      st.mana = Math.min(maxOverride ?? derived.maxMana, st.mana + amount)
    }),

    consumeMana: (amount) => set((st) => {
      st.mana = Math.max(0, st.mana - amount)
    }),

    gainSkipCharge: () => set((st) => {
      st.skipCharges = Math.min(st.maxSkipCharges + 1, st.skipCharges + 1)
      st.maxSkipCharges = Math.max(st.maxSkipCharges, Math.ceil(st.skipCharges))
    }),

    gainXp: (amount, xpBonusOverride) => set((st) => {
      const derived = getDerivedStats(st.attributes, undefined, st.level)
      const actual = Math.round(amount * (xpBonusOverride ?? derived.xpBonus))
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

    tickResources: (deltaMs, speed, derivedOverride) => set((st) => {
      const derived = derivedOverride ?? getDerivedStats(st.attributes, undefined, st.level)
      const deltaS = deltaMs / 1000

      // Net stamina change: positive = regenerating, negative = draining.
      // Regen is always active; drain subtracts from it.
      // At baseSpeed the net is ≥ 0 by definition, so stamina only grows there.
      const rawDrain  = staminaDrainAt(speed) / derived.staminaEfficiency
      const netChange = derived.staminaRegen - rawDrain
      st.stamina = Math.max(0, Math.min(derived.maxStamina, st.stamina + netChange * deltaS))

      st.mana = Math.min(derived.maxMana, st.mana + derived.manaRegen * speed * deltaS)

      // Skip charges regen: level charges per hour = level/3600 per second
      const regenRate = st.level / 3600
      st.skipCharges = Math.min(st.maxSkipCharges, st.skipCharges + regenRate * deltaS)
    }),

    consumeSkipCharge: () => set((st) => {
      if (st.skipCharges >= 1) st.skipCharges -= 1
    }),
  })),
  {
    name: SAVE_KEYS.hero,
    version: SAVE_SCHEMA_VERSION,
    migrate: migrateSave,
    merge: mergeSave,
  }
  )
)
