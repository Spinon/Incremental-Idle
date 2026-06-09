import { useUIStore, APP_TABS } from '../store/uiStore'
import { useQuestStore } from '../store/questStore'
import { useSettingsStore } from '../store/settingsStore'
import { cn } from '../lib/utils'

/** Mobile bottom tab bar — hidden on lg+ (desktop uses the StickyBar top tabs). */
export default function BottomNav() {
  const activeTab    = useUIStore(s => s.activeTab)
  const setActiveTab = useUIStore(s => s.setActiveTab)
  const lang         = useSettingsStore(s => s.lang)
  const isEn         = lang === 'en'
  const activeQuestCount = useQuestStore(s => s.quests.filter(q => q.status === 'active').length)

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 border-t border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch">
        {APP_TABS.map(tab => {
          const active = activeTab === tab.id
          const badge  = tab.id === 'quests' && activeQuestCount > 0 ? activeQuestCount : null
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-1.5 transition-colors',
                active
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-400 dark:text-slate-500 active:bg-slate-200/60 dark:active:bg-slate-800/60',
              )}
            >
              <span className="text-lg leading-none">{tab.icon}</span>
              <span className="text-[9px] font-semibold leading-none truncate max-w-full px-0.5">
                {isEn ? tab.labelEn : tab.label}
              </span>
              {active && <span className="absolute top-0 inset-x-3 h-0.5 rounded-full bg-indigo-500" />}
              {badge !== null && (
                <span className="absolute top-0.5 right-1/2 translate-x-3 min-w-[14px] h-3.5 px-1 rounded-full bg-amber-500 text-white text-[8px] font-bold flex items-center justify-center leading-none">
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
