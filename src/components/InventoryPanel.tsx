import { useState } from 'react'
import { useInventoryStore } from '../store/inventoryStore'
import { useHeroStore } from '../store/heroStore'
import { useSettingsStore } from '../store/settingsStore'
import { useUIStore } from '../store/uiStore'
import { getEquipmentBonuses, ATTR_LABEL_PT, ATTR_LABEL_EN, getItemDisplayName } from '../formulas/items'
import { getDerivedStats } from '../formulas/derived'
import {
  canEquipWeapon,
  getWeaponCombatProfile,
  getWeaponStatBonuses,
  isWeaponAtForgeCap,
  normalizeEquippedWeapons,
  normalizeWeaponProgress,
  TWO_HANDED_WEAPONS,
  weaponForgeCost,
  weaponForgeMaterialTier,
  WEAPON_LABELS,
  WEAPON_MATERIAL_LABELS,
  WEAPON_TYPES,
} from '../formulas/weapons'
import { cn } from '../lib/utils'
import type { Item, ItemRarity, EquipmentKey, EquipmentSlots, ItemStats, Consumable } from '../types/item'
import type { EquippedWeapons, WeaponMaterials, WeaponProgress, WeaponType } from '../types/weapon'
import SpellbookPanel from './SpellbookPanel'
import {
  HeadIcon, ShoulderIcon, ChestIcon, GlovesIcon, LegsIcon, FeetIcon, AccIcon,
  SwordIcon, DaggerIcon, AxeIcon, StaffIcon, BowIcon, ShieldIcon,
} from './icons/EquipIcons'

const ALL_RARITIES: ItemRarity[] = ['common', 'uncommon', 'rare', 'epic', 'set', 'unique']

// ─── Sell price (mirrors inventoryStore logic) ────────────────────────────────
const SELL_MULT_LOCAL: Record<ItemRarity, number> = { common: 1, uncommon: 3, rare: 8, epic: 20, set: 35, unique: 60 }
function localSellPrice(item: Item): number {
  return Math.max(1, Math.floor(item.level * SELL_MULT_LOCAL[item.rarity]))
}

// ─── Constants ────────────────────────────────────────────────────────────────

const RARITY_BORDER: Record<ItemRarity, string> = {
  common:   'border-slate-400  dark:border-slate-600',
  uncommon: 'border-green-500  dark:border-green-700',
  rare:     'border-blue-500   dark:border-blue-700',
  epic:     'border-purple-500 dark:border-purple-700',
  set:      'border-yellow-400 dark:border-yellow-500',
  unique:   'border-orange-500 dark:border-orange-400',
}
const RARITY_BG: Record<ItemRarity, string> = {
  common:   'bg-slate-100   dark:bg-slate-800',
  uncommon: 'bg-green-50    dark:bg-green-900/25',
  rare:     'bg-blue-50     dark:bg-blue-900/25',
  epic:     'bg-purple-50   dark:bg-purple-900/25',
  set:      'bg-yellow-50   dark:bg-yellow-900/20',
  unique:   'bg-orange-50   dark:bg-orange-900/20',
}
const RARITY_TEXT: Record<ItemRarity, string> = {
  common:   'text-slate-600  dark:text-slate-400',
  uncommon: 'text-green-700  dark:text-green-400',
  rare:     'text-blue-600   dark:text-blue-400',
  epic:     'text-purple-600 dark:text-purple-400',
  set:      'text-yellow-600 dark:text-yellow-400',
  unique:   'text-orange-600 dark:text-orange-400',
}
const RARITY_LABEL: Record<ItemRarity, [string, string]> = {
  common:   ['Comum',    'Common'],
  uncommon: ['Incomum',  'Uncommon'],
  rare:     ['Raro',     'Rare'],
  epic:     ['Épico',    'Epic'],
  set:      ['Conjunto', 'Set'],
  unique:   ['Único',    'Unique'],
}

// 3-col × 6-row body grid — null means an empty ghost cell, string = EquipmentKey
//   Row 1: _       head    _
//   Row 2: shoulder  _     chest
//   Row 3: _       gloves  _
//   Row 4: _       legs    _
//   Row 5: _       feet    _
//   Row 6: acc1    acc2    acc3
const EQUIP_GRID: (EquipmentKey | null)[] = [
  null,       'head',   null,
  'shoulder', null,     'chest',
  null,       'gloves', null,
  null,       'legs',   null,
  null,       'feet',   null,
  'acc1',     'acc2',   'acc3',
]

const SLOT_LABEL_PT: Record<EquipmentKey, string> = {
  head: 'CAB', shoulder: 'OMB', chest: 'PEI',
  gloves: 'LUV', legs: 'PER', feet: 'PÉS',
  acc1: '◆', acc2: '◆', acc3: '◆',
}
const SLOT_LABEL_EN: Record<EquipmentKey, string> = {
  head: 'HEAD', shoulder: 'SHLDR', chest: 'CHEST',
  gloves: 'GLOVE', legs: 'LEGS', feet: 'FEET',
  acc1: '◆', acc2: '◆', acc3: '◆',
}
const SLOT_FULL_PT: Record<EquipmentKey, string> = {
  head: 'Cabeça', shoulder: 'Ombro', chest: 'Peitoral',
  gloves: 'Luvas', legs: 'Pernas', feet: 'Pés',
  acc1: 'Acessório 1', acc2: 'Acessório 2', acc3: 'Acessório 3',
}
const SLOT_FULL_EN: Record<EquipmentKey, string> = {
  head: 'Head', shoulder: 'Shoulder', chest: 'Chest',
  gloves: 'Gloves', legs: 'Legs', feet: 'Feet',
  acc1: 'Accessory 1', acc2: 'Accessory 2', acc3: 'Accessory 3',
}

const STAT_LABEL_PT: Partial<Record<keyof ItemStats, string>> = {
  atk: 'ATK', def: 'DEF', hp: 'HP', atkSpeed: 'Vel. Atk',
  magicDamage: 'Dano Mágico', vision: 'Visão', moveSpeed: 'Vel. Mov.',
  dropChance: 'Chance Drop', goldMult: 'Bônus Ouro', xpBonus: 'Bônus XP',
}
const STAT_LABEL_EN: Partial<Record<keyof ItemStats, string>> = {
  atk: 'ATK', def: 'DEF', hp: 'HP', atkSpeed: 'Atk Speed',
  magicDamage: 'Magic Dmg', vision: 'Vision', moveSpeed: 'Move Spd',
  dropChance: 'Drop Rate', goldMult: 'Gold Bonus', xpBonus: 'XP Bonus',
}
const PERCENT_STATS = new Set<keyof ItemStats>(['dropChance', 'goldMult', 'xpBonus', 'moveSpeed', 'atkSpeed'])

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1).replace(/\.0$/, '')}%`
}

function formatStat(key: keyof ItemStats, value: number): string {
  if (PERCENT_STATS.has(key)) return `+${formatPercent(value)}`
  return `+${Math.round(value)}`
}

function formatDelta(key: keyof ItemStats, delta: number): string {
  const sign = delta >= 0 ? '+' : ''
  if (PERCENT_STATS.has(key)) return `${sign}${formatPercent(delta)}`
  return `${sign}${Math.round(delta)}`
}

function itemDisplayName(item: Item, isEn: boolean): string {
  return getItemDisplayName(item, isEn)
}

// ─── Comparison helpers ───────────────────────────────────────────────────────

const ACC_KEYS_ORDERED: EquipmentKey[] = ['acc1', 'acc2', 'acc3']

/** Which equipment key would this inventory item displace? */
function getTargetEquipKey(item: Item, equipment: EquipmentSlots): EquipmentKey {
  if (item.slot !== 'acc') return item.slot as EquipmentKey
  const emptyAcc = ACC_KEYS_ORDERED.find(k => !equipment[k])
  return emptyAcc ?? 'acc1'
}

type StatRow = {
  key: keyof ItemStats
  oldVal: number   // 0 if equipped doesn't have it
  newVal: number   // 0 if incoming doesn't have it
  delta: number
}

function computeStatRows(equipped: Item | null, incoming: Item): StatRow[] {
  const keys = new Set<keyof ItemStats>([
    ...Object.keys(equipped?.stats ?? {}) as (keyof ItemStats)[],
    ...Object.keys(incoming.stats) as (keyof ItemStats)[],
  ])
  return Array.from(keys).map(k => {
    const oldVal = ((equipped?.stats ?? {}) as Record<string, number>)[k as string] ?? 0
    const newVal = (incoming.stats as Record<string, number>)[k as string] ?? 0
    return { key: k, oldVal, newVal, delta: newVal - oldVal }
  })
}

// ─── Selection state ──────────────────────────────────────────────────────────

type Selection =
  | { src: 'inventory'; id: string }
  | { src: 'equipment'; key: EquipmentKey }
  | null

// ─── Sub-components ───────────────────────────────────────────────────────────

function ItemCell({
  item,
  isSelected,
  isEn,
  size = 52,
  onClick,
}: {
  item: Item
  isSelected: boolean
  isEn: boolean
  size?: number
  onClick: () => void
}) {
  const displayName = itemDisplayName(item, isEn)
  const shortName = displayName.split(' ').slice(-1)[0].slice(0, 6)
  return (
    <button
      onClick={onClick}
      style={{ width: size, height: size }}
      className={cn(
        'relative rounded-lg border-2 flex flex-col items-center justify-center gap-0.5 transition-all shrink-0',
        RARITY_BORDER[item.rarity],
        RARITY_BG[item.rarity],
        isSelected && 'ring-2 ring-offset-1 ring-white dark:ring-slate-300 shadow-lg scale-105',
      )}
      title={displayName}
    >
      <span className={cn('text-[8px] font-black uppercase leading-none', RARITY_TEXT[item.rarity])}>
        {shortName}
      </span>
      <span className="text-[7px] text-slate-400 dark:text-slate-500 leading-none">
        Lv.{item.level}
      </span>
    </button>
  )
}

// ── Slot icon map ──────────────────────────────────────────────────────────────
type SlotIconComp = React.ComponentType<{ size?: number; className?: string }>
const SLOT_ICON: Partial<Record<string, SlotIconComp>> = {
  head:     HeadIcon,
  shoulder: ShoulderIcon,
  chest:    ChestIcon,
  gloves:   GlovesIcon,
  legs:     LegsIcon,
  feet:     FeetIcon,
  acc:      AccIcon,
  acc1:     AccIcon,
  acc2:     AccIcon,
  acc3:     AccIcon,
}

const WEAPON_ICON: Record<WeaponType, SlotIconComp> = {
  sword: SwordIcon,
  dagger: DaggerIcon,
  axe: AxeIcon,
  staff: StaffIcon,
  bow: BowIcon,
  shield: ShieldIcon,
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1).replace(/\.0$/, '')}%`
}

function weaponEffectText(type: WeaponType, progress: Record<WeaponType, WeaponProgress>, loadout: EquippedWeapons, isEn: boolean): string {
  const profile = getWeaponCombatProfile(progress, loadout)
  switch (type) {
    case 'sword': return isEn ? `${pct(profile.swordExtraHitChance)} double strike` : `${pct(profile.swordExtraHitChance)} golpe duplo`
    case 'dagger': return isEn ? `${pct(profile.daggerPoisonChance)} poison` : `${pct(profile.daggerPoisonChance)} veneno`
    case 'axe': return isEn ? `${pct(profile.axeBleedChance)} bleed, +${profile.axeBleedPower}/stack` : `${pct(profile.axeBleedChance)} sangramento, +${profile.axeBleedPower}/stack`
    case 'staff': return isEn ? `${pct(profile.staffCooldownReduction)} cooldown, ${pct(profile.staffSlotOneManaDiscount)} slot 1 mana` : `${pct(profile.staffCooldownReduction)} cooldown, ${pct(profile.staffSlotOneManaDiscount)} mana slot 1`
    case 'bow': return isEn ? `${pct(profile.bowMarkChance)} mark` : `${pct(profile.bowMarkChance)} marcar`
    case 'shield': return isEn ? `${pct(profile.shieldBlockChance)} block, ${pct(profile.shieldBlockReduction)} reduction` : `${pct(profile.shieldBlockChance)} block, ${pct(profile.shieldBlockReduction)} redução`
  }
}

function equippedWeaponCount(type: WeaponType, loadout: EquippedWeapons): number {
  return Number(loadout.mainHand === type) + Number(loadout.offHand === type)
}

function WeaponMasteryPanel({
  progress,
  equipped,
  materials,
  isEn,
  onEquip,
  onForge,
}: {
  progress: Record<WeaponType, WeaponProgress>
  equipped: EquippedWeapons
  materials: WeaponMaterials
  isEn: boolean
  onEquip: (hand: 'mainHand' | 'offHand', type: WeaponType) => void
  onForge: (type: WeaponType) => void
}) {
  const weaponProgress = normalizeWeaponProgress(progress)
  const loadout = normalizeEquippedWeapons(equipped)
  const statBonuses = getWeaponStatBonuses(weaponProgress, loadout)
  const statSummary = [
    statBonuses.atk ? `ATK +${statBonuses.atk}` : null,
    statBonuses.def ? `DEF +${statBonuses.def}` : null,
    statBonuses.attackSpeed ? `${isEn ? 'AtkSpd' : 'Vel'} ${formatPercent(statBonuses.attackSpeed)}` : null,
    statBonuses.critChance ? `${isEn ? 'Crit' : 'Crit'} +${formatPercent(statBonuses.critChance)}` : null,
    statBonuses.magicDamage ? `${isEn ? 'Magic Dmg' : 'Dano Magico'} +${statBonuses.magicDamage}` : null,
  ].filter(Boolean).join('  ')

  return (
    <div className="mb-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/30 p-3">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <p className="text-[9px] text-slate-400 dark:text-slate-600 uppercase tracking-widest font-semibold">
          {isEn ? 'Weapons' : 'Armas'}
        </p>
        <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-semibold">
          {WEAPON_LABELS[loadout.mainHand][isEn ? 'en' : 'pt']}
          {loadout.offHand ? ` + ${WEAPON_LABELS[loadout.offHand][isEn ? 'en' : 'pt']}` : ` (${isEn ? 'two-handed' : 'duas mãos'})`}
        </span>
        {statSummary && <span className="text-[9px] text-slate-500 dark:text-slate-500">{statSummary}</span>}
      </div>

      <div className="grid gap-2 md:grid-cols-[1fr_1fr]">
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/40 p-2">
          <p className="text-[8px] text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-1.5 font-bold">
            {isEn ? 'Main hand' : 'Mão principal'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {WEAPON_TYPES.filter(type => type !== 'shield').map(type => {
              const Icon = WEAPON_ICON[type]
              const active = loadout.mainHand === type
              return (
                <button
                  key={`main-${type}`}
                  onClick={() => onEquip('mainHand', type)}
                  className={cn(
                    'h-9 px-2 rounded-lg border flex items-center gap-1.5 text-[10px] font-bold transition-colors',
                    active
                      ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-500 hover:border-indigo-300',
                  )}
                >
                  <Icon size={18} />
                  {WEAPON_LABELS[type][isEn ? 'en' : 'pt']}
                </button>
              )
            })}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/40 p-2">
          <p className="text-[8px] text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-1.5 font-bold">
            {isEn ? 'Off hand' : 'Mão secundária'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {(['sword', 'dagger', 'shield'] as WeaponType[]).map(type => {
              const Icon = WEAPON_ICON[type]
              const active = loadout.offHand === type
              const disabled = !canEquipWeapon('offHand', type, loadout)
              return (
                <button
                  key={`off-${type}`}
                  onClick={() => onEquip('offHand', type)}
                  disabled={disabled}
                  className={cn(
                    'h-9 px-2 rounded-lg border flex items-center gap-1.5 text-[10px] font-bold transition-colors',
                    active
                      ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-500 hover:border-indigo-300',
                    disabled && 'opacity-35 cursor-not-allowed hover:border-slate-200 dark:hover:border-slate-700',
                  )}
                >
                  <Icon size={18} />
                  {WEAPON_LABELS[type][isEn ? 'en' : 'pt']}
                </button>
              )
            })}
            {TWO_HANDED_WEAPONS.has(loadout.mainHand) && (
              <span className="self-center text-[9px] text-slate-400 dark:text-slate-600 italic">
                {isEn ? 'Locked by two-handed weapon' : 'Bloqueado por arma de duas mãos'}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-2 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
        {WEAPON_TYPES.map(type => {
          const p = weaponProgress[type]
          const Icon = WEAPON_ICON[type]
          const xpPct = p.level >= p.maxLevel ? 100 : Math.max(0, Math.min(100, (p.xp / p.xpToNext) * 100))
          const atCap = isWeaponAtForgeCap(p)
          const materialTier = weaponForgeMaterialTier(p)
          const forgeCost = weaponForgeCost(p)
          const owned = materials[materialTier] ?? 0
          const canForge = atCap && owned >= forgeCost
          const equippedHere = loadout.mainHand === type || loadout.offHand === type
          const equippedCount = equippedWeaponCount(type, loadout)
          const effectLoadout: EquippedWeapons = equippedHere
            ? loadout
            : { mainHand: type === 'shield' ? 'sword' : type, offHand: type === 'shield' ? 'shield' : null }

          return (
            <div key={type} className={cn(
              'rounded-lg border px-2 py-2 bg-white/80 dark:bg-slate-900/50',
              equippedHere ? 'border-indigo-300 dark:border-indigo-700' : 'border-slate-200 dark:border-slate-800',
            )}>
              <div className="flex items-center gap-2">
                <Icon size={22} className={equippedHere ? 'opacity-100' : 'opacity-60'} />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-black text-slate-700 dark:text-slate-200 truncate">
                    {WEAPON_LABELS[type][isEn ? 'en' : 'pt']}
                  </p>
                  <p className="text-[8px] text-slate-400 dark:text-slate-600">
                    T{p.tier} · Lv.{p.level}/{p.maxLevel}
                  </p>
                </div>
                {equippedHere && (
                  <div className="flex items-center gap-1">
                    {equippedCount > 1 && (
                      <span
                        title={isEn ? 'Effect stacks from both hands' : 'Efeito acumulado pelas duas maos'}
                        className="rounded border border-amber-300/70 dark:border-amber-600/60 bg-amber-50 dark:bg-amber-950/40 px-1 py-0.5 text-[8px] font-black text-amber-600 dark:text-amber-300"
                      >
                        x{equippedCount}
                      </span>
                    )}
                    <span className="text-[8px] font-bold text-indigo-500 dark:text-indigo-400">
                      {isEn ? 'ON' : 'EQP'}
                    </span>
                  </div>
                )}
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div className="h-full rounded-full bg-indigo-500" style={{ width: `${xpPct}%` }} />
              </div>
              <p className="mt-1 text-[9px] text-slate-500 dark:text-slate-500 min-h-4">
                {weaponEffectText(type, weaponProgress, effectLoadout, isEn)}
                {equippedCount > 1 && (
                  <span className="ml-1 font-bold text-amber-500 dark:text-amber-300">
                    {isEn ? '(x2 stacked)' : '(x2 acumulado)'}
                  </span>
                )}
              </p>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="text-[8px] text-slate-400 dark:text-slate-600 flex-1">
                  {WEAPON_MATERIAL_LABELS[isEn ? 'en' : 'pt']} T{materialTier}: {owned}/{forgeCost}
                </span>
                <button
                  onClick={() => onForge(type)}
                  disabled={!canForge}
                  className={cn(
                    'px-2 py-1 rounded-md text-[8px] font-black border transition-colors',
                    canForge
                      ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50'
                      : 'border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-600 opacity-60 cursor-not-allowed',
                  )}
                >
                  {isEn ? 'Forge' : 'Forjar'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function EmptyEquipSlot({
  slot,
  label,
  title,
  onClick,
  isTarget,
}: {
  slot?: string
  label: string
  title?: string
  onClick: () => void
  isTarget?: boolean
}) {
  const Icon = slot ? SLOT_ICON[slot] : undefined
  return (
    <button
      onClick={onClick}
      title={title ?? label}
      style={{ width: 52, height: 52 }}
      className={cn(
        'rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-0.5 transition-colors shrink-0',
        isTarget
          ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
          : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50',
      )}
    >
      {Icon && (
        <Icon
          size={22}
          className={isTarget ? 'opacity-80' : 'opacity-30'}
        />
      )}
      <span className={cn(
        'text-[7px] font-semibold uppercase tracking-wide',
        isTarget ? 'text-indigo-400' : 'text-slate-400 dark:text-slate-600',
      )}>
        {label}
      </span>
    </button>
  )
}

// ─── Equipment Body ───────────────────────────────────────────────────────────

function EquipmentBody({
  equipment,
  selected,
  isEn,
  onSlotClick,
}: {
  equipment: EquipmentSlots
  selected: Selection
  isEn: boolean
  onSlotClick: (key: EquipmentKey) => void
}) {
  const slotLabels = isEn ? SLOT_LABEL_EN : SLOT_LABEL_PT
  const slotFull   = isEn ? SLOT_FULL_EN  : SLOT_FULL_PT

  // Determine if a selected inventory item can go in a given slot
  const selInv = selected?.src === 'inventory' ? selected.id : null

  return (
    <div
      className="shrink-0"
      style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 52px)', gap: 4 }}
    >
      {EQUIP_GRID.map((key, i) => {
        if (!key) {
          // Ghost cell — shows the body silhouette background
          return (
            <div
              key={i}
              style={{ width: 52, height: 52 }}
              className="rounded-lg bg-slate-100/40 dark:bg-slate-800/20"
            />
          )
        }
        const item  = equipment[key]
        const isSel = selected?.src === 'equipment' && selected.key === key
        return (
          <div key={key}>
            {item
                ? <ItemCell
                    item={item}
                    isSelected={isSel}
                    isEn={isEn}
                    onClick={() => onSlotClick(key)}
                  />
              : <EmptyEquipSlot
                  slot={key}
                  label={slotLabels[key]}
                  title={slotFull[key]}
                  isTarget={!!selInv}
                  onClick={() => onSlotClick(key)}
                />
            }
          </div>
        )
      })}
    </div>
  )
}

// ─── Inventory Grid ───────────────────────────────────────────────────────────

function InventoryGrid({
  inventory,
  maxSlots,
  selected,
  isEn,
  gold,
  expandCost,
  onItemClick,
  onExpand,
  sellMode,
  sellSelected,
}: {
  inventory: Item[]
  maxSlots: number
  selected: Selection
  isEn: boolean
  gold: number
  expandCost: number
  onItemClick: (item: Item) => void
  onExpand: () => void
  sellMode?: boolean
  sellSelected?: Set<string>
}) {
  const canExpand = gold >= expandCost
  const cells: (Item | null)[] = [
    ...inventory,
    ...Array(Math.max(0, maxSlots - inventory.length)).fill(null),
  ]

  return (
    <div className="flex-1 min-w-0">
      <div className="flex flex-wrap gap-1">
        {cells.map((item, i) => {
          if (!item) {
            return (
              <div
                key={`empty-${i}`}
                style={{ width: 52, height: 52 }}
                className="rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40"
              />
            )
          }
          if (sellMode) {
            const isChosen = sellSelected?.has(item.id) ?? false
            return (
              <button
                key={item.id}
                onClick={() => onItemClick(item)}
                style={{ width: 52, height: 52 }}
                className={cn(
                  'relative rounded-lg border-2 flex flex-col items-center justify-center gap-0.5 transition-all shrink-0',
                  isChosen
                    ? 'border-red-400 dark:border-red-500 bg-red-50 dark:bg-red-900/25 ring-2 ring-red-400 ring-offset-1 scale-105'
                    : cn(RARITY_BORDER[item.rarity], RARITY_BG[item.rarity], 'opacity-70 hover:opacity-100'),
                )}
                title={itemDisplayName(item, isEn)}
              >
                <span className={cn('text-[8px] font-black uppercase leading-none', isChosen ? 'text-red-500 dark:text-red-400' : RARITY_TEXT[item.rarity])}>
                  {itemDisplayName(item, isEn).split(' ').slice(-1)[0].slice(0, 6)}
                </span>
                <span className="text-[7px] text-slate-400 dark:text-slate-500 leading-none">
                  Lv.{item.level}
                </span>
                {isChosen && (
                  <span className="absolute top-0.5 right-0.5 text-[9px] leading-none text-red-500 font-black">✓</span>
                )}
              </button>
            )
          }
          const isSel = selected?.src === 'inventory' && selected.id === item.id
          return (
            <ItemCell
              key={item.id}
              item={item}
              isSelected={isSel}
              isEn={isEn}
              onClick={() => onItemClick(item)}
            />
          )
        })}
      </div>

      {/* Expand button */}
      <button
        onClick={onExpand}
        disabled={!canExpand}
        className={cn(
          'mt-2 w-full py-1.5 rounded-lg text-[10px] font-semibold border transition-colors',
          canExpand
            ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-400 dark:border-yellow-700 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/40'
            : 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500',
        )}
      >
        {isEn ? `Expand (+6 slots) — ${expandCost} ⬡` : `Expandir (+6 slots) — ${expandCost} ⬡`}
      </button>
      <p className="mt-1 text-[9px] text-slate-400 dark:text-slate-600 text-center tabular-nums">
        {inventory.length}/{maxSlots} {isEn ? 'slots used' : 'slots usados'}
      </p>
    </div>
  )
}

// ─── Item Detail Panel ────────────────────────────────────────────────────────

function ItemDetail({
  item,
  src,
  equipKey,
  isEn,
  canUnequip,
  onEquip,
  onUnequip,
  onDrop,
}: {
  item: Item
  src: 'inventory' | 'equipment'
  equipKey?: EquipmentKey
  isEn: boolean
  canUnequip: boolean
  onEquip: () => void
  onUnequip: () => void
  onDrop: () => void
}) {
  const statLabels = isEn ? STAT_LABEL_EN : STAT_LABEL_PT
  const rarityLabel = RARITY_LABEL[item.rarity][isEn ? 1 : 0]
  const slotName    = equipKey
    ? (isEn ? SLOT_FULL_EN[equipKey] : SLOT_FULL_PT[equipKey])
    : (isEn ? SLOT_FULL_EN[item.slot as EquipmentKey] ?? item.slot : SLOT_FULL_PT[item.slot as EquipmentKey] ?? item.slot)

  return (
    <div className={cn(
      'mt-2 rounded-xl border-2 p-3 flex items-start gap-4',
      RARITY_BORDER[item.rarity],
      RARITY_BG[item.rarity],
    )}>
      {/* Left: name + rarity + slot */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('text-xs font-bold truncate', RARITY_TEXT[item.rarity])}>
            {itemDisplayName(item, isEn)}
          </span>
          <span className={cn(
            'text-[8px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded',
            RARITY_BG[item.rarity], RARITY_TEXT[item.rarity], 'border', RARITY_BORDER[item.rarity],
          )}>
            {rarityLabel}
          </span>
          <span className="text-[9px] text-slate-500 dark:text-slate-500">
            {isEn ? 'Lv.' : 'Nv.'}{item.level} · {slotName}
          </span>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
          {Object.entries(item.stats).map(([k, v]) => {
            const label = statLabels[k as keyof ItemStats] ?? k
            return (
              <span key={k} className="text-[10px] text-slate-600 dark:text-slate-400">
                <span className="font-medium text-slate-500 dark:text-slate-500">{label}</span>{' '}
                <span className={cn('font-semibold', RARITY_TEXT[item.rarity])}>
                  {formatStat(k as keyof ItemStats, v as number)}
                </span>
              </span>
            )
          })}
        </div>

        {/* Set bonus */}
        {item.setBonus && (
          <div className="mt-1 text-[9px] text-yellow-600 dark:text-yellow-400 font-semibold bg-yellow-50 dark:bg-yellow-900/20 rounded px-1.5 py-0.5 inline-flex items-center gap-1">
            ◆ {isEn ? 'Set bonus:' : 'Bônus de conjunto:'}{' '}
            {formatStat(item.setBonus.stat, item.setBonus.value)}{' '}
            {(statLabels[item.setBonus.stat] ?? item.setBonus.stat)}{' '}
            {isEn ? 'per set item' : 'por item do conjunto'}
          </div>
        )}

        {/* Attribute bonus (unique) */}
        {item.attrBonus && Object.keys(item.attrBonus).length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {Object.entries(item.attrBonus).map(([k, v]) => {
              const label = isEn ? ATTR_LABEL_EN[k as keyof typeof ATTR_LABEL_EN] : ATTR_LABEL_PT[k as keyof typeof ATTR_LABEL_PT]
              return (
                <span key={k} className="text-[9px] font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 rounded px-1.5 py-0.5">
                  +{v} {label}
                </span>
              )
            })}
          </div>
        )}
      </div>

      {/* Right: action buttons */}
      <div className="flex gap-1.5 shrink-0">
        {src === 'inventory' && (
          <>
            <button
              onClick={onEquip}
              className="px-2.5 py-1 rounded text-[10px] font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              {isEn ? 'Equip' : 'Equipar'}
            </button>
            <button
              onClick={onDrop}
              className="px-2 py-1 rounded text-[10px] font-semibold bg-slate-200 dark:bg-slate-700 hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              {isEn ? 'Drop' : 'Descartar'}
            </button>
          </>
        )}
        {src === 'equipment' && (
          <button
            onClick={onUnequip}
            disabled={!canUnequip}
            className={cn(
              'px-2.5 py-1 rounded text-[10px] font-semibold transition-colors',
              canUnequip
                ? 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300'
                : 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400',
            )}
            title={canUnequip ? undefined : (isEn ? 'Inventory full' : 'Inventário cheio')}
          >
            {isEn ? 'Unequip' : 'Desequipar'}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Comparison Detail (equipped vs incoming) ─────────────────────────────────

function ComparisonDetail({
  equipped,
  incoming,
  isEn,
  canEquip,
  onEquip,
  onDrop,
}: {
  equipped: Item
  incoming: Item
  isEn: boolean
  canEquip: boolean
  onEquip: () => void
  onDrop: () => void
}) {
  const statLabels  = isEn ? STAT_LABEL_EN : STAT_LABEL_PT
  const rows        = computeStatRows(equipped, incoming)
  const rarityLabelIdx = isEn ? 1 : 0

  function HeaderCard({ item, dim }: { item: Item; dim?: boolean }) {
    return (
      <div className={cn(
        'flex-1 min-w-0 rounded-lg border-2 px-2.5 py-2 transition-opacity',
        RARITY_BORDER[item.rarity],
        RARITY_BG[item.rarity],
        dim && 'opacity-55',
      )}>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={cn('text-[10px] font-bold truncate', RARITY_TEXT[item.rarity])}>
            {itemDisplayName(item, isEn)}
          </span>
          <span className={cn(
            'shrink-0 text-[8px] font-semibold uppercase tracking-widest px-1 py-px rounded border',
            RARITY_BG[item.rarity], RARITY_TEXT[item.rarity], RARITY_BORDER[item.rarity],
          )}>
            {RARITY_LABEL[item.rarity][rarityLabelIdx]}
          </span>
        </div>
        <p className="text-[9px] text-slate-500 dark:text-slate-500 mt-0.5">
          {isEn ? 'Lv.' : 'Nv.'}{item.level}
        </p>
      </div>
    )
  }

  return (
    <div className={cn(
      'mt-2 rounded-xl border-2 p-3',
      RARITY_BORDER[incoming.rarity],
      RARITY_BG[incoming.rarity],
    )}>
      {/* Two item cards */}
      <div className="flex items-center gap-2 mb-3">
        <HeaderCard item={equipped} dim />
        <span className="shrink-0 text-slate-400 dark:text-slate-500 text-sm font-bold">→</span>
        <HeaderCard item={incoming} />
      </div>

      {/* Stat comparison rows */}
      <div className="rounded-lg bg-white/60 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-700/50 overflow-hidden">
        {rows.map(({ key, oldVal, newVal, delta }, i) => {
          const label  = statLabels[key] ?? key
          const isLast = i === rows.length - 1
          const up   = delta > 0
          const down = delta < 0

          return (
            <div
              key={key}
              className={cn(
                'flex items-center gap-2 px-2.5 py-1 text-[10px]',
                !isLast && 'border-b border-slate-100 dark:border-slate-800',
                i % 2 === 0 ? 'bg-transparent' : 'bg-slate-50/60 dark:bg-slate-800/30',
              )}
            >
              {/* Stat name */}
              <span className="w-24 shrink-0 text-slate-500 dark:text-slate-500 font-medium truncate">
                {label}
              </span>

              {/* Old value */}
              <span className="w-16 text-right tabular-nums text-slate-400 dark:text-slate-600 line-through">
                {oldVal !== 0 ? formatStat(key, oldVal) : '—'}
              </span>

              {/* Arrow */}
              <span className="text-slate-300 dark:text-slate-700">›</span>

              {/* New value */}
              <span className={cn(
                'w-16 text-right tabular-nums font-semibold',
                up   ? 'text-green-600 dark:text-green-400'  :
                down ? 'text-red-500   dark:text-red-400'    :
                       'text-slate-500 dark:text-slate-400',
              )}>
                {newVal !== 0 ? formatStat(key, newVal) : '—'}
              </span>

              {/* Delta badge */}
              <span className={cn(
                'ml-auto shrink-0 font-bold tabular-nums',
                up   ? 'text-green-600 dark:text-green-400'  :
                down ? 'text-red-500   dark:text-red-400'    :
                       'text-slate-400 dark:text-slate-600',
              )}>
                {up   && `▲ ${formatDelta(key, delta)}`}
                {down && `▼ ${formatDelta(key, delta)}`}
                {!up && !down && '='}
              </span>
            </div>
          )
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3 justify-end">
        <button
          onClick={onDrop}
          className="px-2 py-1 rounded text-[10px] font-semibold bg-slate-200 dark:bg-slate-700 hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
        >
          {isEn ? 'Drop new' : 'Descartar'}
        </button>
        <button
          onClick={onEquip}
          disabled={!canEquip}
          className={cn(
            'px-3 py-1 rounded text-[10px] font-semibold transition-colors',
            canEquip
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
              : 'opacity-40 cursor-not-allowed bg-slate-300 dark:bg-slate-700 text-slate-500',
          )}
          title={!canEquip ? (isEn ? 'Inventory full — cannot return equipped item' : 'Inventário cheio — não é possível devolver item equipado') : undefined}
        >
          {isEn ? 'Equip (replace)' : 'Equipar (substituir)'}
        </button>
      </div>
    </div>
  )
}

// ─── Auto-sell config panel ───────────────────────────────────────────────────

function AutoSellPanel({ isEn }: { isEn: boolean }) {
  const autoSell    = useInventoryStore(s => s.autoSell)
  const setAutoSell = useInventoryStore(s => s.setAutoSell)

  const RARITY_CHIP_LABEL: Record<ItemRarity, [string, string]> = {
    common:   ['Comum',    'Common'],
    uncommon: ['Incomum',  'Uncommon'],
    rare:     ['Raro',     'Rare'],
    epic:     ['Épico',    'Epic'],
    set:      ['Conjunto', 'Set'],
    unique:   ['Único',    'Unique'],
  }

  function toggleRarity(r: ItemRarity) {
    const next = autoSell.rarities.includes(r)
      ? autoSell.rarities.filter(x => x !== r)
      : [...autoSell.rarities, r]
    setAutoSell({ rarities: next })
  }

  return (
    <div className="mb-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-2.5 flex flex-col gap-2">
      {/* Master toggle row */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
          {isEn ? 'Auto-sell' : 'Auto-venda'}
        </span>
        <button
          onClick={() => setAutoSell({ enabled: !autoSell.enabled })}
          className={cn(
            'relative inline-flex h-4 w-7 shrink-0 rounded-full border-2 transition-colors',
            autoSell.enabled
              ? 'border-indigo-500 bg-indigo-500'
              : 'border-slate-300 dark:border-slate-600 bg-slate-200 dark:bg-slate-700',
          )}
          aria-label={isEn ? 'Toggle auto-sell' : 'Ativar/desativar auto-venda'}
        >
          <span className={cn(
            'block h-2.5 w-2.5 rounded-full bg-white shadow transition-transform mt-px',
            autoSell.enabled ? 'translate-x-2.5' : 'translate-x-px',
          )} />
        </button>
      </div>

      {/* Rarity chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[9px] text-slate-400 dark:text-slate-600 shrink-0">
          {isEn ? 'Rarities:' : 'Raridades:'}
        </span>
        {ALL_RARITIES.map(r => {
          const active = autoSell.rarities.includes(r)
          return (
            <button
              key={r}
              onClick={() => toggleRarity(r)}
              className={cn(
                'px-1.5 py-0.5 rounded text-[8px] font-semibold border transition-colors',
                active
                  ? cn(RARITY_BORDER[r], RARITY_BG[r], RARITY_TEXT[r])
                  : 'border-slate-200 dark:border-slate-700 bg-transparent text-slate-400 dark:text-slate-600',
              )}
            >
              {RARITY_CHIP_LABEL[r][isEn ? 1 : 0]}
            </button>
          )
        })}
      </div>

      {/* Max level filter */}
      <div className="flex items-center gap-2">
        <span className="text-[9px] text-slate-400 dark:text-slate-600 shrink-0">
          {isEn ? 'Max level:' : 'Nível máx.:'}
        </span>
        <input
          type="number"
          min={0}
          step={1}
          value={autoSell.maxLevel}
          onChange={e => setAutoSell({ maxLevel: Math.max(0, parseInt(e.target.value, 10) || 0) })}
          className="w-14 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-[10px] text-slate-700 dark:text-slate-300 tabular-nums text-right"
        />
        <span className="text-[9px] text-slate-400 dark:text-slate-600">
          {autoSell.maxLevel === 0 ? (isEn ? '(any)' : '(qualquer)') : ''}
        </span>
      </div>
    </div>
  )
}

// ─── Main InventoryPanel ──────────────────────────────────────────────────────

export default function InventoryPanel({ section }: { section?: 'equips' | 'consumables' } = {}) {
  const inventory          = useInventoryStore(s => s.inventory)
  const equipment          = useInventoryStore(s => s.equipment)
  const maxSlots           = useInventoryStore(s => s.maxSlots)
  const equipItem          = useInventoryStore(s => s.equipItem)
  const unequipSlot        = useInventoryStore(s => s.unequipSlot)
  const dropItem           = useInventoryStore(s => s.dropItem)
  const expandSlots        = useInventoryStore(s => s.expandSlots)
  const getExpandCost      = useInventoryStore(s => s.getExpandCost)
  const optimizeEquipment  = useInventoryStore(s => s.optimizeEquipment)
  const autoSell           = useInventoryStore(s => s.autoSell)
  const consumables        = useInventoryStore(s => s.consumables)
  const quickslots         = useInventoryStore(s => s.quickslots)
  const weaponProgress     = useInventoryStore(s => s.weaponProgress)
  const equippedWeapons    = useInventoryStore(s => s.equippedWeapons)
  const weaponMaterials    = useInventoryStore(s => s.weaponMaterials)
  const equipWeapon        = useInventoryStore(s => s.equipWeapon)
  const forgeWeapon        = useInventoryStore(s => s.forgeWeapon)
  const removeConsumable   = useInventoryStore(s => s.removeConsumable)
  const assignQuickslot    = useInventoryStore(s => s.assignQuickslot)
  const sellMode           = useInventoryStore(s => s.sellMode)
  const selectedForSale    = useInventoryStore(s => s.selectedForSale)
  const setSellMode        = useInventoryStore(s => s.setSellMode)
  const toggleSellSelection = useInventoryStore(s => s.toggleSellSelection)
  const confirmSale        = useInventoryStore(s => s.confirmSale)

  const attrs          = useHeroStore(s => s.attributes)
  const gold           = useHeroStore(s => s.gold)
  const spendGold      = useHeroStore(s => s.spendGold)
  const earnGold       = useHeroStore(s => s.earnGold)
  const restoreStamina = useHeroStore(s => s.restoreStamina)
  const restoreMana    = useHeroStore(s => s.restoreMana)
  const gainSkipCharge = useHeroStore(s => s.gainSkipCharge)
  const gainXp         = useHeroStore(s => s.gainXp)
  const heroLevel      = useHeroStore(s => s.level)
  const setActiveTab   = useUIStore(s => s.setActiveTab)
  const lang           = useSettingsStore(s => s.lang)
  const isEn           = lang === 'en'

  const [selected, setSelected]           = useState<Selection>(null)
  const [autoSellOpen, setAutoSellOpen]   = useState(false)
  const [selectedCon, setSelectedCon]     = useState<string | null>(null)

  const expandCost = getExpandCost()

  // ── Sell mode derived ──
  const sellSelectedSet = new Set(selectedForSale)
  const sellTotal = inventory
    .filter(i => sellSelectedSet.has(i.id))
    .reduce((acc, i) => acc + localSellPrice(i), 0)

  // ── Derived selection info ──
  let selectedItem: Item | null = null
  let selectedEquipKey: EquipmentKey | undefined
  let comparedEquipped: Item | null = null   // the item currently in the target slot

  if (selected?.src === 'inventory') {
    selectedItem = inventory.find(i => i.id === selected.id) ?? null
    if (selectedItem) {
      const targetKey   = getTargetEquipKey(selectedItem, equipment)
      comparedEquipped  = equipment[targetKey] ?? null
    }
  } else if (selected?.src === 'equipment') {
    selectedEquipKey = selected.key
    selectedItem = equipment[selected.key] ?? null
  }

  // ── Equipment stat totals ──
  const equipBonuses    = getEquipmentBonuses(equipment)
  const hasEquipBonuses =
    Object.entries(equipBonuses).some(([k, v]) => k !== 'attrBonus' && (v as number) !== 0) ||
    Object.keys(equipBonuses.attrBonus).length > 0

  // ── Handlers ──
  function handleInventoryClick(item: Item) {
    if (sellMode) {
      toggleSellSelection(item.id)
      return
    }
    if (selected?.src === 'inventory' && selected.id === item.id) {
      setSelected(null)
    } else {
      setSelected({ src: 'inventory', id: item.id })
    }
  }

  function returnToMarket() {
    setActiveTab('battle')
  }

  function handleConfirmSale() {
    const earned = confirmSale()
    if (earned > 0) earnGold(earned)
    returnToMarket()
  }

  function handleCancelSell() {
    setSellMode(false)
    returnToMarket()
  }

  function handleEquipSlotClick(key: EquipmentKey) {
    // If we have a selected inventory item, try to equip it into this slot
    if (selected?.src === 'inventory') {
      const invItem = inventory.find(i => i.id === selected.id)
      if (invItem) {
        // Check if the item's slot matches this key
        const keySlot = key.startsWith('acc') ? 'acc' : key
        if (invItem.slot === keySlot) {
          equipItem(invItem.id)
          setSelected(null)
          return
        }
      }
    }
    // Otherwise, select/deselect this equipment slot
    if (!equipment[key]) { setSelected(null); return }
    if (selected?.src === 'equipment' && selected.key === key) {
      setSelected(null)
    } else {
      setSelected({ src: 'equipment', key })
    }
  }

  function handleEquip() {
    if (selected?.src !== 'inventory') return
    equipItem(selected.id)
    setSelected(null)
  }

  function handleUnequip() {
    if (selected?.src !== 'equipment') return
    unequipSlot(selected.key)
    setSelected(null)
  }

  function handleDrop() {
    if (selected?.src !== 'inventory') return
    dropItem(selected.id)
    setSelected(null)
  }

  function handleExpand() {
    if (gold < expandCost) return
    spendGold(expandCost)
    expandSlots()
  }

  const canUnequip = inventory.length < maxSlots

  // ── Consumable helpers ──
  function applyConsumable(c: Consumable) {
    const derived = getDerivedStats(attrs, equipBonuses, heroLevel)
    switch (c.effect) {
      case 'stamina': restoreStamina(derived.maxStamina * c.magnitude, derived.maxStamina); break
      case 'mana':    restoreMana(derived.maxMana * c.magnitude, derived.maxMana);           break
      case 'skip':    for (let i = 0; i < c.magnitude; i++) gainSkipCharge(); break
      case 'xp':      gainXp(Math.round(c.magnitude));                  break
    }
  }

  function handleUseConsumable(id: string) {
    const c = removeConsumable(id)
    if (c) { applyConsumable(c); setSelectedCon(null) }
  }

  function consumableEffectDesc(c: Consumable): string {
    switch (c.effect) {
      case 'stamina': return `${isEn ? 'Restore' : 'Restaura'} ${Math.round(c.magnitude * 100)}% Stamina`
      case 'mana':    return `${isEn ? 'Restore' : 'Restaura'} ${Math.round(c.magnitude * 100)}% Mana`
      case 'skip':    return `+${c.magnitude} ${isEn ? 'Skip Charge' : 'Turbo Charge'}${c.magnitude > 1 ? 's' : ''}`
      case 'xp':      return `+${Math.round(c.magnitude)} XP`
    }
  }

  return (
    <div id="inventory-panel" className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-4">
      {/* Header + Equipment+Inventory body — hidden when showing consumables only */}
      {(!section || section === 'equips') && <>
      <div className="flex items-center gap-3 mb-4">
        <p className="text-[10px] text-slate-400 dark:text-slate-600 uppercase tracking-widest font-semibold">
          {isEn ? 'Equipment & Inventory' : 'Equipamento & Inventário'}
        </p>
        {hasEquipBonuses && (
          <span className="text-[10px] text-indigo-500 dark:text-indigo-400 italic">
            {isEn ? '— bonuses applied to stats' : '— bônus aplicados aos atributos'}
          </span>
        )}
      </div>

      <WeaponMasteryPanel
        progress={weaponProgress}
        equipped={equippedWeapons}
        materials={weaponMaterials}
        isEn={isEn}
        onEquip={equipWeapon}
        onForge={forgeWeapon}
      />

      {/* Main two-column layout (stacks on mobile) */}
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-start">
        {/* Left: Equipment silhouette */}
        <div className="w-full sm:w-auto flex flex-col items-center sm:items-start">
          <p className="text-[9px] text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-2 font-semibold self-start">
            {isEn ? 'Equipment' : 'Equipamento'}
          </p>
          <EquipmentBody
            equipment={equipment}
            selected={selected}
            isEn={isEn}
            onSlotClick={handleEquipSlotClick}
          />
        </div>

        {/* Right: Inventory grid */}
        <div className="flex-1 min-w-0">
          {/* Inventory section header with action buttons */}
          <div className="flex items-center gap-2 mb-2">
            <p className="text-[9px] text-slate-400 dark:text-slate-600 uppercase tracking-widest font-semibold">
              {isEn ? 'Inventory' : 'Inventário'}
            </p>
            <div className="ml-auto flex items-center gap-1.5">
              {/* Optimize button */}
              <button
                onClick={optimizeEquipment}
                className="px-2 py-0.5 rounded text-[9px] font-semibold border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors"
                title={isEn ? 'Auto-equip best items per slot' : 'Equipa automaticamente os melhores itens por slot'}
              >
                ⚡ {isEn ? 'Optimize' : 'Otimizar'}
              </button>
              {/* Auto-sell toggle button */}
              <button
                onClick={() => setAutoSellOpen(o => !o)}
                className={cn(
                  'px-2 py-0.5 rounded text-[9px] font-semibold border transition-colors',
                  autoSellOpen || autoSell.enabled
                    ? 'border-yellow-400 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                    : 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700',
                )}
              >
                🏷 {isEn ? 'Auto-sell' : 'Auto-venda'} {autoSellOpen ? '▲' : '▼'}
              </button>
            </div>
          </div>

          {/* Auto-sell config panel (collapsible) */}
          {autoSellOpen && <AutoSellPanel isEn={isEn} />}

          {/* Sell mode banner */}
          {sellMode && (
            <div className="mb-2 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 px-3 py-2 flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-semibold text-red-600 dark:text-red-400 flex-1">
                🏷 {isEn
                  ? `Select items to sell — ${selectedForSale.length} selected`
                  : `Selecione itens para vender — ${selectedForSale.length} selecionado${selectedForSale.length !== 1 ? 's' : ''}`}
              </span>
              <span className="text-[10px] text-red-500 dark:text-red-400 font-bold tabular-nums">
                {sellTotal} ⬡
              </span>
            </div>
          )}

          <InventoryGrid
            inventory={inventory}
            maxSlots={maxSlots}
            selected={selected}
            isEn={isEn}
            gold={gold}
            expandCost={expandCost}
            onItemClick={handleInventoryClick}
            onExpand={handleExpand}
            sellMode={sellMode}
            sellSelected={sellSelectedSet}
          />

          {/* Sell mode confirm/cancel footer */}
          {sellMode && (
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={handleCancelSell}
                className="flex-1 py-2 rounded-xl text-[11px] font-semibold border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                {isEn ? 'Cancel' : 'Cancelar'}
              </button>
              <button
                onClick={handleConfirmSale}
                disabled={selectedForSale.length === 0}
                className={cn(
                  'flex-[2] py-2 rounded-xl text-[11px] font-semibold border transition-colors',
                  selectedForSale.length > 0
                    ? 'bg-red-600 hover:bg-red-500 border-red-500 text-white'
                    : 'opacity-40 cursor-not-allowed bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-400',
                )}
              >
                {isEn
                  ? `Sell ${selectedForSale.length} item${selectedForSale.length !== 1 ? 's' : ''} — ${sellTotal} ⬡`
                  : `Vender ${selectedForSale.length} item${selectedForSale.length !== 1 ? 'ns' : ''} — ${sellTotal} ⬡`}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Equipment bonuses summary */}
      {hasEquipBonuses && (
        <div className="mt-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 px-3 py-2">
          <p className="text-[9px] text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-1.5 font-semibold">
            {isEn ? 'Total Equipment Bonuses' : 'Bônus de Equipamento'}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5">
            {(Object.entries(equipBonuses) as [string, unknown][])
              .filter(([k, v]) => k !== 'attrBonus' && (v as number) !== 0)
              .map(([k, v]) => {
                const sk = k as keyof ItemStats
                const label = isEn ? STAT_LABEL_EN[sk] : STAT_LABEL_PT[sk]
                return (
                  <span key={k} className="text-[10px] text-slate-500 dark:text-slate-500">
                    <span className="text-slate-400">{label ?? k}</span>{' '}
                    <span className="font-semibold text-indigo-500 dark:text-indigo-400">
                      {formatStat(sk, v as number)}
                    </span>
                  </span>
                )
              })}
            {Object.entries(equipBonuses.attrBonus).map(([k, v]) => {
              const label = isEn
                ? ATTR_LABEL_EN[k as keyof typeof ATTR_LABEL_EN]
                : ATTR_LABEL_PT[k as keyof typeof ATTR_LABEL_PT]
              return (
                <span key={k} className="text-[10px] text-orange-500 dark:text-orange-400 font-semibold">
                  ★ {label} +{v}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Detail area — fixed min-height so the layout above never jumps */}
      <div className="mt-2 min-h-[160px]">
        {selectedItem && selected?.src === 'inventory' && comparedEquipped && (
          <ComparisonDetail
            equipped={comparedEquipped}
            incoming={selectedItem}
            isEn={isEn}
            canEquip={true}
            onEquip={handleEquip}
            onDrop={handleDrop}
          />
        )}
        {selectedItem && !(selected?.src === 'inventory' && comparedEquipped) && (
          <ItemDetail
            item={selectedItem}
            src={selected!.src}
            equipKey={selectedEquipKey}
            isEn={isEn}
            canUnequip={canUnequip}
            onEquip={handleEquip}
            onUnequip={handleUnequip}
            onDrop={handleDrop}
          />
        )}

        {/* Empty state hint — only shown when absolutely no items and nothing selected */}
        {!selectedItem && inventory.length === 0 && Object.keys(equipment).length === 0 && (
          <p className="pt-6 text-center text-[10px] text-slate-400 dark:text-slate-600 italic">
            {isEn
              ? 'No items yet — defeat monsters to find loot!'
              : 'Nenhum item ainda — derrote monstros para encontrar equipamentos!'}
          </p>
        )}
      </div>

      </>}

      {/* ─── Spellbook section ───────────────────────────────────────────── */}
      {!section && (
        <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4">
          <p className="text-[9px] text-slate-400 dark:text-slate-600 uppercase tracking-widest font-semibold mb-3">
            {isEn ? 'Spellbook' : 'Grimório'}
          </p>
          <SpellbookPanel />
        </div>
      )}

      {/* ─── Consumables section ─────────────────────────────────────────── */}
      {(!section || section === 'consumables') && <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4">
        {/* Header: label + quickslots */}
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <p className="text-[9px] text-slate-400 dark:text-slate-600 uppercase tracking-widest font-semibold shrink-0">
            {isEn ? `Consumables (${consumables.length}/8)` : `Consumíveis (${consumables.length}/8)`}
          </p>
          {/* Quickslot strip */}
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] text-slate-400 dark:text-slate-600 uppercase tracking-widest shrink-0">
              {isEn ? 'Slots:' : 'Atalhos:'}
            </span>
            {quickslots.map((qid, slot) => {
              const qcon = qid ? consumables.find(c => c.id === qid) : null
              const isSelecting = selectedCon !== null
              return (
                <button
                  key={slot}
                  onClick={() => {
                    if (isSelecting && selectedCon) {
                      assignQuickslot(slot, selectedCon)
                      setSelectedCon(null)
                    }
                  }}
                  title={qcon ? (isEn ? qcon.nameEn : qcon.name) : (isEn ? `Quickslot ${slot + 1}` : `Atalho ${slot + 1}`)}
                  style={{ width: 36, height: 36 }}
                  className={cn(
                    'rounded-lg border-2 flex flex-col items-center justify-center text-[8px] font-bold transition-all shrink-0',
                    qcon
                      ? RARITY_BORDER[qcon.rarity] + ' bg-slate-50 dark:bg-slate-800'
                      : isSelecting
                        ? 'border-indigo-400 dark:border-indigo-500 border-dashed bg-indigo-50/60 dark:bg-indigo-900/20'
                        : 'border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50',
                  )}
                >
                  {qcon
                    ? <><span className="text-base leading-none">{qcon.icon}</span><span className={cn('text-[7px]', RARITY_TEXT[qcon.rarity])}>{slot + 1}</span></>
                    : <span className="text-slate-400 dark:text-slate-600">{slot + 1}</span>
                  }
                </button>
              )
            })}
            {selectedCon && (
              <span className="text-[9px] text-indigo-500 dark:text-indigo-400 italic">
                {isEn ? '← pick a slot' : '← escolha um slot'}
              </span>
            )}
          </div>
        </div>

        {/* Consumable cards */}
        {consumables.length === 0 ? (
          <p className="text-center text-[10px] text-slate-400 dark:text-slate-600 italic py-3">
            {isEn ? 'No consumables — buy some at the market!' : 'Sem consumíveis — compre no mercado!'}
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {consumables.map(c => {
              const isSel     = selectedCon === c.id
              const qslot     = quickslots.indexOf(c.id)
              return (
                <div
                  key={c.id}
                  className={cn(
                    'flex items-center gap-2.5 rounded-xl px-3 py-2 border-2 transition-all',
                    RARITY_BORDER[c.rarity],
                    isSel
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 shadow ring-1 ring-indigo-300 dark:ring-indigo-700'
                      : 'bg-slate-50 dark:bg-slate-800/40',
                  )}
                >
                  {/* Icon */}
                  <span className="text-xl shrink-0">{c.icon}</span>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={cn('text-[11px] font-bold', RARITY_TEXT[c.rarity])}>
                        {isEn ? c.nameEn : c.name}
                      </span>
                      <span className="text-[8px] text-slate-400 dark:text-slate-600">Lv.{c.level}</span>
                      {qslot !== -1 && (
                        <span className="text-[8px] font-semibold text-indigo-500 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30 px-1 rounded">
                          {isEn ? `Q${qslot + 1}` : `A${qslot + 1}`}
                        </span>
                      )}
                    </div>
                    <p className="text-[9px] text-slate-500 dark:text-slate-500 mt-0.5">
                      {consumableEffectDesc(c)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Assign quickslot */}
                    <button
                      onClick={() => setSelectedCon(isSel ? null : c.id)}
                      className={cn(
                        'px-1.5 py-1 rounded text-[9px] font-semibold border transition-colors',
                        isSel
                          ? 'border-indigo-400 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                          : 'border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:border-indigo-300 dark:hover:border-indigo-700',
                      )}
                      title={isEn ? 'Assign to quickslot' : 'Atribuir atalho'}
                    >
                      {qslot !== -1 ? `⌨ ${isEn ? `Q${qslot + 1}` : `A${qslot + 1}`}` : '⌨'}
                    </button>
                    {/* Use */}
                    <button
                      onClick={() => handleUseConsumable(c.id)}
                      className="px-2 py-1 rounded text-[9px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 transition-colors"
                    >
                      {isEn ? 'Use' : 'Usar'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>}
    </div>
  )
}
