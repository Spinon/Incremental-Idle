import { useHeroStore } from '../store/heroStore'
import { getDerivedStats } from '../formulas/derived'
import type { Attributes } from '../types/hero'
import { useT } from '../i18n/useT'
import { cn } from '../lib/utils'

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-0.5">
      <span className="text-xs text-slate-500 dark:text-slate-500">{label}</span>
      <span className="text-xs text-slate-700 dark:text-slate-300 tabular-nums font-medium">{value}</span>
    </div>
  )
}

export default function HeroPanel() {
  const { level, xp, xpToNext, freePoints, attributes, spendPoint } = useHeroStore()
  const derived = getDerivedStats(attributes)
  const t       = useT()
  const xpPct   = (xp / xpToNext) * 100

  const attrKeys = Object.keys(t.attrNames) as (keyof Attributes)[]

  return (
    <div className="flex flex-col gap-3">

      {/* Level / XP */}
      <div className="bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {t.level} {level}
          </span>
          <span className="text-xs text-slate-500 tabular-nums">{xp} / {xpToNext} {t.xp}</span>
        </div>
        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
          <div
            className="h-full bg-indigo-500 rounded-full transition-[width] duration-300"
            style={{ width: `${xpPct}%` }}
          />
        </div>
        {freePoints > 0 && (
          <p className="mt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-300">
            {t.available(freePoints)}
          </p>
        )}
      </div>

      {/* Attributes */}
      <div className="bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
        <p className="text-[10px] text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-3 font-semibold">
          {t.attributes}
        </p>
        <div className="flex flex-col gap-2.5">
          {attrKeys.map((key) => {
            const label   = t.attrNames[key]
            const smalls  = t.attrSmalls[key]
            const bigs    = t.attrBigs[key]
            const val     = attributes[key]
            const canSpend = freePoints > 0
            const colors: Record<keyof Attributes, string> = {
              forca: 'text-red-500 dark:text-red-400',
              agilidade: 'text-green-600 dark:text-green-400',
              destreza: 'text-yellow-600 dark:text-yellow-400',
              vitalidade: 'text-pink-600 dark:text-pink-400',
              inteligencia: 'text-purple-600 dark:text-purple-400',
              sabedoria: 'text-sky-600 dark:text-sky-400',
              carisma: 'text-orange-600 dark:text-orange-400',
            }

            return (
              <div key={key} className="flex items-start gap-2">
                <button
                  onClick={() => spendPoint(key)}
                  disabled={!canSpend}
                  title={canSpend ? t.addPoint(label) : t.noPoints}
                  className={cn(
                    'mt-0.5 w-5 h-5 rounded flex-shrink-0 flex items-center justify-center text-xs font-bold transition-colors',
                    canSpend
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed'
                  )}
                >+</button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={cn('text-xs font-bold', colors[key])}>{label}</span>
                    <span className="text-xs tabular-nums text-slate-700 dark:text-slate-300 font-semibold">{val}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {smalls.map((s: string) => (
                      <span key={s} className="text-[9px] px-1 py-px rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-500">{s}</span>
                    ))}
                    {bigs.map((b: string) => (
                      <span key={b} className="text-[9px] px-1 py-px rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400/80">{b}</span>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Sub-attributes */}
      <div className="bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
        <p className="text-[10px] text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-2 font-semibold">
          {t.subAttrs}
        </p>
        <div className="grid grid-cols-2 gap-x-3">
          <StatRow label={t.statNames.atk}       value={String(Math.round(derived.atk))} />
          <StatRow label={t.statNames.def}        value={derived.def.toFixed(1)} />
          <StatRow label={t.statNames.hpMax}      value={String(Math.round(derived.maxHp))} />
          <StatRow label={t.statNames.atkSpeed}   value={`${derived.attackSpeed.toFixed(2)}×`} />
          <StatRow label={t.statNames.dodge}      value={`${(derived.dodgeChance * 100).toFixed(1)}%`} />
          <StatRow label={t.statNames.magicDmg}   value={String(Math.round(derived.magicDamage))} />
          <StatRow label={t.statNames.moveSpeed}  value={`${derived.moveSpeed.toFixed(2)}×`} />
          <StatRow label={t.statNames.vision}     value={String(Math.round(derived.vision))} />
          <StatRow label={t.statNames.dropChance} value={`${(derived.dropChance * 100).toFixed(1)}%`} />
          <StatRow label={t.statNames.goldMult}   value={`${derived.goldMultiplier.toFixed(2)}×`} />
        </div>
      </div>
    </div>
  )
}
