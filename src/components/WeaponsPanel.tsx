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
  WEAPON_EFFECT_LABELS,
  WEAPON_LABELS,
  WEAPON_MATERIAL_LABELS,
  WEAPON_MAX_TIER,
  WEAPON_TYPES,
} from '../formulas/weapons'
import { cn } from '../lib/utils'
import {
  SwordIcon, DaggerIcon, AxeIcon, StaffIcon, BowIcon, ShieldIcon,
} from './icons/EquipIcons'
import type {
  EquippedWeapons,
  WeaponHand,
  WeaponMaterials,
  WeaponProgress,
  WeaponType,
} from '../types/weapon'

type IconComp = React.ComponentType<{ size?: number; className?: string }>

const WEAPON_ICON: Record<WeaponType, IconComp> = {
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

function formatXp(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`
  return String(Math.round(value))
}

function weaponEffectText(
  type: WeaponType,
  progress: Record<WeaponType, WeaponProgress>,
  loadout: EquippedWeapons,
  isEn: boolean,
): string {
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

function HandBadge({ label }: { label: string }) {
  return (
    <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-300">
      {label}
    </span>
  )
}

/** Forge Steel stock per tier — always visible so drops have a clear home. */
function ForgeSteelStrip({ materials, isEn }: { materials: WeaponMaterials; isEn: boolean }) {
  const tiers = Array.from({ length: WEAPON_MAX_TIER }, (_, i) => i + 1)
  const ownedTiers = tiers.filter(t => (materials[t] ?? 0) > 0)

  return (
    <div className="rounded-lg border border-amber-300/50 dark:border-amber-700/50 bg-amber-50/70 dark:bg-amber-950/20 px-3 py-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">
          ⚒ {WEAPON_MATERIAL_LABELS[isEn ? 'en' : 'pt']}
        </p>
        {ownedTiers.length === 0 ? (
          <span className="text-[10px] text-amber-700/70 dark:text-amber-300/70">
            {isEn ? 'None yet — found inside chests (higher chest level → higher tiers)' : 'Nenhum ainda — vem dentro de baús (baú de nível maior → tiers maiores)'}
          </span>
        ) : (
          ownedTiers.map(t => (
            <span
              key={t}
              className="rounded-md border border-amber-400/60 bg-white/70 px-2 py-0.5 text-[10px] font-black text-amber-800 dark:border-amber-600/60 dark:bg-amber-900/40 dark:text-amber-100"
            >
              T{t} ×{materials[t]}
            </span>
          ))
        )}
      </div>
    </div>
  )
}

function WeaponCard({
  type,
  progress,
  loadout,
  materials,
  isEn,
  onEquip,
  onForge,
}: {
  type: WeaponType
  progress: Record<WeaponType, WeaponProgress>
  loadout: EquippedWeapons
  materials: WeaponMaterials
  isEn: boolean
  onEquip: (hand: WeaponHand, type: WeaponType) => void
  onForge: (type: WeaponType) => void
}) {
  const p = progress[type]
  const Icon = WEAPON_ICON[type]
  const isMain = loadout.mainHand === type
  const isOff = loadout.offHand === type
  const equippedHere = isMain || isOff
  const bothHands = isMain && isOff

  const xpPct = p.level >= p.maxLevel ? 100 : Math.max(0, Math.min(100, (p.xp / p.xpToNext) * 100))
  const atCap = isWeaponAtForgeCap(p)
  const materialTier = weaponForgeMaterialTier(p)
  const forgeCost = weaponForgeCost(p)
  const owned = materials[materialTier] ?? 0
  const canForge = atCap && owned >= forgeCost
  const maxedOut = p.tier >= WEAPON_MAX_TIER && p.level >= p.maxLevel

  const effectLoadout: EquippedWeapons = equippedHere
    ? loadout
    : { mainHand: type === 'shield' ? 'sword' : type, offHand: type === 'shield' ? 'shield' : null }

  const canMain = type !== 'shield'
  const canOff = canEquipWeapon('offHand', type, loadout)

  return (
    <div
      className={cn(
        'flex flex-col rounded-xl border p-3 transition-colors',
        equippedHere
          ? 'border-indigo-400 dark:border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20'
          : 'border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/50',
      )}
    >
      {/* Header: icon + name + tier */}
      <div className="flex items-center gap-2.5">
        <div className={cn(
          'flex h-11 w-11 items-center justify-center rounded-lg border',
          equippedHere
            ? 'border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900'
            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60',
        )}>
          <Icon size={28} className={equippedHere ? 'opacity-100' : 'opacity-55'} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-xs font-black text-slate-700 dark:text-slate-200">
              {WEAPON_LABELS[type][isEn ? 'en' : 'pt']}
            </p>
            {bothHands && <HandBadge label="×2" />}
            {isMain && !bothHands && <HandBadge label={isEn ? 'Main' : 'Princ.'} />}
            {isOff && !bothHands && <HandBadge label={isEn ? 'Off' : 'Sec.'} />}
          </div>
          <p className="text-[9px] text-slate-400 dark:text-slate-500">
            {isEn ? 'Effect' : 'Efeito'}: {WEAPON_EFFECT_LABELS[type][isEn ? 'en' : 'pt']}
          </p>
        </div>
        <span className={cn(
          'rounded-md px-1.5 py-0.5 text-[10px] font-black',
          atCap
            ? 'bg-amber-200/80 text-amber-900 dark:bg-amber-800/60 dark:text-amber-100'
            : 'bg-slate-200/80 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
        )}>
          T{p.tier}
        </span>
      </div>

      {/* Level + XP bar */}
      <div className="mt-2.5">
        <div className="flex items-center justify-between text-[9px] font-bold text-slate-500 dark:text-slate-400">
          <span>Lv.{p.level}/{p.maxLevel}</span>
          <span>{atCap ? (isEn ? 'Forge to keep leveling' : 'Forje para continuar evoluindo') : `${formatXp(p.xp)}/${formatXp(p.xpToNext)} XP`}</span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className={cn('h-full rounded-full transition-[width] duration-300', atCap ? 'bg-amber-400' : 'bg-indigo-500')}
            style={{ width: `${xpPct}%` }}
          />
        </div>
      </div>

      {/* Current effect numbers */}
      <p className="mt-2 min-h-4 text-[10px] text-slate-500 dark:text-slate-400">
        {weaponEffectText(type, progress, effectLoadout, isEn)}
        {bothHands && (
          <span className="ml-1 font-bold text-amber-500 dark:text-amber-300">
            {isEn ? '(both hands)' : '(duas mãos)'}
          </span>
        )}
      </p>

      {/* Actions */}
      <div className="mt-auto flex items-center gap-1.5 pt-2.5">
        {canMain && (
          <button
            type="button"
            onClick={() => onEquip('mainHand', type)}
            disabled={isMain}
            className={cn(
              'rounded-md border px-2 py-1 text-[9px] font-black uppercase transition-colors',
              isMain
                ? 'border-indigo-400 bg-indigo-500 text-white'
                : 'border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-500',
            )}
          >
            {isEn ? 'Main' : 'Principal'}
          </button>
        )}
        <button
          type="button"
          onClick={() => onEquip('offHand', type)}
          disabled={!canOff || isOff}
          className={cn(
            'rounded-md border px-2 py-1 text-[9px] font-black uppercase transition-colors',
            isOff
              ? 'border-indigo-400 bg-indigo-500 text-white'
              : canOff
                ? 'border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-500'
                : 'border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed',
          )}
          title={!canOff && TWO_HANDED_WEAPONS.has(loadout.mainHand)
            ? (isEn ? 'Locked by two-handed main weapon' : 'Bloqueado por arma principal de duas mãos')
            : undefined}
        >
          {isEn ? 'Off-hand' : 'Secundária'}
        </button>
        {!maxedOut && (
          <button
            type="button"
            onClick={() => onForge(type)}
            disabled={!canForge}
            title={`${WEAPON_MATERIAL_LABELS[isEn ? 'en' : 'pt']} T${materialTier}: ${owned}/${forgeCost}`}
            className={cn(
              'ml-auto rounded-md border px-2 py-1 text-[9px] font-black uppercase transition-colors',
              canForge
                ? 'border-amber-400 bg-amber-100 text-amber-800 hover:bg-amber-200 dark:border-amber-600 dark:bg-amber-900/50 dark:text-amber-200'
                : 'border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600',
            )}
          >
            ⚒ {isEn ? 'Forge' : 'Forjar'} {owned}/{forgeCost}
          </button>
        )}
        {maxedOut && (
          <span className="ml-auto text-[9px] font-black uppercase text-amber-500">MAX</span>
        )}
      </div>
    </div>
  )
}

export default function WeaponsPanel({
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
  onEquip: (hand: WeaponHand, type: WeaponType) => void
  onForge: (type: WeaponType) => void
}) {
  const weaponProgress = normalizeWeaponProgress(progress)
  const loadout = normalizeEquippedWeapons(equipped)
  const statBonuses = getWeaponStatBonuses(weaponProgress, loadout)

  const statChips = [
    statBonuses.atk ? `ATK +${statBonuses.atk}` : null,
    statBonuses.def ? `DEF +${statBonuses.def}` : null,
    statBonuses.attackSpeed ? `${isEn ? 'AtkSpd' : 'Vel. Atk'} ${statBonuses.attackSpeed > 0 ? '+' : ''}${pct(statBonuses.attackSpeed)}` : null,
    statBonuses.critChance ? `${isEn ? 'Crit' : 'Crít'} +${pct(statBonuses.critChance)}` : null,
    statBonuses.magicDamage ? `${isEn ? 'Magic' : 'Mágico'} +${statBonuses.magicDamage}` : null,
  ].filter(Boolean) as string[]

  return (
    <div className="mb-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/30 p-3 space-y-2.5">
      {/* Header: loadout + total bonuses */}
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
          {isEn ? 'Weapons' : 'Armas'}
        </p>
        <span className="text-[11px] font-bold text-indigo-500 dark:text-indigo-400">
          {WEAPON_LABELS[loadout.mainHand][isEn ? 'en' : 'pt']}
          {loadout.offHand
            ? ` + ${WEAPON_LABELS[loadout.offHand][isEn ? 'en' : 'pt']}`
            : ` (${isEn ? 'two-handed' : 'duas mãos'})`}
        </span>
        <div className="ml-auto flex flex-wrap gap-1">
          {statChips.map(chip => (
            <span key={chip} className="rounded bg-slate-200/80 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {chip}
            </span>
          ))}
        </div>
      </div>

      <ForgeSteelStrip materials={materials} isEn={isEn} />

      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {WEAPON_TYPES.map(type => (
          <WeaponCard
            key={type}
            type={type}
            progress={weaponProgress}
            loadout={loadout}
            materials={materials}
            isEn={isEn}
            onEquip={onEquip}
            onForge={onForge}
          />
        ))}
      </div>
    </div>
  )
}
