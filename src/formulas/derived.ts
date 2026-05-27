import type { Attributes, DerivedStats } from '../types/hero'
import type { Speed } from '../store/battleStore'

const BASE = {
  atk: 5,
  def: 2,
  maxHp: 30,
  attackSpeed: 1,
  magicDamage: 3,
  maxStamina: 100,
  staminaRegen: 5,
  maxMana: 50,
  manaRegen: 3,
  moveSpeed: 1,
  vision: 100,
  dropChance: 0.05,
  goldMultiplier: 1,
}

export function getDerivedStats(a: Attributes): DerivedStats {
  return {
    // Combat — small scaling
    atk:           BASE.atk          + a.forca        * 1,
    def:           BASE.def          + a.vitalidade   * 0.5,
    maxHp:         BASE.maxHp        + a.vitalidade   * 15  + a.forca       * 5,
    attackSpeed:   BASE.attackSpeed  + a.agilidade    * 0.02,
    dodgeChance:                       a.destreza     * 0.005,
    magicDamage:   BASE.magicDamage  + a.inteligencia * 1,

    // Stamina — Força e Vitalidade big contributors
    maxStamina:    BASE.maxStamina   + a.forca        * 10  + a.vitalidade  * 20,
    staminaRegen:  BASE.staminaRegen + a.forca        * 0.5 + a.vitalidade  * 1,

    // Mana — Sabedoria big contributor, Inteligência small
    maxMana:       BASE.maxMana      + a.sabedoria    * 15  + a.inteligencia * 5,
    manaRegen:     BASE.manaRegen    + a.sabedoria    * 1   + a.inteligencia * 0.3,

    // Exploration — Agilidade big for speed, Destreza secondary
    moveSpeed:     BASE.moveSpeed    + a.agilidade    * 0.08 + a.destreza   * 0.05,
    vision:        BASE.vision       + a.inteligencia * 8   + a.sabedoria   * 12,

    // Drops
    dropChance:    BASE.dropChance   + a.carisma * 0.02,
    goldMultiplier: BASE.goldMultiplier + a.carisma * 0.05,
  }
}

// Stamina drain per second at each speed level.
// 2x depletes base stamina (100) in 20s.
// 3x in ~6.7s. 4x in ~3.3s.
// With higher maxStamina the player lasts proportionally longer.
export const STAMINA_DRAIN: Record<Speed, number> = {
  1: 0,
  2: 5,
  3: 15,
  4: 30,
}

// Minimum stamina required to activate a speed (5% of base max)
export const STAMINA_THRESHOLD: Record<Speed, number> = {
  1: 0,
  2: 5,
  3: 15,
  4: 30,
}
