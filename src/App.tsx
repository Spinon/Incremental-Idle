import { useEffect } from 'react'
import BattleArena from './components/BattleArena'
import ResourceBars from './components/ResourceBars'
import HeroPanel from './components/HeroPanel'
import SettingsMenu from './components/SettingsMenu'
import { useGameLoop } from './hooks/useGameLoop'
import { useHeroStore } from './store/heroStore'
import { useBattleStore } from './store/battleStore'
import { useSettingsStore } from './store/settingsStore'
import { getDerivedStats } from './formulas/derived'
import { useT } from './i18n/useT'

function GameRoot() {
  useGameLoop()

  const theme        = useSettingsStore((s) => s.theme)
  const attributes   = useHeroStore((s) => s.attributes)
  const syncFromHero = useBattleStore((s) => s.syncFromHero)
  const t            = useT()

  // Apply/remove dark class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  // Sync hero stats → battle store whenever attributes change
  useEffect(() => {
    const d = getDerivedStats(attributes)
    syncFromHero({ atk: d.atk, def: d.def, maxHp: d.maxHp })
  }, [attributes, syncFromHero])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
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

      {/* Main layout */}
      <main className="w-full max-w-5xl mx-auto px-6 py-6">
        <div className="grid grid-cols-[1fr_300px] gap-6 items-start">

          {/* Left — battle + resources */}
          <div className="flex flex-col">
            <BattleArena />
            <ResourceBars />
          </div>

          {/* Right — hero panel */}
          <aside>
            <HeroPanel />
          </aside>
        </div>

        {/* Bottom placeholder */}
        <div className="mt-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-6 text-center text-slate-400 dark:text-slate-700 text-sm italic">
          {t.idle}
        </div>
      </main>
    </div>
  )
}

export default function App() {
  return <GameRoot />
}
