// ─── Hero appearance ──────────────────────────────────────────────────────────

export interface HeroConfig {
  head:   1 | 2 | 3
  hair:   1 | 2 | 3 | 4
  body:   1 | 2 | 3
  weapon: 0 | 1 | 2 | 3
  legs:   1 | 2 | 3
}

export const DEFAULT_HERO_CONFIG: HeroConfig = {
  head: 1, hair: 1, body: 1, weapon: 1, legs: 1,
}

export interface Attributes {
  forca: number
  agilidade: number
  destreza: number
  vitalidade: number
  inteligencia: number
  sabedoria: number
  carisma: number
}

export interface DerivedStats {
  // Combat — primary
  atk: number
  def: number
  maxHp: number
  attackSpeed: number
  dodgeChance: number       // Agilidade
  magicDamage: number
  // Combat — advanced
  critChance: number        // Base 5% + Destreza — probability of a critical hit (0–0.5)
  critDamage: number        // Força   — critical hit damage multiplier (≥1.5)
  damageReduction: number   // Destreza — fraction of all incoming damage negated (0–0.35)
  healBonus: number         // Sabedoria — multiplies all spell heals cast by the hero
  // Resources
  maxStamina: number
  staminaRegen: number
  staminaEfficiency: number   // reduces drain rate — Agilidade + Destreza
  maxMana: number
  manaRegen: number
  manaEfficiency: number      // reduces mana cost — Inteligência
  // Exploration
  moveSpeed: number
  vision: number
  // Economy & drops
  dropChance: number
  goldMultiplier: number
  goldEfficiency: number      // Carisma — buy discount / sell overcharge in market
  xpBonus: number
  // Elemental resistances (0–0.5)
  resIgnea:   number   // vs ignis, caelum    — Vitalidade
  resGlacial: number   // vs glacies, fulgur, tempus — Destreza
  resSombria: number   // vs umbra, mortis, abyssus  — Inteligência
  resVital:   number   // vs vitae, toxicum          — Sabedoria
}
