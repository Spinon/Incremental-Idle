import { useBattleStore, type Speed } from '../store/battleStore'
import { useHeroStore } from '../store/heroStore'
import { getDerivedStats, STAMINA_DRAIN } from '../formulas/derived'
import { useT } from '../i18n/useT'
import { cn } from '../lib/utils'

const SPEEDS: Speed[] = [1, 2, 3, 4]

export default function SpeedControls() {
  const { speed, skipAnim, phase, setSpeed, setSkipAnim, skipBattle } = useBattleStore()
  const stamina = useHeroStore((s) => s.stamina)
  const attrs   = useHeroStore((s) => s.attributes)
  const derived = getDerivedStats(attrs)
  const t       = useT()

  const isOver = phase === 'over'

  function handleSkip() { setSkipAnim(true); skipBattle() }
  function handleSpeed(s: Speed) { setSkipAnim(false); setSpeed(s) }

  function timeAt(s: Speed) {
    const d = STAMINA_DRAIN[s]
    return d > 0 ? stamina / d : null
  }
  function isLow(s: Speed) { const t = timeAt(s); return t !== null && t < 8 }

  const staminaPct = Math.max(0, (stamina / derived.maxStamina) * 100)

  return (
    <div className="flex items-center gap-2 mb-4 flex-wrap">
      <button
        onClick={handleSkip}
        disabled={isOver}
        className={cn(
          'px-4 py-1.5 rounded-md text-sm font-semibold border transition-all',
          isOver
            ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
            : skipAnim
              ? 'bg-rose-600 border-rose-500 text-white shadow-lg'
              : 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-500 text-slate-700 dark:text-slate-200 hover:bg-rose-100 dark:hover:bg-rose-900 hover:border-rose-300 dark:hover:border-rose-700'
        )}
      >
        {t.skip}
      </button>

      <div className="w-px h-5 bg-slate-300 dark:bg-slate-700" />

      <span className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t.speed}</span>

      {SPEEDS.map((s) => {
        const active = speed === s && !skipAnim
        const low    = isLow(s) && s > 1
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
            {s > 1 && time !== null && (
              <span className={cn(
                'text-[9px] leading-none tabular-nums mt-0.5',
                active ? 'text-white/70' : 'text-slate-400 dark:text-slate-600'
              )}>
                {time < 99 ? `${time.toFixed(0)}s` : '—'}
              </span>
            )}
            {active && s > 1 && (
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
