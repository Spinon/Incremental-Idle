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
  maxMana: number
  manaRegen: number
  // Exploration
  moveSpeed: number
  vision: number
  // Drops
  dropChance: number
  goldMultiplier: number
}
