import { useEffect, useRef } from 'react'
import MiniBattlePlayer from './components/MiniBattlePlayer'
import BattleArena from './components/BattleArena'
import AuthGate from './components/AuthGate'
import HouseInterior from './components/HouseInterior'
import MarketInterior from './components/MarketInterior'
import HeroPanel from './components/HeroPanel'
import SettingsMenu from './components/SettingsMenu'
import MapSection from './components/map/MapSection'
import InventoryPanel from './components/InventoryPanel'
import SpellbookPanel from './components/SpellbookPanel'
import QuestPanel from './components/QuestPanel'
import StickyBar from './components/StickyBar'
import NotifToast from './components/NotifToast'
import { SpriteGallery } from './components/icons/__SpriteGallery'
import { useCloudSaveSync } from './hooks/useCloudSaveSync'
import { useGameLoop } from './hooks/useGameLoop'
import { useHeroStore } from './store/heroStore'
import { useBattleStore } from './store/battleStore'
import { useMapStore } from './store/mapStore'
import { useInventoryStore } from './store/inventoryStore'
import { useSpellStore } from './store/spellStore'
import { useSettingsStore } from './store/settingsStore'
import { useNotifStore } from './store/notifStore'
import { useUIStore } from './store/uiStore'
import { getDerivedStats, getBaseSpeed } from './formulas/derived'
import { getEquipmentBonuses } from './formulas/items'
import { getWeaponStatBonuses } from './formulas/weapons'
import { applySpellBuffs } from './formulas/spells'
import { useT } from './i18n/useT'
import type { OfflineSyncState } from './hooks/useGameLoop'

function formatSyncDuration(ms: number, isEn: boolean): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const parts: string[] = []

  if (hours > 0) parts.push(`${hours}${isEn ? 'h' : 'h'}`)
  if (minutes > 0) parts.push(`${minutes}${isEn ? 'm' : 'min'}`)
  if (hours === 0 && seconds > 0) parts.push(`${seconds}s`)

  return parts.length > 0 ? parts.join(' ') : `0s`
}

function OfflineSyncOverlay({
  sync,
  isEn,
  onAccept,
  onDiscard,
}: {
  sync: OfflineSyncState
  isEn: boolean
  onAccept: () => void
  onDiscard: () => void
}) {
  if (sync.status === 'idle') return null

  const progress = sync.elapsedMs > 0
    ? Math.min(100, Math.round((sync.processedMs / sync.elapsedMs) * 100))
    : 100
  const isReady = sync.status === 'ready'
  const elapsed = formatSyncDuration(sync.elapsedMs, isEn)

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl">
        <div className="border-b border-slate-800 px-5 py-4">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-300">
            {isEn ? 'Offline progress' : 'Progresso offline'}
          </div>
          <h2 className="mt-1 text-xl font-black">
            {isReady
              ? (isEn ? 'Synchronization complete' : 'Sincronização concluída')
              : (isEn ? 'Synchronizing...' : 'Sincronizando...')}
          </h2>
        </div>

        <div className="px-5 py-4">
          <p className="text-sm leading-6 text-slate-300">
            {isReady
              ? (isEn
                ? `The game simulated ${elapsed} using the normal battle, map and loot rules.`
                : `O jogo simulou ${elapsed} usando as regras normais de batalha, mapa e loot.`)
              : (isEn
                ? `Processing ${elapsed} of elapsed time. The game is locked until everything is consistent.`
                : `Processando ${elapsed} de tempo decorrido. O jogo fica bloqueado até tudo estar consistente.`)}
          </p>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-indigo-400 transition-[width] duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 text-right text-xs font-bold text-slate-400">{progress}%</div>

          {isReady && (
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onDiscard}
                className="rounded-md border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800"
              >
                {isEn ? 'Discard' : 'Descartar'}
              </button>
              <button
                type="button"
                onClick={onAccept}
                className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-black text-white hover:bg-indigo-400"
              >
                {isEn ? 'Use progress' : 'Usar progresso'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function GameRoot() {
  useCloudSaveSync()
  const { offlineSync, acceptOfflineProgress, discardOfflineProgress } = useGameLoop()

  const theme        = useSettingsStore((s) => s.theme)
  const lang         = useSettingsStore((s) => s.lang)
  const attributes   = useHeroStore((s) => s.attributes)
  const heroLevel    = useHeroStore((s) => s.level)
  const syncFromHero = useBattleStore((s) => s.syncFromHero)
  const setSpeed     = useBattleStore((s) => s.setSpeed)
  const scene        = useMapStore((s) => s.scene)
  const equipment    = useInventoryStore((s) => s.equipment)
  const weaponProgress = useInventoryStore((s) => s.weaponProgress)
  const equippedWeapons = useInventoryStore((s) => s.equippedWeapons)
  const activeBuffs  = useSpellStore((s) => s.activeBuffs)
  const activeTab    = useUIStore((s) => s.activeTab)
  const setShowMini  = useUIStore((s) => s.setShowMiniPlayer)
  const pushNotif    = useNotifStore((s) => s.push)
  const t            = useT()
  const prevLevel    = useRef(heroLevel)

  useEffect(() => {
    const KEY = 'ii-mid-fight'

    // ── Subscribe: write snapshot to localStorage on every HP change ─────────
    // Much more reliable than beforeunload (which may not complete) and avoids
    // Zustand rehydration-timing issues with the partialize approach.
    const unsub = useBattleStore.subscribe((state, prev) => {
      const hpChanged = state.player.hp !== prev.player.hp || state.enemy.hp !== prev.enemy.hp
      const statusChanged = state.enemyStatuses !== prev.enemyStatuses || state.heroStatuses !== prev.heroStatuses
      if (!hpChanged && !statusChanged) return

      if (state.phase !== 'over' && state.enemy.hp > 0 && state.player.hp > 0) {
        localStorage.setItem(KEY, JSON.stringify({
          playerHpRatio: state.player.hp / state.player.maxHp,
          enemyHpRatio:  state.enemy.hp  / state.enemy.maxHp,
          enemyStatuses: state.enemyStatuses,
          heroStatuses:  state.heroStatuses,
          attacker:      state.attacker,
          hitsLeft:      state.hitsLeft,
          comboSize:     state.comboSize,
        }))
      } else {
        // Fight ended — remove so next reload doesn't restore a finished fight
        localStorage.removeItem(KEY)
      }
    })

    // ── Startup: read snapshot BEFORE reset(), apply AFTER ───────────────────
    if (!useMapStore.getState().defeatPending) {
      const raw = localStorage.getItem(KEY)
      localStorage.removeItem(KEY)          // consume immediately

      useBattleStore.getState().reset()     // rebuilds enemy from nextEnemy*

      if (raw) {
        try {
          const snap = JSON.parse(raw) as {
            playerHpRatio: number; enemyHpRatio: number
            enemyStatuses: unknown; heroStatuses: unknown
            attacker: unknown; hitsLeft: unknown; comboSize: unknown
          }
          if (snap.enemyHpRatio > 0.01 && snap.enemyHpRatio < 0.99) {
            const attacker  = snap.attacker  === 'enemy' ? 'enemy' : 'player'
            const hitsLeft  = typeof snap.hitsLeft  === 'number' && snap.hitsLeft  >= 1 ? snap.hitsLeft  : 1
            const comboSize = typeof snap.comboSize === 'number' && snap.comboSize >= 1 ? snap.comboSize : hitsLeft
            useBattleStore.getState().restoreMidFight(
              snap.playerHpRatio,
              snap.enemyHpRatio,
              Array.isArray(snap.enemyStatuses) ? snap.enemyStatuses : [],
              Array.isArray(snap.heroStatuses)  ? snap.heroStatuses  : [],
              attacker,
              hitsLeft,
              comboSize,
            )
          }
        } catch { /* malformed snapshot — ignore */ }
      }
    }

    return unsub
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Apply/remove dark class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  // Force base speed when entering home or market
  useEffect(() => {
    if (scene !== 'map') {
      const equip = getEquipmentBonuses(equipment)
      const d     = applySpellBuffs(getDerivedStats(attributes, equip, heroLevel), activeBuffs)
      setSpeed(getBaseSpeed(d))
    }
  }, [activeBuffs, attributes, equipment, heroLevel, scene, setSpeed])

  // Home and market scenes live inside the battle tab; expose them through
  // the mini player when the user is currently looking at another tab.
  useEffect(() => {
    if (scene === 'home' || scene === 'market') {
      setShowMini(activeTab !== 'battle')
    }
  }, [activeTab, scene, setShowMini])

  // Sync hero stats → battle store whenever attributes, equipment or level change.
  // heroLevel is included so passive level bonuses take effect on level-up.
  useEffect(() => {
    const equip = getEquipmentBonuses(equipment)
    const weaponStats = getWeaponStatBonuses(weaponProgress, equippedWeapons)
    const base  = getDerivedStats(attributes, equip, heroLevel)
    const d     = applySpellBuffs({
      ...base,
      atk: base.atk + weaponStats.atk,
      def: base.def + weaponStats.def,
      attackSpeed: Math.max(0.1, base.attackSpeed + weaponStats.attackSpeed),
      critChance: Math.min(0.75, base.critChance + weaponStats.critChance),
      magicDamage: base.magicDamage + weaponStats.magicDamage,
    }, activeBuffs)
    syncFromHero({
      atk: d.atk, def: d.def, maxHp: d.maxHp,
      atkSpeed: Math.max(0.1, d.attackSpeed), dodgeChance: d.dodgeChance,
      critChance: Math.min(0.75, d.critChance), critDamage: d.critDamage,
      damageReduction: d.damageReduction,
      resIgnea: d.resIgnea, resGlacial: d.resGlacial,
      resSombria: d.resSombria, resVital: d.resVital,
    })
  }, [activeBuffs, attributes, equipment, equippedWeapons, heroLevel, syncFromHero, weaponProgress])

  // Level-up notification
  useEffect(() => {
    if (prevLevel.current !== 0 && heroLevel > prevLevel.current) {
      pushNotif({
        title:    `🎉 Nível ${heroLevel}!`,
        titleEn:  `🎉 Level ${heroLevel}!`,
        body:     'Você subiu de nível! Distribua seus pontos de atributo.',
        bodyEn:   'You leveled up! Distribute your attribute points.',
        scrollTo: 'battle',
        actions:  [
          { label: 'Ver Herói', labelEn: 'View Hero', kind: 'scroll', payload: 'battle' },
        ],
      })
    }
    prevLevel.current = heroLevel
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroLevel])

  if (typeof window !== 'undefined' && window.location.hash === '#gallery') {
    return <SpriteGallery />
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <MiniBattlePlayer />
      <NotifToast />
      <OfflineSyncOverlay
        sync={offlineSync}
        isEn={lang === 'en'}
        onAccept={acceptOfflineProgress}
        onDiscard={discardOfflineProgress}
      />
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 px-6 py-3 flex items-center gap-3">
        <span className="text-indigo-600 dark:text-indigo-400 font-black text-lg tracking-tight">
          INCREMENTAL IDLE
        </span>
        <span className="text-slate-300 dark:text-slate-700">|</span>
        <span className="text-slate-400 dark:text-slate-500 text-sm">{t.build} v{__APP_VERSION__}</span>
        <div className="ml-auto">
          <SettingsMenu />
        </div>
      </header>

      {/* Sticky HUD — speed controls + level/XP */}
      <StickyBar />

      {/* Main layout */}
      <main className="w-full max-w-5xl mx-auto px-6 py-6">

        {/* Battle tab — always mounted (battle timers must keep running) */}
        <div className={activeTab !== 'battle' ? 'hidden' : undefined}>
          <div className="grid grid-cols-[1fr_300px] gap-6 items-start">
            <div className="flex flex-col">
              {scene === 'home'   ? <HouseInterior /> :
               scene === 'market' ? <MarketInterior /> :
                                    <BattleArena />}
            </div>
            <aside>
              <HeroPanel />
            </aside>
          </div>
        </div>

        {activeTab === 'map'         && <MapSection />}
        {activeTab === 'equips'      && <InventoryPanel section="equips" />}
        {activeTab === 'consumables' && <InventoryPanel section="consumables" />}
        {activeTab === 'spells'      && <SpellbookPanel />}
        {activeTab === 'quests'      && <QuestPanel />}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthGate>
      <GameRoot />
    </AuthGate>
  )
}
