import { useState } from 'react'
import { attributeRefundCost, useHeroStore } from '../store/heroStore'
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
    <div className="flex items-center justify-between gap-3 rounded-md border border-slate-100 dark:border-slate-800/80 bg-white/70 dark:bg-slate-950/35 px-2 py-1.5">
      <span className="min-w-0 truncate text-[11px] font-medium text-slate-500 dark:text-slate-500">{label}</span>
      <span className="shrink-0 text-[11px] font-semibold tabular-nums text-slate-700 dark:text-slate-300">
        {modified ? (
          <>
            <span className="text-slate-400 dark:text-slate-600">{base}</span>
            <span className="mx-1 text-slate-400 dark:text-slate-600">-&gt;</span>
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

type AttrTone = {
  text: string
  border: string
  bg: string
  bar: string
  chip: string
}

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
      return `${value}x`
    default:
      return String(Math.round(value))
  }
}

export default function HeroPanel() {
  const [subPage, setSubPage] = useState<SubAttrPage>('combat')
  const freePoints = useHeroStore(s => s.freePoints)
  const refundCredits = useHeroStore(s => s.attributeRefundCredits)
  const attributes = useHeroStore(s => s.attributes)
  const level = useHeroStore(s => s.level)
  const gold = useHeroStore(s => s.gold)
  const spendPoint = useHeroStore(s => s.spendPoint)
  const refundPoint = useHeroStore(s => s.refundPoint)
  const optimizePoints = useHeroStore(s => s.optimizePoints)
  const applyPreset = useHeroStore(s => s.applyPreset)
  const equipment = useInventoryStore(s => s.equipment)
  const weaponProgress = useInventoryStore(s => s.weaponProgress)
  const equippedWeapons = useInventoryStore(s => s.equippedWeapons)
  const activeBuffs = useSpellStore(s => s.activeBuffs)
  const partyAttributes = usePartyEffectiveAttributes(attributes, level)
  const equipBonuses = getEquipmentBonuses(equipment)
  const baseDerived = getDerivedStats(attributes, undefined, level)
  const derived = getEffectiveDerivedStatsFromBonuses(
    partyAttributes,
    equipBonuses,
    level,
    weaponProgress,
    equippedWeapons,
    activeBuffs,
  )
  const maxSpeed = getBaseSpeed(derived)
  const baseMaxSpeed = getBaseSpeed(baseDerived)
  const t = useT()
  const isEn = useSettingsStore(s => s.lang) === 'en'
  const attrKeys = Object.keys(t.attrNames) as (keyof Attributes)[]
  const refundCost = attributeRefundCost(freePoints, level)
  const maxAttrValue = Math.max(1, ...attrKeys.map(key => attributes[key]))

  const attrTones: Record<keyof Attributes, AttrTone> = {
    forca: {
      text: 'text-red-600 dark:text-red-400',
      border: 'border-red-300/70 dark:border-red-800/60',
      bg: 'bg-red-50/70 dark:bg-red-950/15',
      bar: 'bg-red-500',
      chip: 'bg-red-100/80 dark:bg-red-950/45 text-red-700 dark:text-red-300',
    },
    agilidade: {
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-300/70 dark:border-emerald-800/60',
      bg: 'bg-emerald-50/70 dark:bg-emerald-950/15',
      bar: 'bg-emerald-500',
      chip: 'bg-emerald-100/80 dark:bg-emerald-950/45 text-emerald-700 dark:text-emerald-300',
    },
    destreza: {
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-300/70 dark:border-amber-800/60',
      bg: 'bg-amber-50/70 dark:bg-amber-950/15',
      bar: 'bg-amber-500',
      chip: 'bg-amber-100/80 dark:bg-amber-950/45 text-amber-700 dark:text-amber-300',
    },
    vitalidade: {
      text: 'text-rose-600 dark:text-rose-400',
      border: 'border-rose-300/70 dark:border-rose-800/60',
      bg: 'bg-rose-50/70 dark:bg-rose-950/15',
      bar: 'bg-rose-500',
      chip: 'bg-rose-100/80 dark:bg-rose-950/45 text-rose-700 dark:text-rose-300',
    },
    inteligencia: {
      text: 'text-violet-600 dark:text-violet-400',
      border: 'border-violet-300/70 dark:border-violet-800/60',
      bg: 'bg-violet-50/70 dark:bg-violet-950/15',
      bar: 'bg-violet-500',
      chip: 'bg-violet-100/80 dark:bg-violet-950/45 text-violet-700 dark:text-violet-300',
    },
    sabedoria: {
      text: 'text-sky-600 dark:text-sky-400',
      border: 'border-sky-300/70 dark:border-sky-800/60',
      bg: 'bg-sky-50/70 dark:bg-sky-950/15',
      bar: 'bg-sky-500',
      chip: 'bg-sky-100/80 dark:bg-sky-950/45 text-sky-700 dark:text-sky-300',
    },
    carisma: {
      text: 'text-orange-600 dark:text-orange-400',
      border: 'border-orange-300/70 dark:border-orange-800/60',
      bg: 'bg-orange-50/70 dark:bg-orange-950/15',
      bar: 'bg-orange-500',
      chip: 'bg-orange-100/80 dark:bg-orange-950/45 text-orange-700 dark:text-orange-300',
    },
  }

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
        { key: 'maxMana', label: isEn ? 'Max Mana' : 'Mana Max.' },
        { key: 'manaRegen', label: isEn ? 'Mana Regen' : 'Regen. Mana' },
        { key: 'manaEfficiency', label: t.statNames.manaEff },
      ],
    },
    {
      id: 'explore',
      label: isEn ? 'Explore' : 'Exploracao',
      stats: [
        { key: 'maxStamina', label: isEn ? 'Max Stamina' : 'Stamina Max.' },
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
      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70">
        <div className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/30 px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-600">
                {t.attributes}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-500">
                {isEn ? 'Allocate, refund, and rebalance your build' : 'Aloque, recupere e rebalanceie sua build'}
              </p>
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-1.5">
              <div className="min-w-14 rounded-lg border border-indigo-200 dark:border-indigo-800/70 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-1 text-center">
                <p className="text-[8px] uppercase tracking-widest text-indigo-400 dark:text-indigo-500">
                  {isEn ? 'Points' : 'Pontos'}
                </p>
                <p className="text-sm font-black tabular-nums text-indigo-600 dark:text-indigo-300">{freePoints}</p>
              </div>
              <div className="min-w-16 rounded-lg border border-yellow-200 dark:border-yellow-800/70 bg-yellow-50 dark:bg-yellow-950/25 px-2 py-1 text-center">
                <p className="text-[8px] uppercase tracking-widest text-yellow-500 dark:text-yellow-600">
                  {refundCredits > 0 ? (isEn ? 'Free' : 'Gratis') : 'Refund'}
                </p>
                <p className="text-sm font-black tabular-nums text-yellow-700 dark:text-yellow-300">
                  {refundCredits > 0 ? refundCredits : refundCost}
                </p>
              </div>
            </div>
          </div>
        </div>

        {freePoints > 0 && (
          <div className="border-b border-slate-100 dark:border-slate-800 px-4 py-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-600">
                {t.presets.label}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {([
                ['combat', t.presets.combat, 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300'],
                ['explorer', t.presets.explorer, 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300'],
                ['mage', t.presets.mage, 'bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800/50 text-violet-700 dark:text-violet-300'],
              ] as const).map(([preset, label, cls]) => (
                <button
                  key={preset}
                  onClick={() => applyPreset(preset)}
                  className={cn(
                    'min-h-8 rounded-md border px-1.5 py-1 text-[9px] font-semibold leading-tight transition-colors hover:brightness-95',
                    cls,
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={optimizePoints}
              className="mt-1.5 h-6 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 px-2 text-[9px] font-semibold text-slate-600 dark:text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {t.presets.even}
            </button>
          </div>
        )}

        <div className="flex flex-col gap-2 p-3">
          {attrKeys.map((key) => {
            const label = t.attrNames[key]
            const smalls = t.attrSmalls[key]
            const bigs = t.attrBigs[key]
            const val = attributes[key]
            const canSpend = freePoints > 0
            const canRefund = val > 0 && (refundCredits > 0 || gold >= refundCost)
            const tone = attrTones[key]
            const fillPct = Math.max(4, Math.round((val / maxAttrValue) * 100))

            return (
              <div key={key} className={cn('rounded-lg border p-2.5 transition-colors', tone.border, tone.bg)}>
                <div className="flex items-start gap-2">
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => spendPoint(key)}
                      disabled={!canSpend}
                      title={canSpend ? t.addPoint(label) : t.noPoints}
                      className={cn(
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-sm font-black transition-colors',
                        canSpend
                          ? 'cursor-pointer bg-indigo-600 text-white shadow-sm shadow-indigo-900/20 hover:bg-indigo-500'
                          : 'cursor-not-allowed bg-white/70 text-slate-300 dark:bg-slate-900/60 dark:text-slate-600',
                      )}
                    >
                      +
                    </button>
                    <button
                      onClick={() => refundPoint(key)}
                      disabled={!canRefund}
                      title={
                        val <= 0
                          ? (isEn ? `No points in ${label}` : `Sem pontos em ${label}`)
                          : refundCredits > 0
                            ? (isEn ? `Refund ${label} using a free credit` : `Remover ponto de ${label} usando credito gratis`)
                            : (isEn ? `Refund ${label} for ${refundCost} gold` : `Remover ponto de ${label} por ${refundCost} ouro`)
                      }
                      className={cn(
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-sm font-black transition-colors',
                        canRefund
                          ? 'cursor-pointer bg-yellow-500 text-white shadow-sm shadow-yellow-900/20 hover:bg-yellow-400'
                          : 'cursor-not-allowed bg-white/70 text-slate-300 dark:bg-slate-900/60 dark:text-slate-600',
                      )}
                    >
                      -
                    </button>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0">
                        <span className={cn('block truncate text-xs font-black', tone.text)}>{label}</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {smalls.map((s: string) => (
                            <span key={s} className="rounded bg-white/70 px-1.5 py-0.5 text-[8px] text-slate-500 dark:bg-slate-950/35 dark:text-slate-500">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className={cn('ml-auto min-w-10 rounded-md px-2 py-1 text-center tabular-nums', tone.chip)}>
                        <span className="block text-base font-black leading-none">{val}</span>
                      </div>
                    </div>

                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/80 dark:bg-slate-950/50">
                      <div className={cn('h-full rounded-full', tone.bar)} style={{ width: `${fillPct}%` }} />
                    </div>

                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {bigs.map((b: string) => (
                        <span key={b} className={cn('rounded px-1.5 py-0.5 text-[8px]', tone.chip)}>
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70">
        <div className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/30 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-600">
              {t.subAttrs}
            </p>
            {level > 1 && (
              <div className="rounded-md border border-indigo-200/70 dark:border-indigo-800/70 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-1 text-[9px] font-semibold tabular-nums text-indigo-600 dark:text-indigo-300">
                {isEn
                  ? `Lv.${level} +${((level - 1) * 1.5).toFixed(1)} ATK`
                  : `Nv.${level} +${((level - 1) * 1.5).toFixed(1)} ATK`}
              </div>
            )}
          </div>
        </div>

        <div className="p-3">
          <div className="mb-3 grid grid-cols-5 gap-1">
            {subPages.map(page => (
              <button
                key={page.id}
                onClick={() => setSubPage(page.id)}
                className={cn(
                  'h-8 overflow-hidden text-ellipsis whitespace-nowrap rounded-md border px-1 text-[9px] font-semibold transition-colors',
                  subPage === page.id
                    ? 'border-indigo-400 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300'
                    : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-500 dark:hover:bg-slate-800',
                )}
              >
                {page.label}
              </button>
            ))}
          </div>

          {level > 1 && (
            <div className="mb-3 grid grid-cols-3 gap-1.5">
              <div className="rounded-md border border-red-100 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 px-2 py-1">
                <p className="text-[8px] uppercase tracking-widest text-red-400 dark:text-red-500">ATK</p>
                <p className="text-[11px] font-black tabular-nums text-red-600 dark:text-red-300">+{((level - 1) * 1.5).toFixed(1)}</p>
              </div>
              <div className="rounded-md border border-rose-100 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 px-2 py-1">
                <p className="text-[8px] uppercase tracking-widest text-rose-400 dark:text-rose-500">DEF</p>
                <p className="text-[11px] font-black tabular-nums text-rose-600 dark:text-rose-300">+{Math.floor((level - 1) * 0.5)}</p>
              </div>
              <div className="rounded-md border border-emerald-100 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-1">
                <p className="text-[8px] uppercase tracking-widest text-emerald-500 dark:text-emerald-500">HP</p>
                <p className="text-[11px] font-black tabular-nums text-emerald-600 dark:text-emerald-300">+{(level - 1) * 8}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-1.5">
            {activeSubPage.stats.map(({ key, label }) => {
              const baseValue = formatStatValue(key, subStatValue(baseDerived, key))
              const modValue = formatStatValue(key, subStatValue(derived, key))
              return <StatRow key={key} label={label} base={baseValue} value={modValue} />
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
