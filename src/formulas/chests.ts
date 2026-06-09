import { generateConsumable, generateItem, pickItemRarity } from './items'
import { rollWeaponMaterialDrop } from './weapons'
import type { Consumable, Item, ItemRarity, TreasureChest } from '../types/item'
import type { WeaponMaterialDrop } from '../types/weapon'

const RARITY_VALUE: Record<ItemRarity, number> = {
  common: 1,
  uncommon: 1.35,
  rare: 1.8,
  epic: 2.5,
  set: 3.2,
  unique: 4.2,
}

let chestSeq = 0

export interface ChestLoot {
  gold: number
  items: Item[]
  consumables: Consumable[]
  materials: WeaponMaterialDrop[]
}

export function createTreasureChest(level: number, rarity: ItemRarity = pickItemRarity(level)): TreasureChest {
  return {
    id: `chest_${Date.now()}_${chestSeq++}`,
    level: Math.max(1, Math.round(level)),
    rarity,
    qty: 1,
  }
}

export function chestOpenSeconds(chest: TreasureChest, goldMult = 1, dropChance = 0): number {
  const raritySpeedPenalty = RARITY_VALUE[chest.rarity]
  const base = 18 + chest.level * 1.8
  const speed = Math.max(0.4, goldMult) * (1 + Math.max(0, dropChance) * 6)
  return Math.max(6, Math.round((base * raritySpeedPenalty) / speed))
}

export function rollChestLoot(chest: TreasureChest): ChestLoot {
  const value = RARITY_VALUE[chest.rarity]
  const loot: ChestLoot = { gold: 0, items: [], consumables: [], materials: [] }

  if (Math.random() < 0.85) {
    loot.gold = Math.round((12 + chest.level * 7) * value * (0.75 + Math.random() * 0.75))
  }

  if (Math.random() < 0.45) {
    loot.items.push(generateItem(chest.level))
  }

  if (Math.random() < 0.42) {
    loot.consumables.push(generateConsumable(chest.level))
  }

  if (Math.random() < 0.18) {
    const drop = rollWeaponMaterialDrop(chest.level, value * 0.02)
    if (drop) loot.materials.push(drop)
  }

  const extraRolls = chest.rarity === 'unique' ? 3 : chest.rarity === 'set' ? 2 : chest.rarity === 'epic' ? 2 : chest.rarity === 'rare' ? 1 : 0
  for (let i = 0; i < extraRolls; i++) {
    const r = Math.random()
    if (r < 0.36) loot.gold += Math.round((8 + chest.level * 4) * value)
    else if (r < 0.62) loot.items.push(generateItem(chest.level))
    else if (r < 0.86) loot.consumables.push(generateConsumable(chest.level))
    else {
      const drop = rollWeaponMaterialDrop(chest.level, value * 0.02)
      if (drop) loot.materials.push(drop)
    }
  }

  if (loot.gold <= 0 && loot.items.length === 0 && loot.consumables.length === 0 && loot.materials.length === 0) {
    loot.gold = Math.round((10 + chest.level * 6) * value)
  }

  return loot
}
