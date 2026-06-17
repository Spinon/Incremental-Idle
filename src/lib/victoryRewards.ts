import { generateItem, getItemDisplayName } from '../formulas/items'
import { useBattleStore } from '../store/battleStore'
import { useHeroStore } from '../store/heroStore'
import { useInventoryStore } from '../store/inventoryStore'
import { useMapStore } from '../store/mapStore'
import { useNotifStore } from '../store/notifStore'
import { useQuestStore } from '../store/questStore'
import { useSpellStore } from '../store/spellStore'
import type { MonsterRarity } from '../types/monster'
import type { DerivedStats } from '../types/hero'

const ARCANE_DROP_CHANCE: Partial<Record<MonsterRarity, number>> = {
  rare: 0.08,
  epic: 0.16,
  unique: 0.32,
}

const WORD_SAND_DROP_MULT: Partial<Record<MonsterRarity, number>> = {
  rare: 1,
}

const WORD_BIT_DROP_AMOUNT: Partial<Record<MonsterRarity, number>> = {
  epic: 1,
  unique: 3,
}

const RARITY_LABEL_PT: Record<string, string> = {
  common: 'Comum', uncommon: 'Incomum', rare: 'Raro',
  epic: 'Epico', set: 'Conjunto', unique: 'Unico',
}
const RARITY_LABEL_EN: Record<string, string> = {
  common: 'Common', uncommon: 'Uncommon', rare: 'Rare',
  epic: 'Epic', set: 'Set', unique: 'Unique',
}

/**
 * Everything the player earns when a battle ends in victory:
 * treasure-chest claim, quest kill hooks, tile/monster XP, weapon XP,
 * item drop and arcane word-resource rewards.
 */
export function grantVictoryRewards(derived: DerivedStats): void {
  const gainXp = useHeroStore.getState().gainXp
  const defeatedEnemy = useBattleStore.getState().enemy

  if (defeatedEnemy.monsterVariant === 'golden') {
    const pos = useMapStore.getState().playerPos
    useMapStore.getState().claimTreasureAt(pos.x, pos.y)
  }

  {
    const bs = useBattleStore.getState()
    const playerPos = useMapStore.getState().playerPos
    const monsterType = defeatedEnemy.monsterType ?? bs.enemy.monsterType ?? ''
    const questId = bs.activeEnemyQuestId
    if (questId) {
      useQuestStore.getState().onBountyDefeated(questId)
    } else {
      useQuestStore.getState().onBountyDefeatedAt(playerPos.x, playerPos.y)
    }
    useQuestStore.getState().onMonsterKill(monsterType, playerPos.x, playerPos.y)
  }

  {
    const heroLevel = useHeroStore.getState().level
    if (defeatedEnemy.level >= heroLevel - 5) {
      const doom = useBattleStore.getState().enemyStatuses.some(s => s.type === 'doom')
      gainXp(Math.round(defeatedEnemy.maxHp * (doom ? 2 : 1)), derived.xpBonus)
    }
  }

  const tileXp = useMapStore.getState().drainXp()
  if (tileXp > 0) gainXp(tileXp, derived.xpBonus)

  const monsterRewards = useMapStore.getState().drainMonsterXp()
  if (monsterRewards.length > 0) {
    const heroLevel = useHeroStore.getState().level
    for (const reward of monsterRewards) {
      if (reward.monsterLevel >= heroLevel - 5) {
        gainXp(reward.xp, derived.xpBonus)
      }
    }
  }

  useInventoryStore.getState().grantWeaponXp(
    Math.max(5, Math.round(defeatedEnemy.maxHp * 0.25 + defeatedEnemy.level * 8)),
  )

  if (Math.random() < derived.dropChance) {
    const item = generateItem(Math.max(1, defeatedEnemy.level))
    const added = useInventoryStore.getState().addItem(item)

    if (added) {
      const isUpgrade = useInventoryStore.getState().isItemUpgrade(item)
      const rarityPt = RARITY_LABEL_PT[item.rarity] ?? item.rarity
      const rarityEn = RARITY_LABEL_EN[item.rarity] ?? item.rarity

      useNotifStore.getState().push({
        title: 'Item encontrado!',
        titleEn: 'Item found!',
        body: `${rarityPt} - ${getItemDisplayName(item, false)}${isUpgrade ? ' * Upgrade!' : ''}`,
        bodyEn: `${rarityEn} - ${getItemDisplayName(item, true)}${isUpgrade ? ' * Upgrade!' : ''}`,
        rarity: item.rarity,
        scrollTo: 'equips',
        actions: isUpgrade ? [
          { label: 'Equipar', labelEn: 'Equip', kind: 'equip', payload: item.id },
          { label: 'Ver Inventario', labelEn: 'View Inventory', kind: 'scroll', payload: 'equips' },
        ] : [
          { label: 'Ver Inventario', labelEn: 'View Inventory', kind: 'scroll', payload: 'equips' },
        ],
      })
    }
  }

  const monsterRarity = defeatedEnemy.rarity as MonsterRarity | undefined
  const dropChance = monsterRarity ? ARCANE_DROP_CHANCE[monsterRarity] : undefined

  if (dropChance && Math.random() < dropChance) {
    if (monsterRarity === 'epic' || monsterRarity === 'unique') {
      const amount = WORD_BIT_DROP_AMOUNT[monsterRarity] ?? 1
      useSpellStore.getState().grantRandomWordBits(amount)

      useNotifStore.getState().push({
        title: 'Pedaço de palavra!',
        titleEn: 'Word Bit!',
        body: `+${amount} PB`,
        bodyEn: `+${amount} WB`,
        rarity: monsterRarity,
        scrollTo: 'spells',
        actions: [{ label: 'Ver Grimorio', labelEn: 'View Spellbook', kind: 'scroll', payload: 'spells' }],
      })
    } else {
      const mult = WORD_SAND_DROP_MULT[monsterRarity!] ?? 1
      const amount = Math.round((18 + defeatedEnemy.level * 3) * mult)
      useSpellStore.getState().addWordSand(amount)

      useNotifStore.getState().push({
        title: 'Areia de palavra!',
        titleEn: 'Word Sand!',
        body: `+${amount} AP`,
        bodyEn: `+${amount} WS`,
        rarity: 'rare',
        scrollTo: 'spells',
        actions: [{ label: 'Ver Grimorio', labelEn: 'View Spellbook', kind: 'scroll', payload: 'spells' }],
      })
    }
  }
}
