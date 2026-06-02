import { useEffect, useRef } from 'react'
import MiniBattlePlayer from './components/MiniBattlePlayer'
import BattleArena from './components/BattleArena'
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
import { useGameLoop } from './hooks/useGameLoop'
import { useHeroStore } from './store/heroStore'
import { useBattleStore } from './store/battleStore'
import { useMapStore } from './store/mapStore'
import { useInventoryStore } from './store/inventoryStore'
import { useSettingsStore } from './store/settingsStore'
import { useNotifStore } from './store/notifStore'
import { useUIStore } from './store/uiStore'
import { getDerivedStats, getBaseSpeed } from './formulas/derived'
import { getEquipmentBonuses } from './formulas/items'
import { useT } from './i18n/useT'

function GameRoot() {
  useGameLoop()

  const theme        = useSettingsStore((s) => s.theme)
  const attributes   = useHeroStore((s) => s.attributes)
  const heroLevel    = useHeroStore((s) => s.level)
  const syncFromHero = useBattleStore((s) => s.syncFromHero)
  const setSpeed     = useBattleStore((s) => s.setSpeed)
  const scene        = useMapStore((s) => s.scene)
  const equipment    = useInventoryStore((s) => s.equipment)
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
      const d     = getDerivedStats(attributes, equip, heroLevel)
      setSpeed(getBaseSpeed(d))
    }
  }, [scene, setSpeed]) // eslint-disable-line react-hooks/exhaustive-deps

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
    const d     = getDerivedStats(attributes, equip, heroLevel)
    syncFromHero({
      atk: d.atk, def: d.def, maxHp: d.maxHp,
      atkSpeed: d.attackSpeed, dodgeChance: d.dodgeChance,
      critChance: d.critChance, critDamage: d.critDamage,
      damageReduction: d.damageReduction,
      resIgnea: d.resIgnea, resGlacial: d.resGlacial,
      resSombria: d.resSombria, resVital: d.resVital,
    })
  }, [attributes, equipment, heroLevel, syncFromHero])

  // Level-up notification
  useEffect(() => {
    if (prevLevel.current !== 0 && heroLevel > prevLevel.current) {
      pushNotif({
        title:    `🎉 Nível ${heroLevel}!`,
        titleEn:  `🎉 Level ${heroLevel}!`,
        body:     'Você subiu de nível! Distribua seus pontos de atributo.',
        bodyEn:   'You leveled up! Distribute your attribute points.',
        scrollTo: 'hero-panel',
        actions:  [
          { label: 'Ver Herói', labelEn: 'View Hero', kind: 'scroll', payload: 'hero-panel' },
        ],
      })
    }
    prevLevel.current = heroLevel
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroLevel])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <MiniBattlePlayer />
      <NotifToast />
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 px-6 py-3 flex items-center gap-3">
        <span className="text-indigo-600 dark:text-indigo-400 font-black text-lg tracking-tight">
          INCREMENTAL IDLE
        </span>
        <span className="text-slate-300 dark:text-slate-700">|</span>
        <span className="text-slate-400 dark:text-slate-500 text-sm">{t.build}</span>
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
  return <GameRoot />
}
