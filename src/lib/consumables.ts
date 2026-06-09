import { getDerivedStats } from '../formulas/derived'
import { getEquipmentBonuses } from '../formulas/items'
import { useBattleStore } from '../store/battleStore'
import { useHeroStore } from '../store/heroStore'
import { useInventoryStore } from '../store/inventoryStore'
import { useSpellStore } from '../store/spellStore'
import { useUIStore } from '../store/uiStore'
import type { Consumable, ItemStats } from '../types/item'
import type { BuffableStat } from '../types/spell'

export type ConsumableUseResult = 'used' | 'pending' | 'blocked'

const AUTO_USE_COOLDOWN_MS = 1200
let lastAutoUseAt = 0

const STAT_TO_BUFF: Partial<Record<keyof ItemStats, keyof BuffableStat>> = {
  atk: 'atk',
  def: 'def',
  atkSpeed: 'attackSpeed',
  magicDamage: 'magicDamage',
  vision: 'vision',
  moveSpeed: 'moveSpeed',
  dropChance: 'dropChance',
  xpBonus: 'xpBonus',
}

export function useConsumableById(id: string): ConsumableUseResult {
  const inventory = useInventoryStore.getState()
  const consumable = inventory.consumables.find(c => c.id === id)
  if (!consumable) return 'blocked'

  if (consumable.effect === 'normalizeTile') {
    const ui = useUIStore.getState()
    ui.setPendingTileNormalizeConsumableId(id)
    ui.setActiveTab('map')
    return 'pending'
  }

  if (
    (consumable.effect === 'shield' || consumable.effect === 'physicalDamage' || consumable.effect === 'enemyDebuff') &&
    (useBattleStore.getState().phase === 'empty' || useBattleStore.getState().phase === 'over')
  ) {
    return 'blocked'
  }

  const removed = inventory.removeConsumable(id)
  if (!removed) return 'blocked'
  applyConsumableEffect(removed)
  return 'used'
}

export function applyConsumableEffect(consumable: Consumable): void {
  const hero = useHeroStore.getState()
  const inventory = useInventoryStore.getState()
  const derived = getDerivedStats(hero.attributes, getEquipmentBonuses(inventory.equipment), hero.level)

  switch (consumable.effect) {
    case 'stamina':
      hero.restoreStamina(derived.maxStamina * consumable.magnitude, derived.maxStamina)
      break
    case 'mana':
      hero.restoreMana(derived.maxMana * consumable.magnitude, derived.maxMana)
      break
    case 'skip':
      for (let i = 0; i < consumable.magnitude; i++) hero.gainSkipCharge()
      break
    case 'xp':
      hero.gainXp(Math.round(consumable.magnitude))
      break
    case 'resetAttrs':
      hero.resetAttributes()
      break
    case 'shield':
      useBattleStore.getState().addHeroShield(consumable.magnitude)
      break
    case 'physicalDamage':
      useBattleStore.getState().applyConsumablePhysicalDamage(consumable.magnitude)
      break
    case 'enemyDebuff':
      useBattleStore.getState().applyConsumableEnemyDebuff(
        consumable.magnitude,
        consumable.durationTurns ?? 2,
      )
      break
    case 'statBuff': {
      const buffKey = consumable.stat ? STAT_TO_BUFF[consumable.stat] : undefined
      if (!buffKey) return
      useSpellStore.getState().addConsumableBuff(
        { [buffKey]: consumable.magnitude },
        consumable.durationTurns ?? 1,
      )
      break
    }
    case 'normalizeTile':
      break
  }
}

export function tryAutoUseConsumable(now = Date.now()): ConsumableUseResult {
  if (now - lastAutoUseAt < AUTO_USE_COOLDOWN_MS) return 'blocked'

  const inventory = useInventoryStore.getState()
  for (let slot = 0; slot < inventory.quickslots.length; slot++) {
    const config = inventory.consumableAutoSlots[slot]
    if (!config?.enabled) continue

    const id = inventory.quickslots[slot]
    const consumable = id ? inventory.consumables.find(c => c.id === id) : null
    if (!consumable || !shouldAutoUseConsumable(consumable, config.threshold)) continue

    const result = useConsumableById(consumable.id)
    if (result === 'used') lastAutoUseAt = now
    return result
  }

  return 'blocked'
}

function shouldAutoUseConsumable(consumable: Consumable, threshold: number): boolean {
  const hero = useHeroStore.getState()
  const inventory = useInventoryStore.getState()
  const battle = useBattleStore.getState()
  const spell = useSpellStore.getState()
  const derived = getDerivedStats(hero.attributes, getEquipmentBonuses(inventory.equipment), hero.level)
  const battleActive = battle.phase === 'idle' || battle.phase === 'attacking'

  switch (consumable.effect) {
    case 'stamina':
      return hero.stamina / Math.max(1, derived.maxStamina) <= threshold
    case 'mana':
      return hero.mana / Math.max(1, derived.maxMana) <= threshold
    case 'shield':
      return battleActive &&
        battle.heroShield <= 0 &&
        battle.player.hp / Math.max(1, battle.player.maxHp) <= Math.max(threshold, 0.65)
    case 'statBuff':
      return battleActive &&
        battle.turn <= 1 &&
        !spell.activeBuffs.some(b => b.spellId.startsWith('consumable_'))
    case 'physicalDamage':
      return battleActive &&
        battle.enemy.hp / Math.max(1, battle.enemy.maxHp) <= threshold
    case 'enemyDebuff':
      return battleActive &&
        battle.turn <= 1 &&
        !battle.enemyStatuses.some(s => s.type === 'curse')
    case 'skip':
    case 'xp':
    case 'resetAttrs':
    case 'normalizeTile':
      return false
  }
}
