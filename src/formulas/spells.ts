import type { Spell, ActiveBuff } from '../types/spell'
import type { DerivedStats } from '../types/hero'

/** Final damage dealt by a spell, accounting for chaos variance */
export function calcSpellDamage(spell: Spell, derived: DerivedStats): number {
  const { base = 0, scaling = 0, scalingStat, chaos } = spell.effect
  const statValue = scalingStat ? (derived[scalingStat] as number) : 0
  const raw = base + scaling * statValue
  if (chaos) {
    const variance = 0.5 + Math.random()   // ×0.5 to ×1.5
    return Math.max(1, Math.round(raw * variance))
  }
  return Math.max(1, Math.round(raw))
}

/** Final heal amount from a spell */
export function calcSpellHeal(spell: Spell, derived: DerivedStats): number {
  const { base = 0, scaling = 0, scalingStat } = spell.effect
  const statValue = scalingStat ? (derived[scalingStat] as number) : 0
  return Math.max(1, Math.round(base + scaling * statValue))
}

/** Apply active buffs on top of derived stats (non-mutating) */
export function applySpellBuffs(derived: DerivedStats, buffs: ActiveBuff[]): DerivedStats {
  if (buffs.length === 0) return derived
  const result = { ...derived }
  for (const buff of buffs) {
    for (const [key, value] of Object.entries(buff.statAdds)) {
      const k = key as keyof DerivedStats
      ;(result[k] as number) += value as number
    }
  }
  return result
}
