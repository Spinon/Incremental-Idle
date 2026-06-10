import { chestOpenSeconds, rollChestLoot } from '../formulas/chests'
import { useHeroStore } from '../store/heroStore'
import { useInventoryStore } from '../store/inventoryStore'
import { useNotifStore } from '../store/notifStore'
import type { DerivedStats } from '../types/hero'

/**
 * Advances the currently opening chest and resolves its loot when done.
 *
 * Lives in the game loop — this used to run inside InventoryPanel's
 * useEffect, so chests only opened while the Equipment tab was mounted
 * (switching tabs froze the timer).
 */
export function tickChestOpening(deltaMs: number, derived: DerivedStats): void {
  const inv = useInventoryStore.getState()
  const chest = inv.openingChest
  if (!chest) return

  inv.advanceOpeningChest(deltaMs)

  const seconds = chestOpenSeconds(chest, derived.goldEfficiency, derived.dropChance)
  if (useInventoryStore.getState().chestProgressMs < seconds * 1000) return

  const loot = rollChestLoot(chest)
  useInventoryStore.getState().clearOpenedChest()

  let lostItems = 0
  let lostConsumables = 0
  if (loot.gold > 0) useHeroStore.getState().earnGold(loot.gold)
  for (const item of loot.items) {
    if (!useInventoryStore.getState().addItem(item)) lostItems++
  }
  for (const consumable of loot.consumables) {
    if (!useInventoryStore.getState().addConsumable(consumable)) lostConsumables++
  }
  for (const material of loot.materials) useInventoryStore.getState().addWeaponMaterial(material.tier, material.count)

  const parts: string[] = []
  const partsEn: string[] = []
  if (loot.gold > 0) { parts.push(`⬡ ${loot.gold}`); partsEn.push(`⬡ ${loot.gold}`) }
  if (loot.items.length > 0) { parts.push(`${loot.items.length} item${loot.items.length > 1 ? 'ns' : ''}`); partsEn.push(`${loot.items.length} item${loot.items.length > 1 ? 's' : ''}`) }
  if (loot.consumables.length > 0) { parts.push(`${loot.consumables.length} consumível${loot.consumables.length > 1 ? 'is' : ''}`); partsEn.push(`${loot.consumables.length} consumable${loot.consumables.length > 1 ? 's' : ''}`) }
  if (loot.materials.length > 0) { parts.push('material de forja'); partsEn.push('forge material') }

  useNotifStore.getState().push({
    title:    '🎁 Baú aberto!',
    titleEn:  '🎁 Chest opened!',
    body:     parts.join(' · '),
    bodyEn:   partsEn.join(' · '),
    rarity:   chest.rarity,
    scrollTo: 'equips',
    actions:  [{ label: 'Ver Inventário', labelEn: 'View Inventory', kind: 'scroll', payload: 'equips' }],
  })

  // Loot that didn't fit is gone — tell the player instead of failing silently
  if (lostItems > 0 || lostConsumables > 0) {
    const lostPt: string[] = []
    const lostEn: string[] = []
    if (lostItems > 0) { lostPt.push(`${lostItems} item${lostItems > 1 ? 'ns' : ''} (inventário cheio)`); lostEn.push(`${lostItems} item${lostItems > 1 ? 's' : ''} (inventory full)`) }
    if (lostConsumables > 0) { lostPt.push(`${lostConsumables} consumível${lostConsumables > 1 ? 'is' : ''} (bolsa cheia)`); lostEn.push(`${lostConsumables} consumable${lostConsumables > 1 ? 's' : ''} (bag full)`) }
    useNotifStore.getState().push({
      title:    '⚠ Loot perdido!',
      titleEn:  '⚠ Loot lost!',
      body:     `Sem espaço: ${lostPt.join(' · ')}`,
      bodyEn:   `No space: ${lostEn.join(' · ')}`,
      rarity:   'common',
      scrollTo: 'equips',
      actions:  [{ label: 'Ver Inventário', labelEn: 'View Inventory', kind: 'scroll', payload: 'equips' }],
    })
  }
}
