import { useEffect, useRef, useState } from 'react'
import { useSpellStore, getKnownWordIds, getPlayerSpells } from '../store/spellStore'
import { useHeroStore } from '../store/heroStore'
import { useInventoryStore } from '../store/inventoryStore'
import { ALL_WORDS, LEARNABLE_WORDS, getAutoWordSlots } from '../data/words'
import { findSpell, SPELL_ICONS, SPELL_MAP, WORD_ICONS } from '../data/spells'
import { getDerivedStats } from '../formulas/derived'
import { getEquipmentBonuses } from '../formulas/items'
import { getWeaponCombatProfile, getWeaponStatBonuses } from '../formulas/weapons'
import { applySpellBuffs } from '../formulas/spells'
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
const EFFECT_ICON: Record<string, string> = {
  damage: '⚔', heal: '✦', buff: '▲', debuff: '▼', utility: '◎',
}
const EFFECT_COLOR: Record<string, string> = {
  damage:  'text-red-500 dark:text-red-400',
  heal:    'text-emerald-600 dark:text-emerald-400',
  buff:    'text-blue-500 dark:text-blue-400',
  debuff:  'text-purple-500 dark:text-purple-400',
  utility: 'text-amber-500 dark:text-amber-400',
}

const PERCENT_EFFECT_STATS = new Set([
  'attackSpeed', 'dodgeChance', 'critChance', 'critDamage', 'damageReduction',
  'healBonus', 'moveSpeed', 'dropChance', 'xpBonus',
])

const STAT_LABEL: Record<string, { pt: string; en: string }> = {
  atk: { pt: 'ATK', en: 'ATK' },
  def: { pt: 'DEF', en: 'DEF' },
  attackSpeed: { pt: 'Vel. Atk', en: 'Atk Speed' },
  dodgeChance: { pt: 'Esquiva', en: 'Dodge' },
  magicDamage: { pt: 'Dano Magico', en: 'Magic Dmg' },
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

function spellEffectSummary(spell: Spell, derived: DerivedStats, isEn: boolean): {
  primary: string
  details: string[]
} {
  const e = spell.effect
  const details: string[] = []

  if (e.type === 'damage') {
    const raw = spellRawAmount(spell, derived)
    const valueText = e.chaos
      ? `${Math.max(1, Math.round(raw * 0.5))}-${Math.max(1, Math.round(raw * 1.5))}`
      : String(Math.round(raw))
    if (e.scalingStat) details.push(`${statLabel(e.scalingStat, isEn)} ${fmtNumber(derived[e.scalingStat] as number)}`)
    if (e.lifesteal) details.push(`${isEn ? 'Lifesteal' : 'Roubo de vida'} ${fmtPercent(e.lifesteal)}`)
    if (e.enemyAtkMult !== undefined) details.push(`ATK ${formatDebuffMult(e.enemyAtkMult)}`)
    if (e.enemyAtkSpeedMult !== undefined) details.push(`${isEn ? 'Speed' : 'Vel'} ${formatDebuffMult(e.enemyAtkSpeedMult)}`)
    if (e.debuffDuration) details.push(`${e.debuffDuration}t`)
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
    if (e.duration) details.push(`${e.duration}t`)
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
    if (e.duration) details.push(`${e.duration}t`)
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
    if (e.debuffDuration) details.push(`${e.debuffDuration}t`)
    return {
      primary: `${isEn ? 'Debuff' : 'Debuff'}: ${details.join(' + ')}`,
      details,
    }
  }

  return { primary: isEn ? 'No direct effect' : 'Sem efeito direto', details }
}

// ─── Word card ────────────────────────────────────────────────────────────────
function WordCard({ word, isSelected, onClick }: {
  word: Word
  isSelected: boolean
  onClick: () => void
}) {
  const isEn = useSettingsStore(s => s.lang === 'en')
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
        {word.category === 'element' ? 'Elem' : 'Forma'}
      </span>
    </button>
  )
}

// ─── Spell card ───────────────────────────────────────────────────────────────
function SpellCard({
  spell,
  cooldownRemaining,
  effectiveCooldown,
  firstSlotManaCost,
  derived,
  onAssign,
  isAssigning,
}: {
  spell: Spell
  cooldownRemaining: number
  effectiveCooldown: number
  firstSlotManaCost: number | null
  derived: DerivedStats
  onAssign: () => void
  isAssigning: boolean
}) {
  const isEn = useSettingsStore(s => s.lang === 'en')
  const pct = cooldownRemaining / spell.cooldown
  const summary = spellEffectSummary(spell, derived, isEn)
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
          {spell.effect.type === 'damage'  ? 'Dano'   :
           spell.effect.type === 'heal'    ? 'Cura'   :
           spell.effect.type === 'buff'    ? 'Bônus'  :
           spell.effect.type === 'debuff'  ? 'Debuff' : 'Util'}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={cn('text-[11px] font-bold', RARITY_TEXT[spell.rarity])}>
            {spell.name}
          </span>
          <span className={cn('text-[8px] uppercase tracking-widest font-semibold opacity-60', RARITY_TEXT[spell.rarity])}>
            {RARITY_LABEL[spell.rarity]}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[9px] text-blue-500 dark:text-blue-400 font-semibold">
            {spell.manaCost} mana
          </span>
          {firstSlotManaCost !== null && firstSlotManaCost !== spell.manaCost && (
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
          {spell.description}
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
        {cooldownRemaining > 0 && (
          <div className="mt-1 h-1 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-400 dark:bg-indigo-500 transition-[width]"
              style={{ width: `${(1 - pct) * 100}%` }}
            />
          </div>
        )}
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
        title="Atribuir a slot de magia"
      >
        ⌨
      </button>
    </div>
  )
}

// ─── Main SpellbookPanel ──────────────────────────────────────────────────────
export default function SpellbookPanel() {
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
  const activeDebuff  = useSpellStore(s => s.activeDebuff)
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
            {t === 'words' ? `Palavras (${knownWords.length})` : `Magias (${availableSpells.length})`}
          </button>
        ))}
        <span className="ml-auto text-[9px] text-slate-400 dark:text-slate-600 self-center">
          Mana: {Math.floor(mana)}
        </span>
      </div>

      {/* ── WORDS TAB ────────────────────────────────────────────────────── */}
      {tab === 'words' && (
        <div>
          {/* Progress info */}
          <div className="mb-2 text-[9px] text-slate-400 dark:text-slate-600 flex gap-3 flex-wrap">
            <span>Slots de nível: {wordSlotCount}/{LEARNABLE_WORDS.length} (próx. Nv.{nextSlotAt})</span>
            <span>+INT: +{Math.floor(attrs.inteligencia / 10)} &nbsp; +SAB: +{Math.floor(attrs.sabedoria / 10)}</span>
            {earnedWordIds.length > 0 && (
              <span className="text-purple-500 dark:text-purple-400">+{earnedWordIds.length} palavra{earnedWordIds.length !== 1 ? 's' : ''} obtida{earnedWordIds.length !== 1 ? 's' : ''}</span>
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
                Nenhuma palavra conhecida ainda.
              </p>
            )}
          </div>

          {/* Combo preview */}
          {selectedWords.length > 0 && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-2.5">
              <p className="text-[9px] text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-2">
                Combinação
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
                  {previewSpell.description} · {previewSpell.manaCost} mana · CD {previewSpell.cooldown}t
                </p>
              )}
            </div>
          )}

          {/* Locked words hint */}
          {LEARNABLE_WORDS.length - knownWords.filter(w => ['common','uncommon'].includes(w.rarity)).length > 0 && (
            <p className="mt-2 text-[9px] text-slate-400 dark:text-slate-600 italic">
              Palavras raras+ podem ser obtidas por drops ou compradas na loja.
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
              Slots:
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
                  title={spell ? `Slot ${i+1}: ${spell.name} (clique para remover)` : `Slot ${i+1} (vazio)`}
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
                ← escolha um slot
              </span>
            )}
            <div className="relative ml-auto flex items-center gap-1">
              <span className="text-[8px] text-slate-400 dark:text-slate-600 uppercase tracking-widest">
                Auto
              </span>
              <button
                type="button"
                onClick={() => setShowAutoConfig(v => !v)}
                title="Configurar auto-uso"
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
                    Auto-uso de Magias
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
                                <option value={1.0}>sempre</option>
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
                            vazio
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Active effects */}
          {(activeBuffs.length > 0 || activeDebuff) && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {activeBuffs.map(b => {
                const spell = SPELL_MAP.get(b.spellId)
                return (
                  <span key={b.spellId} title={spell?.name} className="inline-flex items-center gap-0.5 text-[8px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded px-1.5 py-0.5 font-semibold">
                    {SPELL_ICONS[b.spellId] ?? WORD_ICONS[spell?.word1Id ?? ''] ?? '▲'} {spell?.name ?? b.spellId} <span className="opacity-60">{b.remaining}t</span>
                  </span>
                )
              })}
              {activeDebuff && (() => {
                const spell = SPELL_MAP.get(activeDebuff.spellId)
                return (
                  <span title={spell?.name} className="inline-flex items-center gap-0.5 text-[8px] bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded px-1.5 py-0.5 font-semibold">
                    {SPELL_ICONS[activeDebuff.spellId] ?? WORD_ICONS[spell?.word1Id ?? ''] ?? '▼'} {spell?.name ?? 'Debuff'} <span className="opacity-60">{activeDebuff.remaining}t</span>
                  </span>
                )
              })()}
            </div>
          )}

          {/* Spell list */}
          {availableSpells.length === 0 ? (
            <p className="text-[10px] text-slate-400 dark:text-slate-600 italic text-center py-3">
              Aprenda pelo menos 2 palavras para desbloquear magias.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {availableSpells.map(spell => (
                <SpellCard
                  key={spell.id}
                  spell={spell}
                  cooldownRemaining={cooldowns[spell.id] ?? 0}
                  effectiveCooldown={Math.max(1, Math.ceil(spell.cooldown * (1 - weaponProfile.staffCooldownReduction)))}
                  firstSlotManaCost={spellSlots[0] === spell.id
                    ? Math.max(1, Math.round(spell.manaCost * (1 - weaponProfile.staffSlotOneManaDiscount)))
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
