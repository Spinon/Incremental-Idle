import type { Attributes, DerivedStats } from '../types/hero'
import type { EquipBonuses } from '../types/item'

/**
 * Soft cap: linear up to `knee`, then sublinear (`pow`) growth. Keeps early
 * investment honest while preventing late-game stats from going vertical.
 */
function softcap(value: number, knee: number, pow: number): number {
  if (value <= knee) return value
  return knee + Math.pow(value - knee, pow)
}

const BASE = {
  atk: 5,
  def: 2,
  maxHp: 30,
  attackSpeed: 1,
  magicDamage: 3,
  maxStamina: 100,
  staminaRegen: 4,
  staminaEfficiency: 1,
  maxMana: 150,
  manaRegen: 0.1,
  manaEfficiency: 1,
  moveSpeed: 1,
  vision: 100,
  dropChance: 0.015,
  critChance: 0.05,
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
    //  DEF: armadura física = só Vitalidade (tank) + passivo de nível
    def:    BASE.def    + fa.vitalidade * 0.5
                        + Math.floor(lvl * 0.5)                          + (eq?.def ?? 0),
    maxHp:  BASE.maxHp  + fa.vitalidade * 15   + fa.forca * 5 + lvl * 8 + (eq?.hp  ?? 0),
    attackSpeed:   BASE.attackSpeed  + fa.agilidade * 0.1                + (eq?.atkSpeed    ?? 0),
    //  Dodge moved to Agilidade (speed/reflexes)
    dodgeChance: Math.min(0.5, fa.agilidade * 0.005),
    magicDamage: BASE.magicDamage + fa.inteligencia * 1.6                + (eq?.magicDamage ?? 0),

    // ── Advanced combat ──────────────────────────────────────────────────────
    //  Destreza: precision → critical hits + accuracy (negates target dodge)
    critChance:      Math.min(0.50, BASE.critChance + fa.destreza * 0.006 + (eq?.critChance ?? 0)),
    critDamage:      1.5 + fa.forca * 0.01,        // Força amplifies crit damage
    accuracy:        Math.min(0.50, fa.destreza * 0.006 + (eq?.accuracy ?? 0)),
    //  Força: brawn → shrugs off blows (all-damage reduction)
    damageReduction: Math.min(0.35, fa.forca * 0.01),
    healBonus:       1 + fa.sabedoria * 0.02,       // Sabedoria: heal potency

    // ── Stamina ──────────────────────────────────────────────────────────────
    // Regen/efficiency soft-capped so the self-sustaining base speed tops out
    // around 6 — beyond that, drain grows exponentially (see staminaDrainAt).
    maxStamina:        BASE.maxStamina        + fa.forca     * 10  + fa.vitalidade  * 20,
    staminaRegen:      BASE.staminaRegen      + softcap(fa.forca * 0.5 + fa.vitalidade * 1, 60, 0.6),
    staminaEfficiency: BASE.staminaEfficiency + softcap(fa.agilidade * 0.04 + fa.destreza * 0.025, 1.2, 0.45),

    // ── Mana ─────────────────────────────────────────────────────────────────
    maxMana:        BASE.maxMana        + fa.sabedoria    * 20  + fa.inteligencia * 8,
    // manaRegen sublinear: sustaining one extra spell tier should keep costing
    // real investment — previously SAB made mana self-sufficient too early.
    manaRegen:      BASE.manaRegen + lvl * 0.02 + softcap(fa.sabedoria * 0.2 + fa.inteligencia * 0.05, 3, 0.6),
    manaEfficiency: BASE.manaEfficiency + fa.inteligencia * 0.04,

    // ── Exploration ──────────────────────────────────────────────────────────
    moveSpeed: BASE.moveSpeed + fa.agilidade * 0.08 + fa.destreza * 0.05 + (eq?.moveSpeed ?? 0),
    vision:    BASE.vision    + fa.inteligencia * 8  + fa.sabedoria * 12  + (eq?.vision    ?? 0),

    // ── Economy & drops ──────────────────────────────────────────────────────
    dropChance:      Math.min(0.3, BASE.dropChance + fa.carisma * 0.003 + (eq?.dropChance ?? 0)),
    goldMultiplier:  BASE.goldMultiplier + fa.carisma * 0.05 + (eq?.goldMult   ?? 0),
    goldEfficiency:  1 + fa.carisma * 0.02,
    xpBonus:         BASE.xpBonus       + fa.carisma * 0.03 + (eq?.xpBonus    ?? 0),

    // ── Elemental resistances ─────────────────────────────────────────────
    // Home stat: 0.008/pt (cap 50% ≈ 63 pts). Inteligência = "defesa mágica":
    // sombria é a especialidade dela (0.008) + um pouco de TODOS os elementos (0.004).
    resIgnea:   Math.min(0.5, fa.vitalidade   * 0.008 + fa.inteligencia * 0.004 + (eq?.resIgnea   ?? 0)),
    resGlacial: Math.min(0.5, fa.destreza     * 0.008 + fa.inteligencia * 0.004 + (eq?.resGlacial ?? 0)),
    resSombria: Math.min(0.5, fa.inteligencia * 0.008 + (eq?.resSombria ?? 0)),
    resVital:   Math.min(0.5, fa.sabedoria    * 0.008 + fa.inteligencia * 0.004 + (eq?.resVital   ?? 0)),
  }
}

/**
 * Stamina drained per second at speed `s`.
 * Quadratic up to 6 (5*(s-1)*s: s=2→10 s=4→60 s=6→150), then an aggressive
 * ×2.5 exponential per extra step (s=7→525 s=8→1750 s=9→6 000) so the
 * self-sustaining base speed effectively tops out at 6.
 */
export function staminaDrainAt(s: number): number {
  if (s <= 1) return 0
  const quad = 5 * (s - 1) * s
  if (s <= 6) return quad
  return quad * Math.pow(2.5, s - 6)
}

/**
 * Tile deck capacity from the vision stat. Slow sqrt growth, hard cap 16:
 *   vision 100→5  400→7  900→9  1600→11  2500→13  3600→15  4200+→16
 */
export function getMaxDeck(vision: number): number {
  return Math.min(16, 3 + Math.floor(Math.sqrt(Math.max(0, vision)) / 5))
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
