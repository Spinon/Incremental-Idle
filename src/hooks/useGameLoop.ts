import { useCallback, useEffect, useRef, useState } from 'react'
import { useBattleStore } from '../store/battleStore'
import { useHeroStore } from '../store/heroStore'
import { useMapStore } from '../store/mapStore'
import { useInventoryStore } from '../store/inventoryStore'
import { useNotifStore } from '../store/notifStore'
import { useSpellStore, getKnownWordIds } from '../store/spellStore'
import { useQuestStore } from '../store/questStore'
import { CLOUD_ACCEPTED_REMOTE_UPDATED_AT_KEY, CLOUD_RESTORE_OFFLINE_PENDING_KEY, OFFLINE_LAST_ACTIVE_KEY, SAVE_KEYS } from '../store/save'
import { useCloudSaveStore } from '../store/cloudSaveStore'
import { getBaseSpeed } from '../formulas/derived'
import { generateItem, getEquipmentBonuses, getItemDisplayName } from '../formulas/items'
import { getEffectiveDerivedStatsFromBonuses } from '../formulas/effectiveStats'
import { WEAPON_MATERIAL_LABELS } from '../formulas/weapons'
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

const STEP_MS = 200
const SYNC_PROMPT_MS = 30 * 1000
const OFFLINE_STEP_MS = 5 * 1000
const SYNC_CHUNK_STEPS = 240
const MID_FIGHT_KEY = 'ii-mid-fight'
const OFFLINE_SYNC_SNAPSHOT_KEY = 'incremental-idle-offline-sync-snapshot'
const OFFLINE_SYNC_PENDING_KEY = 'incremental-idle-offline-sync-pending'

const PERSISTED_STATE_KEYS = [
  ...Object.values(SAVE_KEYS),
  MID_FIGHT_KEY,
] as const

type OfflineSyncStatus = 'idle' | 'running' | 'ready'

export interface OfflineSyncState {
  status: OfflineSyncStatus
  elapsedMs: number
  processedMs: number
}

interface RunStepOptions {
  offline?: boolean
}

interface SimulationContext {
  offline: boolean
}

type BlockingSystemHandler = (context: SimulationContext) => boolean

function resolveBattleSimulation({ offline }: SimulationContext): boolean {
  if (!offline) return false
  if (useMapStore.getState().scene !== 'map') return false
  const phase = useBattleStore.getState().phase
  if (phase !== 'idle' && phase !== 'attacking') return false

  useBattleStore.getState().skipBattle()
  return true
}

const BLOCKING_SYSTEM_HANDLERS: BlockingSystemHandler[] = [
  resolveBattleSimulation,
]

function readLastActiveAt(): number | null {
  const raw = localStorage.getItem(OFFLINE_LAST_ACTIVE_KEY)
  if (!raw) return null
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? value : null
}

function writeLastActiveAt(now = Date.now()) {
  localStorage.setItem(OFFLINE_LAST_ACTIVE_KEY, String(now))
}

function snapshotPersistedState(): Record<string, string | null> {
  const snapshot: Record<string, string | null> = {}
  for (const key of PERSISTED_STATE_KEYS) {
    snapshot[key] = localStorage.getItem(key)
  }
  return snapshot
}

function restorePersistedState(snapshot: Record<string, string | null>) {
  for (const [key, value] of Object.entries(snapshot)) {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  }
}

function beginOfflineTransaction(snapshot: Record<string, string | null>) {
  localStorage.setItem(OFFLINE_SYNC_SNAPSHOT_KEY, JSON.stringify(snapshot))
  localStorage.setItem(OFFLINE_SYNC_PENDING_KEY, '1')
}

function clearOfflineTransaction() {
  localStorage.removeItem(OFFLINE_SYNC_SNAPSHOT_KEY)
  localStorage.removeItem(OFFLINE_SYNC_PENDING_KEY)
}

function restoreInterruptedOfflineTransaction(): boolean {
  if (localStorage.getItem(OFFLINE_SYNC_PENDING_KEY) !== '1') return false

  const raw = localStorage.getItem(OFFLINE_SYNC_SNAPSHOT_KEY)
  clearOfflineTransaction()

  if (!raw) return false
  try {
    const snapshot = JSON.parse(raw) as Record<string, string | null>
    restorePersistedState(snapshot)
    writeLastActiveAt()
    return true
  } catch {
    writeLastActiveAt()
    return false
  }
}

export function useGameLoop(paused = false) {
  const setSpeed      = useBattleStore((s) => s.setSpeed)
  const tickResources = useHeroStore((s) => s.tickResources)
  const gainXp        = useHeroStore((s) => s.gainXp)
  const earnGold      = useHeroStore((s) => s.earnGold)
  const prevPhase     = useRef<Phase>('idle')
  const prevTurn      = useRef<number>(-1)
  const prevScene     = useRef<string>('map')
  const battleResolveAt = useRef<number | null>(null)
  const syncSnapshot  = useRef<Record<string, string | null> | null>(null)
  const syncActive    = useRef(false)
  const syncActions   = useRef({ accept: () => {}, discard: () => {} })
  const pausedRef     = useRef(paused)
  const [offlineSync, setOfflineSync] = useState<OfflineSyncState>({
    status: 'idle',
    elapsedMs: 0,
    processedMs: 0,
  })
  const [startupReady, setStartupReady] = useState(false)

  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  useEffect(() => {
    function collectWeaponMaterials() {
      const drops = useMapStore.getState().drainWeaponMaterials()
      for (const drop of drops) {
        useInventoryStore.getState().addWeaponMaterial(drop.tier, drop.count)
        useNotifStore.getState().push({
          title:    'Material de forja!',
          titleEn:  'Forge material!',
          body:     `${WEAPON_MATERIAL_LABELS.pt} T${drop.tier} x${drop.count}`,
          bodyEn:   `${WEAPON_MATERIAL_LABELS.en} T${drop.tier} x${drop.count}`,
          rarity:   drop.tier >= 4 ? 'epic' : drop.tier >= 2 ? 'rare' : 'uncommon',
          scrollTo: 'equips',
          actions:  [{ label: 'Ver Armas', labelEn: 'View Weapons', kind: 'scroll', payload: 'equips' }],
        })
      }
    }

    function advanceBlockingSystems(options: RunStepOptions) {
      const context: SimulationContext = { offline: !!options.offline }
      for (const handler of BLOCKING_SYSTEM_HANDLERS) handler(context)
    }

    function ensureCurrentTileEncounter() {
      if (useMapStore.getState().scene !== 'map') return
      if (useBattleStore.getState().phase !== 'empty') return
      useMapStore.getState().processMarketExitTile()
      prevTurn.current = -1
    }

    const runStep = (deltaMs: number, options: RunStepOptions = {}) => {
      if (pausedRef.current && !options.offline) return
      advanceBlockingSystems(options)

      const speed    = useBattleStore.getState().speed
      const attrs    = useHeroStore.getState().attributes
      const heroLvl  = useHeroStore.getState().level
      const inv      = useInventoryStore.getState()
      const equip    = getEquipmentBonuses(inv.equipment)
      const derived  = getEffectiveDerivedStatsFromBonuses(
        attrs,
        equip,
        heroLvl,
        inv.weaponProgress,
        inv.equippedWeapons,
        useSpellStore.getState().activeBuffs,
      )

      tickResources(deltaMs, speed, derived)
      useSpellStore.getState().tick(deltaMs / 1000)

      const turn     = useBattleStore.getState().turn
      const attacker = useBattleStore.getState().attacker
      const battlePhase = useBattleStore.getState().phase
      if ((battlePhase === 'idle' || battlePhase === 'attacking') && turn !== prevTurn.current) {
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
      useMapStore.getState().tickMap(deltaMs, derived.moveSpeed, maxDeck, derived.vision, heroLevel)

      // Drain treasure XP and monster gold
      const xp = useMapStore.getState().drainXp()
      if (xp > 0) gainXp(xp, derived.xpBonus)
      const gold = useMapStore.getState().drainGold()
      if (gold > 0) earnGold(gold)
      collectWeaponMaterials()

      // Battle-end handling — always track phase, react only in map scene
      const phase = useBattleStore.getState().phase
      const scene = useMapStore.getState().scene

      // ── Market exit detection ─────────────────────────────────────────────
      // processMarketExitTile() marks the exit tile as explored, grants any
      // first-encounter rewards, and starts the correct enemy (including the
      // tile-based stealth buff via tilesPlaced).  This also fixes the bug
      // where market exits left the exit tile permanently unexplored.
      if (prevScene.current === 'market' && scene === 'map') {
        useBattleStore.getState().reset()
        useMapStore.getState().processMarketExitTile()
        const tileXp2 = useMapStore.getState().drainXp()
        if (tileXp2 > 0) gainXp(tileXp2, derived.xpBonus)
        const gold2 = useMapStore.getState().drainGold()
        if (gold2 > 0) earnGold(gold2)
        collectWeaponMaterials()
        prevTurn.current = -1
      }
      prevScene.current = scene

      ensureCurrentTileEncounter()

      if (!options.offline && scene === 'map' && phase === 'over') {
        if (battleResolveAt.current === null) {
          battleResolveAt.current = performance.now() + 1800 / Math.max(0.1, useBattleStore.getState().speed)
        }
        if (performance.now() < battleResolveAt.current) return
      } else if (phase !== 'over') {
        battleResolveAt.current = null
      }

      if (scene === 'map' && prevPhase.current !== 'over' && phase === 'over') {
        battleResolveAt.current = null
        const winner = useBattleStore.getState().winner
        let resolvedBlockingSystem = false

        if (winner === 'enemy') {
          // ── Defeat: snapshot who killed us, then force player home ────────
          useBattleStore.getState().captureDefeat(
            useHeroStore.getState().level,
            useMapStore.getState().tilesPlaced,
          )
          useMapStore.getState().handleDefeat()
          resolvedBlockingSystem = true
        } else {
          // ── Victory: advance, rewards, drops ────────────────────────────
          if (useBattleStore.getState().attacker !== 'enemy') {
            useSpellStore.getState().onBattleTurn()
          }
          prevTurn.current = -1
          useSpellStore.getState().clearEnemyDebuff()
          const defeatedEnemy = useBattleStore.getState().enemy

          // ── Quest progress: kill hooks (read before reset clears questId) ──
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
            const inv2       = useInventoryStore.getState()
            const equip2     = getEquipmentBonuses(inv2.equipment)
            const d2         = getEffectiveDerivedStatsFromBonuses(
              attrs2,
              equip2,
              heroLv,
              inv2.weaponProgress,
              inv2.equippedWeapons,
              useSpellStore.getState().activeBuffs,
            )
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
          if (tileXp > 0) gainXp(tileXp, derived.xpBonus)

          // Monster boss XP — only granted if enemy is within ±5 hero levels
          const monsterReward = useMapStore.getState().drainMonsterXp()
          if (monsterReward) {
            const heroLevel = useHeroStore.getState().level
            if (Math.abs(heroLevel - monsterReward.monsterLevel) <= 5) {
              gainXp(monsterReward.xp, derived.xpBonus)
            }
          }

          useInventoryStore.getState().grantWeaponXp(
            Math.max(5, Math.round(defeatedEnemy.maxHp * 0.25 + defeatedEnemy.level * 8)),
          )

          // Item drop
          const heroAttrs = useHeroStore.getState().attributes
          const inv3      = useInventoryStore.getState()
          const equip     = getEquipmentBonuses(inv3.equipment)
          const dropDerived = getEffectiveDerivedStatsFromBonuses(
            heroAttrs,
            equip,
            useHeroStore.getState().level,
            inv3.weaponProgress,
            inv3.equippedWeapons,
            useSpellStore.getState().activeBuffs,
          )
          if (Math.random() < dropDerived.dropChance) {
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

          // Word drop (rare+ monsters only)
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
          const activatedBlueTower = useMapStore.getState().activatePendingBlueTower()
          if (!activatedBlueTower) {
            useMapStore.getState().moveOneStep(useHeroStore.getState().level)
            const nextPhase = useBattleStore.getState().phase
            const nextScene = useMapStore.getState().scene
            if (nextScene === 'map' && nextPhase !== 'idle' && nextPhase !== 'attacking') {
              useMapStore.getState().processMarketExitTile()
            }
          }

          resolvedBlockingSystem = true
        }

        if (options.offline && resolvedBlockingSystem) {
          useBattleStore.getState().reset()
          prevTurn.current = -1
          prevPhase.current = 'empty'
          return
        }
      }

      // Always update prevPhase — avoids stale 'over' when returning from home
      prevPhase.current = phase
    }

    let cancelled = false
    let lastTickAt = performance.now()
    let lastActiveWriteAt = performance.now()
    let lagMs = 0
    let startupOfflineChecked = false
    let startupReloading = false

    function startOfflineSync(elapsedMs: number) {
      if (syncActive.current || elapsedMs < STEP_MS) return

      const totalMs = Math.floor(elapsedMs / STEP_MS) * STEP_MS
      if (totalMs <= 0) return

      syncActive.current = true
      syncSnapshot.current = snapshotPersistedState()
      beginOfflineTransaction(syncSnapshot.current)
      lagMs = 0

      let processedMs = 0
      setOfflineSync({
        status: 'running',
        elapsedMs: totalMs,
        processedMs: 0,
      })

      function processChunk() {
        if (cancelled || !syncActive.current) return

        let steps = 0
        let remainingMs = totalMs - processedMs

        while (remainingMs > 0 && steps < SYNC_CHUNK_STEPS && processedMs < totalMs) {
          const deltaMs = Math.min(OFFLINE_STEP_MS, remainingMs)
          runStep(deltaMs, { offline: true })
          processedMs += deltaMs
          remainingMs = totalMs - processedMs
          steps += 1
        }

        if (processedMs >= totalMs) {
          setOfflineSync({
            status: 'ready',
            elapsedMs: totalMs,
            processedMs,
          })
          writeLastActiveAt()
          lastTickAt = performance.now()
          return
        }

        setOfflineSync({
          status: 'running',
          elapsedMs: totalMs,
          processedMs,
        })
        window.setTimeout(processChunk, 0)
      }

      window.setTimeout(processChunk, 0)
    }

    function checkStartupOffline() {
      if (startupOfflineChecked || pausedRef.current) return
      startupOfflineChecked = true

      if (restoreInterruptedOfflineTransaction()) {
        startupReloading = true
        window.location.reload()
        return
      }

      const savedAt = readLastActiveAt()
      const startupElapsedMs = savedAt ? Date.now() - savedAt : 0
      if (startupElapsedMs >= SYNC_PROMPT_MS) {
        startOfflineSync(startupElapsedMs)
      } else {
        localStorage.removeItem(CLOUD_RESTORE_OFFLINE_PENDING_KEY)
        writeLastActiveAt()
        setStartupReady(true)
      }

      lastTickAt = performance.now()
      lastActiveWriteAt = lastTickAt
    }

    syncActions.current = {
      accept: () => {
        syncActive.current = false
        syncSnapshot.current = null
        clearOfflineTransaction()
        lagMs = 0
        lastTickAt = performance.now()
        writeLastActiveAt()
        ensureCurrentTileEncounter()
        if (localStorage.getItem(CLOUD_RESTORE_OFFLINE_PENDING_KEY) === '1') {
          localStorage.removeItem(CLOUD_RESTORE_OFFLINE_PENDING_KEY)
          useCloudSaveStore.getState().pushLocalSave(true)
        }
        setStartupReady(true)
        setOfflineSync({ status: 'idle', elapsedMs: 0, processedMs: 0 })
      },
      discard: () => {
        if (syncSnapshot.current) {
          restorePersistedState(syncSnapshot.current)
        }
        localStorage.removeItem(CLOUD_ACCEPTED_REMOTE_UPDATED_AT_KEY)
        localStorage.removeItem(CLOUD_RESTORE_OFFLINE_PENDING_KEY)
        clearOfflineTransaction()
        writeLastActiveAt()
        window.location.reload()
      },
    }

    function pump() {
      if (syncActive.current) return
      if (document.hidden) return

      const now = performance.now()
      if (pausedRef.current) {
        lastTickAt = now
        lagMs = 0
        return
      }
      checkStartupOffline()
      if (startupReloading || syncActive.current || !startupOfflineChecked) return
      const elapsedMs = now - lastTickAt
      lastTickAt = now

      if (elapsedMs >= SYNC_PROMPT_MS) {
        startOfflineSync(elapsedMs)
        return
      }

      lagMs += Math.max(0, elapsedMs)

      while (lagMs >= STEP_MS) {
        runStep(STEP_MS)
        lagMs -= STEP_MS
      }

      if (now - lastActiveWriteAt >= 5000) {
        writeLastActiveAt()
        lastActiveWriteAt = now
      }
    }

    function pumpOnResume() {
      pump()
    }

    const id = setInterval(pump, STEP_MS)
    checkStartupOffline()

    window.addEventListener('focus', pumpOnResume)
    document.addEventListener('visibilitychange', pumpOnResume)

    return () => {
      cancelled = true
      clearInterval(id)
      window.removeEventListener('focus', pumpOnResume)
      document.removeEventListener('visibilitychange', pumpOnResume)
    }
  }, [tickResources, setSpeed, gainXp, earnGold])

  const acceptOfflineProgress = useCallback(() => {
    syncActions.current.accept()
  }, [])

  const discardOfflineProgress = useCallback(() => {
    syncActions.current.discard()
  }, [])

  return { offlineSync, startupReady, acceptOfflineProgress, discardOfflineProgress }
}
