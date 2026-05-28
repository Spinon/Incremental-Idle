import { useEffect, useRef } from 'react'
import { useBattleStore } from '../store/battleStore'
import { useHeroStore } from '../store/heroStore'
import { useMapStore } from '../store/mapStore'
import { useInventoryStore } from '../store/inventoryStore'
import { useNotifStore } from '../store/notifStore'
import { useSpellStore } from '../store/spellStore'
import { getDerivedStats, getBaseSpeed } from '../formulas/derived'
import { generateItem, getEquipmentBonuses } from '../formulas/items'
import type { Phase } from '../store/battleStore'

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

  useEffect(() => {
    const id = setInterval(() => {
      const speed   = useBattleStore.getState().speed
      const attrs   = useHeroStore.getState().attributes
      const derived = getDerivedStats(attrs)

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

      if (scene === 'map' && prevPhase.current !== 'over' && phase === 'over') {
        const winner = useBattleStore.getState().winner

        if (winner === 'enemy') {
          // ── Defeat: snapshot who killed us, then force player home ────────
          useBattleStore.getState().captureDefeat()
          useMapStore.getState().handleDefeat()
        } else {
          // ── Victory: advance, rewards, drops ────────────────────────────
          // Guarantee one cooldown tick even for instant kills — when the enemy
          // dies on the first hit, switchAttacker() never fires, turn stays at 0,
          // and the normal turn-diff check never triggers onBattleTurn again.
          useSpellStore.getState().onBattleTurn()
          // Reset prevTurn so turn=0 of the next battle fires a fresh tick.
          prevTurn.current = -1

          useSpellStore.getState().clearEnemyDebuff()

          useMapStore.getState().moveOneStep(useHeroStore.getState().level)

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
                body:     `${rarityPt} — ${item.name}${isUpgrade ? ' ★ Upgrade!' : ''}`,
                bodyEn:   `${rarityEn} — ${item.name}${isUpgrade ? ' ★ Upgrade!' : ''}`,
                rarity:   item.rarity,
                scrollTo: 'inventory-panel',
                actions:  isUpgrade ? [
                  { label: 'Equipar', labelEn: 'Equip', kind: 'equip', payload: item.id },
                  { label: 'Ver Inventário', labelEn: 'View Inventory', kind: 'scroll', payload: 'inventory-panel' },
                ] : [
                  { label: 'Ver Inventário', labelEn: 'View Inventory', kind: 'scroll', payload: 'inventory-panel' },
                ],
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
