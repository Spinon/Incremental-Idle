import { useHeroStore } from '../store/heroStore'
import { useBattleStore } from '../store/battleStore'
import { getDerivedStats, STAMINA_DRAIN } from '../formulas/derived'
import { useT } from '../i18n/useT'
import { cn } from '../lib/utils'

export default function ResourceBars() {
  const stamina = useHeroStore((s) => s.stamina)
  const mana    = useHeroStore((s) => s.mana)
  const attrs   = useHeroStore((s) => s.attributes)
  const speed   = useBattleStore((s) => s.speed)
  const derived = getDerivedStats(attrs)
  const t       = useT()

  const staminaPct = Math.max(0, (stamina / derived.maxStamina) * 100)
  const manaPct    = Math.max(0, (mana    / derived.maxMana)    * 100)

  const drain    = STAMINA_DRAIN[speed]
  const timeLeft = drain > 0 ? stamina / drain : null

  const staminaFill = staminaPct > 50 ? 'bg-amber-400' : staminaPct > 25 ? 'bg-orange-400' : 'bg-red-500'

  return (
    <div className="flex flex-col gap-2.5 mt-3">
      {/* Stamina */}
      <div>
        <div className="flex justify-between items-baseline text-xs px-0.5 mb-1">
          <span className="font-bold text-amber-600 dark:text-amber-400/90 tracking-wide">{t.stamina}</span>
          <span className="text-slate-500 dark:text-slate-400 tabular-nums">
            {Math.floor(stamina)}<span className="text-slate-400 dark:text-slate-600">/{Math.round(derived.maxStamina)}</span>
            {timeLeft !== null && (
              <span className={cn(
                'ml-2 font-semibold',
                timeLeft > 15 ? 'text-slate-400 dark:text-slate-500' : timeLeft > 5 ? 'text-orange-500 dark:text-orange-400' : 'text-red-500 dark:text-red-400'
              )}>
                {timeLeft.toFixed(1)}s
              </span>
            )}
            {speed === 1 && (
              <span className="ml-2 text-amber-600/60 dark:text-amber-600/70 text-[10px]">
                +{derived.staminaRegen.toFixed(1)}/s
              </span>
            )}
          </span>
        </div>
        <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-300 dark:border-slate-700/80">
          <div
            className={`h-full rounded-full transition-[width] duration-200 ${staminaFill}`}
            style={{ width: `${staminaPct}%` }}
          />
        </div>
      </div>

      {/* Mana */}
      <div>
        <div className="flex justify-between items-baseline text-xs px-0.5 mb-1">
          <span className="font-bold text-blue-600 dark:text-blue-400/90 tracking-wide">{t.mana}</span>
          <span className="text-slate-500 dark:text-slate-400 tabular-nums">
            {Math.floor(mana)}<span className="text-slate-400 dark:text-slate-600">/{Math.round(derived.maxMana)}</span>
            <span className="ml-2 text-blue-500/60 dark:text-blue-600/70 text-[10px]">
              +{derived.manaRegen.toFixed(1)}/s
            </span>
          </span>
        </div>
        <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-300 dark:border-slate-700/80">
          <div
            className="h-full rounded-full transition-[width] duration-200 bg-blue-500"
            style={{ width: `${manaPct}%` }}
          />
        </div>
      </div>
    </div>
  )
}
