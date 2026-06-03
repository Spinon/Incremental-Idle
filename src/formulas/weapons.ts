import type {
  EquippedWeapons,
  WeaponCombatProfile,
  WeaponHand,
  WeaponMaterialDrop,
  WeaponMaterials,
  WeaponProgress,
  WeaponStatBonuses,
  WeaponType,
} from '../types/weapon'

export const WEAPON_TYPES: WeaponType[] = ['sword', 'dagger', 'axe', 'staff', 'bow', 'shield']
export const TWO_HANDED_WEAPONS = new Set<WeaponType>(['axe', 'staff', 'bow'])
export const OFF_HAND_WEAPONS = new Set<WeaponType>(['sword', 'dagger', 'shield'])

export const WEAPON_LEVELS_PER_TIER = 10
export const WEAPON_MAX_TIER = 12

export const WEAPON_LABELS: Record<WeaponType, { pt: string; en: string }> = {
  sword:  { pt: 'Espada', en: 'Sword' },
  dagger: { pt: 'Adaga',  en: 'Dagger' },
  axe:    { pt: 'Machado', en: 'Axe' },
  staff:  { pt: 'Cajado', en: 'Staff' },
  bow:    { pt: 'Arco', en: 'Bow' },
  shield: { pt: 'Escudo', en: 'Shield' },
}

export const WEAPON_EFFECT_LABELS: Record<WeaponType, { pt: string; en: string }> = {
  sword:  { pt: 'golpe duplo', en: 'double strike' },
  dagger: { pt: 'veneno', en: 'poison' },
  axe:    { pt: 'sangramento', en: 'bleed' },
  staff:  { pt: 'fluxo arcano', en: 'arcane flow' },
  bow:    { pt: 'marca', en: 'mark' },
  shield: { pt: 'bloqueio', en: 'block' },
}

export const WEAPON_MATERIAL_LABELS = {
  pt: 'Aço de Forja',
  en: 'Forge Steel',
}

export function weaponXpForLevel(level: number, tier: number): number {
  const l = Math.max(1, level)
  return Math.floor(720 * Math.pow(l, 2.15) * Math.pow(tier, 1.35))
}

export function weaponMaxLevelForTier(tier: number): number {
  return Math.max(1, tier) * WEAPON_LEVELS_PER_TIER
}

export function createWeaponProgress(type: WeaponType): WeaponProgress {
  return {
    type,
    level: 1,
    xp: 0,
    xpToNext: weaponXpForLevel(1, 1),
    tier: 1,
    maxLevel: weaponMaxLevelForTier(1),
  }
}

export function normalizeWeaponProgress(
  saved?: Partial<Record<WeaponType, Partial<WeaponProgress>>>,
): Record<WeaponType, WeaponProgress> {
  const result = {} as Record<WeaponType, WeaponProgress>
  for (const type of WEAPON_TYPES) {
    const base = createWeaponProgress(type)
    const prev = saved?.[type]
    const tier = Math.max(1, Math.min(WEAPON_MAX_TIER, Math.round(prev?.tier ?? base.tier)))
    const maxLevel = weaponMaxLevelForTier(tier)
    const level = Math.max(1, Math.min(maxLevel, Math.round(prev?.level ?? base.level)))
    result[type] = {
      type,
      level,
      xp: Math.max(0, Math.round(prev?.xp ?? base.xp)),
      xpToNext: weaponXpForLevel(level, tier),
      tier,
      maxLevel,
    }
  }
  return result
}

export function normalizeEquippedWeapons(saved?: Partial<EquippedWeapons>): EquippedWeapons {
  const main = saved?.mainHand && WEAPON_TYPES.includes(saved.mainHand) ? saved.mainHand : 'sword'
  const off = saved?.offHand && WEAPON_TYPES.includes(saved.offHand) ? saved.offHand : 'shield'
  return enforceWeaponLoadout({ mainHand: main, offHand: off })
}

export function enforceWeaponLoadout(loadout: EquippedWeapons): EquippedWeapons {
  if (loadout.mainHand === 'shield') return { mainHand: 'sword', offHand: 'shield' }
  if (TWO_HANDED_WEAPONS.has(loadout.mainHand)) return { mainHand: loadout.mainHand, offHand: null }
  if (loadout.offHand && !OFF_HAND_WEAPONS.has(loadout.offHand)) return { ...loadout, offHand: null }
  return loadout
}

export function canEquipWeapon(hand: WeaponHand, type: WeaponType, current: EquippedWeapons): boolean {
  if (hand === 'mainHand') return type !== 'shield'
  if (!OFF_HAND_WEAPONS.has(type)) return false
  return !TWO_HANDED_WEAPONS.has(current.mainHand)
}

export function equippedWeaponTypes(loadout: EquippedWeapons): WeaponType[] {
  return [loadout.mainHand, loadout.offHand].filter(Boolean) as WeaponType[]
}

export function weaponDisplayLevel(progress: WeaponProgress): number {
  return progress.level
}

export function weaponForgeMaterialTier(progress: WeaponProgress): number {
  return progress.tier
}

export function weaponForgeCost(progress: WeaponProgress): number {
  return Math.max(1, progress.tier)
}

export function isWeaponAtForgeCap(progress: WeaponProgress): boolean {
  return progress.level >= progress.maxLevel
}

export function treasureMaxWeaponTier(tileLevel: number): number {
  if (tileLevel < 10) return 1
  return Math.min(WEAPON_MAX_TIER, 2 + Math.floor((tileLevel - 10) / 5))
}

export function rollWeaponMaterialDrop(tileLevel: number, dropBonus = 0): WeaponMaterialDrop | null {
  const maxTier = treasureMaxWeaponTier(tileLevel)
  const chance = Math.min(0.10, 0.018 * Math.max(0.5, 1 + dropBonus))
  if (Math.random() >= chance) return null

  const tiers = Array.from({ length: maxTier }, (_, i) => i + 1)
  const weights = tiers.map(t => Math.max(1, 6 - (maxTier - t)))
  const total = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let i = 0; i < tiers.length; i++) {
    r -= weights[i]
    if (r <= 0) return { tier: tiers[i], count: 1 }
  }
  return { tier: 1, count: 1 }
}

function weaponScale(progress: WeaponProgress): number {
  return progress.level + (progress.tier - 1) * 4
}

export function getWeaponStatBonuses(
  progress: Record<WeaponType, WeaponProgress>,
  loadout: EquippedWeapons,
): WeaponStatBonuses {
  const bonuses: WeaponStatBonuses = { atk: 0, def: 0, attackSpeed: 0, critChance: 0, magicDamage: 0 }
  for (const type of equippedWeaponTypes(loadout)) {
    const scale = weaponScale(progress[type])
    switch (type) {
      case 'sword':
        bonuses.atk += 1 + scale * 0.45
        break
      case 'dagger':
        bonuses.atk += scale * 0.25
        bonuses.attackSpeed += 0.015 + scale * 0.002
        break
      case 'axe':
        bonuses.atk += 2 + scale * 0.75
        bonuses.attackSpeed -= 0.04
        break
      case 'staff':
        bonuses.magicDamage += 2 + scale * 0.8
        break
      case 'bow':
        bonuses.atk += 1 + scale * 0.55
        bonuses.critChance += Math.min(0.18, 0.025 + scale * 0.0015)
        break
      case 'shield':
        bonuses.def += 1 + scale * 0.4
        break
    }
  }
  bonuses.atk = Math.round(bonuses.atk)
  bonuses.def = Math.round(bonuses.def)
  bonuses.magicDamage = Math.round(bonuses.magicDamage)
  bonuses.attackSpeed = Number(bonuses.attackSpeed.toFixed(3))
  bonuses.critChance = Number(bonuses.critChance.toFixed(4))
  return bonuses
}

export function getWeaponCombatProfile(
  progress: Record<WeaponType, WeaponProgress>,
  loadout: EquippedWeapons,
): WeaponCombatProfile {
  const profile: WeaponCombatProfile = {
    swordExtraHitChance: 0,
    daggerPoisonChance: 0,
    daggerPoisonPower: 0,
    axeBleedChance: 0,
    axeBleedPower: 0,
    bowMarkChance: 0,
    bowMarkTurns: 0,
    staffCooldownReduction: 0,
    staffSlotOneManaDiscount: 0,
    shieldBlockChance: 0,
    shieldPerfectBlockChance: 0,
    shieldBlockReduction: 0,
  }

  for (const type of equippedWeaponTypes(loadout)) {
    const scale = weaponScale(progress[type])
    switch (type) {
      case 'sword':
        profile.swordExtraHitChance += Math.min(0.28, 0.045 + scale * 0.0028)
        break
      case 'dagger':
        profile.daggerPoisonChance += Math.min(0.34, 0.055 + scale * 0.0025)
        profile.daggerPoisonPower += 1 + scale * 0.18
        break
      case 'axe':
        profile.axeBleedChance += Math.min(0.36, 0.075 + scale * 0.003)
        profile.axeBleedPower += 1 + scale * 0.28
        break
      case 'staff':
        profile.staffCooldownReduction = Math.max(profile.staffCooldownReduction, Math.min(0.30, 0.06 + scale * 0.003))
        profile.staffSlotOneManaDiscount = Math.max(profile.staffSlotOneManaDiscount, Math.min(0.38, 0.08 + scale * 0.0035))
        break
      case 'bow':
        profile.bowMarkChance += Math.min(0.30, 0.055 + scale * 0.0025)
        profile.bowMarkTurns = Math.max(profile.bowMarkTurns, 2 + Math.floor(scale / 20))
        break
      case 'shield':
        profile.shieldBlockChance += Math.min(0.28, 0.07 + scale * 0.0024)
        profile.shieldPerfectBlockChance += Math.min(0.12, 0.025 + scale * 0.0009)
        profile.shieldBlockReduction = Math.max(profile.shieldBlockReduction, Math.min(0.72, 0.36 + scale * 0.004))
        break
    }
  }

  profile.daggerPoisonPower = Math.max(1, Math.round(profile.daggerPoisonPower))
  profile.axeBleedPower = Math.max(1, Math.round(profile.axeBleedPower))
  return profile
}

export function hasWeaponMaterial(materials: WeaponMaterials, tier: number, count: number): boolean {
  return (materials[tier] ?? 0) >= count
}
