import { useCallback, useEffect, useRef, useState } from 'react'
import { useBattleStore } from '../store/battleStore'
import { useHeroStore } from '../store/heroStore'
import { useMapStore } from '../store/mapStore'
import { useInventoryStore } from '../store/inventoryStore'
import { useNotifStore } from '../store/notifStore'
import { useSpellStore } from '../store/spellStore'
import {
  CLOUD_ACCEPTED_REMOTE_UPDATED_AT_KEY,
  CLOUD_RESTORE_OFFLINE_PENDING_KEY,
  OFFLINE_LAST_ACTIVE_KEY,
  SAVE_KEYS,
  beginDeferredPersistWrites,
  endDeferredPersistWrites,
} from '../store/save'
import { useCloudSaveStore } from '../store/cloudSaveStore'
import { requestCriticalCloudSave } from '../lib/cloudAutosave'
import { tryAutoUseConsumable } from '../lib/consumables'
import { tickChestOpening } from '../lib/chestOpening'
import { getHeroDerived } from '../lib/heroDerived'
import { grantVictoryRewards } from '../lib/victoryRewards'
import { getBaseSpeed, getMaxDeck } from '../formulas/derived'
import { usePartyStore } from '../store/partyStore'
import { WEAPON_MATERIAL_LABELS } from '../formulas/weapons'
import type { Phase } from '../store/battleStore'

const STEP_MS = 200
const SYNC_PROMPT_MS = 30 * 1000
const OFFLINE_STEP_MS = 5 * 1000
// Offline catch-up is capped at 24h: longer absences simulate only the last
// day, so the player isn't punished for being away and the sim stays bounded.
const OFFLINE_MAX_MS = 24 * 60 * 60 * 1000
const SYNC_CHUNK_STEPS = 500
const SYNC_CHUNK_BUDGET_MS = 40
const SYNC_PROGRESS_UPDATE_MS = 200
const AUTO_PLACE_MAX_PER_STEP = 32
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

// Interiors normally leave through real-time UI timers (market/tower 6s, house
// 10s), which would stall the offline catch-up for their full real duration.
// In simulation, resolve them instantly through the same exit paths the timers
// use.
function resolveInteriorSimulation({ offline }: SimulationContext): boolean {
  if (!offline) return false
  const scene = useMapStore.getState().scene

  if (scene === 'market') {
    // MarketInterior auto-sells on entry; keep that so offline runs with
    // auto-sell builds don't fill the inventory and block drops.
    const gold = useInventoryStore.getState().performAutoSell()
    if (gold > 0) useHeroStore.getState().earnGold(gold)
    useMapStore.getState().exitMarket()
    return true
  }

  if (scene === 'tower') {
    useMapStore.getState().autoExitBlueTower()
    return true
  }

  if (scene === 'home') {
    // Same condition as HouseInterior's auto-restart: only after defeat or
    // stuck. A hero sent home manually stays home, like online.
    const map = useMapStore.getState()
    if (!map.defeatPending && !map.stuckPending) return false
    useBattleStore.getState().reset()
    map.resetMap(useHeroStore.getState().level)
    useMapStore.getState().leaveScene()
    return true
  }

  return false
}

const BLOCKING_SYSTEM_HANDLERS: BlockingSystemHandler[] = [
  resolveInteriorSimulation,
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
  const notifPausedForOffline = useRef(false)
  const persistDeferredForOffline = useRef(false)
  // Ref (not effect-local) so StrictMode's dev remount doesn't re-run the
  // startup check and mistake the transaction the first mount just began for
  // an interrupted one from a previous page load.
  const startupOfflineChecked = useRef(false)
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
      const chests = useMapStore.getState().drainChests()
      for (const chest of chests) {
        useInventoryStore.getState().addChest(chest)
        useNotifStore.getState().push({
          title:    'Baú encontrado!',
          titleEn:  'Chest found!',
          body:     `Baú Lv.${chest.level} (${chest.rarity})`,
          bodyEn:   `Chest Lv.${chest.level} (${chest.rarity})`,
          rarity:   chest.rarity,
          scrollTo: 'equips',
          actions:  [{ label: 'Ver Inventário', labelEn: 'View Inventory', kind: 'scroll', payload: 'equips' }],
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
      const derived  = getHeroDerived()

      tickResources(deltaMs, speed, derived)
      useSpellStore.getState().tick(deltaMs / 1000)
      tickChestOpening(deltaMs, derived)
      if (!options.offline) tryAutoUseConsumable()

      const turn     = useBattleStore.getState().turn
      const attacker = useBattleStore.getState().attacker
      const battlePhase = useBattleStore.getState().phase
      if ((battlePhase === 'idle' || battlePhase === 'attacking') && turn !== prevTurn.current) {
        prevTurn.current = turn
        // Cooldowns only tick at the end of the player's turn
        // (switchAttacker just ran → attacker is now 'enemy')
        if (attacker === 'enemy') {
          useSpellStore.getState().onBattleTurn()
          // Elemental DoTs (burn, poison) and regen tick once per full round
          // (only when the turn passes to the enemy) — same cadence as skipBattle
          useBattleStore.getState().tickStatuses()
        }
      }

      if (useHeroStore.getState().stamina <= 0 && speed > 1) {
        const bs = getBaseSpeed(derived)
        setSpeed(bs)
      }

      const maxDeck   = getMaxDeck(derived.vision)
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
          useSpellStore.getState().onBattleEnd()
          resolvedBlockingSystem = true
        } else {
          // ── Victory: advance, rewards, drops ────────────────────────────
          if (useBattleStore.getState().attacker !== 'enemy') {
            useSpellStore.getState().onBattleTurn()
          }
          prevTurn.current = -1
          useSpellStore.getState().clearEnemyDebuff()
          const rescuedNpc = useMapStore.getState().drainNpcRecruit()
          if (rescuedNpc) usePartyStore.getState().addRecruitOffer(rescuedNpc)

          // Chest claim, quest kill hooks, tile/monster XP, weapon XP,
          // item drop and word drop all live in the rewards pipeline.
          grantVictoryRewards(derived)
          useSpellStore.getState().onBattleEnd()

          // ── Auto-place tiles (Full Auto mode only) ──────────────────────
          if (useMapStore.getState().autoExplore === 'full') {
            const heroLv   = useHeroStore.getState().level
            const riskMode = useMapStore.getState().riskMode

            // In safe mode only place tiles the hero can actually path to
            // (within the level cap).  In risk mode place any tile so the
            // deck is consumed even for above-level zones.
            const maxTileLv = riskMode ? undefined : heroLv
            let autoPlaced = 0
            while (
              autoPlaced < AUTO_PLACE_MAX_PER_STEP &&
              useMapStore.getState().tryAutoPlace(maxTileLv)
            ) {
              autoPlaced += 1
            }

            // Truly stuck: deck is full AND no tile of ANY level can be
            // placed (map is geometrically enclosed, not just level-capped).
            const afterPlace = useMapStore.getState()
            const d2         = getHeroDerived()
            const maxDk      = getMaxDeck(d2.vision)
            if (
              afterPlace.scene === 'map' &&
              afterPlace.deck.length >= maxDk &&
              !afterPlace.canAutoPlace()          // no tile fits at all → enclosed
            ) {
              useMapStore.getState().handleStuck()
            }
          }

          usePartyStore.getState().simulateExplorersAfterPlayerVictory()
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

        // Skip during offline simulation: each victory would write
        // localStorage and schedule cloud pushes mid-simulation.
        if (resolvedBlockingSystem && !options.offline) {
          requestCriticalCloudSave()
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

    let lastTickAt = performance.now()
    let lastActiveWriteAt = performance.now()
    let lagMs = 0
    let startupReloading = false

    function pauseNotifsForOffline() {
      if (notifPausedForOffline.current) return
      notifPausedForOffline.current = true
      useNotifStore.getState().setPaused(true)
    }

    function resumeNotifsAfterOffline() {
      if (!notifPausedForOffline.current) return
      notifPausedForOffline.current = false
      useNotifStore.getState().setPaused(false)
    }

    function deferPersistForOffline() {
      if (persistDeferredForOffline.current) return
      persistDeferredForOffline.current = true
      beginDeferredPersistWrites()
    }

    function finishDeferredPersistForOffline(flush: boolean) {
      if (!persistDeferredForOffline.current) return
      persistDeferredForOffline.current = false
      endDeferredPersistWrites({ flush })
    }

    function startOfflineSync(elapsedMs: number) {
      if (syncActive.current || elapsedMs < STEP_MS) return

      const cappedMs = Math.min(elapsedMs, OFFLINE_MAX_MS)
      const totalMs = Math.floor(cappedMs / STEP_MS) * STEP_MS
      if (totalMs <= 0) return

      syncActive.current = true
      deferPersistForOffline()
      pauseNotifsForOffline()
      syncSnapshot.current = snapshotPersistedState()
      beginOfflineTransaction(syncSnapshot.current)
      lagMs = 0

      let processedMs = 0
      let lastProgressPushedAt = 0
      setOfflineSync({
        status: 'running',
        elapsedMs: totalMs,
        processedMs: 0,
      })

      // MessageChannel instead of setTimeout(0): nested timeouts get clamped
      // to ~4ms by the browser, which wasted a large share of each chunk slot.
      const chunkChannel = new MessageChannel()
      chunkChannel.port1.onmessage = () => processChunk()
      const scheduleNextChunk = () => chunkChannel.port2.postMessage(0)

      function processChunk() {
        // Tied to syncActive (a ref) rather than the effect lifecycle: the
        // chunk chain must survive StrictMode's dev remount mid-simulation.
        if (!syncActive.current) return

        try {
          let steps = 0
          let remainingMs = totalMs - processedMs
          const chunkStartedAt = performance.now()

          while (
            remainingMs > 0 &&
            steps < SYNC_CHUNK_STEPS &&
            processedMs < totalMs &&
            (steps === 0 || performance.now() - chunkStartedAt < SYNC_CHUNK_BUDGET_MS)
          ) {
            const deltaMs = Math.min(OFFLINE_STEP_MS, remainingMs)
            runStep(deltaMs, { offline: true })
            processedMs += deltaMs
            remainingMs = totalMs - processedMs
            steps += 1
          }

          if (processedMs >= totalMs) {
            chunkChannel.port1.close()
            finishDeferredPersistForOffline(true)
            resumeNotifsAfterOffline()
            setOfflineSync({
              status: 'ready',
              elapsedMs: totalMs,
              processedMs,
            })
            writeLastActiveAt()
            lastTickAt = performance.now()
            return
          }

          // Throttled: a React commit per chunk costs more than the progress
          // bar is worth.
          const nowTs = performance.now()
          if (nowTs - lastProgressPushedAt >= SYNC_PROGRESS_UPDATE_MS) {
            lastProgressPushedAt = nowTs
            setOfflineSync({
              status: 'running',
              elapsedMs: totalMs,
              processedMs,
            })
          }
          scheduleNextChunk()
        } catch (error) {
          console.error('Offline progress simulation failed', error)
          chunkChannel.port1.close()
          syncActive.current = false
          finishDeferredPersistForOffline(false)
          resumeNotifsAfterOffline()
          if (syncSnapshot.current) {
            restorePersistedState(syncSnapshot.current)
          }
          syncSnapshot.current = null
          clearOfflineTransaction()
          writeLastActiveAt()
          setOfflineSync({ status: 'idle', elapsedMs: 0, processedMs: 0 })
          setStartupReady(true)
          window.setTimeout(() => window.location.reload(), 0)
        }
      }

      scheduleNextChunk()
    }

    function checkStartupOffline() {
      if (startupOfflineChecked.current || pausedRef.current) return
      startupOfflineChecked.current = true

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
        finishDeferredPersistForOffline(true)
        resumeNotifsAfterOffline()
        syncSnapshot.current = null
        clearOfflineTransaction()
        lagMs = 0
        lastTickAt = performance.now()
        writeLastActiveAt()
        ensureCurrentTileEncounter()
        const restoreRemoteUpdatedAt = localStorage.getItem(CLOUD_RESTORE_OFFLINE_PENDING_KEY)
        const acceptedRemoteUpdatedAt = localStorage.getItem(CLOUD_ACCEPTED_REMOTE_UPDATED_AT_KEY)
        if (restoreRemoteUpdatedAt && restoreRemoteUpdatedAt === acceptedRemoteUpdatedAt) {
          localStorage.removeItem(CLOUD_RESTORE_OFFLINE_PENDING_KEY)
          useCloudSaveStore.getState().pushLocalSave(true)
        } else if (restoreRemoteUpdatedAt) {
          localStorage.removeItem(CLOUD_RESTORE_OFFLINE_PENDING_KEY)
        }
        setStartupReady(true)
        setOfflineSync({ status: 'idle', elapsedMs: 0, processedMs: 0 })
      },
      discard: () => {
        finishDeferredPersistForOffline(false)
        resumeNotifsAfterOffline()
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
      if (startupReloading || syncActive.current || !startupOfflineChecked.current) return
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
      if (!syncActive.current) {
        finishDeferredPersistForOffline(true)
        resumeNotifsAfterOffline()
      }
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
