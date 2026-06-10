import { useState } from 'react'
import { useHeroStore } from '../store/heroStore'
import { useInventoryStore } from '../store/inventoryStore'
import { useSpellStore } from '../store/spellStore'
import { useSettingsStore } from '../store/settingsStore'
import { getDerivedStats, getBaseSpeed } from '../formulas/derived'
import { getEquipmentBonuses } from '../formulas/items'
import { getEffectiveDerivedStatsFromBonuses } from '../formulas/effectiveStats'
import { usePartyEffectiveAttributes } from '../lib/partyBonuses'
import type { Attributes, DerivedStats } from '../types/hero'
import { useT } from '../i18n/useT'
import { cn } from '../lib/utils'

function StatRow({ label, base, value }: { label: string; base?: string; value: string }) {
  const modified = base !== undefined && base !== value
  return (
    <div className="flex justify-between py-0.5">
      <span className="text-xs text-slate-500 dark:text-slate-500">{label}</span>
      <span className="text-xs text-slate-700 dark:text-slate-300 tabular-nums font-medium">
        {modified ? (
          <>
            <span className="text-slate-400 dark:text-slate-600">{base}</span>
            <span className="mx-1 text-slate-400 dark:text-slate-600">→</span>
            <span className="text-indigo-600 dark:text-indigo-400">{value}</span>
          </>
        ) : value}
      </span>
    </div>
  )
}

function formatPercent(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits).replace(/\.0$/, '')}%`
}

function formatMultiplierBonus(value: number): string {
  const bonus = value - 1
  const sign = bonus >= 0 ? '+' : ''
  return `${sign}${formatPercent(bonus)}`
}

type SubAttrPage = 'combat' | 'magic' | 'explore' | 'economy' | 'resist'
type StatKey = keyof DerivedStats | 'maxSpeed' | 'goldEfficiency'

function formatStatValue(key: StatKey, value: number): string {
  switch (key) {
    case 'attackSpeed':
    case 'critDamage':
    case 'healBonus':
    case 'staminaEfficiency':
    case 'manaEfficiency':
    case 'moveSpeed':
    case 'goldMultiplier':
    case 'xpBonus':
      return formatMultiplierBonus(value)
    case 'dodgeChance':
    case 'accuracy':
    case 'critChance':
    case 'damageReduction':
    case 'dropChance':
    case 'resIgnea':
    case 'resGlacial':
    case 'resSombria':
    case 'resVital':
      return formatPercent(value)
    case 'def':
      return value.toFixed(1)
    case 'goldEfficiency':
      return `${((value - 1) * 100).toFixed(0)}% desc.`
    case 'maxSpeed':
      return `${value}×`
    default:
      return String(Math.round(value))
  }
}

export default function HeroPanel() {
  const [subPage, setSubPage] = useState<SubAttrPage>('combat')
  const freePoints     = useHeroStore(s => s.freePoints)
  const attributes     = useHeroStore(s => s.attributes)
  const level          = useHeroStore(s => s.level)
  const spendPoint     = useHeroStore(s => s.spendPoint)
  const optimizePoints = useHeroStore(s => s.optimizePoints)
  const applyPreset    = useHeroStore(s => s.applyPreset)
  const equipment    = useInventoryStore(s => s.equipment)
  const weaponProgress = useInventoryStore(s => s.weaponProgress)
  const equippedWeapons = useInventoryStore(s => s.equippedWeapons)
  const activeBuffs  = useSpellStore(s => s.activeBuffs)
  const partyAttributes = usePartyEffectiveAttributes(attributes, level)
  const equipBonuses = getEquipmentBonuses(equipment)
  const baseDerived  = getDerivedStats(attributes, undefined, level)
  const derived      = getEffectiveDerivedStatsFromBonuses(
    partyAttributes,
    equipBonuses,
    level,
    weaponProgress,
    equippedWeapons,
    activeBuffs,
  )
  const maxSpeed     = getBaseSpeed(derived)
  const baseMaxSpeed = getBaseSpeed(baseDerived)
  const t            = useT()

  const isEn     = useSettingsStore(s => s.lang) === 'en'
  const attrKeys = Object.keys(t.attrNames) as (keyof Attributes)[]
  const subPages: { id: SubAttrPage; label: string; stats: { key: StatKey; label: string }[] }[] = [
    {
      id: 'combat',
      label: isEn ? 'Combat' : 'Combate',
      stats: [
        { key: 'atk', label: t.statNames.atk },
        { key: 'def', label: t.statNames.def },
        { key: 'maxHp', label: t.statNames.hpMax },
        { key: 'attackSpeed', label: t.statNames.atkSpeed },
        { key: 'dodgeChance', label: t.statNames.dodge },
        { key: 'accuracy', label: t.statNames.accuracy },
        { key: 'critChance', label: t.statNames.critChance },
        { key: 'critDamage', label: t.statNames.critDamage },
        { key: 'damageReduction', label: t.statNames.damageReduction },
      ],
    },
    {
      id: 'magic',
      label: isEn ? 'Magic' : 'Magia',
      stats: [
        { key: 'magicDamage', label: t.statNames.magicDmg },
        { key: 'healBonus', label: t.statNames.healBonus },
        { key: 'maxMana', label: isEn ? 'Max Mana' : 'Mana Máx.' },
        { key: 'manaRegen', label: isEn ? 'Mana Regen' : 'Regen. Mana' },
        { key: 'manaEfficiency', label: t.statNames.manaEff },
      ],
    },
    {
      id: 'explore',
      label: isEn ? 'Explore' : 'Exploração',
      stats: [
        { key: 'maxStamina', label: isEn ? 'Max Stamina' : 'Stamina Máx.' },
        { key: 'staminaRegen', label: isEn ? 'Stamina Regen' : 'Regen. Stamina' },
        { key: 'staminaEfficiency', label: t.statNames.staminaEff },
        { key: 'moveSpeed', label: t.statNames.moveSpeed },
        { key: 'maxSpeed', label: t.statNames.maxSpeed },
        { key: 'vision', label: t.statNames.vision },
      ],
    },
    {
      id: 'economy',
      label: isEn ? 'Economy' : 'Economia',
      stats: [
        { key: 'dropChance', label: t.statNames.dropChance },
        { key: 'goldEfficiency', label: t.statNames.goldEfficiency },
        { key: 'goldMultiplier', label: t.statNames.goldMult },
        { key: 'xpBonus', label: t.statNames.xpBonus },
      ],
    },
    {
      id: 'resist',
      label: isEn ? 'Resist' : 'Resist.',
      stats: [
        { key: 'resIgnea', label: t.statNames.resIgnea },
        { key: 'resGlacial', label: t.statNames.resGlacial },
        { key: 'resSombria', label: t.statNames.resSombria },
        { key: 'resVital', label: t.statNames.resVital },
      ],
    },
  ]
  const activeSubPage = subPages.find(page => page.id === subPage) ?? subPages[0]

  function subStatValue(source: DerivedStats, key: StatKey): number {
    if (key === 'maxSpeed') return source === baseDerived ? baseMaxSpeed : maxSpeed
    if (key === 'goldEfficiency') return source.goldEfficiency
    return source[key]
  }

  return (
    <div id="hero-panel" className="flex flex-col gap-3">

      {/* Attributes */}
      <div className="bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
        <div className="flex items-center mb-3">
          <p className="text-[10px] text-slate-400 dark:text-slate-600 uppercase tracking-widest font-semibold">
            {t.attributes}
          </p>
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
                  <div className="flex items-center gap-2">
                    <span className={cn('text-xs font-bold', colors[key])}>{label}</span>
                    <div className="ml-auto flex flex-wrap justify-end gap-1 min-w-0">
                      {smalls.map((s: string) => (
                        <span key={s} className="text-[9px] px-1 py-px rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-500">{s}</span>
                      ))}
                    </div>
                    <span className="text-xs tabular-nums text-slate-700 dark:text-slate-300 font-semibold shrink-0">{val}</span>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1 mt-0.5">
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

        <div className="mb-2 flex flex-wrap gap-1">
          {subPages.map(page => (
            <button
              key={page.id}
              onClick={() => setSubPage(page.id)}
              className={cn(
                'px-2 py-1 rounded-md text-[9px] font-semibold border transition-colors',
                subPage === page.id
                  ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700',
              )}
            >
              {page.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-x-3">
          {activeSubPage.stats.map(({ key, label }) => {
            const baseValue = formatStatValue(key, subStatValue(baseDerived, key))
            const modValue = formatStatValue(key, subStatValue(derived, key))
            return <StatRow key={key} label={label} base={baseValue} value={modValue} />
          })}
        </div>
      </div>
    </div>
  )
}
