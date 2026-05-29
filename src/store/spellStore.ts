import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { LEARNABLE_WORDS, getAutoWordSlots } from '../data/words'
import { SPELL_MAP, SPELL_ICONS, getAvailableSpells } from '../data/spells'
import { calcSpellDamage, calcSpellHeal } from '../formulas/spells'
import { getDerivedStats } from '../formulas/derived'
import { useHeroStore } from './heroStore'
import { useBattleStore } from './battleStore'
import type { ActiveBuff, ActiveDebuff, AutoCastConfig } from '../types/spell'

export const SPELL_SLOT_COUNT = 6

const DEFAULT_AUTO: AutoCastConfig = { enabled: false, hpThreshold: 0.7 }

interface SpellStore {
  earnedWordIds:  string[]
  spellSlots:     (string | null)[]
  // Cooldowns in battle TURNS (integer ≥ 0; key absent = ready)
  cooldowns:      Record<string, number>
  activeBuffs:    ActiveBuff[]
  activeDebuff:   ActiveDebuff | null
  autoSlots:      AutoCastConfig[]

  earnWord(wordId: string): void
  setSpellSlot(slotIndex: number, spellId: string | null): void
  setAutoSlot(slotIndex: number, config: AutoCastConfig): void
  castSpell(spellId: string): void
  onBattleTurn(): void       // called each time battleStore.turn increments
  clearEnemyDebuff(): void   // called when a new enemy spawns
  tick(deltaS: number): void // only for buff/debuff durations (seconds)
}

export const useSpellStore = create<SpellStore>()(
  persist(
  immer((set, get) => ({
    earnedWordIds: [],
    spellSlots:    Array(SPELL_SLOT_COUNT).fill(null),
    cooldowns:     {},
    activeBuffs:   [],
    activeDebuff:  null,
    autoSlots:     Array(SPELL_SLOT_COUNT).fill(null).map(() => ({ ...DEFAULT_AUTO })),

    earnWord: (wordId) => set((st) => {
      if (!st.earnedWordIds.includes(wordId)) st.earnedWordIds.push(wordId)
    }),

    setSpellSlot: (slotIndex, spellId) => set((st) => {
      st.spellSlots[slotIndex] = spellId
    }),

    setAutoSlot: (slotIndex, config) => set((st) => {
      st.autoSlots[slotIndex] = config
    }),

    castSpell: (spellId) => {
      const spell = SPELL_MAP.get(spellId)
      if (!spell) return

      // ── Guards ──────────────────────────────────────────────────────
      if ((get().cooldowns[spellId] ?? 0) > 0) return

      const heroState = useHeroStore.getState()
      if (heroState.mana < spell.manaCost) return

      // ── Consume mana (outside Immer) ─────────────────────────────────
      heroState.consumeMana(spell.manaCost)

      const { effect } = spell
      const derived    = getDerivedStats(heroState.attributes)

      // ── Compute values that require derived stats ─────────────────────
      let dmg  = 0
      let heal = 0
      let shouldDebuff = false

      if (effect.type === 'damage') {
        dmg = calcSpellDamage(spell, derived)
        if (effect.lifesteal) heal = Math.round(dmg * effect.lifesteal)
        if (effect.enemyAtkMult !== undefined || effect.enemyAtkSpeedMult !== undefined) {
          shouldDebuff = true
        }
      } else if (effect.type === 'heal') {
        heal = calcSpellHeal(spell, derived)
      } else if (effect.type === 'debuff') {
        shouldDebuff = true
      }

      // ── Apply battle effects BEFORE Immer set (no side effects inside set) ──
      const battleStore = useBattleStore.getState()

      // Log the spell before applying so the float triggers together with the hit
      battleStore.logSpell({
        casterName: heroState.name,
        name:       spell.name,
        icon:       SPELL_ICONS[spellId] ?? '✨',
        effectType: effect.type,
        value:      effect.type === 'damage' ? dmg
                  : effect.type === 'heal'   ? heal
                  : 0,
      })

      if (dmg  > 0) battleStore.applyMagicDamage(dmg)
      if (heal > 0) battleStore.healPlayer(heal)

      // ── Debuff: save current enemy stats, apply multipliers ───────────
      const savedAtk      = battleStore.enemy.atk
      const savedAtkSpeed = battleStore.enemy.atkSpeed

      if (shouldDebuff) {
        // Restore any previous debuff first
        const prev = get().activeDebuff
        if (prev) useBattleStore.getState().restoreEnemyStats(prev.savedAtk, prev.savedAtkSpeed)
        useBattleStore.getState().applyEnemyDebuff(
          effect.enemyAtkMult      ?? 1,
          effect.enemyAtkSpeedMult ?? 1,
        )
      }

      // ── Update spellStore state (Immer set — no side effects here) ────
      set((st) => {
        // Cooldown in turns
        st.cooldowns[spellId] = spell.cooldown

        // Buff / utility side-effects
        if (effect.statAdds && effect.duration) {
          st.activeBuffs = st.activeBuffs.filter(b => b.spellId !== spellId)
          st.activeBuffs.push({
            spellId,
            statAdds: effect.statAdds,
            remaining: effect.duration,
          })
        }

        // Store debuff record
        if (shouldDebuff) {
          st.activeDebuff = {
            spellId,
            atkMult:      effect.enemyAtkMult      ?? 1,
            atkSpeedMult: effect.enemyAtkSpeedMult ?? 1,
            remaining:    effect.debuffDuration ?? 8,
            savedAtk,
            savedAtkSpeed,
          }
        }
      })
    },

    // Decrement cooldowns + buff/debuff durations by 1 turn, then process auto-cast
    onBattleTurn: () => {
      // Capture expired debuff BEFORE mutating
      const expiredDebuff = (() => {
        const d = get().activeDebuff
        return d && d.remaining - 1 <= 0 ? d : null
      })()

      set((st) => {
        // Cooldowns
        for (const id of Object.keys(st.cooldowns)) {
          const next = st.cooldowns[id] - 1
          if (next <= 0) delete st.cooldowns[id]
          else st.cooldowns[id] = next
        }
        // Buff durations
        st.activeBuffs = st.activeBuffs
          .map(b => ({ ...b, remaining: b.remaining - 1 }))
          .filter(b => b.remaining > 0)
        // Debuff duration
        if (st.activeDebuff) {
          st.activeDebuff.remaining -= 1
          if (st.activeDebuff.remaining <= 0) st.activeDebuff = null
        }
      })

      // Restore enemy stats after expired debuff
      if (expiredDebuff) {
        useBattleStore.getState().restoreEnemyStats(expiredDebuff.savedAtk, expiredDebuff.savedAtkSpeed)
      }

      // Auto-cast
      const battleState = useBattleStore.getState()
      if (battleState.phase === 'over') return

      const { spellSlots, autoSlots, cooldowns } = get()
      const hpRatio = battleState.player.hp / battleState.player.maxHp

      spellSlots.forEach((sid, i) => {
        if (!sid) return
        const cfg = autoSlots[i] ?? DEFAULT_AUTO
        if (!cfg.enabled) return
        if ((cooldowns[sid] ?? 0) > 0) return
        const spell = SPELL_MAP.get(sid)
        if (!spell) return
        if (spell.effect.type === 'heal' && hpRatio >= cfg.hpThreshold) return
        get().castSpell(sid)
      })
    },

    clearEnemyDebuff: () => {
      const debuff = get().activeDebuff
      if (debuff) {
        useBattleStore.getState().restoreEnemyStats(debuff.savedAtk, debuff.savedAtkSpeed)
      }
      set((st) => { st.activeDebuff = null })
    },

    // Buff/debuff durations are now turn-based (decremented in onBattleTurn).
    // tick() kept as a no-op so callers don't need updating.
    tick: (_deltaS) => {},
  })),
  {
    name: 'incremental-idle-spells',
    partialize: (s) => ({
      earnedWordIds: s.earnedWordIds,
      spellSlots:    s.spellSlots,
      autoSlots:     s.autoSlots,
    }),
  }
  )
)

// ─── Selectors ────────────────────────────────────────────────────────────────

export function getKnownWordIds(
  level: number, inteligencia: number, sabedoria: number, earnedWordIds: string[],
): string[] {
  const slots     = getAutoWordSlots(level, inteligencia, sabedoria)
  const autoWords = LEARNABLE_WORDS.slice(0, slots).map(w => w.id)
  return [...new Set([...autoWords, ...earnedWordIds])]
}

export function getPlayerSpells(knownWordIds: string[]) {
  return getAvailableSpells(knownWordIds)
}
