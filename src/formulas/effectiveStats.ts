import { getDerivedStats } from './derived'
import { getWeaponStatBonuses } from './weapons'
import { applySpellBuffs } from './spells'
import type { Attributes, DerivedStats } from '../types/hero'
import type { EquipBonuses, EquipmentSlots } from '../types/item'
import type { ActiveBuff } from '../types/spell'
import type { EquippedWeapons, WeaponProgress, WeaponType } from '../types/weapon'

export function applyWeaponStatBonuses(
  derived: DerivedStats,
  weaponProgress: Record<WeaponType, WeaponProgress>,
  equippedWeapons: EquippedWeapons,
): DerivedStats {
  const weaponStats = getWeaponStatBonuses(weaponProgress, equippedWeapons)
  return {
    ...derived,
    atk: derived.atk + weaponStats.atk,
    def: derived.def + weaponStats.def,
    attackSpeed: Math.max(0.1, derived.attackSpeed + weaponStats.attackSpeed),
    critChance: Math.min(0.75, derived.critChance + weaponStats.critChance),
    magicDamage: derived.magicDamage + weaponStats.magicDamage,
  }
}

export function getEffectiveDerivedStatsFromBonuses(
  attributes: Attributes,
  equipBonuses: EquipBonuses | undefined,
  level: number,
  weaponProgress: Record<WeaponType, WeaponProgress>,
  equippedWeapons: EquippedWeapons,
  activeBuffs: ActiveBuff[],
): DerivedStats {
  return applySpellBuffs(
    applyWeaponStatBonuses(
      getDerivedStats(attributes, equipBonuses, level),
      weaponProgress,
      equippedWeapons,
    ),
    activeBuffs,
  )
}

export function getEffectiveDerivedStats(
  attributes: Attributes,
  equipment: EquipmentSlots,
  level: number,
  weaponProgress: Record<WeaponType, WeaponProgress>,
  equippedWeapons: EquippedWeapons,
  activeBuffs: ActiveBuff[],
  getEquipmentBonuses: (equipment: EquipmentSlots) => EquipBonuses,
): DerivedStats {
  return getEffectiveDerivedStatsFromBonuses(
    attributes,
    getEquipmentBonuses(equipment),
    level,
    weaponProgress,
    equippedWeapons,
    activeBuffs,
  )
}
