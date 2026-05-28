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
  // Combat
  atk: number
  def: number
  maxHp: number
  attackSpeed: number
  dodgeChance: number
  magicDamage: number
  // Resources
  maxStamina: number
  staminaRegen: number
  staminaEfficiency: number   // reduces drain rate — driven by Agilidade + Destreza
  maxMana: number
  manaRegen: number
  manaEfficiency: number      // reduces mana cost of abilities — driven by Inteligência
  // Exploration
  moveSpeed: number
  vision: number
  // Drops & progression
  dropChance: number
  goldMultiplier: number
  xpBonus: number             // multiplies XP gained — driven by Carisma
}
