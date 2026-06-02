import { useHeroStore } from '../store/heroStore'
import { getDerivedStats } from '../formulas/derived'
import { useT } from '../i18n/useT'

export default function ResourceBars() {
  const mana    = useHeroStore((s) => s.mana)
  const attrs   = useHeroStore((s) => s.attributes)
  const derived = getDerivedStats(attrs)
  const t       = useT()

  const manaPct = Math.max(0, (mana / derived.maxMana) * 100)

  return (
    <div className="flex flex-col gap-2.5 mt-3">
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
