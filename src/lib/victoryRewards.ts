import { DROP_WORDS } from '../data/words'
import { generateItem, getItemDisplayName } from '../formulas/items'
import { useBattleStore } from '../store/battleStore'
import { useHeroStore } from '../store/heroStore'
import { useInventoryStore } from '../store/inventoryStore'
import { useMapStore } from '../store/mapStore'
import { useNotifStore } from '../store/notifStore'
import { useQuestStore } from '../store/questStore'
import { useSpellStore, getKnownWordIds } from '../store/spellStore'
import type { MonsterRarity } from '../types/monster'
import type { DerivedStats } from '../types/hero'

// Chance a monster of each rarity drops a word on defeat
const WORD_DROP_CHANCE: Partial<Record<MonsterRarity, number>> = {
  rare:   0.02,
  epic:   0.04,
  unique: 0.10,
}

// Which word rarities each monster rarity can drop (cumulative)
const WORD_DROP_POOL: Partial<Record<MonsterRarity, ReadonlyArray<'rare' | 'epic' | 'unique'>>> = {
  rare:   ['rare'],
  epic:   ['rare', 'epic'],
  unique: ['rare', 'epic', 'unique'],
}

const RARITY_LABEL_PT: Record<string, string> = {
  common: 'Comum', uncommon: 'Incomum', rare: 'Raro',
  epic: 'Épico', set: 'Conjunto', unique: 'Único',
}
const RARITY_LABEL_EN: Record<string, string> = {
  common: 'Common', uncommon: 'Uncommon', rare: 'Rare',
  epic: 'Epic', set: 'Set', unique: 'Unique',
}

/**
 * Everything the player earns when a battle ends in victory:
 * treasure-chest claim, quest kill hooks, tile/monster XP, weapon XP,
 * item drop and word drop (with notifications).
 *
 * Movement orchestration (auto-place, blue tower, next step) stays in
 * useGameLoop — this module is purely about rewards, so new reward types
 * can be added here without touching the loop.
 */
export function grantVictoryRewards(derived: DerivedStats): void {
  const gainXp   = useHeroStore.getState().gainXp
  const defeatedEnemy = useBattleStore.getState().enemy

  // ── Golden demon defeated → claim the treasure tile's chest ─────────────
  if (defeatedEnemy.monsterVariant === 'golden') {
    const pos = useMapStore.getState().playerPos
    useMapStore.getState().claimTreasureAt(pos.x, pos.y)
  }

  // ── Quest progress: kill hooks (read before reset clears questId) ───────
  {
    const bs          = useBattleStore.getState()
    const playerPos   = useMapStore.getState().playerPos
    const monsterType = defeatedEnemy.monsterType ?? bs.enemy.monsterType ?? ''
    const questId     = bs.activeEnemyQuestId
    if (questId) {
      useQuestStore.getState().onBountyDefeated(questId)
    } else {
      useQuestStore.getState().onBountyDefeatedAt(playerPos.x, playerPos.y)
    }
    useQuestStore.getState().onMonsterKill(monsterType, playerPos.x, playerPos.y)
  }

  // ── Kill XP — was granted inside BattleArena's useEffect, making XP
  // depend on the component being mounted (offline battles earned nothing).
  // Doom status doubles it. Same asymmetric anti-farm gate as boss XP.
  {
    const heroLevel = useHeroStore.getState().level
    if (defeatedEnemy.level >= heroLevel - 5) {
      const doom = useBattleStore.getState().enemyStatuses.some(s => s.type === 'doom')
      gainXp(Math.round(defeatedEnemy.maxHp * (doom ? 2 : 1)), derived.xpBonus)
    }
  }

  // ── Tile XP + monster boss XP ────────────────────────────────────────────
  const tileXp = useMapStore.getState().drainXp()
  if (tileXp > 0) gainXp(tileXp, derived.xpBonus)

  // Monster boss XP — anti-farm gate: no XP for monsters more than 5 levels
  // BELOW the hero. Beating a stronger monster always rewards XP (an upset
  // win 6+ levels up used to grant nothing, which punished skilled play).
  const monsterReward = useMapStore.getState().drainMonsterXp()
  if (monsterReward) {
    const heroLevel = useHeroStore.getState().level
    if (monsterReward.monsterLevel >= heroLevel - 5) {
      gainXp(monsterReward.xp, derived.xpBonus)
    }
  }

  // ── Weapon XP ────────────────────────────────────────────────────────────
  useInventoryStore.getState().grantWeaponXp(
    Math.max(5, Math.round(defeatedEnemy.maxHp * 0.25 + defeatedEnemy.level * 8)),
  )

  // ── Item drop ────────────────────────────────────────────────────────────
  if (Math.random() < derived.dropChance) {
    const item = generateItem(Math.max(1, defeatedEnemy.level))
    const added = useInventoryStore.getState().addItem(item)

    if (added) {
      const isUpgrade = useInventoryStore.getState().isItemUpgrade(item)
      const rarityPt  = RARITY_LABEL_PT[item.rarity] ?? item.rarity
      const rarityEn  = RARITY_LABEL_EN[item.rarity] ?? item.rarity

      useNotifStore.getState().push({
        title:    '🎁 Item encontrado!',
        titleEn:  '🎁 Item found!',
        body:     `${rarityPt} — ${getItemDisplayName(item, false)}${isUpgrade ? ' ★ Upgrade!' : ''}`,
        bodyEn:   `${rarityEn} — ${getItemDisplayName(item, true)}${isUpgrade ? ' ★ Upgrade!' : ''}`,
        rarity:   item.rarity,
        scrollTo: 'equips',
        actions:  isUpgrade ? [
          { label: 'Equipar', labelEn: 'Equip', kind: 'equip', payload: item.id },
          { label: 'Ver Inventário', labelEn: 'View Inventory', kind: 'scroll', payload: 'equips' },
        ] : [
          { label: 'Ver Inventário', labelEn: 'View Inventory', kind: 'scroll', payload: 'equips' },
        ],
      })
    }
  }

  // ── Word drop (rare+ monsters only) ─────────────────────────────────────
  const monsterRarity = defeatedEnemy.rarity as MonsterRarity | undefined
  const dropChance    = monsterRarity ? WORD_DROP_CHANCE[monsterRarity] : undefined

  if (dropChance && Math.random() < dropChance) {
    const allowedRarities = WORD_DROP_POOL[monsterRarity!]!
    const spellSt         = useSpellStore.getState()
    const heroSt          = useHeroStore.getState()
    const knownIds        = new Set(getKnownWordIds(
      heroSt.level, heroSt.attributes.inteligencia,
      heroSt.attributes.sabedoria, spellSt.earnedWordIds,
    ))

    // Filter DROP_WORDS to eligible rarities and not already known
    const candidates = DROP_WORDS.filter(
      w => allowedRarities.includes(w.rarity as 'rare' | 'epic' | 'unique')
        && !knownIds.has(w.id),
    )

    if (candidates.length > 0) {
      const word = candidates[Math.floor(Math.random() * candidates.length)]
      useSpellStore.getState().earnWord(word.id)

      const rarityPt = RARITY_LABEL_PT[word.rarity] ?? word.rarity
      const rarityEn = RARITY_LABEL_EN[word.rarity] ?? word.rarity
      useNotifStore.getState().push({
        title:    '📖 Palavra aprendida!',
        titleEn:  '📖 Word learned!',
        body:     `${rarityPt} — ${word.nameEn}${word.namePt !== word.nameEn ? ` (${word.namePt})` : ''}`,
        bodyEn:   `${rarityEn} — ${word.nameEn}`,
        rarity:   word.rarity as 'rare' | 'epic' | 'unique',
        scrollTo: 'spells',
        actions:  [{ label: 'Ver Grimório', labelEn: 'View Spellbook', kind: 'scroll', payload: 'spells' }],
      })
    }
  }
}
