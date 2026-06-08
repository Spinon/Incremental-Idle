import { useEffect, useMemo, useRef, useState } from 'react'
import { useSpellStore, getKnownWordIds, getPlayerSpells } from '../store/spellStore'
import { useHeroStore } from '../store/heroStore'
import { useInventoryStore } from '../store/inventoryStore'
import { ALL_WORDS, LEARNABLE_WORDS, getAutoWordSlots } from '../data/words'
import { findSpell, SPELL_ICONS, WORD_ICONS } from '../data/spells'
import { getDerivedStats } from '../formulas/derived'
import { getEquipmentBonuses } from '../formulas/items'
import { getWeaponCombatProfile, getWeaponStatBonuses } from '../formulas/weapons'
import { applySpellBuffs, getSpellManaCost } from '../formulas/spells'
import { cn } from '../lib/utils'
import type { Word, Spell, SpellRarity, AutoCastConfig } from '../types/spell'
import type { DerivedStats } from '../types/hero'
import { useSettingsStore } from '../store/settingsStore'

// ─── Rarity styling ───────────────────────────────────────────────────────────
const RARITY_BORDER: Record<SpellRarity, string> = {
  common:   'border-slate-400  dark:border-slate-600',
  uncommon: 'border-green-500  dark:border-green-600',
  rare:     'border-blue-500   dark:border-blue-600',
  epic:     'border-purple-500 dark:border-purple-600',
  unique:   'border-orange-500 dark:border-orange-400',
}
const RARITY_BG: Record<SpellRarity, string> = {
  common:   'bg-slate-50    dark:bg-slate-800/80',
  uncommon: 'bg-green-50    dark:bg-green-900/20',
  rare:     'bg-blue-50     dark:bg-blue-900/20',
  epic:     'bg-purple-50   dark:bg-purple-900/20',
  unique:   'bg-orange-50   dark:bg-orange-900/15',
}
const RARITY_TEXT: Record<SpellRarity, string> = {
  common:   'text-slate-600  dark:text-slate-400',
  uncommon: 'text-green-700  dark:text-green-400',
  rare:     'text-blue-600   dark:text-blue-400',
  epic:     'text-purple-600 dark:text-purple-400',
  unique:   'text-orange-600 dark:text-orange-400',
}
const RARITY_LABEL: Record<SpellRarity, string> = {
  common: 'Comum', uncommon: 'Incomum', rare: 'Raro', epic: 'Épico', unique: 'Único',
}
const RARITY_LABEL_EN: Record<SpellRarity, string> = {
  common: 'Common', uncommon: 'Uncommon', rare: 'Rare', epic: 'Epic', unique: 'Unique',
}
const EFFECT_ICON: Record<string, string> = {
  damage: '⚔', heal: '✦', buff: '▲', debuff: '▼', utility: '◎', fizzle: '∅',
}
const EFFECT_COLOR: Record<string, string> = {
  damage:  'text-red-500 dark:text-red-400',
  heal:    'text-emerald-600 dark:text-emerald-400',
  buff:    'text-blue-500 dark:text-blue-400',
  debuff:  'text-purple-500 dark:text-purple-400',
  utility: 'text-amber-500 dark:text-amber-400',
  fizzle:  'text-slate-400 dark:text-slate-500',
}

const SPELL_EFFECT_TYPES = ['damage', 'heal', 'buff', 'debuff', 'utility', 'fizzle'] as const
const SPELL_RARITIES: SpellRarity[] = ['common', 'uncommon', 'rare', 'epic', 'unique']
type SpellEffectFilter = 'all' | typeof SPELL_EFFECT_TYPES[number]
type SpellRarityFilter = 'all' | SpellRarity

const PERCENT_EFFECT_STATS = new Set([
  'attackSpeed', 'dodgeChance', 'critChance', 'critDamage', 'damageReduction',
  'healBonus', 'moveSpeed', 'dropChance', 'xpBonus',
])

const STAT_LABEL: Record<string, { pt: string; en: string }> = {
  atk: { pt: 'ATK', en: 'ATK' },
  def: { pt: 'DEF', en: 'DEF' },
  attackSpeed: { pt: 'Vel. Atk', en: 'Atk Speed' },
  dodgeChance: { pt: 'Esquiva', en: 'Dodge' },
  magicDamage: { pt: 'Dano mágico', en: 'Magic damage' },
  critChance: { pt: 'Crit', en: 'Crit' },
  critDamage: { pt: 'Dano Crit', en: 'Crit Dmg' },
  damageReduction: { pt: 'Reducao', en: 'Reduction' },
  healBonus: { pt: 'Cura', en: 'Heal' },
  staminaRegen: { pt: 'Stamina/s', en: 'Stamina/s' },
  manaRegen: { pt: 'Mana/s', en: 'Mana/s' },
  vision: { pt: 'Visao', en: 'Vision' },
  moveSpeed: { pt: 'Movimento', en: 'Move Spd' },
  dropChance: { pt: 'Drop', en: 'Drop' },
  xpBonus: { pt: 'XP', en: 'XP' },
  maxHp: { pt: 'HP Max', en: 'Max HP' },
}

function fmtNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '')
}

function fmtPercent(value: number): string {
  return `${(value * 100).toFixed(1).replace(/\.0$/, '')}%`
}

function statLabel(stat: string, isEn: boolean): string {
  return (isEn ? STAT_LABEL[stat]?.en : STAT_LABEL[stat]?.pt) ?? stat
}

function formatStatAdd(stat: string, value: number, isEn: boolean): string {
  const amount = PERCENT_EFFECT_STATS.has(stat) ? fmtPercent(value) : fmtNumber(value)
  return `+${amount} ${statLabel(stat, isEn)}`
}

function formatDebuffMult(mult: number): string {
  return `-${fmtPercent(1 - mult)}`
}

function spellRawAmount(spell: Spell, derived: DerivedStats): number {
  const { base = 0, scaling = 0, scalingStat } = spell.effect
  const statValue = scalingStat ? (derived[scalingStat] as number) : 0
  return Math.max(1, base + scaling * statValue)
}

function cappedDuration(duration: number | undefined, maxDuration?: number): number | undefined {
  if (duration === undefined) return undefined
  return Math.min(duration, maxDuration ?? duration)
}

function spellEffectSummary(spell: Spell, derived: DerivedStats, isEn: boolean, maxDuration?: number): {
  primary: string
  details: string[]
} {
  const e = spell.effect
  const details: string[] = []
  const duration = cappedDuration(e.duration, maxDuration)
  const debuffDuration = cappedDuration(e.debuffDuration, maxDuration)

  if (e.type === 'damage') {
    const raw = spellRawAmount(spell, derived)
    const valueText = e.chaos
      ? `${Math.max(1, Math.round(raw * 0.5))}-${Math.max(1, Math.round(raw * 1.5))}`
      : String(Math.round(raw))
    if (e.scalingStat) details.push(`${statLabel(e.scalingStat, isEn)} ${fmtNumber(derived[e.scalingStat] as number)}`)
    if (e.lifesteal) details.push(`${isEn ? 'Lifesteal' : 'Roubo de vida'} ${fmtPercent(e.lifesteal)}`)
    if (e.enemyAtkMult !== undefined) details.push(`ATK ${formatDebuffMult(e.enemyAtkMult)}`)
    if (e.enemyAtkSpeedMult !== undefined) details.push(`${isEn ? 'Speed' : 'Vel'} ${formatDebuffMult(e.enemyAtkSpeedMult)}`)
    if (debuffDuration) details.push(`${debuffDuration}t`)
    return {
      primary: `${isEn ? 'Damage' : 'Dano'}: Base ${fmtNumber(e.base ?? 0)} -> ${valueText}`,
      details,
    }
  }

  if (e.type === 'heal') {
    const raw = spellRawAmount(spell, derived)
    const effective = Math.max(1, Math.round(raw * derived.healBonus))
    if (e.scalingStat) details.push(`${statLabel(e.scalingStat, isEn)} ${fmtNumber(derived[e.scalingStat] as number)}`)
    if (derived.healBonus !== 1) details.push(`${isEn ? 'Heal bonus' : 'Bonus cura'} ${fmtPercent(derived.healBonus - 1)}`)
    if (e.statAdds) details.push(...Object.entries(e.statAdds).map(([k, v]) => formatStatAdd(k, v ?? 0, isEn)))
    if (duration) details.push(`${duration}t`)
    return {
      primary: `${isEn ? 'Heal' : 'Cura'}: Base ${fmtNumber(e.base ?? 0)} -> ${effective}`,
      details,
    }
  }

  if (e.type === 'buff' || e.type === 'utility') {
    if (e.statAdds) details.push(...Object.entries(e.statAdds).map(([k, v]) => formatStatAdd(k, v ?? 0, isEn)))
    if (e.tileAction) {
      const action = e.tileAction === 'create'
        ? (isEn ? 'Create tiles' : 'Cria tiles')
        : (isEn ? 'Refresh deck' : 'Renova deck')
      details.push(`${action} x${e.tileCount ?? (e.tileAction === 'create' ? 2 : 3)}`)
    }
    if (duration) details.push(`${duration}t`)
    return {
      primary: e.statAdds
        ? `${isEn ? 'Effect' : 'Efeito'}: ${Object.entries(e.statAdds).map(([k, v]) => formatStatAdd(k, v ?? 0, isEn)).join(' + ')}`
        : `${isEn ? 'Effect' : 'Efeito'}: ${isEn ? 'Utility' : 'Utilidade'}`,
      details,
    }
  }

  if (e.type === 'debuff') {
    if (e.enemyAtkMult !== undefined) details.push(`ATK ${formatDebuffMult(e.enemyAtkMult)}`)
    if (e.enemyAtkSpeedMult !== undefined) details.push(`${isEn ? 'Speed' : 'Vel'} ${formatDebuffMult(e.enemyAtkSpeedMult)}`)
    if (debuffDuration) details.push(`${debuffDuration}t`)
    return {
      primary: `${isEn ? 'Debuff' : 'Debuff'}: ${details.join(' + ')}`,
      details,
    }
  }

  if (e.type === 'fizzle') {
    return {
      primary: isEn ? 'Fizzle: no practical effect' : 'Falha: sem efeito prático',
      details,
    }
  }

  return { primary: isEn ? 'No direct effect' : 'Sem efeito direto', details }
}

const SPELLBOOK_TEXT = {
  pt: {
    words: 'Palavras',
    spells: 'Magias',
    mana: 'Mana',
    effect: {
      damage: 'Dano',
      heal: 'Cura',
      buff: 'Bônus',
      debuff: 'Debuff',
      utility: 'Util',
      fizzle: 'Falha',
    },
    category: {
      element: 'Elem',
      form: 'Forma',
    },
    assignTitle: 'Atribuir a slot de magia',
    levelSlots: 'Slots de nível',
    nextLevel: 'próx. Nv.',
    obtainedWord: 'palavra obtida',
    obtainedWords: 'palavras obtidas',
    noWords: 'Nenhuma palavra conhecida ainda.',
    combination: 'Combinação',
    rareHint: 'Palavras raras+ podem ser obtidas por drops ou compradas na loja.',
    slots: 'Slots:',
    removeSlot: 'clique para remover',
    emptySlot: 'vazio',
    chooseSlot: '← escolha um slot',
    auto: 'Auto',
    autoTitle: 'Configurar auto-uso',
    autoCast: 'Auto-uso de Magias',
    always: 'sempre',
    search: 'Buscar magia',
    searchPlaceholder: 'nome, palavra, efeito...',
    filterAll: 'Todos',
    filterEffect: 'Efeito',
    filterRarity: 'Raridade',
    clearFilters: 'limpar',
    noFilteredSpells: 'Nenhuma magia encontrada com esses filtros.',
    noSpells: 'Aprenda pelo menos 2 palavras para desbloquear magias.',
  },
  en: {
    words: 'Words',
    spells: 'Spells',
    mana: 'Mana',
    effect: {
      damage: 'Damage',
      heal: 'Heal',
      buff: 'Buff',
      debuff: 'Debuff',
      utility: 'Util',
      fizzle: 'Fizzle',
    },
    category: {
      element: 'Elem',
      form: 'Form',
    },
    assignTitle: 'Assign to spell slot',
    levelSlots: 'Level slots',
    nextLevel: 'next Lv.',
    obtainedWord: 'word obtained',
    obtainedWords: 'words obtained',
    noWords: 'No known words yet.',
    combination: 'Combination',
    rareHint: 'Rare+ words can be obtained from drops or bought at the shop.',
    slots: 'Slots:',
    removeSlot: 'click to remove',
    emptySlot: 'empty',
    chooseSlot: '← choose a slot',
    auto: 'Auto',
    autoTitle: 'Configure auto-cast',
    autoCast: 'Spell Auto-cast',
    always: 'always',
    search: 'Search spell',
    searchPlaceholder: 'name, word, effect...',
    filterAll: 'All',
    filterEffect: 'Effect',
    filterRarity: 'Rarity',
    clearFilters: 'clear',
    noFilteredSpells: 'No spells match these filters.',
    noSpells: 'Learn at least 2 words to unlock spells.',
  },
} as const

function statList(stats?: Record<string, number>): string {
  if (!stats) return ''
  return Object.entries(stats)
    .map(([stat, value]) => `${value > 0 ? '+' : ''}${value} ${statLabel(stat, true)}`)
    .join(', ')
}

function spellDescription(spell: Spell, isEn: boolean): string {
  if (!isEn) return spell.description

  const { effect } = spell
  if (effect.type === 'damage') {
    const pieces = [`Deals magical damage with ${effect.base ?? 0} base power`]
    if (effect.scaling) pieces.push(`its power increases with ${statLabel(effect.scalingStat ?? 'magicDamage', true)}`)
    if (effect.lifesteal) pieces.push(`restores ${Math.round(effect.lifesteal * 100)}% of damage dealt as HP`)
    if (effect.enemyAtkMult || effect.enemyAtkSpeedMult) pieces.push(`weakens the enemy for ${effect.debuffDuration ?? 0} turns`)
    if (effect.chaos) pieces.push('damage varies unpredictably')
    return `${pieces.join(', ')}.`
  }
  if (effect.type === 'heal') {
    const pieces = [`Restores HP with ${effect.base ?? 0} base healing`]
    if (effect.scaling) pieces.push(`its healing increases with ${statLabel(effect.scalingStat ?? 'magicDamage', true)}`)
    if (effect.statAdds) pieces.push(`also grants ${statList(effect.statAdds)} for ${effect.duration ?? 0} turns`)
    return `${pieces.join(', ')}.`
  }
  if (effect.type === 'buff') {
    return `Grants ${statList(effect.statAdds)} for ${effect.duration ?? 0} turns.`
  }
  if (effect.type === 'debuff') {
    const parts = []
    if (effect.enemyAtkMult !== undefined) parts.push(`enemy ATK ${formatDebuffMult(effect.enemyAtkMult)}`)
    if (effect.enemyAtkSpeedMult !== undefined) parts.push(`enemy speed ${formatDebuffMult(effect.enemyAtkSpeedMult)}`)
    return `Weakens the enemy${parts.length ? `: ${parts.join(', ')}` : ''} for ${effect.debuffDuration ?? 0} turns.`
  }
  if (effect.tileAction === 'create') {
    return `Creates ${effect.tileCount ?? 2} new map tiles.`
  }
  if (effect.tileAction === 'refresh') {
    return `Refreshes ${effect.tileCount ?? 3} map tiles.`
  }
  if (effect.type === 'fizzle') {
    return 'The magic collapses before producing any practical effect.'
  }
  return 'A utility spell with no direct combat effect.'
}

function spellSearchText(spell: Spell, isEn: boolean, derived: DerivedStats): string {
  const w1 = ALL_WORDS.find(w => w.id === spell.word1Id)
  const w2 = ALL_WORDS.find(w => w.id === spell.word2Id)
  const effectLabel = SPELLBOOK_TEXT[isEn ? 'en' : 'pt'].effect[spell.effect.type]
  const alternateEffectLabel = SPELLBOOK_TEXT[isEn ? 'pt' : 'en'].effect[spell.effect.type]
  const rarityLabel = (isEn ? RARITY_LABEL_EN : RARITY_LABEL)[spell.rarity]
  const summary = spellEffectSummary(spell, derived, isEn)
  const alternateSummary = spellEffectSummary(spell, derived, !isEn)
  return [
    spell.id,
    spell.name,
    spell.description,
    spellDescription(spell, isEn),
    spellDescription(spell, !isEn),
    summary.primary,
    ...summary.details,
    alternateSummary.primary,
    ...alternateSummary.details,
    spell.word1Id,
    spell.word2Id,
    w1?.nameEn,
    w1?.namePt,
    w2?.nameEn,
    w2?.namePt,
    effectLabel,
    alternateEffectLabel,
    spell.effect.type,
    rarityLabel,
    spell.rarity,
  ].filter(Boolean).join(' ').toLowerCase()
}

function spellMatchesFilters(
  spell: Spell,
  isEn: boolean,
  derived: DerivedStats,
  query: string,
  effectFilter: SpellEffectFilter,
  rarityFilter: SpellRarityFilter,
): boolean {
  if (effectFilter !== 'all' && spell.effect.type !== effectFilter) return false
  if (rarityFilter !== 'all' && spell.rarity !== rarityFilter) return false

  const q = query.trim().toLowerCase()
  if (!q) return true
  return spellSearchText(spell, isEn, derived).includes(q)
}

// ─── Word card ────────────────────────────────────────────────────────────────
function WordCard({ word, isSelected, onClick }: {
  word: Word
  isSelected: boolean
  onClick: () => void
}) {
  const isEn = useSettingsStore(s => s.lang === 'en')
  const tx = SPELLBOOK_TEXT[isEn ? 'en' : 'pt']
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border-2 px-2 py-2.5 transition-all w-[72px] shrink-0',
        RARITY_BORDER[word.rarity],
        RARITY_BG[word.rarity],
        isSelected && 'ring-2 ring-offset-1 ring-white dark:ring-slate-300 shadow-lg scale-105',
      )}
      title={isEn || word.namePt === word.nameEn ? word.nameEn : `${word.nameEn} — ${word.namePt}`}
    >
      <span className={cn('text-[11px] font-black tracking-wide', RARITY_TEXT[word.rarity])}>
        {word.nameEn}
      </span>
      {!isEn && word.namePt !== word.nameEn && (
        <span className="text-[8px] text-slate-400 dark:text-slate-500 mt-0.5">
          {word.namePt}
        </span>
      )}
      <span className={cn('text-[7px] uppercase tracking-widest mt-1 font-semibold opacity-60', RARITY_TEXT[word.rarity])}>
        {word.category === 'element' ? tx.category.element : tx.category.form}
      </span>
    </button>
  )
}

// ─── Spell card ───────────────────────────────────────────────────────────────
function SpellCard({
  spell,
  effectiveCooldown,
  firstSlotManaCost,
  derived,
  onAssign,
  isAssigning,
}: {
  spell: Spell
  effectiveCooldown: number
  firstSlotManaCost: number | null
  derived: DerivedStats
  onAssign: () => void
  isAssigning: boolean
}) {
  const isEn = useSettingsStore(s => s.lang === 'en')
  const tx = SPELLBOOK_TEXT[isEn ? 'en' : 'pt']
  const summary = spellEffectSummary(spell, derived, isEn, effectiveCooldown)
  return (
    <div className={cn(
      'rounded-xl border-2 px-3 py-2.5 flex items-start gap-3',
      RARITY_BORDER[spell.rarity],
      RARITY_BG[spell.rarity],
    )}>
      {/* Effect icon */}
      <div className="shrink-0 flex flex-col items-center gap-0.5 mt-0.5">
        <span className="text-base">
          {SPELL_ICONS[spell.id] ?? WORD_ICONS[spell.word1Id] ?? EFFECT_ICON[spell.effect.type]}
        </span>
        <span className={cn('text-[8px] font-semibold', EFFECT_COLOR[spell.effect.type])}>
          {tx.effect[spell.effect.type]}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={cn('text-[11px] font-bold', RARITY_TEXT[spell.rarity])}>
            {spell.name}
          </span>
          <span className={cn('text-[8px] uppercase tracking-widest font-semibold opacity-60', RARITY_TEXT[spell.rarity])}>
            {(isEn ? RARITY_LABEL_EN : RARITY_LABEL)[spell.rarity]}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[9px] text-blue-500 dark:text-blue-400 font-semibold">
            {getSpellManaCost(spell)} mana
          </span>
          {firstSlotManaCost !== null && firstSlotManaCost !== getSpellManaCost(spell) && (
            <span className="text-[9px] text-blue-400 dark:text-blue-300 font-semibold">
              slot 1: {firstSlotManaCost}
            </span>
          )}
          <span className="text-[9px] text-slate-400 dark:text-slate-500">
            CD {spell.cooldown}t{effectiveCooldown !== spell.cooldown ? ` -> ${effectiveCooldown}t` : ''}
          </span>
          <span className="text-[8px] text-slate-400 dark:text-slate-500">
            {spell.word1Id} + {spell.word2Id}
          </span>
        </div>
        <p className="text-[9px] text-slate-500 dark:text-slate-500 mt-0.5 leading-tight">
          {spellDescription(spell, isEn)}
        </p>
        <div className="mt-1.5 rounded-lg border border-slate-200/70 dark:border-slate-700/70 bg-white/45 dark:bg-slate-950/25 px-2 py-1">
          <p className={cn('text-[9px] font-bold leading-tight', EFFECT_COLOR[spell.effect.type])}>
            {summary.primary}
          </p>
          {summary.details.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {summary.details.map((detail, i) => (
                <span
                  key={`${spell.id}-detail-${i}`}
                  className="rounded border border-slate-200/70 dark:border-slate-700/70 bg-slate-100/70 dark:bg-slate-900/60 px-1.5 py-0.5 text-[8px] font-semibold text-slate-500 dark:text-slate-400"
                >
                  {detail}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Assign button */}
      <button
        onClick={onAssign}
        className={cn(
          'shrink-0 px-2 py-1 rounded text-[9px] font-semibold border transition-colors',
          isAssigning
            ? 'border-indigo-400 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
            : 'border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:border-indigo-300 dark:hover:border-indigo-700',
        )}
        title={tx.assignTitle}
      >
        ⌨
      </button>
    </div>
  )
}

// ─── Main SpellbookPanel ──────────────────────────────────────────────────────
export default function SpellbookPanel() {
  const lang       = useSettingsStore(s => s.lang)
  const isEn       = lang === 'en'
  const tx         = SPELLBOOK_TEXT[isEn ? 'en' : 'pt']
  const level      = useHeroStore(s => s.level)
  const attrs      = useHeroStore(s => s.attributes)
  const mana       = useHeroStore(s => s.mana)
  const equipment  = useInventoryStore(s => s.equipment)
  const weaponProgress = useInventoryStore(s => s.weaponProgress)
  const equippedWeapons = useInventoryStore(s => s.equippedWeapons)

  const earnedWordIds = useSpellStore(s => s.earnedWordIds)
  const spellSlots    = useSpellStore(s => s.spellSlots)
  const cooldowns     = useSpellStore(s => s.cooldowns)
  const setSpellSlot  = useSpellStore(s => s.setSpellSlot)
  const activeBuffs   = useSpellStore(s => s.activeBuffs)
  const spellAutoSlots = useSpellStore(s => s.autoSlots)
  const setAutoSlot    = useSpellStore(s => s.setAutoSlot)

  const knownWordIds    = getKnownWordIds(level, attrs.inteligencia, attrs.sabedoria, earnedWordIds)
  const availableSpells = getPlayerSpells(knownWordIds)
  const equipBonuses = getEquipmentBonuses(equipment)
  const weaponStats = getWeaponStatBonuses(weaponProgress, equippedWeapons)
  const weaponProfile = getWeaponCombatProfile(weaponProgress, equippedWeapons)
  const baseDerived = getDerivedStats(attrs, equipBonuses, level)
  const spellDerived: DerivedStats = applySpellBuffs({
    ...baseDerived,
    magicDamage: baseDerived.magicDamage + weaponStats.magicDamage,
  }, activeBuffs)

  const wordSlotCount = getAutoWordSlots(level, attrs.inteligencia, attrs.sabedoria)
  const nextSlotAt  = (Math.floor(level / 5) + 1) * 5  // next level milestone

  const [tab, setTab]           = useState<'words' | 'spells'>('words')
  const [selectedWords, setSelectedWords] = useState<string[]>([])
  const [assigningSpell, setAssigningSpell] = useState<string | null>(null)
  const [showAutoConfig, setShowAutoConfig] = useState(false)
  const [spellQuery, setSpellQuery] = useState('')
  const [effectFilter, setEffectFilter] = useState<SpellEffectFilter>('all')
  const [rarityFilter, setRarityFilter] = useState<SpellRarityFilter>('all')
  const autoConfigRef = useRef<HTMLDivElement>(null)

  // ── Word selection for preview combo ──
  function toggleWord(id: string) {
    setSelectedWords(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      if (prev.length >= 2)  return [prev[1], id]
      return [...prev, id]
    })
  }

  const previewSpell = selectedWords.length === 2
    ? findSpell(selectedWords[0], selectedWords[1])
    : null

  // ── Assign to slot ──
  function handleAssignSlot(slotIndex: number) {
    if (!assigningSpell) return
    setSpellSlot(slotIndex, assigningSpell)
    setAssigningSpell(null)
  }

  useEffect(() => {
    if (!showAutoConfig) return
    function closeAutoConfig(e: MouseEvent) {
      if (autoConfigRef.current && !autoConfigRef.current.contains(e.target as Node)) {
        setShowAutoConfig(false)
      }
    }
    document.addEventListener('mousedown', closeAutoConfig)
    return () => document.removeEventListener('mousedown', closeAutoConfig)
  }, [showAutoConfig])

  const knownWords = ALL_WORDS.filter(w => knownWordIds.includes(w.id))
  const filteredSpells = useMemo(
    () => availableSpells.filter(spell => spellMatchesFilters(spell, isEn, spellDerived, spellQuery, effectFilter, rarityFilter)),
    [availableSpells, effectFilter, isEn, rarityFilter, spellDerived, spellQuery],
  )
  const hasSpellFilters = spellQuery.trim() !== '' || effectFilter !== 'all' || rarityFilter !== 'all'

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-3">
        {(['words', 'spells'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-3 py-1 rounded-lg text-[10px] font-semibold border transition-colors',
              tab === t
                ? 'border-indigo-400 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700',
            )}
          >
            {t === 'words' ? `${tx.words} (${knownWords.length})` : `${tx.spells} (${availableSpells.length})`}
          </button>
        ))}
        <span className="ml-auto text-[9px] text-slate-400 dark:text-slate-600 self-center">
          {tx.mana}: {Math.floor(mana)}
        </span>
      </div>

      {/* ── WORDS TAB ────────────────────────────────────────────────────── */}
      {tab === 'words' && (
        <div>
          {/* Progress info */}
          <div className="mb-2 text-[9px] text-slate-400 dark:text-slate-600 flex gap-3 flex-wrap">
            <span>{tx.levelSlots}: {wordSlotCount}/{LEARNABLE_WORDS.length} ({tx.nextLevel}{nextSlotAt})</span>
            <span>+INT: +{Math.floor(attrs.inteligencia / 10)} &nbsp; +SAB: +{Math.floor(attrs.sabedoria / 10)}</span>
            {earnedWordIds.length > 0 && (
              <span className="text-purple-500 dark:text-purple-400">
                +{earnedWordIds.length} {earnedWordIds.length === 1 ? tx.obtainedWord : tx.obtainedWords}
              </span>
            )}
          </div>

          {/* Known words grid */}
          <div className="flex flex-wrap gap-2 mb-3">
            {knownWords.map(w => (
              <WordCard
                key={w.id}
                word={w}
                isSelected={selectedWords.includes(w.id)}
                onClick={() => toggleWord(w.id)}
              />
            ))}
            {knownWords.length === 0 && (
              <p className="text-[10px] text-slate-400 dark:text-slate-600 italic">
                {tx.noWords}
              </p>
            )}
          </div>

          {/* Combo preview */}
          {selectedWords.length > 0 && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-2.5">
              <p className="text-[9px] text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-2">
                {tx.combination}
              </p>
              <div className="flex items-center gap-2">
                {selectedWords.map((id, i) => {
                  const w = ALL_WORDS.find(x => x.id === id)!
                  return (
                    <span key={i} className={cn('text-[11px] font-bold', RARITY_TEXT[w.rarity])}>
                      {w.nameEn}
                    </span>
                  )
                })}
                {selectedWords.length === 2 && <span className="text-slate-400">→</span>}
                {selectedWords.length === 2 && previewSpell && (
                  <span className={cn('font-bold text-[11px]', RARITY_TEXT[previewSpell.rarity])}>{previewSpell.name}</span>
                )}
              </div>
              {previewSpell && (
                <p className="text-[9px] text-slate-500 dark:text-slate-500 mt-1">
                  {spellDescription(previewSpell, isEn)} · {getSpellManaCost(previewSpell)} mana · CD {previewSpell.cooldown}t
                </p>
              )}
            </div>
          )}

          {/* Locked words hint */}
          {LEARNABLE_WORDS.length - knownWords.filter(w => ['common','uncommon'].includes(w.rarity)).length > 0 && (
            <p className="mt-2 text-[9px] text-slate-400 dark:text-slate-600 italic">
              {tx.rareHint}
            </p>
          )}
        </div>
      )}

      {/* ── SPELLS TAB ───────────────────────────────────────────────────── */}
      {tab === 'spells' && (
        <div>
          {/* Spell slots strip */}
          <div
            ref={autoConfigRef}
            className="sticky top-[76px] z-30 mb-3 flex items-center gap-1.5 flex-wrap rounded-xl border border-slate-200/80 dark:border-slate-800/90 bg-slate-50/95 dark:bg-slate-950/95 px-2.5 py-2 shadow-sm backdrop-blur"
          >
            <span className="text-[9px] text-slate-400 dark:text-slate-600 uppercase tracking-widest shrink-0">
              {tx.slots}
            </span>
            {spellSlots.map((sid, i) => {
              const spell = sid ? availableSpells.find(s => s.id === sid) : null
              const cd    = sid ? (cooldowns[sid] ?? 0) : 0
              const isAssigning = assigningSpell !== null
              const isAuto = spellAutoSlots[i]?.enabled ?? false
              return (
                <button
                  key={i}
                  onClick={() => {
                    if (isAssigning) { handleAssignSlot(i); return }
                    if (spell) setSpellSlot(i, null)
                  }}
                  style={{ width: 44, height: 44 }}
                  className={cn(
                    'relative rounded-xl border-2 flex flex-col items-center justify-center text-[8px] font-bold transition-all shrink-0',
                    spell
                      ? cn(RARITY_BORDER[spell.rarity], RARITY_BG[spell.rarity])
                      : isAssigning
                        ? 'border-indigo-400 dark:border-indigo-500 border-dashed bg-indigo-50/60 dark:bg-indigo-900/20'
                        : 'border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50',
                  )}
                  title={spell ? `Slot ${i+1}: ${spell.name} (${tx.removeSlot})` : `Slot ${i+1} (${tx.emptySlot})`}
                >
                  {spell ? (
                    <>
                      <span className="text-base leading-none">
                        {SPELL_ICONS[spell.id] ?? WORD_ICONS[spell.word1Id] ?? EFFECT_ICON[spell.effect.type]}
                      </span>
                      <span className={cn('text-[7px]', RARITY_TEXT[spell.rarity])}>{i + 1}</span>
                      {isAuto && cd === 0 && (
                        <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-indigo-500 border border-white dark:border-slate-900" />
                      )}
                      {cd > 0 && (
                        <div
                          className="absolute inset-0 rounded-xl bg-black/40 flex items-center justify-center"
                        >
                          <span className="text-[9px] text-white font-bold">{cd}t</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-600">{i + 1}</span>
                  )}
                </button>
              )
            })}
            {assigningSpell && (
              <span className="text-[9px] text-indigo-500 dark:text-indigo-400 italic ml-1">
                {tx.chooseSlot}
              </span>
            )}
            <div className="relative ml-auto flex items-center gap-1">
              <span className="text-[8px] text-slate-400 dark:text-slate-600 uppercase tracking-widest">
                {tx.auto}
              </span>
              <button
                type="button"
                onClick={() => setShowAutoConfig(v => !v)}
                title={tx.autoTitle}
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-[12px] transition-colors',
                  showAutoConfig
                    ? 'bg-indigo-500 text-white'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700',
                )}
              >
                ⚙
              </button>

              {showAutoConfig && (
                <div className="absolute top-full right-0 mt-2 z-50 w-72 max-h-[60vh] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-xl">
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                    {tx.autoCast}
                  </p>
                  {spellSlots.map((sid, i) => {
                    const spell = sid ? availableSpells.find(s => s.id === sid) : null
                    const cfg: AutoCastConfig = spellAutoSlots[i] ?? { enabled: false, hpThreshold: 0.7 }
                    const isHeal = spell?.effect.type === 'heal'
                    return (
                      <div key={i} className="flex items-center gap-2 py-1.5 border-b border-slate-100 dark:border-slate-700/60 last:border-0">
                        <span className="text-[10px] font-bold text-slate-400 w-3 shrink-0">{i + 1}</span>
                        {spell ? (
                          <>
                            <span className={cn('text-xs shrink-0', EFFECT_COLOR[spell.effect.type])}>
                              {EFFECT_ICON[spell.effect.type]}
                            </span>
                            <span className="text-xs text-slate-700 dark:text-slate-200 flex-1 truncate min-w-0">
                              {spell.name}
                            </span>
                            {isHeal && cfg.enabled && (
                              <select
                                className="text-[10px] bg-slate-100 dark:bg-slate-700 rounded px-1 py-0.5 text-slate-600 dark:text-slate-300 border-0 shrink-0"
                                value={cfg.hpThreshold}
                                onChange={e => setAutoSlot(i, { ...cfg, hpThreshold: Number(e.target.value) })}
                                onClick={e => e.stopPropagation()}
                              >
                                <option value={0.5}>HP &lt; 50%</option>
                                <option value={0.6}>HP &lt; 60%</option>
                                <option value={0.7}>HP &lt; 70%</option>
                                <option value={0.8}>HP &lt; 80%</option>
                                <option value={0.9}>HP &lt; 90%</option>
                                <option value={1.0}>{tx.always}</option>
                              </select>
                            )}
                            <button
                              type="button"
                              onClick={() => setAutoSlot(i, { ...cfg, enabled: !cfg.enabled })}
                              className={cn(
                                'text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors shrink-0',
                                cfg.enabled
                                  ? 'bg-indigo-500 text-white'
                                  : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600',
                              )}
                            >
                              {cfg.enabled ? 'AUTO' : 'OFF'}
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-600 italic">
                            {tx.emptySlot}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Search and filters */}
          <div className="mb-3 rounded-xl border border-slate-200/80 dark:border-slate-800/90 bg-slate-50 dark:bg-slate-900/50 px-2.5 py-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="relative flex-1 min-w-0">
                <span className="sr-only">{tx.search}</span>
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">⌕</span>
                <input
                  type="search"
                  value={spellQuery}
                  onChange={e => setSpellQuery(e.target.value)}
                  placeholder={tx.searchPlaceholder}
                  className="h-8 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 pl-6 pr-2 text-[11px] font-semibold text-slate-700 dark:text-slate-200 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-indigo-400 dark:focus:border-indigo-500"
                />
              </label>

              <div className="flex gap-1.5 overflow-x-auto pb-0.5 sm:pb-0">
                <select
                  value={effectFilter}
                  onChange={e => setEffectFilter(e.target.value as SpellEffectFilter)}
                  title={tx.filterEffect}
                  className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 text-[10px] font-bold text-slate-600 dark:text-slate-300 outline-none focus:border-indigo-400 dark:focus:border-indigo-500"
                >
                  <option value="all">{tx.filterEffect}: {tx.filterAll}</option>
                  {SPELL_EFFECT_TYPES.map(type => (
                    <option key={type} value={type}>{tx.effect[type]}</option>
                  ))}
                </select>

                <select
                  value={rarityFilter}
                  onChange={e => setRarityFilter(e.target.value as SpellRarityFilter)}
                  title={tx.filterRarity}
                  className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 text-[10px] font-bold text-slate-600 dark:text-slate-300 outline-none focus:border-indigo-400 dark:focus:border-indigo-500"
                >
                  <option value="all">{tx.filterRarity}: {tx.filterAll}</option>
                  {SPELL_RARITIES.map(rarity => (
                    <option key={rarity} value={rarity}>{(isEn ? RARITY_LABEL_EN : RARITY_LABEL)[rarity]}</option>
                  ))}
                </select>

                {hasSpellFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      setSpellQuery('')
                      setEffectFilter('all')
                      setRarityFilter('all')
                    }}
                    className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    {tx.clearFilters}
                  </button>
                )}
              </div>
            </div>
            <div className="mt-1.5 text-[9px] font-semibold text-slate-400 dark:text-slate-600">
              {filteredSpells.length}/{availableSpells.length}
            </div>
          </div>

          {/* Spell list */}
          {availableSpells.length === 0 ? (
            <p className="text-[10px] text-slate-400 dark:text-slate-600 italic text-center py-3">
              {tx.noSpells}
            </p>
          ) : filteredSpells.length === 0 ? (
            <p className="text-[10px] text-slate-400 dark:text-slate-600 italic text-center py-3">
              {tx.noFilteredSpells}
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {filteredSpells.map(spell => (
                <SpellCard
                  key={spell.id}
                  spell={spell}
                  effectiveCooldown={Math.max(1, Math.ceil(spell.cooldown * (1 - weaponProfile.staffCooldownReduction)))}
                  firstSlotManaCost={spellSlots[0] === spell.id
                    ? Math.max(1, Math.round(getSpellManaCost(spell) * (1 - weaponProfile.staffSlotOneManaDiscount)))
                    : null}
                  derived={spellDerived}
                  onAssign={() => setAssigningSpell(a => a === spell.id ? null : spell.id)}
                  isAssigning={assigningSpell === spell.id}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
