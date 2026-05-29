import { useHeroStore } from '../store/heroStore'
import { useInventoryStore } from '../store/inventoryStore'
import { useSettingsStore } from '../store/settingsStore'
import { getDerivedStats, getBaseSpeed } from '../formulas/derived'
import { getEquipmentBonuses } from '../formulas/items'
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
  const { freePoints, attributes, level, spendPoint, optimizePoints, applyPreset } = useHeroStore()
  const equipment    = useInventoryStore(s => s.equipment)
  const equipBonuses = getEquipmentBonuses(equipment)
  const derived      = getDerivedStats(attributes, equipBonuses, level)
  const maxSpeed     = getBaseSpeed(derived)
  const t            = useT()

  const isEn     = useSettingsStore(s => s.lang) === 'en'
  const attrKeys = Object.keys(t.attrNames) as (keyof Attributes)[]

  return (
    <div id="hero-panel" className="flex flex-col gap-3">

      {/* Attributes */}
      <div className="bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] text-slate-400 dark:text-slate-600 uppercase tracking-widest font-semibold">
            {t.attributes}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={optimizePoints}
              disabled={freePoints <= 0}
              title={t.optimize}
              className={cn(
                'w-5 h-5 rounded flex items-center justify-center text-xs font-bold transition-colors',
                freePoints > 0
                  ? 'bg-amber-400 hover:bg-amber-300 dark:bg-amber-500 dark:hover:bg-amber-400 text-white cursor-pointer'
                  : 'invisible pointer-events-none',
              )}
            >+</button>
          </div>
        </div>

        {/* Quick-build presets — only shown when there are points to spend */}
        {freePoints > 0 && (
          <div className="mb-3 flex flex-col gap-1.5">
            <p className="text-[9px] text-slate-400 dark:text-slate-600 uppercase tracking-widest font-semibold">
              {t.presets.label}
            </p>
            <div className="grid grid-cols-3 gap-1">
              {([
                ['combat',   t.presets.combat,   'bg-red-50    dark:bg-red-900/20    border-red-200    dark:border-red-800/40    text-red-700    dark:text-red-400'],
                ['explorer', t.presets.explorer, 'bg-green-50  dark:bg-green-900/20  border-green-200  dark:border-green-800/40  text-green-700  dark:text-green-400'],
                ['mage',     t.presets.mage,     'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800/40 text-purple-700 dark:text-purple-400'],
              ] as const).map(([preset, label, cls]) => (
                <button
                  key={preset}
                  onClick={() => applyPreset(preset)}
                  className={cn(
                    'text-[9px] font-semibold py-1 px-1.5 rounded border transition-colors leading-tight',
                    cls,
                    'hover:brightness-95',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={optimizePoints}
              className="text-[9px] font-semibold py-1 px-2 rounded border transition-colors leading-tight
                bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:brightness-95"
            >
              {t.presets.even}
            </button>
          </div>
        )}
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

        {/* Passive level bonus indicator */}
        {level > 1 && (
          <div className="mb-2 px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200/60 dark:border-indigo-800/40 text-[9px] text-indigo-600 dark:text-indigo-400">
            {isEn
              ? `Lv.${level} passive · +${((level-1)*1.5).toFixed(1)} ATK  +${Math.floor((level-1)*0.5)} DEF  +${(level-1)*8} HP`
              : `Bônus Nv.${level} · +${((level-1)*1.5).toFixed(1)} ATK  +${Math.floor((level-1)*0.5)} DEF  +${(level-1)*8} HP`}
          </div>
        )}

        <div className="grid grid-cols-2 gap-x-3">
          <StatRow label={t.statNames.atk}             value={String(Math.round(derived.atk))} />
          <StatRow label={t.statNames.def}             value={derived.def.toFixed(1)} />
          <StatRow label={t.statNames.hpMax}           value={String(Math.round(derived.maxHp))} />
          <StatRow label={t.statNames.atkSpeed}        value={derived.attackSpeed.toFixed(2)} />
          <StatRow label={t.statNames.dodge}           value={`${(derived.dodgeChance * 100).toFixed(1)}%`} />
          <StatRow label={t.statNames.critChance}      value={`${(derived.critChance * 100).toFixed(1)}%`} />
          <StatRow label={t.statNames.critDamage}      value={`${derived.critDamage.toFixed(2)}×`} />
          <StatRow label={t.statNames.damageReduction} value={`${(derived.damageReduction * 100).toFixed(1)}%`} />
          <StatRow label={t.statNames.magicDmg}        value={String(Math.round(derived.magicDamage))} />
          <StatRow label={t.statNames.healBonus}       value={`${derived.healBonus.toFixed(2)}×`} />
          <StatRow label={t.statNames.staminaEff}      value={`${derived.staminaEfficiency.toFixed(2)}×`} />
          <StatRow label={t.statNames.manaEff}         value={`${derived.manaEfficiency.toFixed(2)}×`} />
          <StatRow label={t.statNames.moveSpeed}       value={`${derived.moveSpeed.toFixed(2)}×`} />
          <StatRow label={t.statNames.maxSpeed}        value={`${maxSpeed}×`} />
          <StatRow label={t.statNames.vision}          value={String(Math.round(derived.vision))} />
          <StatRow label={t.statNames.dropChance}      value={`${(derived.dropChance * 100).toFixed(1)}%`} />
          <StatRow label={t.statNames.goldEfficiency}  value={`${((derived.goldEfficiency - 1) * 100).toFixed(0)}% desc.`} />
          <StatRow label={t.statNames.goldMult}        value={`${derived.goldMultiplier.toFixed(2)}×`} />
          <StatRow label={t.statNames.xpBonus}        value={`${derived.xpBonus.toFixed(2)}×`} />
        </div>
      </div>
    </div>
  )
}
