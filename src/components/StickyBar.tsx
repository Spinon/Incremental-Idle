import { useBattleStore } from '../store/battleStore'
import { useHeroStore } from '../store/heroStore'
import { getDerivedStats, staminaDrainAt, getBaseSpeed } from '../formulas/derived'
import { useT } from '../i18n/useT'
import { cn } from '../lib/utils'

export default function StickyBar() {
  const { speed, skipAnim, phase, setSpeed, setSkipAnim, skipBattle } = useBattleStore()

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

  const derived    = getDerivedStats(attrs)
  const t          = useT()
  const baseSpeed  = getBaseSpeed(derived)
  const SPEEDS     = [baseSpeed, baseSpeed + 1, baseSpeed + 2, baseSpeed + 3]

  const isOver       = phase === 'over'
  const hasCharge    = skipCharges >= 1
  const skipDisabled = isOver || !hasCharge
  const wholeCharges = Math.floor(skipCharges)
  const chargeFill   = skipCharges < maxSkipCharges ? (skipCharges % 1) * 100 : 100
  const staminaPct   = Math.max(0, (stamina / derived.maxStamina) * 100)
  const xpPct        = (xp / xpToNext) * 100

  function timeAt(s: number) {
    const rawDrain  = staminaDrainAt(s) / derived.staminaEfficiency
    const netDrain  = rawDrain - derived.staminaRegen   // positive = net loss
    return netDrain > 0 ? stamina / netDrain : null
  }
  function isLow(s: number) { const tt = timeAt(s); return tt !== null && tt < 8 }

  function handleSkip()        { consumeSkipCharge(); setSkipAnim(true); skipBattle() }
  function handleSpeed(s: number) { setSkipAnim(false); setSpeed(s) }

  return (
    <div className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-sm px-6 py-2 flex items-center gap-2 flex-wrap">

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

      {/* Divider */}
      <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />

      {/* Gold — right side */}
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

      {/* Level + XP — relative wrapper so the XP float can pop above */}
      <div className="relative flex items-center gap-2.5">
        {/* XP float rises above the bar (bottom-full) — no horizontal overlap with gold */}
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

        {/* XP bar */}
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

        {/* Free points badge */}
        {freePoints > 0 && (
          <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800/50 px-1.5 py-0.5 rounded whitespace-nowrap">
            +{freePoints} pts
          </span>
        )}
      </div>
    </div>
  )
}
