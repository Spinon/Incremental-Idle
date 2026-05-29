import { useEffect, useRef, useState, useCallback } from 'react'
import { useBattleStore } from '../store/battleStore'
import { useHeroStore } from '../store/heroStore'
import { useInventoryStore } from '../store/inventoryStore'
import { useSpellStore, getKnownWordIds, getPlayerSpells } from '../store/spellStore'
import { useUIStore } from '../store/uiStore'
import { SPELL_ICONS, SPELL_MAP, WORD_ICONS } from '../data/spells'
import { getDerivedStats } from '../formulas/derived'
import { useT } from '../i18n/useT'
import { cn } from '../lib/utils'
import { useSettingsStore } from '../store/settingsStore'
import UnitSprite from './UnitSprite'
import HpBar from './HpBar'
import type { Consumable, ItemRarity } from '../types/item'
import type { SpellRarity, AutoCastConfig } from '../types/spell'

const RARITY_BORDER: Record<ItemRarity | SpellRarity, string> = {
  common:   'border-slate-400  dark:border-slate-600',
  uncommon: 'border-green-500  dark:border-green-700',
  rare:     'border-blue-500   dark:border-blue-700',
  epic:     'border-purple-500 dark:border-purple-700',
  set:      'border-yellow-400 dark:border-yellow-500',
  unique:   'border-orange-500 dark:border-orange-400',
}

const EFFECT_ICON: Record<string, string> = {
  damage: '⚔', heal: '✦', buff: '▲', debuff: '▼', utility: '◎',
}
const EFFECT_COLOR: Record<string, string> = {
  damage:  'text-red-400',
  heal:    'text-emerald-400',
  buff:    'text-blue-400',
  debuff:  'text-purple-400',
  utility: 'text-amber-400',
}

const ATTACK_MS = 2000
const IDLE_MS   = 1600
const COMBO_MS  = 350   // short gap between hits in a combo

export default function BattleArena() {
  const store      = useBattleStore()
  const gainXp     = useHeroStore((s) => s.gainXp)
  const heroLevel  = useHeroStore((s) => s.level)
  const xpGranted  = useRef(false)
  const t          = useT()
  const lang       = useSettingsStore(s => s.lang)
  const isEn       = lang === 'en'

  // Consumable quickslots
  const attrs          = useHeroStore(s => s.attributes)
  const restoreStamina = useHeroStore(s => s.restoreStamina)
  const restoreMana    = useHeroStore(s => s.restoreMana)
  const gainSkipCharge = useHeroStore(s => s.gainSkipCharge)
  const consumables    = useInventoryStore(s => s.consumables)
  const quickslots     = useInventoryStore(s => s.quickslots)
  const removeConsumable = useInventoryStore(s => s.removeConsumable)

  // Spell quickslots
  const level           = useHeroStore(s => s.level)
  const earnedWordIds   = useSpellStore(s => s.earnedWordIds)
  const spellSlots      = useSpellStore(s => s.spellSlots)
  const cooldowns       = useSpellStore(s => s.cooldowns)
  const castSpell       = useSpellStore(s => s.castSpell)
  const autoSlots       = useSpellStore(s => s.autoSlots)
  const activeBuffs     = useSpellStore(s => s.activeBuffs)
  const activeDebuff    = useSpellStore(s => s.activeDebuff)
  const setAutoSlot     = useSpellStore(s => s.setAutoSlot)
  const mana            = useHeroStore(s => s.mana)
  const knownWordIds    = getKnownWordIds(level, attrs.inteligencia, attrs.sabedoria, earnedWordIds)
  const availableSpells = getPlayerSpells(knownWordIds)

  const showMini       = useUIStore(s => s.showMiniPlayer)
  const toggleMini     = useUIStore(s => s.toggleMiniPlayer)

  const [showAutoConfig, setShowAutoConfig] = useState(false)
  const autoConfigRef = useRef<HTMLDivElement>(null)

  const closeAutoConfig = useCallback((e: MouseEvent) => {
    if (autoConfigRef.current && !autoConfigRef.current.contains(e.target as Node)) {
      setShowAutoConfig(false)
    }
  }, [])

  useEffect(() => {
    if (showAutoConfig) document.addEventListener('mousedown', closeAutoConfig)
    return () => document.removeEventListener('mousedown', closeAutoConfig)
  }, [showAutoConfig, closeAutoConfig])

  function useQuickslot(c: Consumable) {
    removeConsumable(c.id)
    const derived = getDerivedStats(attrs)
    switch (c.effect) {
      case 'stamina': restoreStamina(derived.maxStamina * c.magnitude); break
      case 'mana':    restoreMana(derived.maxMana * c.magnitude);        break
      case 'skip':    for (let i = 0; i < c.magnitude; i++) gainSkipCharge(); break
      case 'xp':      gainXp(Math.round(c.magnitude));                  break
    }
  }
  const timerA     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timerB     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timerC     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [impact, setImpact] = useState(false)

  // Floating number state — positive value = heal (green), negative = damage
  interface DmgFloat { id: number; value: number; missed: boolean; side: 'player' | 'enemy'; icon?: string }
  const [floats, setFloats] = useState<DmgFloat[]>([])
  const floatId = useRef(0)
  const lastLogLen = useRef(0)

  // Watch the battle log for new entries and spawn a float
  const logLen = store.log.length
  useEffect(() => {
    if (logLen > lastLogLen.current && store.log.length > 0 && !store.skipAnim) {
      const entry = store.log[0]  // newest entry (unshifted to front)

      // Float appears on the DEFENDER's side (the unit taking the hit/effect)
      const side: 'player' | 'enemy' = entry.defender === store.player.name ? 'player' : 'enemy'

      let floatValue = 0
      let floatIcon: string | undefined

      if (entry.missed) {
        floatValue = 0  // "MISS" handled separately
      } else if (entry.spell) {
        if (entry.spell.effectType === 'damage')  floatValue = -(entry.spell.value)
        else if (entry.spell.effectType === 'heal') floatValue = entry.spell.value
        // buff/debuff/utility: show spell icon without a number
        else floatIcon = entry.spell.icon
      } else {
        floatValue = -entry.dmg
      }

      // Skip utility floats that have no number or icon
      const shouldFloat = entry.missed || floatValue !== 0 || floatIcon !== undefined
      if (shouldFloat) {
        const id = ++floatId.current
        setFloats(prev => [...prev.slice(-6), { id, value: floatValue, missed: !!entry.missed, side, icon: floatIcon }])
        setTimeout(() => setFloats(prev => prev.filter(f => f.id !== id)), 1150)
      }
    }
    lastLogLen.current = logLen
  }, [logLen]) // eslint-disable-line react-hooks/exhaustive-deps

  function clearTimers() {
    ;[timerA, timerB, timerC].forEach((r) => {
      if (r.current !== null) { clearTimeout(r.current); r.current = null }
    })
  }

  useEffect(() => {
    clearTimers()
    setImpact(false)

    if (store.skipAnim && store.phase !== 'over') return

    let cancelled = false

    if (store.phase === 'over') {
      if (!xpGranted.current && store.winner === 'player') {
        xpGranted.current = true
        // Only grant XP when enemy is within ±5 levels of the hero
        if (Math.abs(heroLevel - store.enemy.level) <= 5) {
          gainXp(store.enemy.maxHp)
        }
      }
      timerA.current = setTimeout(() => {
        if (!cancelled) { xpGranted.current = false; store.reset() }
      }, 1800 / store.speed)
      return () => { cancelled = true; clearTimers() }
    }

    if (store.phase === 'idle') {
      // First hit of a combo → full idle pause; continuation → short gap
      const isFirstHit = store.hitsLeft === store.comboSize
      const wait = (isFirstHit ? IDLE_MS : COMBO_MS) / store.speed
      timerA.current = setTimeout(() => {
        if (!cancelled) store.setPhase('attacking')
      }, wait)
    } else if (store.phase === 'attacking') {
      const full    = ATTACK_MS / store.speed
      const contact = full * 0.4

      timerA.current = setTimeout(() => {
        if (cancelled) return
        store.applyHit()
        setImpact(true)
        timerC.current = setTimeout(() => {
          if (!cancelled) setImpact(false)
        }, full * 0.22)
      }, contact)

      timerB.current = setTimeout(() => {
        if (cancelled) return
        const state = useBattleStore.getState()
        if (state.phase === 'over') return
        if (state.hitsLeft > 0) {
          // combo continues — go back to idle (short gap handled above)
          store.setPhase('idle')
        } else {
          store.switchAttacker()
        }
      }, full)
    }

    return () => { cancelled = true; clearTimers() }
  }, [store.phase, store.turn, store.speed, store.skipAnim])

  const isPlayerAttacking = store.attacker === 'player' && store.phase === 'attacking'
  const isEnemyAttacking  = store.attacker === 'enemy'  && store.phase === 'attacking'
  const playerHit = store.attacker === 'enemy'  && impact
  const enemyHit  = store.attacker === 'player' && impact

  const attackDur = `${ATTACK_MS / store.speed}ms`
  const hitDur    = `${(ATTACK_MS / store.speed) * 0.22}ms`

  // Combo indicator dots
  const showCombo = store.comboSize > 1 && store.phase !== 'over'
  const comboAttacker = store.attacker

  return (
    <div className="w-full">
      {/* ── Arena ─────────────────────────────────────────── */}
      <div className="relative h-80 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-xl select-none arena-bg">

        {/* Mini-player toggle */}
        <button
          onClick={toggleMini}
          title={showMini ? (isEn ? 'Close mini player' : 'Fechar mini player') : (isEn ? 'Open mini player' : 'Abrir mini player')}
          className={cn(
            'absolute top-2 right-2 z-10 w-6 h-6 rounded-md text-[11px] flex items-center justify-center transition-colors border',
            showMini
              ? 'bg-indigo-600 border-indigo-500 text-white'
              : 'bg-black/20 border-white/10 text-white/50 hover:bg-black/40 hover:text-white/80',
          )}
        >
          ⊞
        </button>

        {/* Stars (dark only) */}
        {([
          [8,6],[22,3],[38,9],[55,4],[72,7],[88,2],[15,14],[45,11],[65,15],[80,8],
          [5,22],[30,18],[50,20],[78,17],[92,24],[20,28],[60,25],[35,5],[95,12],[12,32],
        ] as [number,number][]).map(([x,y],i) => (
          <div key={i} className="absolute rounded-full bg-white hidden dark:block"
            style={{ left:`${x}%`, top:`${y}%`, width: i%3===0?2:1, height: i%3===0?2:1, opacity: 0.4+(i%4)*0.15 }}
          />
        ))}

        {/* Ground */}
        <div className="absolute bottom-0 left-0 right-0 h-24 arena-ground" />
        <div className="absolute bottom-20 left-0 right-0 h-px arena-ground-line" />

        {/* VS divider */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-10 pointer-events-none flex flex-col items-center gap-1">
          <div className="h-10 w-px bg-slate-300/20 dark:bg-slate-600/30" />
          <span className="text-slate-400/25 dark:text-slate-500/40 font-black text-xl tracking-widest">VS</span>
          <div className="h-10 w-px bg-slate-300/20 dark:bg-slate-600/30" />
        </div>

        {/* Combo dots — shown above the attacker when comboSize > 1 */}
        {showCombo && (
          <div className={`absolute bottom-[148px] flex gap-1 ${comboAttacker === 'player' ? 'left-10' : 'right-10'}`}>
            {Array.from({ length: store.comboSize }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full border transition-colors ${
                  i < store.hitsLeft
                    ? 'bg-indigo-400 border-indigo-300'
                    : 'bg-slate-600 border-slate-500'
                }`}
              />
            ))}
          </div>
        )}

        {/* Player */}
        <div className="absolute left-10 bottom-[72px] flex flex-col items-start gap-2">
          <HpBar name={store.player.name} current={store.player.hp} max={store.player.maxHp} side="player" />
          <div
            key={`player-${store.turn}`}
            className={isPlayerAttacking ? 'anim-attack-right' : ''}
            style={isPlayerAttacking ? { animationDuration: attackDur } : undefined}
          >
            <UnitSprite side="player" isHit={playerHit} hitDuration={hitDur} />
          </div>
        </div>

        {/* Enemy */}
        <div className="absolute right-10 bottom-[72px] flex flex-col items-end gap-2">
          <HpBar
            name={store.enemy.name}
            level={store.enemy.level}
            current={store.enemy.hp}
            max={store.enemy.maxHp}
            side="enemy"
            rarityColor={
              store.enemy.rarity === 'unique'   ? 'text-orange-400' :
              store.enemy.rarity === 'epic'     ? 'text-purple-400' :
              store.enemy.rarity === 'rare'     ? 'text-blue-400'   :
              store.enemy.rarity === 'uncommon' ? 'text-green-400'  :
              undefined
            }
          />
          <div
            key={`enemy-${store.turn}`}
            className={isEnemyAttacking ? 'anim-attack-left' : ''}
            style={isEnemyAttacking ? { animationDuration: attackDur } : undefined}
          >
            <UnitSprite side="enemy" isHit={enemyHit} hitDuration={hitDur} monsterType={store.enemy.monsterType} />
          </div>
        </div>

        {/* Floating numbers — after sprites so they render on top */}
        {floats.map(f => (
          <div
            key={f.id}
            className={cn(
              'absolute z-10 anim-dmg-float font-black drop-shadow-lg pointer-events-none',
              f.side === 'player' ? 'left-16 bottom-28' : 'right-16 bottom-28',
              f.missed
                ? 'text-slate-400 dark:text-slate-500 text-sm italic'
                : f.icon
                  ? 'text-2xl'
                  : f.value > 0
                    ? 'text-emerald-400 dark:text-emerald-300 text-lg'
                    : f.side === 'player'
                      ? 'text-red-500 dark:text-red-400 text-lg'
                      : 'text-yellow-300 dark:text-yellow-200 text-xl',
            )}
          >
            {f.missed ? 'MISS' : f.icon ? f.icon : f.value > 0 ? `+${f.value}` : `${f.value}`}
          </div>
        ))}

        {/* Battle over overlay */}
        {store.phase === 'over' && (
          <div className={cn(
            'absolute inset-0 flex flex-col items-center justify-center backdrop-blur-[2px]',
            store.winner === 'player'
              ? 'bg-amber-50/80 dark:bg-amber-950/60'
              : 'bg-red-50/80 dark:bg-red-950/60',
          )}>
            <p className={cn(
              'text-5xl font-black mb-1 tracking-tight',
              store.winner === 'player'
                ? 'text-yellow-500 dark:text-yellow-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]'
                : 'text-red-500 dark:text-red-400 drop-shadow-[0_0_12px_rgba(239,68,68,0.5)]',
            )}>
              {store.winner === 'player' ? t.victory : t.defeat}
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-xs mb-4 tracking-wide">{t.nextBattle}</p>
            <div className="w-40 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                key={store.turn}
                className={cn('h-full rounded-full anim-fill-bar', store.winner === 'player' ? 'bg-yellow-400' : 'bg-red-500')}
                style={{ animationDuration: `${1800 / store.speed}ms` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Active spell effects ────────────────────────────────────────── */}
      {(activeBuffs.length > 0 || activeDebuff) && (
        <div className="mt-1.5 flex flex-wrap gap-1 justify-center">
          {activeBuffs.map(b => {
            const spell = SPELL_MAP.get(b.spellId)
            const icon  = SPELL_ICONS[b.spellId] ?? WORD_ICONS[spell?.word1Id ?? ''] ?? '▲'
            const label = spell
              ? Object.entries(b.statAdds ?? {}).map(([k, v]) => `+${v} ${k}`).join(' ')
              : b.spellId
            return (
              <span key={b.spellId}
                title={spell?.name ?? b.spellId}
                className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700/60">
                <span>{icon}</span>
                <span>{label}</span>
                <span className="opacity-60">{b.remaining}t</span>
              </span>
            )
          })}
          {activeDebuff && (() => {
            const spell = SPELL_MAP.get(activeDebuff.spellId)
            const icon  = SPELL_ICONS[activeDebuff.spellId] ?? WORD_ICONS[spell?.word1Id ?? ''] ?? '▼'
            const parts: string[] = []
            if (activeDebuff.atkMult < 1)      parts.push(`ATK ×${activeDebuff.atkMult}`)
            if (activeDebuff.atkSpeedMult < 1)  parts.push(`Vel ×${activeDebuff.atkSpeedMult}`)
            return (
              <span
                title={spell?.name ?? activeDebuff.spellId}
                className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700/60">
                <span>{icon}</span>
                <span>{isEn ? 'Enemy' : 'Inimigo'} {parts.join(' ')}</span>
                <span className="opacity-60">{activeDebuff.remaining}t</span>
              </span>
            )
          })()}
        </div>
      )}

      {/* ── Quickslot bar ───────────────────────────────────────────────── */}
      <div className="mt-2 flex items-center gap-2 justify-center">
        {quickslots.map((qid, slot) => {
          const c = qid ? consumables.find(x => x.id === qid) : null
          return (
            <button
              key={slot}
              onClick={() => c && useQuickslot(c)}
              disabled={!c}
              title={c ? `[${slot + 1}] ${isEn ? c.nameEn : c.name}` : (isEn ? `Quickslot ${slot + 1} (empty)` : `Atalho ${slot + 1} (vazio)`)}
              style={{ width: 44, height: 44 }}
              className={cn(
                'relative rounded-xl border-2 flex flex-col items-center justify-center transition-all',
                c
                  ? cn(RARITY_BORDER[c.rarity], 'bg-white dark:bg-slate-800 hover:scale-110 active:scale-95 shadow')
                  : 'border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 opacity-40 cursor-not-allowed',
              )}
            >
              {c ? (
                <>
                  <span className="text-lg leading-none">{c.icon}</span>
                  <span className="text-[7px] font-bold text-slate-400 dark:text-slate-500">{slot + 1}</span>
                </>
              ) : (
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-600">{slot + 1}</span>
              )}
            </button>
          )
        })}
        <span className="text-[8px] text-slate-400 dark:text-slate-600 ml-1 mr-2">
          {isEn ? 'Items' : 'Itens'}
        </span>

        {/* Divider */}
        <div className="h-7 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

        {/* ── Spell slots ─────────────────────────────────────── */}
        {spellSlots.map((sid, slot) => {
          const spell = sid ? availableSpells.find(s => s.id === sid) : null
          const cd    = sid ? (cooldowns[sid] ?? 0) : 0
          const canCast = spell && mana >= spell.manaCost && cd === 0
          const isAuto  = autoSlots[slot]?.enabled ?? false
          return (
            <button
              key={`spell-${slot}`}
              onClick={() => spell && castSpell(spell.id)}
              disabled={!spell || !canCast}
              title={spell
                ? `[${slot + 5}] ${spell.name} — ${spell.manaCost} mana · CD ${spell.cooldown} ${isEn ? 'turns' : 'turnos'}${cd > 0 ? ` (${cd} ${isEn ? 'left' : 'rest.'})` : ''}`
                : (isEn ? `Spell slot ${slot + 1} (empty)` : `Slot de magia ${slot + 1} (vazio)`)}
              style={{ width: 44, height: 44 }}
              className={cn(
                'relative rounded-xl border-2 flex flex-col items-center justify-center transition-all',
                spell
                  ? cn(
                      RARITY_BORDER[spell.rarity],
                      'bg-white dark:bg-slate-800 shadow',
                      canCast ? 'hover:scale-110 active:scale-95' : 'opacity-50 cursor-not-allowed',
                    )
                  : 'border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 opacity-40 cursor-not-allowed',
              )}
            >
              {spell ? (
                <>
                  <span className="text-base leading-none">
                    {SPELL_ICONS[spell.id] ?? WORD_ICONS[spell.word1Id] ?? EFFECT_ICON[spell.effect.type]}
                  </span>
                  <span className="text-[7px] font-bold text-slate-400 dark:text-slate-500">{slot + 1}</span>
                  {isAuto && cd === 0 && (
                    <div className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-indigo-500 border border-white dark:border-slate-800" />
                  )}
                  {cd > 0 && (() => {
                    const circ = 2 * Math.PI * 17
                    const offset = circ * (cd / spell.cooldown)
                    return (
                      <div className="absolute inset-0 rounded-xl bg-black/50 flex items-center justify-center">
                        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 44 44" fill="none">
                          <circle cx="22" cy="22" r="17" stroke="white" strokeOpacity="0.15" strokeWidth="3" />
                          <circle
                            cx="22" cy="22" r="17"
                            stroke="white" strokeOpacity="0.85" strokeWidth="3"
                            strokeDasharray={circ}
                            strokeDashoffset={circ - offset}
                            strokeLinecap="round"
                            transform="rotate(-90 22 22)"
                          />
                        </svg>
                        <span className="text-[9px] text-white font-bold z-10">{cd}</span>
                      </div>
                    )
                  })()}
                </>
              ) : (
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-600">✦</span>
              )}
            </button>
          )
        })}

        {/* Gear button + label + auto-cast config panel */}
        <div ref={autoConfigRef} className="relative flex items-center gap-1">
          <span className="text-[8px] text-slate-400 dark:text-slate-600 ml-1">
            {isEn ? 'Spells' : 'Magias'}
          </span>
          <button
            onClick={() => setShowAutoConfig(v => !v)}
            title={isEn ? 'Configure auto-cast' : 'Configurar auto-uso'}
            className={cn(
              'w-5 h-5 rounded-full flex items-center justify-center text-[10px] transition-colors',
              showAutoConfig
                ? 'bg-indigo-500 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600',
            )}
          >
            ⚙
          </button>

          {showAutoConfig && (
            <div className="absolute bottom-full right-0 mb-2 z-30 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-3 w-72">
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                {isEn ? 'Spell Auto-cast' : 'Auto-uso de Magias'}
              </p>
              {spellSlots.map((sid, i) => {
                const spell = sid ? availableSpells.find(s => s.id === sid) : null
                const cfg: AutoCastConfig = autoSlots[i] ?? { enabled: false, hpThreshold: 0.7 }
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
                            <option value={1.0}>{isEn ? 'always' : 'sempre'}</option>
                          </select>
                        )}
                        <button
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
                        {isEn ? 'empty' : 'vazio'}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Battle log */}
      <div className="mt-3 h-28 overflow-y-auto bg-slate-50 dark:bg-slate-900/60 rounded-xl px-3 py-2 border border-slate-200 dark:border-slate-800/80">
        <p className="text-[9px] text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-1.5 font-bold">{t.log}</p>
        {store.log.length === 0
          ? <p className="text-xs text-slate-400 dark:text-slate-600 italic">{t.awaiting}</p>
          : store.log.map((entry, i) => {
              const isPlayerAttacker = entry.attacker === store.player.name
              const isNew = i === 0

              // ── Spell entry ──────────────────────────────────────────────
              if (entry.spell) {
                const { spell } = entry
                const bgClass =
                  spell.effectType === 'damage'  ? (isNew ? 'bg-orange-50/70 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300' : 'text-slate-400 dark:text-slate-600')
                  : spell.effectType === 'heal'   ? (isNew ? 'bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300' : 'text-slate-400 dark:text-slate-600')
                  : spell.effectType === 'buff'   ? (isNew ? 'bg-blue-50/70 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300' : 'text-slate-400 dark:text-slate-600')
                  : spell.effectType === 'debuff' ? (isNew ? 'bg-purple-50/70 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300' : 'text-slate-400 dark:text-slate-600')
                  :                                 (isNew ? 'bg-amber-50/70 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300' : 'text-slate-400 dark:text-slate-600')
                return (
                  <div key={i} className={cn('text-[11px] leading-tight py-0.5 px-1.5 rounded mb-0.5 flex items-center gap-1', bgClass)}>
                    <span className="shrink-0">{spell.icon}</span>
                    <span className={cn('truncate', isNew && 'font-semibold')}>{spell.name}</span>
                    {spell.value > 0 && (
                      <span className={cn('ml-auto font-bold tabular-nums shrink-0', isNew && (
                        spell.effectType === 'damage' ? 'text-orange-600 dark:text-orange-300'
                        : 'text-emerald-600 dark:text-emerald-300'
                      ))}>
                        {spell.effectType === 'heal' ? `+${spell.value}` : `-${spell.value}`}
                      </span>
                    )}
                  </div>
                )
              }

              // ── Physical attack entry ────────────────────────────────────
              return (
                <div key={i} className={cn(
                  'text-[11px] leading-tight py-0.5 px-1.5 rounded mb-0.5 flex items-center gap-1',
                  isNew
                    ? entry.missed
                      ? 'text-slate-500 dark:text-slate-400 italic bg-slate-100/50 dark:bg-slate-800/40'
                      : isPlayerAttacker
                        ? 'text-indigo-700 dark:text-indigo-300 bg-indigo-50/60 dark:bg-indigo-950/30'
                        : 'text-red-700 dark:text-red-300 bg-red-50/60 dark:bg-red-950/30'
                    : 'text-slate-400 dark:text-slate-600',
                )}>
                  {entry.missed
                    ? <span>{entry.attacker} <span className="font-bold">MISS</span></span>
                    : <>
                        <span className={isNew ? 'font-semibold' : ''}>{entry.attacker}</span>
                        <span className="opacity-40">→</span>
                        <span className={isNew ? 'font-semibold' : ''}>{entry.defender}</span>
                        <span className={cn('ml-auto font-bold tabular-nums shrink-0', isNew && (isPlayerAttacker ? 'text-indigo-600 dark:text-indigo-300' : 'text-red-600 dark:text-red-300'))}>
                          -{entry.dmg}
                        </span>
                      </>
                  }
                </div>
              )
            })
        }
      </div>
    </div>
  )
}
