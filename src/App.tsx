import { useEffect, useRef } from 'react'
import MiniBattlePlayer from './components/MiniBattlePlayer'
import BattleArena from './components/BattleArena'
import HouseInterior from './components/HouseInterior'
import MarketInterior from './components/MarketInterior'
import ResourceBars from './components/ResourceBars'
import HeroPanel from './components/HeroPanel'
import SettingsMenu from './components/SettingsMenu'
import MapSection from './components/map/MapSection'
import InventoryPanel from './components/InventoryPanel'
import StickyBar from './components/StickyBar'
import NotifToast from './components/NotifToast'
import { useGameLoop } from './hooks/useGameLoop'
import { useHeroStore } from './store/heroStore'
import { useBattleStore } from './store/battleStore'
import { useMapStore } from './store/mapStore'
import { useInventoryStore } from './store/inventoryStore'
import { useSettingsStore } from './store/settingsStore'
import { useNotifStore } from './store/notifStore'
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
  const pushNotif    = useNotifStore((s) => s.push)
  const t            = useT()
  const prevLevel    = useRef(heroLevel)

  // ── Mid-fight persistence ────────────────────────────────────────────────
  // Save HP fractions + elemental statuses just before the page closes/reloads.
  // Using beforeunload avoids expensive per-hit localStorage writes.
  useEffect(() => {
    const MID_FIGHT_KEY = 'ii-mid-fight'

    const save = () => {
      const { player, enemy, phase, enemyStatuses, heroStatuses } = useBattleStore.getState()
      if (phase !== 'over' && enemy.hp > 0 && player.hp > 0) {
        localStorage.setItem(MID_FIGHT_KEY, JSON.stringify({
          playerHpRatio: player.hp / player.maxHp,
          enemyHpRatio:  enemy.hp  / enemy.maxHp,
          enemyStatuses,
          heroStatuses,
        }))
      } else {
        localStorage.removeItem(MID_FIGHT_KEY)
      }
    }

    window.addEventListener('beforeunload', save)

    // On startup: restore mid-fight snapshot if one exists
    if (!useMapStore.getState().defeatPending) {
      useBattleStore.getState().reset()   // always rebuild enemy first

      const raw = localStorage.getItem(MID_FIGHT_KEY)
      if (raw) {
        localStorage.removeItem(MID_FIGHT_KEY)
        try {
          const { playerHpRatio, enemyHpRatio, enemyStatuses, heroStatuses } = JSON.parse(raw)
          // Only restore if the enemy was genuinely mid-fight (HP between 1–99 %)
          if (enemyHpRatio > 0.01 && enemyHpRatio < 0.99) {
            useBattleStore.getState().restoreMidFight(
              playerHpRatio, enemyHpRatio, enemyStatuses ?? [], heroStatuses ?? [],
            )
          }
        } catch { /* malformed snapshot — ignore */ }
      }
    }

    return () => window.removeEventListener('beforeunload', save)
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
        <div className="grid grid-cols-[1fr_300px] gap-6 items-start">

          {/* Left — scene-dependent content + resources */}
          <div className="flex flex-col">
            {scene === 'home'   ? <HouseInterior /> :
             scene === 'market' ? <MarketInterior /> :
                                  <BattleArena />}
            <ResourceBars />
          </div>

          {/* Right — hero panel */}
          <aside>
            <HeroPanel />
          </aside>
        </div>

        {/* Map */}
        <div className="mt-6">
          <MapSection />
        </div>

        {/* Inventory & Equipment */}
        <div className="mt-6">
          <InventoryPanel />
        </div>
      </main>
    </div>
  )
}

export default function App() {
  return <GameRoot />
}
