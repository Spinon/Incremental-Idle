import { useEffect, useMemo, useRef } from 'react'
import MiniBattlePlayer from './components/MiniBattlePlayer'
import BattleArena from './components/BattleArena'
import AuthGate from './components/AuthGate'
import CloudSaveConflictModal from './components/CloudSaveConflictModal'
import HouseInterior from './components/HouseInterior'
import MarketInterior from './components/MarketInterior'
import TileMarketInterior from './components/TileMarketInterior'
import TowerInterior from './components/TowerInterior'
import HeroPanel from './components/HeroPanel'
import SettingsMenu from './components/SettingsMenu'
import MapSection from './components/map/MapSection'
import InventoryPanel from './components/InventoryPanel'
import SpellbookPanel from './components/SpellbookPanel'
import QuestPanel from './components/QuestPanel'
import PartyPanel from './components/PartyPanel'
import StickyBar from './components/StickyBar'
import BottomNav from './components/BottomNav'
import NotifToast from './components/NotifToast'
import { useCloudSaveSync } from './hooks/useCloudSaveSync'
import { useGameLoop } from './hooks/useGameLoop'
import { useCloudSaveStore } from './store/cloudSaveStore'
import { useHeroStore } from './store/heroStore'
import { useBattleStore } from './store/battleStore'
import { useMapStore } from './store/mapStore'
import { useInventoryStore } from './store/inventoryStore'
import { useSpellStore } from './store/spellStore'
import { useSettingsStore } from './store/settingsStore'
import { useNotifStore } from './store/notifStore'
import { useUIStore } from './store/uiStore'
import { usePartyStore } from './store/partyStore'
import { LOCAL_PLAY_KEY } from './store/save'
import { getBaseSpeed } from './formulas/derived'
import { getEquipmentBonuses } from './formulas/items'
import { getEffectiveDerivedStatsFromBonuses } from './formulas/effectiveStats'
import { getPartyEffectiveAttributes } from './lib/partyBonuses'
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

function CloudSyncOverlay({ isEn, status }: { isEn: boolean; status: string }) {
  // Two visible phases: session check (idle/loading), then save reconciliation
  // (syncing). The width nudges forward per phase so the bar reflects real
  // progress instead of sitting at a fixed 50%.
  const checkingSession = status === 'idle' || status === 'loading'
  const phaseLabel = checkingSession
    ? (isEn ? 'Checking session...' : 'Verificando sessão...')
    : (isEn ? 'Comparing cloud and local progress...' : 'Comparando progresso local e da nuvem...')

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/75 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-lg border border-slate-700 bg-slate-900 px-5 py-4 text-slate-100 shadow-2xl">
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-300">
          {isEn ? 'Cloud save' : 'Save na nuvem'}
        </div>
        <h2 className="mt-1 text-lg font-black">
          {isEn ? 'Synchronizing...' : 'Sincronizando...'}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">{phaseLabel}</p>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full animate-pulse rounded-full bg-indigo-400 transition-[width] duration-500"
            style={{ width: checkingSession ? '35%' : '75%' }}
          />
        </div>
      </div>
    </div>
  )
}

function GameRoot() {
  const cloudConfigured = useCloudSaveStore(s => s.configured)
  const cloudStatus = useCloudSaveStore(s => s.status)
  const cloudUser = useCloudSaveStore(s => s.user)
  const cloudRemoteChecked = useCloudSaveStore(s => s.remoteChecked)
  const cloudPendingRemote = useCloudSaveStore(s => s.pendingRemote)
  const localPlay = localStorage.getItem(LOCAL_PLAY_KEY) === '1'
  const cloudInitialCheckPending = cloudConfigured && !localPlay && cloudStatus === 'idle'
  const cloudRemoteCheckPending = (cloudStatus === 'loading' || cloudStatus === 'syncing') && !cloudRemoteChecked
  const gamePausedForCloudSave = cloudInitialCheckPending
    || !!cloudPendingRemote
    || cloudRemoteCheckPending
    || (!!cloudUser && !cloudRemoteChecked)

  const { offlineSync, startupReady, acceptOfflineProgress, discardOfflineProgress } = useGameLoop(gamePausedForCloudSave)
  const gamePausedForSync = gamePausedForCloudSave || !startupReady || offlineSync.status !== 'idle'
  useCloudSaveSync(gamePausedForSync)

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
  const ensureStarterNpcs = usePartyStore((s) => s.ensureStarterNpcs)
  // Subscriptions so partyAttributes recomputes when the party changes
  const partySlots = usePartyStore((s) => s.slots)
  const partyKnownNpcs = usePartyStore((s) => s.knownNpcs)
  const t            = useT()
  const prevLevel    = useRef(heroLevel)
  const startupInitialized = useRef(false)
  const partyAttributes = useMemo(
    () => getPartyEffectiveAttributes(attributes, heroLevel),
    [attributes, heroLevel, partySlots, partyKnownNpcs],
  )

  useEffect(() => {
    ensureStarterNpcs(heroLevel)
  }, [ensureStarterNpcs, heroLevel])

  useEffect(() => {
    if (startupInitialized.current || gamePausedForSync) return
    startupInitialized.current = true

    localStorage.removeItem('ii-mid-fight')
    if (!useMapStore.getState().defeatPending) {
      const battlePhase = useBattleStore.getState().phase
      if (battlePhase === 'empty' && useMapStore.getState().scene === 'map') {
        useMapStore.getState().processMarketExitTile()
      }
    }

  }, [gamePausedForSync])

  // Apply/remove dark class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  // Force base speed when entering non-battle scenes
  useEffect(() => {
    if (gamePausedForSync) return
    if (scene !== 'map') {
      const equip = getEquipmentBonuses(equipment)
      const d = getEffectiveDerivedStatsFromBonuses(
        partyAttributes,
        equip,
        heroLevel,
        weaponProgress,
        equippedWeapons,
        activeBuffs,
      )
      setSpeed(getBaseSpeed(d))
    }
  }, [activeBuffs, partyAttributes, equipment, equippedWeapons, gamePausedForSync, heroLevel, scene, setSpeed, weaponProgress])

  // Interior scenes live inside the battle tab; expose them through
  // the mini player when the user is currently looking at another tab.
  useEffect(() => {
    if (gamePausedForSync) return
    if (scene === 'home' || scene === 'market' || scene === 'tileMarket' || scene === 'tower') {
      setShowMini(activeTab !== 'battle')
    }
  }, [activeTab, gamePausedForSync, scene, setShowMini])

  // Sync hero stats → battle store whenever attributes, equipment or level change.
  // heroLevel is included so passive level bonuses take effect on level-up.
  useEffect(() => {
    if (gamePausedForSync) return
    const equip = getEquipmentBonuses(equipment)
    const d = getEffectiveDerivedStatsFromBonuses(
      partyAttributes,
      equip,
      heroLevel,
      weaponProgress,
      equippedWeapons,
      activeBuffs,
    )
    syncFromHero({
      atk: d.atk, def: d.def, maxHp: d.maxHp,
      atkSpeed: Math.max(0.1, d.attackSpeed), dodgeChance: d.dodgeChance,
      critChance: Math.min(0.75, d.critChance), critDamage: d.critDamage,
      accuracy: d.accuracy, damageReduction: d.damageReduction,
      resIgnea: d.resIgnea, resGlacial: d.resGlacial,
      resSombria: d.resSombria, resVital: d.resVital,
    })
  }, [activeBuffs, partyAttributes, equipment, equippedWeapons, gamePausedForSync, heroLevel, syncFromHero, weaponProgress])

  // Level-up notification
  useEffect(() => {
    if (gamePausedForSync) return
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
  }, [gamePausedForSync, heroLevel])

  // During the offline simulation every step mutates the game stores; keeping
  // the battle/map tree mounted meant re-rendering it all behind the overlay.
  // Render only the overlay until the player accepts or discards the result.
  if (offlineSync.status !== 'idle') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
        <OfflineSyncOverlay
          sync={offlineSync}
          isEn={lang === 'en'}
          onAccept={acceptOfflineProgress}
          onDiscard={discardOfflineProgress}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <MiniBattlePlayer />
      <NotifToast />
      <CloudSaveConflictModal />
      {gamePausedForSync && !cloudPendingRemote && (
        <CloudSyncOverlay isEn={lang === 'en'} status={cloudStatus} />
      )}
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 py-3 flex items-center gap-2 sm:gap-3">
        <span className="text-indigo-600 dark:text-indigo-400 font-black text-base sm:text-lg tracking-tight">
          INCREMENTAL IDLE
        </span>
        <span className="hidden sm:inline text-slate-300 dark:text-slate-700">|</span>
        <span className="hidden sm:inline text-slate-400 dark:text-slate-500 text-sm">{t.build} v{__APP_VERSION__}</span>
        <div className="ml-auto">
          <SettingsMenu />
        </div>
      </header>

      {/* Sticky HUD — speed controls + level/XP */}
      <StickyBar />

      {/* Main layout */}
      <main className="w-full max-w-5xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6 pb-[calc(9rem+env(safe-area-inset-bottom))] sm:pb-[calc(9rem+env(safe-area-inset-bottom))] lg:pb-6">

        {/* Battle tab — always mounted (battle timers must keep running) */}
        <div className={activeTab !== 'battle' ? 'hidden' : undefined}>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4 lg:gap-6 items-start">
            <div className="flex flex-col min-w-0">
              {scene === 'home'   ? <HouseInterior /> :
               scene === 'market' ? <MarketInterior /> :
               scene === 'tileMarket' ? <TileMarketInterior /> :
               scene === 'tower'  ? <TowerInterior /> :
                                    <BattleArena paused={gamePausedForSync} />}
            </div>
            <aside className="min-w-0">
              <HeroPanel />
            </aside>
          </div>
        </div>

        {activeTab === 'map'         && <MapSection />}
        {activeTab === 'party'       && <PartyPanel />}
        {activeTab === 'equips'      && <InventoryPanel section="equips" />}
        {activeTab === 'consumables' && <InventoryPanel section="consumables" />}
        {activeTab === 'spells'      && <SpellbookPanel />}
        {activeTab === 'quests'      && <QuestPanel />}
      </main>

      <BottomNav />
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
