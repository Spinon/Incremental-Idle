import type { ActiveStatus, StatusType } from '../types/element'

/**
 * Declarative combat rules per status effect.
 *
 * battleStore consumes this table in applyHit / switchAttacker / tickStatuses,
 * so adding a new status is (mostly) a matter of adding an entry here plus its
 * element mapping in types/element.ts — no battle-flow surgery required.
 */
export interface StatusCombatRules {
  /** Extra miss chance for the ATTACKER carrying this status. */
  attackerMissChance?: number
  /** Attacker carrying this status cannot land critical hits. */
  attackerCannotCrit?: boolean
  /** Attacker's ATK replaced by its precision value — (crit + accuracy) × 100. */
  attackerAtkFromPrecision?: boolean
  /** Defender carrying this status cannot dodge. */
  defenderCannotDodge?: boolean
  /** Multiplier on damage TAKEN by the unit carrying this status. */
  damageTakenMult?: number
  /** Status power (0–1) removes that fraction of the carrier's damageReduction. */
  removesDamageReduction?: boolean
  /** Attack-speed multiplier for the carrier when attacking (freeze). */
  attackSpeedMult?: number
  /**
   * Carrier skips its whole turn. Consumed (decremented) per skipped turn in
   * switchAttacker — tickStatuses must NOT decrement it again.
   */
  skipsTurn?: boolean
  /** Damage-over-time: deals `power` per tick; power ×= growthPerTick after. */
  dot?: { growthPerTick?: number }
  /** Heal-over-time: heals the carrier `power` per tick. */
  hot?: boolean
}

export const STATUS_RULES: Partial<Record<StatusType, StatusCombatRules>> = {
  blind:      { attackerMissChance: 0.10, attackerCannotCrit: true },
  distortion: { attackerAtkFromPrecision: true },
  shock:      { defenderCannotDodge: true },
  curse:      { removesDamageReduction: true },
  marked:     { damageTakenMult: 1.5 },
  blessed:    { damageTakenMult: 0.5 },
  freeze:     { attackSpeedMult: 0.35 },
  gravity:    { skipsTurn: true },
  burn:       { dot: {} },
  poison:     { dot: { growthPerTick: 1.3 } },
  regen:      { hot: true },
  // doom: handled at kill-reward time (×2 XP) — no combat hook needed here
}

export function hasStatus(arr: ActiveStatus[], type: StatusType): boolean {
  return arr.some(s => s.type === type)
}

export function getStatus(arr: ActiveStatus[], type: StatusType): ActiveStatus | undefined {
  return arr.find(s => s.type === type)
}

/** Total extra miss chance from every status the attacker carries. */
export function attackerMissChance(atkSt: ActiveStatus[]): number {
  let p = 0
  for (const s of atkSt) p += STATUS_RULES[s.type]?.attackerMissChance ?? 0
  return Math.min(0.95, p)
}

export function attackerCannotCrit(atkSt: ActiveStatus[]): boolean {
  return atkSt.some(s => STATUS_RULES[s.type]?.attackerCannotCrit)
}

export function attackerAtkFromPrecision(atkSt: ActiveStatus[]): boolean {
  return atkSt.some(s => STATUS_RULES[s.type]?.attackerAtkFromPrecision)
}

export function defenderCannotDodge(defSt: ActiveStatus[]): boolean {
  return defSt.some(s => STATUS_RULES[s.type]?.defenderCannotDodge)
}

/** Aggregate multiplier on damage taken by the defender (marked × blessed …). */
export function damageTakenMult(defSt: ActiveStatus[]): number {
  let m = 1
  for (const s of defSt) m *= STATUS_RULES[s.type]?.damageTakenMult ?? 1
  return m
}

/** Fraction (0–1) of the defender's damageReduction removed by curses. */
export function damageReductionRemoval(defSt: ActiveStatus[]): number {
  let frac = 0
  for (const s of defSt) {
    if (STATUS_RULES[s.type]?.removesDamageReduction) {
      frac = Math.max(frac, Math.min(1, Math.max(0, s.power)))
    }
  }
  return frac
}

/** Combined attack-speed multiplier for the attacking unit's statuses. */
export function attackSpeedMult(atkSt: ActiveStatus[]): number {
  let m = 1
  for (const s of atkSt) m *= STATUS_RULES[s.type]?.attackSpeedMult ?? 1
  return m
}

/** True when this status makes its carrier skip whole turns (gravity). */
export function isTurnSkipper(type: StatusType): boolean {
  return !!STATUS_RULES[type]?.skipsTurn
}
