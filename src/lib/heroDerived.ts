import { getEquipmentBonuses } from '../formulas/items'
import { getEffectiveDerivedStatsFromBonuses } from '../formulas/effectiveStats'
import { useHeroStore } from '../store/heroStore'
import { useInventoryStore } from '../store/inventoryStore'
import { useSpellStore } from '../store/spellStore'
import { getPartyEffectiveAttributes } from './partyBonuses'

/**
 * Single source of truth for the hero's EFFECTIVE derived stats:
 * attributes + equipment bonuses + weapon progress + active spell buffs.
 *
 * Always prefer this over assembling the pieces manually — partial
 * assemblies (e.g. skipping weapons or buffs) were the root cause of
 * inconsistent max-stamina/mana values across the codebase.
 */
export function getHeroDerived() {
  const hero = useHeroStore.getState()
  const inv  = useInventoryStore.getState()
  const attributes = getPartyEffectiveAttributes(hero.attributes, hero.level)
  return getEffectiveDerivedStatsFromBonuses(
    attributes,
    getEquipmentBonuses(inv.equipment),
    hero.level,
    inv.weaponProgress,
    inv.equippedWeapons,
    useSpellStore.getState().activeBuffs,
  )
}
