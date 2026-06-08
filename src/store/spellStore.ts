import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { LEARNABLE_WORDS, WORD_MAP, getAutoWordSlots } from '../data/words'
import { SPELL_MAP, SPELL_ICONS, getAvailableSpells } from '../data/spells'
import { calcSpellDamage, calcSpellHeal } from '../formulas/spells'
import { useHeroStore } from './heroStore'
import { useBattleStore } from './battleStore'
import { useMapStore } from './mapStore'
import { useInventoryStore } from './inventoryStore'
import { getEquipmentBonuses } from '../formulas/items'
import { getWeaponCombatProfile } from '../formulas/weapons'
import { getEffectiveDerivedStatsFromBonuses } from '../formulas/effectiveStats'
import type { ActiveBuff, ActiveDebuff, AutoCastConfig } from '../types/spell'
import type { ElementType } from '../types/element'
import { ELEMENT_DEFAULT_STATUS, makeStatus } from '../types/element'
import type { Spell } from '../types/spell'
import { SAVE_KEYS, SAVE_SCHEMA_VERSION, mergeSave, migrateSave } from './save'

/** Returns the primary element word from a spell (word1 first, then word2). */
function getSpellElement(spell: Spell): ElementType | null {
  const w1 = WORD_MAP.get(spell.word1Id)
  if (w1?.category === 'element') return spell.word1Id as ElementType
  const w2 = WORD_MAP.get(spell.word2Id)
  if (w2?.category === 'element') return spell.word2Id as ElementType
  return null
}

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
      const weaponState = useInventoryStore.getState()
      const weaponProfile = getWeaponCombatProfile(weaponState.weaponProgress, weaponState.equippedWeapons)
      const isSlotOneSpell = get().spellSlots[0] === spellId
      const manaCost = Math.max(1, Math.round(
        spell.manaCost * (isSlotOneSpell ? (1 - weaponProfile.staffSlotOneManaDiscount) : 1),
      ))
      if (heroState.mana < manaCost) return

      // ── Consume mana (outside Immer) ─────────────────────────────────
      heroState.consumeMana(manaCost)

      const { effect } = spell
      const equip = getEquipmentBonuses(weaponState.equipment)
      const derived = getEffectiveDerivedStatsFromBonuses(
        heroState.attributes,
        equip,
        heroState.level,
        weaponState.weaponProgress,
        weaponState.equippedWeapons,
        get().activeBuffs,
      )

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

      // Determine the elemental nature of this spell
      const spellElement = getSpellElement(spell)

      if (dmg  > 0) battleStore.applyMagicDamage(dmg, spellElement ?? undefined)
      if (heal > 0) battleStore.healPlayer(heal)

      // ── Elemental status application ──────────────────────────────────
      if (spellElement && effect.type !== 'fizzle') {
        const cfg = ELEMENT_DEFAULT_STATUS[spellElement]
        const chance = cfg.chance
        if (Math.random() < chance) {
          const status = makeStatus(spellElement, derived.magicDamage, heroState.level)
          // Damage/debuff spells → apply to enemy; heal/buff → apply to hero
          const target = (effect.type === 'damage' || effect.type === 'debuff') ? 'enemy' : 'hero'
          battleStore.applyElementalStatus(status, target)
        }
      }

      // ── Out-of-combat tile actions ────────────────────────────────────
      if (effect.tileAction) {
        const mapStore = useMapStore.getState()
        const lv = heroState.level
        if (effect.tileAction === 'create') {
          mapStore.generateSpellTiles(effect.tileCount ?? 2, lv)
        } else if (effect.tileAction === 'refresh') {
          mapStore.refreshSpellDeck(effect.tileCount ?? 3, lv)
        }
      }

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
        const effectiveCooldown = Math.max(1, Math.ceil(spell.cooldown * (1 - weaponProfile.staffCooldownReduction)))
        st.cooldowns[spellId] = effectiveCooldown

        // Buff / utility side-effects
        if (effect.statAdds && effect.duration) {
          const effectiveDuration = Math.min(effect.duration, effectiveCooldown)
          st.activeBuffs = st.activeBuffs.filter(b => b.spellId !== spellId)
          st.activeBuffs.push({
            spellId,
            statAdds: effect.statAdds,
            remaining: effectiveDuration,
          })
        }

        // Store debuff record
        if (shouldDebuff) {
          const effectiveDebuffDuration = Math.min(effect.debuffDuration ?? 8, effectiveCooldown)
          st.activeDebuff = {
            spellId,
            atkMult:      effect.enemyAtkMult      ?? 1,
            atkSpeedMult: effect.enemyAtkSpeedMult ?? 1,
            remaining:    effectiveDebuffDuration,
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
    name: SAVE_KEYS.spells,
    version: SAVE_SCHEMA_VERSION,
    migrate: migrateSave,
    merge: mergeSave,
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
