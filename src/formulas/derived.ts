import type { Attributes, DerivedStats } from '../types/hero'
import type { EquipBonuses } from '../types/item'

const BASE = {
  atk: 5,
  def: 2,
  maxHp: 30,
  attackSpeed: 1,
  magicDamage: 3,
  maxStamina: 100,
  staminaRegen: 4,
  staminaEfficiency: 1,
  maxMana: 50,
  manaRegen: 3,
  manaEfficiency: 1,
  moveSpeed: 1,
  vision: 100,
  dropChance: 0.015,
  goldMultiplier: 1,
  xpBonus: 1,
}

export function getDerivedStats(a: Attributes, equip?: EquipBonuses): DerivedStats {
  // Apply attribute bonuses from unique items before deriving stats
  const ab = equip?.attrBonus ?? {}
  const fa: Attributes = {
    forca:        a.forca        + (ab.forca        ?? 0),
    vitalidade:   a.vitalidade   + (ab.vitalidade   ?? 0),
    agilidade:    a.agilidade    + (ab.agilidade    ?? 0),
    destreza:     a.destreza     + (ab.destreza     ?? 0),
    inteligencia: a.inteligencia + (ab.inteligencia ?? 0),
    sabedoria:    a.sabedoria    + (ab.sabedoria    ?? 0),
    carisma:      a.carisma      + (ab.carisma      ?? 0),
  }
  const eq = equip
  return {
    // Combat — small scaling + equipment
    atk:           BASE.atk          + fa.forca        * 1.5  + (eq?.atk          ?? 0),
    def:           BASE.def          + fa.vitalidade   * 0.5  + (eq?.def          ?? 0),
    maxHp:         BASE.maxHp        + fa.vitalidade   * 15   + fa.forca * 5      + (eq?.hp           ?? 0),
    attackSpeed:   BASE.attackSpeed  + fa.agilidade    * 0.1  + (eq?.atkSpeed     ?? 0),
    dodgeChance:                       fa.destreza     * 0.005,
    magicDamage:   BASE.magicDamage  + fa.inteligencia * 1    + (eq?.magicDamage  ?? 0),

    // Stamina — Força e Vitalidade big contributors; Agilidade+Destreza reduce drain
    maxStamina:        BASE.maxStamina        + fa.forca     * 10  + fa.vitalidade  * 20,
    staminaRegen:      BASE.staminaRegen      + fa.forca     * 0.5 + fa.vitalidade  * 1,
    staminaEfficiency: BASE.staminaEfficiency + fa.agilidade * 0.04 + fa.destreza   * 0.025,

    // Mana — Sabedoria big contributor; Inteligência adds efficiency
    maxMana:        BASE.maxMana        + fa.sabedoria    * 15  + fa.inteligencia * 5,
    manaRegen:      BASE.manaRegen      + fa.sabedoria    * 1   + fa.inteligencia * 0.3,
    manaEfficiency: BASE.manaEfficiency + fa.inteligencia * 0.04,

    // Exploration — Agilidade big for speed, Destreza secondary
    moveSpeed:     BASE.moveSpeed    + fa.agilidade * 0.08 + fa.destreza * 0.05 + (eq?.moveSpeed   ?? 0),
    vision:        BASE.vision       + fa.inteligencia * 8 + fa.sabedoria * 12  + (eq?.vision      ?? 0),

    // Drops & progression — Carisma big contributor
    dropChance:     BASE.dropChance      + fa.carisma * 0.006 + (eq?.dropChance ?? 0),
    goldMultiplier: BASE.goldMultiplier  + fa.carisma * 0.05  + (eq?.goldMult   ?? 0),
    xpBonus:        BASE.xpBonus        + fa.carisma * 0.03  + (eq?.xpBonus    ?? 0),
  }
}

/**
 * Stamina drained per second at speed `s`.
 * Formula: 3*(s-1)² + 2*(s-1) — matches original values at s=2,3,4 and
 * extends cleanly to any higher speed.
 *   s=1→0  s=2→5  s=3→16  s=4→33  s=5→56  s=6→85  s=7→120 …
 */
export function staminaDrainAt(s: number): number {
  if (s <= 1) return 0
  const t = s - 1
  return 3 * t * t + 2 * t
}

/**
 * Returns the highest integer speed at which stamina is self-sustaining
 * (net drain ≤ 0, i.e. drain/efficiency ≤ regen).
 * At exact parity (drain = regen) the net is 0 — no stamina is lost, so it
 * counts as self-sufficient.  This becomes the minimum (base) speed shown in UI.
 */
export function getBaseSpeed(derived: DerivedStats): number {
  for (let s = 2; s <= 30; s++) {
    if (staminaDrainAt(s) / derived.staminaEfficiency > derived.staminaRegen) {
      return s - 1
    }
  }
  return 30
}
