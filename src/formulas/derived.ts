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
  dropChance: 0.025,
  goldMultiplier: 1,
  xpBonus: 1,
}

/**
 * Computes all derived stats from raw attributes, optional equipment bonuses,
 * and the hero's current level.
 *
 * The `level` parameter adds a **passive combat baseline** that grows with
 * experience independently of attribute choices:
 *   ATK  += (level-1) × 1.5   — one free Força point worth of ATK per level
 *   DEF  += ⌊(level-1) × 0.5⌋ — half a Vitalidade DEF point per level
 *   HP   += (level-1) × 8     — between Força (5) and Vitalidade (15) HP per level
 *
 * This closes the scaling gap between a balanced hero and concentrated monster
 * stats without forcing the player into a pure combat attribute build.
 */
export function getDerivedStats(a: Attributes, equip?: EquipBonuses, level = 1): DerivedStats {
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
  const eq  = equip
  const lvl = Math.max(0, level - 1)   // 0 at Lv1, 9 at Lv10, 19 at Lv20…
  return {
    // ── Primary combat ───────────────────────────────────────────────────────
    atk:    BASE.atk    + fa.forca      * 1.5  + lvl * 1.5              + (eq?.atk ?? 0),
    //  DEF: Vitalidade (tank), Inteligência (magical insight), passive level
    def:    BASE.def    + fa.vitalidade * 0.5  + fa.inteligencia * 0.2
                        + Math.floor(lvl * 0.5)                          + (eq?.def ?? 0),
    maxHp:  BASE.maxHp  + fa.vitalidade * 15   + fa.forca * 5 + lvl * 8 + (eq?.hp  ?? 0),
    attackSpeed:   BASE.attackSpeed  + fa.agilidade * 0.1                + (eq?.atkSpeed    ?? 0),
    //  Dodge moved to Agilidade (speed/reflexes)
    dodgeChance: Math.min(0.5, fa.agilidade * 0.005),
    magicDamage: BASE.magicDamage + fa.inteligencia * 1                  + (eq?.magicDamage ?? 0),

    // ── Advanced combat ──────────────────────────────────────────────────────
    //  Destreza: precision → critical hits + all-damage reduction (technique)
    critChance:      Math.min(0.50, fa.destreza * 0.005),
    critDamage:      1.5 + fa.forca * 0.01,        // Força amplifies crit damage
    damageReduction: Math.min(0.35, fa.destreza * 0.01),
    healBonus:       1 + fa.sabedoria * 0.02,       // Sabedoria: heal potency

    // ── Stamina ──────────────────────────────────────────────────────────────
    maxStamina:        BASE.maxStamina        + fa.forca     * 10  + fa.vitalidade  * 20,
    staminaRegen:      BASE.staminaRegen      + fa.forca     * 0.5 + fa.vitalidade  * 1,
    staminaEfficiency: BASE.staminaEfficiency + fa.agilidade * 0.04 + fa.destreza   * 0.025,

    // ── Mana ─────────────────────────────────────────────────────────────────
    maxMana:        BASE.maxMana        + fa.sabedoria    * 15  + fa.inteligencia * 5,
    manaRegen:      BASE.manaRegen      + fa.sabedoria    * 1   + fa.inteligencia * 0.3,
    manaEfficiency: BASE.manaEfficiency + fa.inteligencia * 0.04,

    // ── Exploration ──────────────────────────────────────────────────────────
    moveSpeed: BASE.moveSpeed + fa.agilidade * 0.08 + fa.destreza * 0.05 + (eq?.moveSpeed ?? 0),
    vision:    BASE.vision    + fa.inteligencia * 8  + fa.sabedoria * 12  + (eq?.vision    ?? 0),

    // ── Economy & drops ──────────────────────────────────────────────────────
    //  Carisma: more drops, more gold, market efficiency (discount/overcharge)
    dropChance:      Math.min(0.5, BASE.dropChance + fa.carisma * 0.005 + (eq?.dropChance ?? 0)),
    goldMultiplier:  BASE.goldMultiplier + fa.carisma * 0.05 + (eq?.goldMult   ?? 0),
    goldEfficiency:  1 + fa.carisma * 0.02,   // 1.0 = neutral; >1 = cheaper to buy
    xpBonus:         BASE.xpBonus       + fa.carisma * 0.03 + (eq?.xpBonus    ?? 0),
  }
}

/**
 * Stamina drained per second at speed `s`.
 * Formula: 5*(s-1)*(s) — grows faster than before, making higher speeds costly.
 *   s=1→0  s=2→10  s=3→30  s=4→60  s=5→100  s=6→150  s=7→210 …
 */
export function staminaDrainAt(s: number): number {
  if (s <= 1) return 0
  const t = s - 1
  return 5 * t * s
}

/**
 * Returns the highest integer speed at which stamina is self-sustaining
 * (drain/efficiency strictly less than regen — surplus regen required).
 * This becomes the minimum (base) speed shown in UI.
 */
export function getBaseSpeed(derived: DerivedStats): number {
  for (let s = 2; s <= 30; s++) {
    if (staminaDrainAt(s) / derived.staminaEfficiency >= derived.staminaRegen) {
      return s - 1
    }
  }
  return 30
}
