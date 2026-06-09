import { useBattleStore } from '../store/battleStore'
import { useHeroStore } from '../store/heroStore'
import { getDerivedStats, staminaDrainAt, getBaseSpeed } from '../formulas/derived'
import { useT } from '../i18n/useT'
import { cn } from '../lib/utils'

export default function SpeedControls() {
  const { speed, skipAnim, phase, setSpeed, setSkipAnim, skipBattle } = useBattleStore()
  const stamina           = useHeroStore((s) => s.stamina)
  const attrs             = useHeroStore((s) => s.attributes)
  const skipCharges       = useHeroStore((s) => s.skipCharges)
  const maxSkipCharges    = useHeroStore((s) => s.maxSkipCharges)
  const consumeSkipCharge = useHeroStore((s) => s.consumeSkipCharge)

  const derived       = getDerivedStats(attrs)
  const t             = useT()
  const baseSpeed     = getBaseSpeed(derived)
  const SPEEDS        = [baseSpeed, baseSpeed + 1, baseSpeed + 2, baseSpeed + 3]
  const effectiveSpd  = Math.max(speed, baseSpeed)

  const isOver       = phase === 'over' || phase === 'empty'
  const hasCharge    = skipCharges >= 1
  const skipDisabled = isOver || !hasCharge
  const wholeCharges = Math.floor(skipCharges)
  const chargeFill   = skipCharges < maxSkipCharges ? (skipCharges % 1) * 100 : 100
  const staminaPct   = Math.max(0, (stamina / derived.maxStamina) * 100)

  function handleSkip()          { consumeSkipCharge(); setSkipAnim(true); skipBattle() }
  function handleSpeed(s: number){ setSkipAnim(false); setSpeed(s) }

  function timeAt(s: number) {
    const d = s > baseSpeed ? staminaDrainAt(s) / derived.staminaEfficiency : 0
    return d > 0 ? stamina / d : null
  }
  function isLow(s: number) { const tt = timeAt(s); return tt !== null && tt < 8 }

  return (
    <div className="flex items-center gap-2 mb-4 flex-wrap">
      <button
        onClick={handleSkip}
        disabled={skipDisabled}
        className={cn(
          'relative flex flex-col items-center px-4 py-1 rounded-md text-sm font-semibold border transition-all overflow-hidden',
          skipDisabled
            ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
            : skipAnim
              ? 'bg-rose-600 border-rose-500 text-white shadow-lg'
              : 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-500 text-slate-700 dark:text-slate-200 hover:bg-rose-100 dark:hover:bg-rose-900 hover:border-rose-300 dark:hover:border-rose-700'
        )}
      >
        <span>{t.skip}</span>
        <span className="flex gap-0.5 mt-0.5 mb-1">
          {Array.from({ length: Math.min(maxSkipCharges, 5) }).map((_, i) => (
            <span
              key={i}
              className={cn(
                'w-1.5 h-1.5 rounded-full transition-colors duration-300',
                i < wholeCharges
                  ? skipAnim ? 'bg-white/80' : 'bg-rose-500 dark:bg-rose-400'
                  : 'bg-slate-300 dark:bg-slate-600'
              )}
            />
          ))}
        </span>
        {skipCharges < maxSkipCharges && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/10">
            <div
              className={cn('h-full transition-[width] duration-200', skipAnim ? 'bg-white/50' : 'bg-rose-400 dark:bg-rose-500')}
              style={{ width: `${chargeFill}%` }}
            />
          </div>
        )}
      </button>

      <div className="w-px h-5 bg-slate-300 dark:bg-slate-700" />
      <span className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t.speed}</span>

      {SPEEDS.map((s) => {
        const active = effectiveSpd === s && !skipAnim
        const low    = isLow(s) && s > baseSpeed
        const time   = timeAt(s)

        return (
          <button
            key={s}
            onClick={() => handleSpeed(s)}
            className={cn(
              'relative flex flex-col items-center px-3 py-1 rounded-md text-sm font-semibold border transition-all',
              active
                ? low
                  ? 'bg-orange-500 border-orange-400 text-white shadow-lg'
                  : 'bg-indigo-600 border-indigo-400 text-white shadow-lg'
                : low
                  ? 'bg-slate-100 dark:bg-slate-800 border-orange-300 dark:border-orange-800/60 text-orange-500 dark:text-orange-400/70 hover:bg-orange-50 dark:hover:bg-slate-700'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            )}
          >
            <span>{s}×</span>
            {s > baseSpeed && time !== null && (
              <span className={cn(
                'text-[9px] leading-none tabular-nums mt-0.5',
                active ? 'text-white/70' : 'text-slate-400 dark:text-slate-600'
              )}>
                {time < 99 ? `${time.toFixed(0)}s` : '—'}
              </span>
            )}
            {active && s > baseSpeed && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/10 rounded-b-md overflow-hidden">
                <div
                  className={cn('h-full transition-[width] duration-200', low ? 'bg-orange-300' : 'bg-white/60')}
                  style={{ width: `${staminaPct}%` }}
                />
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
