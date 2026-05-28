import { useState } from 'react'
import { useSpellStore, getKnownWordIds, getPlayerSpells } from '../store/spellStore'
import { useHeroStore } from '../store/heroStore'
import { ALL_WORDS, LEARNABLE_WORDS, getAutoWordSlots } from '../data/words'
import { findSpell, SPELL_ICONS, SPELL_MAP, WORD_ICONS } from '../data/spells'
import { cn } from '../lib/utils'
import type { Word, Spell, SpellRarity } from '../types/spell'

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

// ─── Word card ────────────────────────────────────────────────────────────────
function WordCard({ word, isSelected, onClick }: {
  word: Word
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border-2 px-2 py-2.5 transition-all w-[72px] shrink-0',
        RARITY_BORDER[word.rarity],
        RARITY_BG[word.rarity],
        isSelected && 'ring-2 ring-offset-1 ring-white dark:ring-slate-300 shadow-lg scale-105',
      )}
      title={`${word.nameEn} — ${word.namePt}`}
    >
      <span className={cn('text-[11px] font-black tracking-wide', RARITY_TEXT[word.rarity])}>
        {word.nameEn}
      </span>
      <span className="text-[8px] text-slate-400 dark:text-slate-500 mt-0.5">
        {word.namePt}
      </span>
      <span className={cn('text-[7px] uppercase tracking-widest mt-1 font-semibold opacity-60', RARITY_TEXT[word.rarity])}>
        {word.category === 'element' ? 'Elem' : 'Forma'}
      </span>
    </button>
  )
}

// ─── Spell card ───────────────────────────────────────────────────────────────
function SpellCard({ spell, cooldownRemaining, onAssign, isAssigning }: {
  spell: Spell
  cooldownRemaining: number
  onAssign: () => void
  isAssigning: boolean
}) {
  const pct = cooldownRemaining / spell.cooldown
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
          <span className="text-[9px] text-slate-400 dark:text-slate-500">
            CD {spell.cooldown}t
          </span>
          <span className="text-[8px] text-slate-400 dark:text-slate-500">
            {spell.word1Id} + {spell.word2Id}
          </span>
        </div>
        <p className="text-[9px] text-slate-500 dark:text-slate-500 mt-0.5 leading-tight">
          {spell.description}
        </p>
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

  const earnedWordIds = useSpellStore(s => s.earnedWordIds)
  const spellSlots    = useSpellStore(s => s.spellSlots)
  const cooldowns     = useSpellStore(s => s.cooldowns)
  const setSpellSlot  = useSpellStore(s => s.setSpellSlot)
  const activeBuffs   = useSpellStore(s => s.activeBuffs)
  const activeDebuff  = useSpellStore(s => s.activeDebuff)

  const knownWordIds    = getKnownWordIds(level, attrs.inteligencia, attrs.sabedoria, earnedWordIds)
  const availableSpells = getPlayerSpells(knownWordIds)

  const autoSlots   = getAutoWordSlots(level, attrs.inteligencia, attrs.sabedoria)
  const nextSlotAt  = (Math.floor(level / 5) + 1) * 5  // next level milestone

  const [tab, setTab]           = useState<'words' | 'spells'>('words')
  const [selectedWords, setSelectedWords] = useState<string[]>([])
  const [assigningSpell, setAssigningSpell] = useState<string | null>(null)

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
            <span>Slots de nível: {autoSlots}/{LEARNABLE_WORDS.length} (próx. Nv.{nextSlotAt})</span>
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
          <div className="flex items-center gap-1.5 mb-3 flex-wrap">
            <span className="text-[9px] text-slate-400 dark:text-slate-600 uppercase tracking-widest shrink-0">
              Slots:
            </span>
            {spellSlots.map((sid, i) => {
              const spell = sid ? availableSpells.find(s => s.id === sid) : null
              const cd    = sid ? (cooldowns[sid] ?? 0) : 0
              const isAssigning = assigningSpell !== null
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
