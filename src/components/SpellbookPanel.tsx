import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import {
  getKnownWordIds,
  getPlayerSpells,
  getSpellCreationCost,
  getWordBitCost,
  getWordBitRequirement,
  getWordSandPerSecond,
  useSpellStore,
} from '../store/spellStore'
import { useHeroStore } from '../store/heroStore'
import { useInventoryStore } from '../store/inventoryStore'
import { ALL_WORDS } from '../data/words'
import { findSpell, SPELL_ICONS, WORD_ICONS } from '../data/spells'
import { getDerivedStats } from '../formulas/derived'
import { getEquipmentBonuses } from '../formulas/items'
import { getWeaponCombatProfile, getWeaponStatBonuses } from '../formulas/weapons'
import { applySpellBuffs } from '../formulas/spells'
import { cn } from '../lib/utils'
import { usePartyEffectiveAttributes } from '../lib/partyBonuses'
import type { Word, Spell, SpellRarity, AutoCastConfig } from '../types/spell'
import { ELEMENT_PRISM } from '../types/element'
import type { ElementType } from '../types/element'
import type { DerivedStats } from '../types/hero'
import { useSettingsStore } from '../store/settingsStore'
import elementBadges from '../assets/elements_spritesheet.png'

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

function elementLabel(element: string, isEn: boolean): string {
  const word = ALL_WORDS.find(w => w.id === element)
  return isEn ? (word?.nameEn ?? element) : (word?.namePt ?? word?.nameEn ?? element)
}

function formatStatAdd(stat: string, value: number, isEn: boolean): string {
  const amount = PERCENT_EFFECT_STATS.has(stat) ? fmtPercent(value) : fmtNumber(value)
  return `+${amount} ${statLabel(stat, isEn)}`
}

function formatElementList(elements: string[], isEn: boolean): string {
  return elements.map(element => elementLabel(element, isEn)).join(', ')
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
  // Utility buffs are exempt from the cooldown clamp (see spellStore.castSpell)
  const duration = e.type === 'utility' ? e.duration : cappedDuration(e.duration, maxDuration)
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
    if (e.attackElement) {
      details.push(`${isEn ? 'Attacks become' : 'Ataques viram'} ${elementLabel(e.attackElement, isEn)}`)
      details.push(isEn ? 'Uses elemental resistance' : 'Usa resistencia elemental')
    }
    if (e.elementalForm) {
      const prism = ELEMENT_PRISM[e.elementalForm]
      details.push(`${isEn ? 'Absorbs' : 'Absorve'} ${elementLabel(prism.absorb, isEn)}`)
      details.push(`${isEn ? 'Immune' : 'Imune'} ${formatElementList(prism.immuneTo, isEn)}`)
      details.push(`${isEn ? 'Resists' : 'Resiste'} ${formatElementList(prism.resistTo, isEn)}`)
      details.push(`${isEn ? 'Weak to' : 'Fraco contra'} ${formatElementList(prism.weakTo, isEn)}`)
    }
    if (e.tileAction) {
      const action = e.tileAction === 'create'
        ? (isEn ? 'Create tiles' : 'Cria tiles')
        : (isEn ? 'Refresh deck' : 'Renova deck')
      details.push(`${action} x${e.tileCount ?? (e.tileAction === 'create' ? 2 : 3)}`)
    }
    if (e.mapAction) {
      const radius = e.teleportRadius ?? 4
      if (e.mapAction === 'teleportBlueTower') {
        details.push(isEn ? `Teleport to blue tower (${radius})` : `Teleporte para torre azul (${radius})`)
      } else {
        details.push(isEn ? `Teleport to explored tile (${radius})` : `Teleporte para tile explorado (${radius})`)
      }
    }
    if (duration) details.push(`${duration}t`)
    return {
      primary: e.statAdds
        ? `${isEn ? 'Effect' : 'Efeito'}: ${Object.entries(e.statAdds).map(([k, v]) => formatStatAdd(k, v ?? 0, isEn)).join(' + ')}`
        : e.attackElement
          ? `${isEn ? 'Effect' : 'Efeito'}: ${isEn ? 'Elemental attack' : 'Ataque elemental'} - ${elementLabel(e.attackElement, isEn)}`
        : e.elementalForm
          ? `${isEn ? 'Effect' : 'Efeito'}: ${isEn ? 'Elemental form' : 'Forma elemental'} - ${elementLabel(e.elementalForm, isEn)}`
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
    elements: 'Elementos',
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
      element: 'Elemento',
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
    elements: 'Elements',
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
      element: 'Element',
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

type VisualText = { pt: string; en: string }

const WORD_VISUAL: Record<string, VisualText> = {
  ignis: { pt: 'chamas vivas', en: 'living flame' },
  glacies: { pt: 'cristais de gelo', en: 'ice crystals' },
  vitae: { pt: 'luz verdejante', en: 'verdant light' },
  fulgur: { pt: 'arcos eletricos', en: 'crackling lightning' },
  umbra: { pt: 'sombras liquidas', en: 'liquid shadow' },
  lux: { pt: 'luz pura', en: 'pure light' },
  toxicum: { pt: 'nevoa venenosa', en: 'venomous mist' },
  tempus: { pt: 'ecos temporais', en: 'temporal echoes' },
  mortis: { pt: 'cinzas frias', en: 'cold ash' },
  caelum: { pt: 'brilho celeste', en: 'celestial radiance' },
  abyssus: { pt: 'escuridao abissal', en: 'abyssal darkness' },
  eternum: { pt: 'luz eterna', en: 'eternal light' },
  sagitta: { pt: 'uma flecha precisa', en: 'a precise arrow' },
  manus: { pt: 'uma mao espectral', en: 'a spectral hand' },
  scutum: { pt: 'um escudo circular', en: 'a round shield' },
  unda: { pt: 'uma onda ampla', en: 'a sweeping wave' },
  aura: { pt: 'uma aura pulsante', en: 'a pulsing aura' },
  pluvia: { pt: 'uma chuva fina', en: 'a fine rain' },
  vortex: { pt: 'um vortice giratorio', en: 'a spinning vortex' },
  arcanum: { pt: 'sigilos arcanos', en: 'arcane sigils' },
  fortis: { pt: 'pressao condensada', en: 'condensed force' },
  reformare: { pt: 'um corpo refeito', en: 'a remade body' },
  chaos: { pt: 'fragmentos instaveis', en: 'unstable fragments' },
  mutare: { pt: 'um selo mutavel', en: 'a shifting seal' },
}

const ELEMENT_ORDER: ElementType[] = [
  'ignis', 'glacies', 'fulgur', 'umbra', 'lux', 'toxicum',
  'mortis', 'vitae', 'caelum', 'abyssus', 'eternum', 'tempus',
]

const ELEMENT_TONE: Record<ElementType, { text: string; border: string; bg: string; line: string }> = {
  ignis:   { text: 'text-orange-500', border: 'border-orange-500/60', bg: 'bg-orange-500/10', line: '#f97316' },
  glacies: { text: 'text-sky-400',    border: 'border-sky-400/60',    bg: 'bg-sky-400/10',    line: '#38bdf8' },
  fulgur:  { text: 'text-amber-400',  border: 'border-amber-400/60',  bg: 'bg-amber-400/10',  line: '#fbbf24' },
  umbra:   { text: 'text-violet-400', border: 'border-violet-400/60', bg: 'bg-violet-400/10', line: '#a78bfa' },
  lux:     { text: 'text-yellow-300', border: 'border-yellow-300/60', bg: 'bg-yellow-300/10', line: '#fde047' },
  toxicum: { text: 'text-lime-400',   border: 'border-lime-400/60',   bg: 'bg-lime-400/10',   line: '#a3e635' },
  mortis:  { text: 'text-fuchsia-400', border: 'border-fuchsia-400/60', bg: 'bg-fuchsia-400/10', line: '#e879f9' },
  vitae:   { text: 'text-emerald-400', border: 'border-emerald-400/60', bg: 'bg-emerald-400/10', line: '#34d399' },
  caelum:  { text: 'text-purple-400', border: 'border-purple-400/60', bg: 'bg-purple-400/10', line: '#c084fc' },
  abyssus: { text: 'text-cyan-500',   border: 'border-cyan-500/60',   bg: 'bg-cyan-500/10',   line: '#06b6d4' },
  eternum: { text: 'text-amber-500',  border: 'border-amber-500/60',  bg: 'bg-amber-500/10',  line: '#f59e0b' },
  tempus:  { text: 'text-blue-400',   border: 'border-blue-400/60',   bg: 'bg-blue-400/10',   line: '#60a5fa' },
}

const ELEMENT_BADGE_INDEX: Record<ElementType, number> = {
  ignis: 0,
  glacies: 1,
  fulgur: 2,
  umbra: 3,
  lux: 4,
  toxicum: 5,
  mortis: 6,
  caelum: 7,
  vitae: 8,
  abyssus: 9,
  eternum: 10,
  tempus: 11,
}

const ELEMENT_BADGE_VISUAL_OFFSET: Partial<Record<ElementType, { x: number; y: number }>> = {
  glacies: { x: 0, y: 1.35 },
}

function elementBadgeStyle(element: ElementType): CSSProperties {
  const index = ELEMENT_BADGE_INDEX[element]
  return {
    backgroundImage: `url(${elementBadges})`,
    backgroundSize: '1200% 100%',
    backgroundPosition: `${(index / 11) * 100}% 0%`,
  }
}

function ElementBadge({ element, size = 24, className }: {
  element: ElementType
  size?: number
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block shrink-0 rounded-full bg-black/40 align-middle shadow-sm', className)}
      style={{ width: size, height: size, ...elementBadgeStyle(element) }}
    />
  )
}

const ELEMENT_LORE: Record<ElementType, VisualText> = {
  ignis: {
    pt: 'Chamas que respiram como feras pequenas, famintas por forma, calor e ruptura.',
    en: 'Flames that breathe like small beasts, hungry for shape, heat, and rupture.',
  },
  glacies: {
    pt: 'Frio cristalino que silencia o ar e guarda movimento dentro de facetas azuis.',
    en: 'Crystal cold that silences the air and traps motion inside blue facets.',
  },
  fulgur: {
    pt: 'Relampagos presos em nervos de luz, sempre procurando o caminho mais curto ate o impacto.',
    en: 'Lightning caught in nerves of light, always seeking the shortest path to impact.',
  },
  umbra: {
    pt: 'Sombra liquida que escorre entre as certezas e apaga bordas antes do golpe chegar.',
    en: 'Liquid shadow slipping between certainties, erasing edges before the blow arrives.',
  },
  lux: {
    pt: 'Luz pura em laminas suaves, revelando fissuras que a escuridao tentou esconder.',
    en: 'Pure light in gentle blades, revealing fractures darkness tried to hide.',
  },
  toxicum: {
    pt: 'Nevoa viva e paciente, verde no pulso, transformando resistencia em febre.',
    en: 'Living, patient mist, green at the pulse, turning resistance into fever.',
  },
  mortis: {
    pt: 'Cinza fria de tudo que terminou, pesada como sino distante sobre a pele.',
    en: 'Cold ash of everything ended, heavy as a distant bell against the skin.',
  },
  vitae: {
    pt: 'Seiva luminosa que costura carne, folha e vontade com a mesma paciencia.',
    en: 'Luminous sap stitching flesh, leaf, and will with the same patience.',
  },
  caelum: {
    pt: 'Brilho das alturas, amplo e vertical, como uma promessa caindo do ceu.',
    en: 'Radiance from above, wide and vertical, like a promise falling from the sky.',
  },
  abyssus: {
    pt: 'Escuridao profunda que puxa o peso do mundo para dentro de um ponto sem fundo.',
    en: 'Deep darkness pulling the weight of the world into a bottomless point.',
  },
  eternum: {
    pt: 'Luz sem idade, parada no instante entre a memoria e aquilo que ainda nao nasceu.',
    en: 'Ageless light, still in the instant between memory and what has not yet been born.',
  },
  tempus: {
    pt: 'Ecos do tempo dobrando passos, atrasos e futuros em aneis quase invisiveis.',
    en: 'Echoes of time folding steps, delays, and futures into nearly invisible rings.',
  },
}

const PRISM_RELATION = {
  absorb: { icon: '♥', pt: 'Absorve', en: 'Absorbs', color: '#84cc16', text: 'text-lime-400', border: 'border-lime-400/40', bg: 'bg-lime-400/10' },
  immune: { icon: '▣', pt: 'Imune', en: 'Immune', color: '#38bdf8', text: 'text-sky-400', border: 'border-sky-400/40', bg: 'bg-sky-400/10' },
  resist: { icon: '⬟', pt: 'Resiste', en: 'Resists', color: '#facc15', text: 'text-yellow-300', border: 'border-yellow-300/40', bg: 'bg-yellow-300/10' },
  weak:   { icon: '✦', pt: 'Fraco', en: 'Weak', color: '#fb4b35', text: 'text-red-400', border: 'border-red-400/40', bg: 'bg-red-400/10' },
} as const

type PrismRelationKey = keyof typeof PRISM_RELATION

function visualPhrase(wordId: string, isEn: boolean): string {
  const text = WORD_VISUAL[wordId]
  if (text) return isEn ? text.en : text.pt
  const word = ALL_WORDS.find(w => w.id === wordId)
  return isEn ? (word?.nameEn ?? wordId) : (word?.namePt ?? wordId)
}

function spellVisualVariant(spell: Spell, count: number): number {
  const seed = `${spell.word1Id}:${spell.word2Id}`
  return Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0) % count
}

function spellVisualDescription(spell: Spell, isEn: boolean): string {
  const w1 = ALL_WORDS.find(w => w.id === spell.word1Id)
  const w2 = ALL_WORDS.find(w => w.id === spell.word2Id)
  const first = visualPhrase(spell.word1Id, isEn)
  const second = visualPhrase(spell.word2Id, isEn)

  if (w1?.category === 'element' && w2?.category === 'form') {
    const templates = isEn
      ? [
          `${first} gathers into ${second}, tracing the spell's shape through the air.`,
          `${second} condenses from ${first}, bright at the edges and restless at the core.`,
          `${first} threads itself through ${second}, leaving a thin shimmer behind.`,
          `${second} blooms out of ${first}, held together by a quiet arcane pulse.`,
        ]
      : [
          `${first} se concentra em ${second}, desenhando a forma da magia no ar.`,
          `${second} se condensa a partir de ${first}, brilhando nas bordas e vibrando no centro.`,
          `${first} atravessa ${second}, deixando um rastro fino de brilho.`,
          `${second} floresce de ${first}, sustentada por um pulso arcano discreto.`,
        ]
    return templates[spellVisualVariant(spell, templates.length)]
  }

  if (w1?.category === 'form' && w2?.category === 'element') {
    const templates = isEn
      ? [
          `${first} forms first, then fills with ${second} until the spell takes hold.`,
          `${second} pours into ${first}, giving the shape a faint inner glow.`,
          `${first} opens like a vessel, drawing ${second} into its center.`,
          `${second} coils around ${first}, tightening into a focused sign.`,
        ]
      : [
          `${first} se forma primeiro, depois se enche de ${second} ate a magia firmar.`,
          `${second} escorre para dentro de ${first}, acendendo um brilho interno suave.`,
          `${first} se abre como um vaso, puxando ${second} para o centro.`,
          `${second} se enrola ao redor de ${first}, apertando em um sinal focado.`,
        ]
    return templates[spellVisualVariant(spell, templates.length)]
  }

  if (w1?.category === 'element' && w2?.category === 'element') {
    const templates = isEn
      ? [
          `${first} and ${second} collide, blooming into a volatile magical surge.`,
          `${first} mixes with ${second}, forming a restless veil around the caster.`,
          `${second} answers ${first} in sharp pulses, as if the air is breathing.`,
          `${first} and ${second} spiral together, too bright to read clearly.`,
        ]
      : [
          `${first} e ${second} colidem, abrindo uma explosao magica instavel.`,
          `${first} se mistura com ${second}, formando um veu inquieto ao redor do conjurador.`,
          `${second} responde a ${first} em pulsos curtos, como se o ar respirasse.`,
          `${first} e ${second} giram juntos, brilhantes demais para serem lidos com clareza.`,
        ]
    return templates[spellVisualVariant(spell, templates.length)]
  }

  if (w1?.category === 'form' && w2?.category === 'form') {
    const templates = isEn
      ? [
          `${first} folds into ${second}, shaping raw magic into a strange pattern.`,
          `${second} mirrors ${first}, and the space between them begins to hum.`,
          `${first} and ${second} overlap, sketching a glyph that refuses to settle.`,
          `${second} turns through ${first}, leaving a precise mark in the air.`,
        ]
      : [
          `${first} se dobra em ${second}, moldando magia bruta em um padrao estranho.`,
          `${second} espelha ${first}, e o espaco entre as formas comeca a vibrar.`,
          `${first} e ${second} se sobrepoem, desenhando um glifo que nao quer assentar.`,
          `${second} gira atraves de ${first}, deixando uma marca precisa no ar.`,
        ]
    return templates[spellVisualVariant(spell, templates.length)]
  }

  return isEn
    ? `${spell.name} manifests as shifting light and pressure around the caster.`
    : `${spell.name} se manifesta como luz e pressao movendo ao redor do conjurador.`
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
    spellVisualDescription(spell, isEn),
    spellVisualDescription(spell, !isEn),
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
export function WordCard({ word, isSelected, onClick }: {
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

function WordProgressCard({ word, displayName, subtitle, progressLabel, progressPct, isKnown, isHighlighted, isSelected, onClick }: {
  word: Word
  displayName: string
  subtitle: string
  progressLabel: string
  progressPct: number
  isKnown: boolean
  isHighlighted: boolean
  isSelected: boolean
  onClick: () => void
}) {
  const isEn = useSettingsStore(s => s.lang === 'en')
  const tx = SPELLBOOK_TEXT[isEn ? 'en' : 'pt']
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isKnown}
      className={cn(
        'relative flex min-h-[104px] w-[150px] shrink-0 flex-col overflow-hidden rounded-xl border-2 px-3 py-3 text-left transition-all',
        isKnown ? RARITY_BORDER[word.rarity] : 'border-slate-300 dark:border-slate-700 border-dashed',
        isKnown ? RARITY_BG[word.rarity] : 'bg-slate-100/70 dark:bg-slate-900/60',
        !isKnown && 'cursor-not-allowed',
        isSelected && 'ring-2 ring-offset-1 ring-white dark:ring-slate-300 shadow-lg scale-105',
        isHighlighted && 'ring-2 ring-cyan-300 dark:ring-cyan-400 shadow-[0_0_18px_rgba(34,211,238,0.55)]',
      )}
      title={isKnown ? (isEn || word.namePt === word.nameEn ? word.nameEn : `${word.nameEn} - ${word.namePt}`) : progressLabel}
    >
      {isHighlighted && (
        <span className="absolute right-2 top-2 rounded-full border border-cyan-300/70 bg-cyan-100 px-1.5 py-0.5 text-[8px] font-black uppercase text-cyan-700 dark:bg-cyan-950/70 dark:text-cyan-200">
          {isEn ? '+1 Bit' : '+1 Pedaco'}
        </span>
      )}
      <span className={cn('text-[14px] font-black leading-tight', isKnown ? RARITY_TEXT[word.rarity] : 'text-slate-500 dark:text-slate-400')}>
        {displayName}
      </span>
      <span className="mt-1 text-[10px] font-semibold text-slate-500 dark:text-slate-500">
        {subtitle}
      </span>
      <span className={cn('mt-2 text-[9px] uppercase tracking-widest font-bold', isKnown ? RARITY_TEXT[word.rarity] : 'text-slate-500')}>
        {isKnown ? `${isEn ? RARITY_LABEL_EN[word.rarity] : RARITY_LABEL[word.rarity]} - ${word.category === 'element' ? tx.category.element : tx.category.form}` : progressLabel}
      </span>
      <div className="mt-auto pt-2">
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className={cn('h-full rounded-full transition-all', isKnown ? 'bg-emerald-400' : 'bg-cyan-400')}
            style={{ width: `${Math.max(4, Math.min(100, progressPct))}%` }}
          />
        </div>
      </div>
    </button>
  )
}

// ─── Spell card ───────────────────────────────────────────────────────────────
function SpellCard({
  spell,
  effectiveCooldown,
  derived,
  onAssign,
  isAssigning,
}: {
  spell: Spell
  effectiveCooldown: number
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
          <span className="text-[8px] text-slate-400 dark:text-slate-500">
            {spell.word1Id} + {spell.word2Id}
          </span>
        </div>
        <p className="text-[9px] text-slate-500 dark:text-slate-500 mt-0.5 leading-tight">
          {spellVisualDescription(spell, isEn)}
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
function ElementPrismPanel({ selected, onSelect }: {
  selected: ElementType
  onSelect: (element: ElementType) => void
}) {
  const isEn = useSettingsStore(s => s.lang === 'en')
  const selectedPrism = ELEMENT_PRISM[selected]
  const center = { x: 180, y: 180 }
  const radius = 136
  const ringElements = ELEMENT_ORDER.filter(element => element !== selected)
  const positions = {
    [selected]: center,
    ...Object.fromEntries(ringElements.map((element, index) => {
      const angle = -Math.PI / 2 + (index / ringElements.length) * Math.PI * 2
      return [element, { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius }]
    })),
  } as Record<ElementType, { x: number; y: number }>
  const relations: { to: ElementType; kind: PrismRelationKey }[] = [
    { to: selectedPrism.absorb, kind: 'absorb' },
    ...selectedPrism.immuneTo.map(to => ({ to, kind: 'immune' as const })),
    ...selectedPrism.resistTo.map(to => ({ to, kind: 'resist' as const })),
    ...selectedPrism.weakTo.map(to => ({ to, kind: 'weak' as const })),
  ]
  const visibleRelations = relations.filter(rel => rel.kind !== 'absorb')
  const relationByTarget = new Map(relations.map(rel => [rel.to, rel.kind]))
  const relationLabel = (kind: PrismRelationKey) => isEn ? PRISM_RELATION[kind].en : PRISM_RELATION[kind].pt
  const relationList = (elements: ElementType[]) => elements.map(element => elementLabel(element, isEn)).join(', ')

  return (
    <div className="space-y-3">
      <div className="grid gap-3">
        <div className="overflow-hidden rounded-xl border border-indigo-300/30 bg-slate-950 text-slate-100 shadow-inner">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-3 py-2">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300">
                {isEn ? 'Elemental Prism' : 'Prisma Elemental'}
              </p>
              <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
                {isEn ? 'Select a form to inspect its reactions.' : 'Selecione uma forma para inspecionar as reacoes.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-1">
              {(Object.keys(PRISM_RELATION) as PrismRelationKey[]).map(kind => {
                const rel = PRISM_RELATION[kind]
                return (
                  <span key={kind} className={cn('rounded border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide', rel.border, rel.bg, rel.text)}>
                    {rel.icon} {relationLabel(kind)}
                  </span>
                )
              })}
            </div>
          </div>

          <div className="grid gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div className="relative min-h-[320px]">
              <svg viewBox="-44 -14 448 392" className="h-full min-h-[320px] w-full">
                <defs>
                  <radialGradient id="prism-core" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(165,180,252,0.24)" />
                    <stop offset="60%" stopColor="rgba(99,102,241,0.08)" />
                    <stop offset="100%" stopColor="rgba(15,23,42,0)" />
                  </radialGradient>
                  <filter id="prism-soft-glow" x="-40%" y="-40%" width="180%" height="180%">
                    <feGaussianBlur stdDeviation="1.45" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter id="prism-label-shadow" x="-25%" y="-80%" width="150%" height="240%">
                    <feDropShadow dx="0" dy="1" stdDeviation="0.7" floodColor="#020617" floodOpacity="0.92" />
                    <feDropShadow dx="0" dy="0" stdDeviation="0.45" floodColor="#ffffff" floodOpacity="0.18" />
                  </filter>
                  <pattern id="prism-letter-grain" patternUnits="userSpaceOnUse" width="6" height="6">
                    <path d="M0 1.5 H6 M1 5 H5" stroke="rgba(255,255,255,0.48)" strokeWidth="0.45" />
                    <path d="M4 0 L6 2 M0 4 L2 6" stroke="rgba(2,6,23,0.5)" strokeWidth="0.35" />
                  </pattern>
                  {(Object.keys(PRISM_RELATION) as PrismRelationKey[]).map(kind => (
                    <marker key={kind} id={`prism-arrow-${kind}`} markerWidth="5.4" markerHeight="5.4" refX="5" refY="2.7" orient="auto">
                      <path d="M0,0.35 L5.4,2.7 L0,5.05 Z" fill={PRISM_RELATION[kind].color} opacity="0.82" />
                    </marker>
                  ))}
                </defs>
                <circle cx={center.x} cy={center.y} r="118" fill="url(#prism-core)" />
                <circle cx={center.x} cy={center.y} r={radius} fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth="2" />
                <circle cx={center.x} cy={center.y} r={radius - 26} fill="none" stroke="rgba(99,102,241,0.10)" strokeWidth="1" strokeDasharray="3 9" />
                <circle cx={center.x} cy={center.y} r="9" fill="rgba(129,140,248,0.28)" stroke="rgba(199,210,254,0.58)" filter="url(#prism-soft-glow)" />
                {ringElements.map(element => {
                  const target = positions[element]
                  return (
                    <line
                      key={`guide-${selected}-${element}`}
                      x1={center.x}
                      y1={center.y}
                      x2={target.x}
                      y2={target.y}
                      stroke="rgba(148,163,184,0.07)"
                      strokeWidth="1"
                      strokeLinecap="round"
                    />
                  )
                })}
                {visibleRelations.map(({ to, kind }) => {
                  const from = kind === 'weak' ? positions[selected] : positions[to]
                  const target = kind === 'weak' ? positions[to] : positions[selected]
                  const dx = target.x - from.x, dy = target.y - from.y
                  const len = Math.max(1, Math.sqrt(dx * dx + dy * dy))
                  const startPad = kind === 'weak' ? 27 : 22
                  const endPad = kind === 'weak' ? 22 : 27
                  const start = { x: from.x + (dx / len) * startPad, y: from.y + (dy / len) * startPad }
                  const end = { x: target.x - (dx / len) * endPad, y: target.y - (dy / len) * endPad }
                  const curve = kind === 'immune' ? 10 : kind === 'resist' ? -8 : 14
                  const mx = (start.x + end.x) / 2 - (dy / len) * curve
                  const my = (start.y + end.y) / 2 + (dx / len) * curve
                  return (
                    <path
                      key={`${selected}-${kind}-${to}`}
                      d={`M ${start.x} ${start.y} Q ${mx} ${my} ${end.x} ${end.y}`}
                      fill="none"
                      stroke={PRISM_RELATION[kind].color}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={kind === 'absorb' ? 2.4 : 1.55}
                      strokeDasharray={kind === 'immune' ? '6 5' : kind === 'resist' ? '3 5' : undefined}
                      opacity={kind === 'absorb' ? 0.8 : 0.72}
                      filter={kind === 'absorb' ? 'url(#prism-soft-glow)' : undefined}
                      markerEnd={`url(#prism-arrow-${kind})`}
                    />
                  )
                })}
                {[selected, ...ringElements].map(element => {
                  const pos = positions[element]
                  const isSelected = element === selected
                  const relation = relationByTarget.get(element)
                  const tone = ELEMENT_TONE[element]
                  const stroke = relation ? PRISM_RELATION[relation].color : tone.line
                  const label = elementLabel(element, isEn).toUpperCase()
                  const labelDx = isSelected ? 0 : pos.x - center.x
                  const labelDy = isSelected ? 1 : pos.y - center.y
                  const labelLen = Math.max(1, Math.sqrt(labelDx * labelDx + labelDy * labelDy))
                  const labelDistance = isSelected ? 47 : 31
                  const labelX = pos.x + (labelDx / labelLen) * labelDistance
                  const labelY = pos.y + (labelDy / labelLen) * labelDistance + 4
                  const labelAnchor = isSelected ? 'middle' : labelDx > 45 ? 'start' : labelDx < -45 ? 'end' : 'middle'
                  const badgeSize = isSelected ? 44 : 36
                  const badgeOffset = ELEMENT_BADGE_VISUAL_OFFSET[element] ?? { x: 0, y: 0 }
                  const badgeCenter = {
                    x: pos.x + badgeOffset.x,
                    y: pos.y - (isSelected ? 0.5 : 0.35) + badgeOffset.y,
                  }
                  const badgeHalf = badgeSize / 2
                  return (
                    <g key={element} role="button" tabIndex={0} onClick={() => onSelect(element)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onSelect(element) }} className="cursor-pointer outline-none">
                      {isSelected && (
                        <circle cx={badgeCenter.x} cy={badgeCenter.y} r="27" fill="none" stroke={PRISM_RELATION.absorb.color} strokeWidth="1.15" strokeDasharray="3 6" opacity="0.5" />
                      )}
                      <circle cx={badgeCenter.x} cy={badgeCenter.y} r={isSelected ? 25 : relation ? 20 : 19} fill={isSelected ? `${stroke}1c` : 'rgba(15,23,42,0.62)'} stroke={stroke} strokeWidth={isSelected ? 1.65 : relation ? 1.25 : 1.05} opacity={isSelected || relation ? 0.82 : 0.9} filter={isSelected || relation ? 'url(#prism-soft-glow)' : undefined} />
                      <circle cx={badgeCenter.x} cy={badgeCenter.y} r={isSelected ? 23 : 18.2} fill="rgba(2,6,23,0.72)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.9" />
                      <foreignObject x={badgeCenter.x - badgeHalf} y={badgeCenter.y - badgeHalf} width={badgeSize} height={badgeSize}>
                        <div
                          className={cn('rounded-full drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]', isSelected ? 'h-11 w-11' : 'h-9 w-9')}
                          style={elementBadgeStyle(element)}
                        />
                      </foreignObject>
                      <g opacity={isSelected ? 0.98 : 0.9} filter="url(#prism-label-shadow)">
                        <text x={labelX} y={labelY} textAnchor={labelAnchor} fontSize={isSelected ? '11' : '10'} fontWeight="900" fill="rgba(2,6,23,0.88)" stroke="rgba(2,6,23,0.88)" strokeWidth="2.1" strokeLinejoin="round">{label}</text>
                        <text x={labelX} y={labelY} textAnchor={labelAnchor} fontSize={isSelected ? '11' : '10'} fontWeight="900" fill={isSelected ? '#e0e7ff' : tone.line}>{label}</text>
                        <text x={labelX} y={labelY} textAnchor={labelAnchor} fontSize={isSelected ? '11' : '10'} fontWeight="900" fill="url(#prism-letter-grain)" opacity={isSelected ? 0.52 : 0.46}>{label}</text>
                        <text x={labelX - 0.35} y={labelY - 0.35} textAnchor={labelAnchor} fontSize={isSelected ? '11' : '10'} fontWeight="900" fill="rgba(255,255,255,0.2)">{label}</text>
                      </g>
                      {isSelected && <text x={badgeCenter.x + 34} y={badgeCenter.y - 32} textAnchor="middle" fontSize="13" fill={PRISM_RELATION.absorb.color}>{PRISM_RELATION.absorb.icon}</text>}
                      {relation && element !== selected && <text x={badgeCenter.x + 18} y={badgeCenter.y - 17} textAnchor="middle" fontSize="12" fill={PRISM_RELATION[relation].color}>{PRISM_RELATION[relation].icon}</text>}
                    </g>
                  )
                })}
              </svg>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
              <div className={cn('rounded-lg border px-3 py-2', ELEMENT_TONE[selected].border, ELEMENT_TONE[selected].bg)}>
                <p className={cn('text-[11px] font-black uppercase tracking-widest', ELEMENT_TONE[selected].text)}>{elementLabel(selected, isEn)}</p>
                <p className="mt-1 text-[10px] font-semibold leading-snug text-slate-300">
                  {isEn ? ELEMENT_LORE[selected].en : ELEMENT_LORE[selected].pt}
                </p>
              </div>
              <div className="mt-3 space-y-2">
                {([
                  ['absorb', [selectedPrism.absorb]],
                  ['immune', selectedPrism.immuneTo],
                  ['resist', selectedPrism.resistTo],
                  ['weak', selectedPrism.weakTo],
                ] as [PrismRelationKey, ElementType[]][]).map(([kind, elements]) => {
                  const rel = PRISM_RELATION[kind]
                  return (
                    <div key={kind} className={cn('rounded-lg border px-2.5 py-2', rel.border, rel.bg)}>
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn('text-[9px] font-black uppercase tracking-widest', rel.text)}>{rel.icon} {relationLabel(kind)}</span>
                        <span className="text-[9px] font-bold text-slate-400">{kind === 'absorb' ? (isEn ? 'heals' : 'cura') : kind === 'immune' ? '0%' : kind === 'resist' ? '50%' : '150%'}</span>
                      </div>
                      <p className="mt-1 text-[11px] font-bold text-slate-100">{relationList(elements)}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50">
          <div className="border-b border-slate-200 px-3 py-2 dark:border-slate-800">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{isEn ? 'Prism Table' : 'Tabela do Prisma'}</p>
          </div>
          <div className="max-h-[520px] overflow-auto">
            <table className="w-full text-left text-[10px]">
              <thead className="sticky top-0 bg-slate-100 text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                <tr>
                  <th className="px-2 py-2 font-black uppercase">{isEn ? 'Form' : 'Forma'}</th>
                  <th className="px-2 py-2 font-black uppercase">{relationLabel('absorb')}</th>
                  <th className="px-2 py-2 font-black uppercase">{relationLabel('immune')}</th>
                  <th className="px-2 py-2 font-black uppercase">{relationLabel('resist')}</th>
                  <th className="px-2 py-2 font-black uppercase">{isEn ? 'Weak To' : 'Fraco'}</th>
                </tr>
              </thead>
              <tbody>
                {ELEMENT_ORDER.map(element => {
                  const prism = ELEMENT_PRISM[element]
                  const active = selected === element
                  return (
                    <tr key={element} onClick={() => onSelect(element)} className={cn('cursor-pointer border-t border-slate-200/80 transition-colors dark:border-slate-800', active ? 'bg-indigo-50 dark:bg-indigo-950/35' : 'hover:bg-white dark:hover:bg-slate-800/70')}>
                      <td className="px-2 py-2"><span className={cn('inline-flex items-center gap-1.5 font-black', ELEMENT_TONE[element].text)}><ElementBadge element={element} size={22} />{elementLabel(element, isEn)}</span></td>
                      <td className="px-2 py-2 font-semibold text-lime-600 dark:text-lime-400">{elementLabel(prism.absorb, isEn)}</td>
                      <td className="px-2 py-2 font-semibold text-sky-600 dark:text-sky-400">{relationList(prism.immuneTo)}</td>
                      <td className="px-2 py-2 font-semibold text-yellow-700 dark:text-yellow-300">{relationList(prism.resistTo)}</td>
                      <td className="px-2 py-2 font-semibold text-red-600 dark:text-red-400">{relationList(prism.weakTo)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function maskedWordName(name: string, bits: number, required: number): string {
  if (bits >= required) return name
  if (bits <= 0) return '?'.repeat(name.length)
  const chars = Array.from({ length: name.length }, () => '?')
  const revealCount = Math.max(1, Math.min(name.length, Math.ceil((bits / required) * name.length)))
  const positions = [0, name.length - 1]
  for (let i = 1; positions.length < revealCount && i < name.length - 1; i += 2) positions.push(i)
  for (const pos of positions.slice(0, revealCount)) chars[pos] = name[pos]
  return chars.join('')
}

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
  const wordBits     = useSpellStore(s => s.wordBits)
  const wordSand     = useSpellStore(s => s.wordSand)
  const craftedSpellIds = useSpellStore(s => s.craftedSpellIds)
  const generateWordBit = useSpellStore(s => s.generateWordBit)
  const createSpellFromWords = useSpellStore(s => s.createSpellFromWords)
  const spellSlots    = useSpellStore(s => s.spellSlots)
  const cooldowns     = useSpellStore(s => s.cooldowns)
  const setSpellSlot  = useSpellStore(s => s.setSpellSlot)
  const activeBuffs   = useSpellStore(s => s.activeBuffs)
  const spellAutoSlots = useSpellStore(s => s.autoSlots)
  const setAutoSlot    = useSpellStore(s => s.setAutoSlot)

  const partyAttributes = usePartyEffectiveAttributes(attrs, level)
  const knownWordIds    = getKnownWordIds(earnedWordIds, wordBits)
  const availableSpells = getPlayerSpells(knownWordIds, craftedSpellIds)
  const equipBonuses = getEquipmentBonuses(equipment)
  const weaponStats = getWeaponStatBonuses(weaponProgress, equippedWeapons)
  const weaponProfile = getWeaponCombatProfile(weaponProgress, equippedWeapons)
  const baseDerived = getDerivedStats(partyAttributes, equipBonuses, level)
  const spellDerived: DerivedStats = applySpellBuffs({
    ...baseDerived,
    magicDamage: baseDerived.magicDamage + weaponStats.magicDamage,
  }, activeBuffs)

  const wordSandRate = getWordSandPerSecond(level, partyAttributes.inteligencia, partyAttributes.sabedoria)

  const [tab, setTab]           = useState<'words' | 'spells' | 'elements'>('words')
  const [selectedWords, setSelectedWords] = useState<string[]>([])
  const [selectedElement, setSelectedElement] = useState<ElementType>('ignis')
  const [assigningSpell, setAssigningSpell] = useState<string | null>(null)
  const [showAutoConfig, setShowAutoConfig] = useState(false)
  const [spellQuery, setSpellQuery] = useState('')
  const [effectFilter, setEffectFilter] = useState<SpellEffectFilter>('all')
  const [rarityFilter, setRarityFilter] = useState<SpellRarityFilter>('all')
  const [lastWordBitId, setLastWordBitId] = useState<string | null>(null)
  const autoConfigRef = useRef<HTMLDivElement>(null)
  const wordBitCost = getWordBitCost(knownWordIds.length)
  const wordSandLabel = isEn ? 'Word Sand' : 'Areia de Palavra'
  const wordBitLabel = isEn ? 'Word Bit' : 'Pedaco de Palavra'
  const wordBitsLabel = isEn ? 'Word Bits' : 'Pedacos de Palavra'

  function handleGenerateWordBit() {
    const wordId = generateWordBit()
    if (!wordId) return
    setLastWordBitId(wordId)
  }

  // ── Word selection for preview combo ──
  function toggleWord(id: string) {
    if (!knownWordIds.includes(id)) return
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

  useEffect(() => {
    if (!lastWordBitId) return
    const id = window.setTimeout(() => setLastWordBitId(null), 2200)
    return () => window.clearTimeout(id)
  }, [lastWordBitId])

  const knownWords = ALL_WORDS
  const filteredSpells = useMemo(
    () => availableSpells.filter(spell => spellMatchesFilters(spell, isEn, spellDerived, spellQuery, effectFilter, rarityFilter)),
    [availableSpells, effectFilter, isEn, rarityFilter, spellDerived, spellQuery],
  )
  const hasSpellFilters = spellQuery.trim() !== '' || effectFilter !== 'all' || rarityFilter !== 'all'

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-3">
        {(['words', 'spells', 'elements'] as const).map(t => (
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
            {t === 'words'
              ? `${tx.words} (${knownWordIds.length}/${ALL_WORDS.length})`
              : t === 'spells'
                ? `${tx.spells} (${availableSpells.length})`
                : tx.elements}
          </button>
        ))}
        <span className="hidden">
          {wordSandLabel}: {Math.floor(wordSand)} - {tx.mana}: {Math.floor(mana)}
        </span>
      </div>

      {/* ── WORDS TAB ────────────────────────────────────────────────────── */}
      {tab === 'words' && (
        <div>
          {/* Progress info */}
          <div className="mb-3 grid gap-2 md:grid-cols-[minmax(180px,1.2fr)_minmax(150px,1fr)_minmax(150px,1fr)_auto] md:items-stretch">
            <div className="rounded-xl border border-cyan-400/40 bg-cyan-50/80 px-3 py-2 dark:bg-cyan-950/25">
              <span className="block text-[8px] font-black uppercase tracking-widest text-cyan-700/70 dark:text-cyan-300/70">{wordSandLabel}</span>
              <span className="mt-0.5 block text-[22px] font-black leading-none text-cyan-700 dark:text-cyan-200">{Math.floor(wordSand)}</span>
              <span className="mt-1 block text-[10px] font-semibold text-cyan-700/70 dark:text-cyan-300/70">
                +{wordSandRate.toFixed(2)} {isEn ? 'per second' : 'por segundo'}
              </span>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-3 py-2">
              <span className="block text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                {isEn ? `Next ${wordBitLabel}` : `Proximo ${wordBitLabel}`}
              </span>
              <span className="mt-0.5 block text-[16px] font-black text-slate-700 dark:text-slate-200">{wordBitCost} {wordSandLabel}</span>
              <span className={cn('mt-1 block text-[10px] font-bold', wordSand >= wordBitCost ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500')}>
                {wordSand >= wordBitCost ? (isEn ? 'Ready to generate' : 'Pronto para gerar') : (isEn ? 'Collect more sand' : 'Junte mais areia')}
              </span>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-3 py-2">
              <span className="block text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                {isEn ? 'Known Words' : 'Palavras Conhecidas'}
              </span>
              <span className="mt-0.5 block text-[16px] font-black text-slate-700 dark:text-slate-200">{knownWordIds.length}/{ALL_WORDS.length}</span>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.max(4, (knownWordIds.length / ALL_WORDS.length) * 100)}%` }} />
              </div>
            </div>
            <button
              type="button"
              onClick={handleGenerateWordBit}
              disabled={wordSand < wordBitCost}
              className={cn(
                'rounded-xl border px-4 py-2 text-[11px] font-black transition-colors md:min-w-[128px]',
                wordSand >= wordBitCost
                  ? 'border-cyan-400 bg-cyan-500 text-white shadow-[0_0_14px_rgba(34,211,238,0.35)] hover:bg-cyan-400'
                  : 'border-slate-300 dark:border-slate-700 text-slate-400 opacity-50 cursor-not-allowed',
              )}
            >
              {isEn ? `Generate ${wordBitLabel}` : `Gerar ${wordBitLabel}`}
            </button>
          </div>

          {/* Known words grid */}
          <div className="flex flex-wrap gap-2 mb-3">
            {knownWords.map(w => (
              (() => {
                const bits = Math.min(wordBits[w.id] ?? 0, getWordBitRequirement(w.id))
                const required = getWordBitRequirement(w.id)
                const isKnown = knownWordIds.includes(w.id)
                return (
                  <WordProgressCard
                    key={w.id}
                    word={w}
                    displayName={isKnown ? w.nameEn : maskedWordName(w.nameEn, bits, required)}
                    subtitle={isKnown
                      ? (!isEn && w.namePt !== w.nameEn ? w.namePt : w.description)
                      : (isEn ? 'Unknown word' : 'Palavra desconhecida')}
                    progressLabel={isKnown ? (isEn ? 'Ready' : 'Pronta') : `${bits}/${required} ${wordBitsLabel}`}
                    progressPct={(bits / required) * 100}
                    isKnown={isKnown}
                    isHighlighted={lastWordBitId === w.id}
                    isSelected={isKnown && selectedWords.includes(w.id)}
                    onClick={() => toggleWord(w.id)}
                  />
                )
              })()
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
              <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
                {[0, 1].map(slot => {
                  const selected = selectedWords[slot]
                  const word = selected ? ALL_WORDS.find(x => x.id === selected) : null
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => selected && toggleWord(selected)}
                      className={cn(
                        'min-h-[64px] rounded-xl border-2 px-3 py-2 text-left transition-colors',
                        slot === 0 ? 'sm:order-1' : 'sm:order-3',
                        word
                          ? cn(RARITY_BORDER[word.rarity], RARITY_BG[word.rarity])
                          : 'border-dashed border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-950/30',
                      )}
                    >
                      <span className="block text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-600">
                        {isEn ? `Word Slot ${slot + 1}` : `Slot de Palavra ${slot + 1}`}
                      </span>
                      <span className={cn('mt-1 block text-[13px] font-black', word ? RARITY_TEXT[word.rarity] : 'text-slate-400 dark:text-slate-600')}>
                        {word ? word.nameEn : (isEn ? 'Choose a word' : 'Escolha uma palavra')}
                      </span>
                      {word && !isEn && word.namePt !== word.nameEn && (
                        <span className="mt-0.5 block text-[10px] text-slate-500 dark:text-slate-500">{word.namePt}</span>
                      )}
                    </button>
                  )
                })}
                <div className="hidden items-center justify-center text-slate-400 sm:order-2 sm:flex">+</div>
              </div>
              <div className="hidden">
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
                <div className="mt-3 rounded-lg border border-slate-200/70 dark:border-slate-700/70 bg-white/50 dark:bg-slate-950/30 px-3 py-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className={cn('text-[13px] font-black', RARITY_TEXT[previewSpell.rarity])}>{previewSpell.name}</span>
                    <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-300">
                      {getSpellCreationCost(previewSpell, craftedSpellIds.length)} {wordSandLabel}
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-500 dark:text-slate-500">
                    {spellVisualDescription(previewSpell, isEn)}
                  </p>
                  {!craftedSpellIds.includes(previewSpell.id) ? (
                    <button
                      type="button"
                      onClick={() => createSpellFromWords(previewSpell.word1Id, previewSpell.word2Id)}
                      disabled={wordSand < getSpellCreationCost(previewSpell, craftedSpellIds.length)}
                      className={cn(
                        'mt-2 rounded-lg border px-3 py-1.5 text-[10px] font-bold transition-colors',
                        wordSand >= getSpellCreationCost(previewSpell, craftedSpellIds.length)
                          ? 'border-indigo-400 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300'
                          : 'border-slate-300 dark:border-slate-700 text-slate-400 opacity-50 cursor-not-allowed',
                      )}
                    >
                      {isEn ? 'Create spell' : 'Criar magia'}
                    </button>
                  ) : (
                    <span className="mt-2 inline-block text-[10px] font-bold text-emerald-500">{isEn ? 'Spell created' : 'Magia criada'}</span>
                  )}
                </div>
              )}
            </div>
          )}

          <p className="mt-2 text-[9px] text-slate-400 dark:text-slate-600 italic">
            {isEn
              ? 'Level, Intelligence and Wisdom increase Word Sand generation; words come from Word Bit progress.'
              : 'Nivel, Inteligencia e Sabedoria aumentam a geracao de Areia de Palavra; palavras vêm do progresso de Pedacos de Palavra.'}
          </p>
        </div>
      )}

      {/* ── SPELLS TAB ───────────────────────────────────────────────────── */}
      {tab === 'elements' && (
        <ElementPrismPanel selected={selectedElement} onSelect={setSelectedElement} />
      )}

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
