import { useEffect, useRef } from 'react'
import { useBattleStore } from '../store/battleStore'
import { useHeroStore } from '../store/heroStore'
import { useMapStore } from '../store/mapStore'
import { useInventoryStore } from '../store/inventoryStore'
import { useNotifStore } from '../store/notifStore'
import { useSpellStore, getKnownWordIds } from '../store/spellStore'
import { useQuestStore } from '../store/questStore'
import { getDerivedStats, getBaseSpeed } from '../formulas/derived'
import { generateItem, getEquipmentBonuses, getItemDisplayName } from '../formulas/items'
import { DROP_WORDS } from '../data/words'
import type { Phase } from '../store/battleStore'
import type { MonsterRarity } from '../types/monster'

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

const TICK_MS = 200

export function useGameLoop() {
  const setSpeed      = useBattleStore((s) => s.setSpeed)
  const tickResources = useHeroStore((s) => s.tickResources)
  const gainXp        = useHeroStore((s) => s.gainXp)
  const earnGold      = useHeroStore((s) => s.earnGold)
  const prevPhase     = useRef<Phase>('idle')
  const prevTurn      = useRef<number>(-1)
  const prevScene     = useRef<string>('map')

  useEffect(() => {
    const id = setInterval(() => {
      const speed    = useBattleStore.getState().speed
      const attrs    = useHeroStore.getState().attributes
      const heroLvl  = useHeroStore.getState().level
      const derived  = getDerivedStats(attrs, undefined, heroLvl)

      tickResources(TICK_MS, speed)
      useSpellStore.getState().tick(TICK_MS / 1000)

      const turn     = useBattleStore.getState().turn
      const attacker = useBattleStore.getState().attacker
      if (turn !== prevTurn.current) {
        prevTurn.current = turn
        // Cooldowns only tick at the end of the player's turn
        // (switchAttacker just ran → attacker is now 'enemy')
        if (attacker === 'enemy') {
          useSpellStore.getState().onBattleTurn()
          // Elemental DoTs (burn, poison) and regen tick every turn
          useBattleStore.getState().tickStatuses()
        }
      }

      if (useHeroStore.getState().stamina <= 0 && speed > 1) {
        const bs = getBaseSpeed(derived)
        setSpeed(bs)
      }

      const maxDeck   = Math.min(8, 3 + Math.floor(derived.vision / 50))
      const heroLevel = useHeroStore.getState().level
      useMapStore.getState().tickMap(TICK_MS, derived.moveSpeed, maxDeck, derived.vision, heroLevel)

      // Drain treasure XP and monster gold
      const xp = useMapStore.getState().drainXp()
      if (xp > 0) gainXp(xp)
      const gold = useMapStore.getState().drainGold()
      if (gold > 0) earnGold(gold)

      // Battle-end handling — always track phase, react only in map scene
      const phase = useBattleStore.getState().phase
      const scene = useMapStore.getState().scene

      // ── Market exit detection ─────────────────────────────────────────────
      // processMarketExitTile() marks the exit tile as explored, grants any
      // first-encounter rewards, and queues the correct enemy (including the
      // tile-based stealth buff via tilesPlaced).  This also fixes the bug
      // where market exits left the exit tile permanently unexplored.
      if (prevScene.current === 'market' && scene === 'map') {
        useMapStore.getState().processMarketExitTile()
        const tileXp2 = useMapStore.getState().drainXp()
        if (tileXp2 > 0) gainXp(tileXp2)
        const gold2 = useMapStore.getState().drainGold()
        if (gold2 > 0) earnGold(gold2)
        useBattleStore.getState().reset()
        prevTurn.current = -1
      }
      prevScene.current = scene

      if (scene === 'map' && prevPhase.current !== 'over' && phase === 'over') {
        const winner = useBattleStore.getState().winner

        if (winner === 'enemy') {
          // ── Defeat: snapshot who killed us, then force player home ────────
          useBattleStore.getState().captureDefeat(
            useHeroStore.getState().level,
            useMapStore.getState().tilesPlaced,
          )
          useMapStore.getState().handleDefeat()
        } else {
          // ── Victory: advance, rewards, drops ────────────────────────────
          useSpellStore.getState().onBattleTurn()
          prevTurn.current = -1
          useSpellStore.getState().clearEnemyDebuff()

          // ── Quest progress: kill hooks (read before reset clears questId) ──
          {
            const bs          = useBattleStore.getState()
            const playerPos   = useMapStore.getState().playerPos
            const monsterType = bs.enemy.monsterType ?? ''
            const questId     = bs.nextEnemyQuestId
            if (questId) {
              useQuestStore.getState().onBountyDefeated(questId)
            }
            useQuestStore.getState().onMonsterKill(monsterType, playerPos.x, playerPos.y)
          }

          useMapStore.getState().moveOneStep(useHeroStore.getState().level)

          // ── Auto-place tiles (Full Auto mode only) ──────────────────────
          if (useMapStore.getState().autoExplore === 'full') {
            const heroLv   = useHeroStore.getState().level
            const riskMode = useMapStore.getState().riskMode

            // In safe mode only place tiles the hero can actually path to
            // (within the level cap).  In risk mode place any tile so the
            // deck is consumed even for above-level zones.
            const maxTileLv = riskMode ? undefined : heroLv
            while (useMapStore.getState().tryAutoPlace(maxTileLv)) { /* */ }

            // Truly stuck: deck is full AND no tile of ANY level can be
            // placed (map is geometrically enclosed, not just level-capped).
            const afterPlace = useMapStore.getState()
            const attrs2     = useHeroStore.getState().attributes
            const d2         = getDerivedStats(attrs2, undefined, heroLv)
            const maxDk      = Math.min(8, 3 + Math.floor(d2.vision / 50))
            if (
              afterPlace.scene === 'map' &&
              afterPlace.deck.length >= maxDk &&
              !afterPlace.canAutoPlace()          // no tile fits at all → enclosed
            ) {
              useMapStore.getState().handleStuck()
            }
          }

          const tileXp = useMapStore.getState().drainXp()
          if (tileXp > 0) gainXp(tileXp)

          // Monster boss XP — only granted if enemy is within ±5 hero levels
          const monsterReward = useMapStore.getState().drainMonsterXp()
          if (monsterReward) {
            const heroLevel = useHeroStore.getState().level
            if (Math.abs(heroLevel - monsterReward.monsterLevel) <= 5) {
              gainXp(monsterReward.xp)
            }
          }

          // Item drop
          const heroAttrs = useHeroStore.getState().attributes
          const equip     = getEquipmentBonuses(useInventoryStore.getState().equipment)
          const derived   = getDerivedStats(heroAttrs, equip)
          if (Math.random() < derived.dropChance) {
            const enemyLevel = useBattleStore.getState().enemy.level
            const item = generateItem(Math.max(1, enemyLevel))
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

          // Word drop (rare+ monsters only)
          const enemy         = useBattleStore.getState().enemy
          const monsterRarity = enemy.rarity as MonsterRarity | undefined
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
      }

      // Always update prevPhase — avoids stale 'over' when returning from home
      prevPhase.current = phase
    }, TICK_MS)

    return () => clearInterval(id)
  }, [tickResources, setSpeed, gainXp, earnGold])
}
