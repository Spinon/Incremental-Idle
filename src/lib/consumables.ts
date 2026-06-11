import { getHeroDerived } from './heroDerived'
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

/** Cooldowns are shared per EFFECT (like per spell), not per item instance. */
export function consumableCooldownKey(effect: Consumable['effect']): string {
  return `consumable_cd_${effect}`
}

/** Remaining cooldown in battle turns for this effect (0 = ready). */
export function getConsumableCooldown(effect: Consumable['effect']): number {
  return useSpellStore.getState().cooldowns[consumableCooldownKey(effect)] ?? 0
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

  if ((consumable.cooldownTurns ?? 0) > 0 && getConsumableCooldown(consumable.effect) > 0) {
    return 'blocked'
  }

  const removed = inventory.removeConsumable(id)
  if (!removed) return 'blocked'
  applyConsumableEffect(removed)
  if ((removed.cooldownTurns ?? 0) > 0) {
    useSpellStore.getState().startConsumableCooldown(
      consumableCooldownKey(removed.effect),
      removed.cooldownTurns!,
    )
  }
  return 'used'
}

function consumableLogLabel(consumable: Consumable) {
  return { name: consumable.name, nameEn: consumable.nameEn, icon: consumable.icon }
}

// Writes a battle-log entry for consumables whose effect lives outside the
// battle store (potions, tonics, tomes). Only logs mid-battle — the log is the
// battle diary and is cleared on reset, so out-of-combat uses are skipped.
function logConsumableInBattle(consumable: Consumable, effectType: 'buff' | 'utility'): void {
  const battle = useBattleStore.getState()
  if (battle.phase !== 'idle' && battle.phase !== 'attacking') return
  battle.logSpell({
    casterName: battle.player.name,
    ...consumableLogLabel(consumable),
    effectType,
    value: 0,
  })
}

export function applyConsumableEffect(consumable: Consumable): void {
  const hero = useHeroStore.getState()
  // Effective stats (incl. weapons + buffs) — keeps potion caps consistent
  // with the maxima shown everywhere else in the game
  const derived = getHeroDerived()

  switch (consumable.effect) {
    case 'stamina':
      hero.restoreStamina(derived.maxStamina * consumable.magnitude, derived.maxStamina)
      logConsumableInBattle(consumable, 'utility')
      break
    case 'mana':
      hero.restoreMana(derived.maxMana * consumable.magnitude, derived.maxMana)
      logConsumableInBattle(consumable, 'utility')
      break
    case 'skip':
      for (let i = 0; i < consumable.magnitude; i++) hero.gainSkipCharge()
      logConsumableInBattle(consumable, 'utility')
      break
    case 'xp':
      hero.gainXp(Math.round(consumable.magnitude))
      logConsumableInBattle(consumable, 'utility')
      break
    case 'resetAttrs':
      hero.resetAttributes()
      logConsumableInBattle(consumable, 'utility')
      break
    case 'shield':
      useBattleStore.getState().addHeroShield(consumable.magnitude, consumableLogLabel(consumable))
      break
    case 'physicalDamage':
      useBattleStore.getState().applyConsumablePhysicalDamage(consumable.magnitude, consumableLogLabel(consumable))
      break
    case 'enemyDebuff':
      useBattleStore.getState().applyConsumableEnemyDebuff(
        consumable.magnitude,
        consumable.durationTurns ?? 2,
        consumableLogLabel(consumable),
      )
      break
    case 'statBuff': {
      const buffKey = consumable.stat ? STAT_TO_BUFF[consumable.stat] : undefined
      if (!buffKey) return
      useSpellStore.getState().addConsumableBuff(
        { [buffKey]: consumable.magnitude },
        consumable.durationTurns ?? 1,
      )
      logConsumableInBattle(consumable, 'buff')
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
    if (result === 'used') {
      lastAutoUseAt = now
      return result
    }
    if (result === 'pending') return result
    // 'blocked' → keep trying the remaining quickslots this tick
  }

  return 'blocked'
}

function shouldAutoUseConsumable(consumable: Consumable, threshold: number): boolean {
  const hero = useHeroStore.getState()
  const battle = useBattleStore.getState()
  const spell = useSpellStore.getState()
  const derived = getHeroDerived()
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
