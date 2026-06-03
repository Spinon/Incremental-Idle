export type WeaponType = 'sword' | 'dagger' | 'axe' | 'staff' | 'bow' | 'shield'

export type WeaponHand = 'mainHand' | 'offHand'

export interface WeaponProgress {
  type: WeaponType
  level: number
  xp: number
  xpToNext: number
  tier: number
  maxLevel: number
}

export interface EquippedWeapons {
  mainHand: WeaponType
  offHand: WeaponType | null
}

export type WeaponMaterials = Record<number, number>

export interface WeaponMaterialDrop {
  tier: number
  count: number
}

export interface WeaponStatBonuses {
  atk: number
  def: number
  attackSpeed: number
  critChance: number
  magicDamage: number
}

export interface WeaponCombatProfile {
  swordExtraHitChance: number
  daggerPoisonChance: number
  daggerPoisonPower: number
  axeBleedChance: number
  axeBleedPower: number
  bowMarkChance: number
  bowMarkTurns: number
  staffCooldownReduction: number
  staffSlotOneManaDiscount: number
  shieldBlockChance: number
  shieldPerfectBlockChance: number
  shieldBlockReduction: number
}
