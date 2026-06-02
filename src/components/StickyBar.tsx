import { useBattleStore } from '../store/battleStore'
import { useHeroStore } from '../store/heroStore'
import { useQuestStore } from '../store/questStore'
import { useUIStore, type AppTab } from '../store/uiStore'
import { useSettingsStore } from '../store/settingsStore'
import { getDerivedStats, staminaDrainAt, getBaseSpeed } from '../formulas/derived'
import { useT } from '../i18n/useT'
import { cn } from '../lib/utils'

interface TabDef {
  id: AppTab
  label: string
  labelEn: string
}

const TABS: TabDef[] = [
  { id: 'battle',      label: 'Batalha',     labelEn: 'Battle'      },
  { id: 'map',         label: 'Mapa',        labelEn: 'Map'         },
  { id: 'equips',      label: 'Equips',      labelEn: 'Equips'      },
  { id: 'spells',      label: 'Magias',      labelEn: 'Spells'      },
  { id: 'consumables', label: 'Consumíveis', labelEn: 'Consumables' },
  { id: 'quests',      label: 'Missões',     labelEn: 'Quests'      },
]

export default function StickyBar() {
  const { speed, skipAnim, phase, setSpeed, setSkipAnim, skipBattle } = useBattleStore()
  const activeTab    = useUIStore(s => s.activeTab)
  const setActiveTab = useUIStore(s => s.setActiveTab)

  const stamina           = useHeroStore(s => s.stamina)
  const attrs             = useHeroStore(s => s.attributes)
  const skipCharges       = useHeroStore(s => s.skipCharges)
  const maxSkipCharges    = useHeroStore(s => s.maxSkipCharges)
  const consumeSkipCharge = useHeroStore(s => s.consumeSkipCharge)
  const level             = useHeroStore(s => s.level)
  const xp                = useHeroStore(s => s.xp)
  const xpToNext          = useHeroStore(s => s.xpToNext)
  const freePoints        = useHeroStore(s => s.freePoints)
  const lastXpGain        = useHeroStore(s => s.lastXpGain)
  const xpGainVersion     = useHeroStore(s => s.xpGainVersion)
  const gold              = useHeroStore(s => s.gold)
  const lastGoldGain      = useHeroStore(s => s.lastGoldGain)
  const goldGainVersion   = useHeroStore(s => s.goldGainVersion)

  const activeQuestCount = useQuestStore(s => s.quests.filter(q => q.status === 'active').length)

  const derived    = getDerivedStats(attrs)
  const t          = useT()
  const lang       = useSettingsStore(s => s.lang)
  const isEn       = lang === 'en'
  const baseSpeed  = getBaseSpeed(derived)
  const SPEEDS     = [baseSpeed, baseSpeed + 1, baseSpeed + 2, baseSpeed + 3]

  const isOver       = phase === 'over'
  const hasCharge    = skipCharges >= 1
  const skipDisabled = isOver || !hasCharge
  const wholeCharges = Math.floor(skipCharges)
  const chargeFill   = skipCharges < maxSkipCharges ? (skipCharges % 1) * 100 : 100
  const staminaPct   = Math.max(0, (stamina / derived.maxStamina) * 100)
  const xpPct        = (xp / xpToNext) * 100
  const staminaFill  = staminaPct > 50 ? 'bg-amber-400' : staminaPct > 25 ? 'bg-orange-400' : 'bg-red-500'

  const rawDrain  = staminaDrainAt(speed) / derived.staminaEfficiency
  const netChange = derived.staminaRegen - rawDrain
  const netDrain  = -netChange
  const timeLeft  = netDrain > 0 ? stamina / netDrain : null

  function timeAt(s: number) {
    const rd  = staminaDrainAt(s) / derived.staminaEfficiency
    const nd  = rd - derived.staminaRegen
    return nd > 0 ? stamina / nd : null
  }
  function isLow(s: number) { const tt = timeAt(s); return tt !== null && tt < 8 }

  function handleSkip()           { consumeSkipCharge(); setSkipAnim(true); skipBattle() }
  function handleSpeed(s: number) { setSkipAnim(false); setSpeed(s) }

  return (
    <div className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-sm px-6 py-1.5 flex flex-col gap-1">

      {/* ── Row 1: Nav tabs ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-0.5">
        {TABS.map(tab => {
          const active = activeTab === tab.id
          const badge  = tab.id === 'quests' && activeQuestCount > 0 ? activeQuestCount : null
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative flex items-center gap-1 px-3 py-1 rounded text-xs font-semibold transition-colors',
                active
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200',
              )}
            >
              {isEn ? tab.labelEn : tab.label}
              {badge !== null && (
                <span className="ml-0.5 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Row 2: Controls + Gold + XP ──────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">

        {/* Skip button */}
        <button
          onClick={handleSkip}
          disabled={skipDisabled}
          className={cn(
            'relative flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold border transition-all overflow-hidden',
            skipDisabled
              ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
              : skipAnim
                ? 'bg-rose-600 border-rose-500 text-white shadow'
                : 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-500 text-slate-700 dark:text-slate-200 hover:bg-rose-100 dark:hover:bg-rose-900 hover:border-rose-300 dark:hover:border-rose-700',
          )}
        >
          {t.skip}
          <span className="flex gap-0.5">
            {Array.from({ length: Math.min(maxSkipCharges, 5) }).map((_, i) => (
              <span key={i} className={cn(
                'w-1 h-1 rounded-full transition-colors',
                i < wholeCharges
                  ? skipAnim ? 'bg-white/80' : 'bg-rose-500 dark:bg-rose-400'
                  : 'bg-slate-300 dark:bg-slate-600',
              )} />
            ))}
          </span>
          {skipCharges < maxSkipCharges && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/10">
              <div
                className={cn('h-full', skipAnim ? 'bg-white/50' : 'bg-rose-400 dark:bg-rose-500')}
                style={{ width: `${chargeFill}%` }}
              />
            </div>
          )}
        </button>

        <div className="w-px h-4 bg-slate-300 dark:bg-slate-700" />
        <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t.speed}</span>

        {/* Speed buttons */}
        {SPEEDS.map(s => {
          const effectiveSpeed = Math.max(speed, baseSpeed)
          const active = effectiveSpeed === s && !skipAnim
          const low    = isLow(s) && s > baseSpeed
          const time   = timeAt(s)
          return (
            <button key={s} onClick={() => handleSpeed(s)}
              className={cn(
                'relative flex flex-col items-center px-2.5 py-1 rounded text-xs font-semibold border transition-all',
                active
                  ? low
                    ? 'bg-orange-500 border-orange-400 text-white shadow'
                    : 'bg-indigo-600 border-indigo-400 text-white shadow'
                  : low
                    ? 'bg-slate-100 dark:bg-slate-800 border-orange-300 dark:border-orange-800/60 text-orange-500 dark:text-orange-400/70 hover:bg-orange-50 dark:hover:bg-slate-700'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700',
              )}
            >
              {s}×
              {s > baseSpeed && time !== null && (
                <span className={cn(
                  'text-[8px] leading-none tabular-nums',
                  active ? 'text-white/70' : 'text-slate-400 dark:text-slate-600',
                )}>
                  {time < 99 ? `${time.toFixed(0)}s` : '—'}
                </span>
              )}
              {active && s > baseSpeed && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/10 rounded-b overflow-hidden">
                  <div
                    className={cn('h-full', low ? 'bg-orange-300' : 'bg-white/60')}
                    style={{ width: `${staminaPct}%` }}
                  />
                </div>
              )}
            </button>
          )
        })}

        <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />

        {/* Gold */}
        <div className="relative flex items-center ml-auto">
          {goldGainVersion > 0 && (
            <span
              key={goldGainVersion}
              className="anim-xp-float absolute right-full mr-1.5 text-[10px] font-bold text-yellow-400 whitespace-nowrap pointer-events-none"
            >
              +{lastGoldGain} ⬡
            </span>
          )}
          <span className="text-xs font-semibold text-yellow-500 dark:text-yellow-400 tabular-nums">
            ⬡ {gold}
          </span>
        </div>

        <div className="w-px h-4 bg-slate-300 dark:bg-slate-700" />

        {/* Level + XP */}
        <div className="relative flex items-center gap-2.5">
          {xpGainVersion > 0 && (
            <span
              key={xpGainVersion}
              className="anim-xp-float absolute bottom-full left-0 mb-1 text-[10px] font-bold text-indigo-400 whitespace-nowrap pointer-events-none z-50"
            >
              +{lastXpGain} XP
            </span>
          )}
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">
            {t.level} {level}
          </span>
          <div className="flex items-center gap-1.5">
            <div className="w-24 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-[width] duration-300"
                style={{ width: `${xpPct}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 tabular-nums whitespace-nowrap">
              {xp}/{xpToNext} {t.xp}
            </span>
          </div>
          {freePoints > 0 && (
            <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800/50 px-1.5 py-0.5 rounded whitespace-nowrap">
              +{freePoints} pts
            </span>
          )}
        </div>
      </div>

      {/* ── Row 3: Stamina bar ───────────────────────────────────────────── */}
      <div className="flex items-center gap-2 pb-0.5">
        <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400/90 uppercase tracking-wider w-12 shrink-0">
          {t.stamina}
        </span>
        <span className="text-[9px] text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
          {Math.floor(stamina)}/{Math.round(derived.maxStamina)}
        </span>
        <span className={cn(
          'text-[9px] font-semibold tabular-nums whitespace-nowrap',
          netChange >= 0 ? 'text-amber-500/80 dark:text-amber-400/60' : 'text-red-500 dark:text-red-400',
        )}>
          {netChange >= 0 ? '+' : ''}{netChange.toFixed(1)}/s
        </span>
        {timeLeft !== null && (
          <span className={cn(
            'text-[9px] tabular-nums whitespace-nowrap',
            timeLeft > 10 ? 'text-slate-400 dark:text-slate-600' : timeLeft > 5 ? 'text-orange-500' : 'text-red-500',
          )}>
            ({timeLeft.toFixed(0)}s)
          </span>
        )}
        <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-300/50 dark:border-slate-700/50 min-w-0">
          <div
            className={cn('h-full rounded-full transition-[width] duration-200', staminaFill)}
            style={{ width: `${staminaPct}%` }}
          />
        </div>
      </div>
    </div>
  )
}
