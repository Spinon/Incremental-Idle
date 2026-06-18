import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { ALL_WORDS, WORD_MAP } from '../data/words'
import { SPELL_MAP, SPELL_ICONS, findSpell, getAvailableSpells } from '../data/spells'
import { calcSpellDamage, calcSpellHeal, getSpellManaCost } from '../formulas/spells'
import { useHeroStore } from './heroStore'
import { useBattleStore } from './battleStore'
import { useMapStore } from './mapStore'
import { useInventoryStore } from './inventoryStore'
import { getWeaponCombatProfile } from '../formulas/weapons'
import { getHeroDerived } from '../lib/heroDerived'
import type { ActiveBuff, ActiveDebuff, AutoCastConfig } from '../types/spell'
import type { ElementType } from '../types/element'
import { ELEMENT_DEFAULT_STATUS, makeStatus } from '../types/element'
import type { Spell } from '../types/spell'
import { SAVE_KEYS, SAVE_SCHEMA_VERSION, gameStorage, mergeSave, migrateSave } from './save'
import { requestCriticalCloudSave } from '../lib/cloudAutosave'

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
export const WORD_BIT_BASE_COST = 180

export const WORD_BIT_REQUIREMENTS: Record<string, number> = {
  common: 2,
  uncommon: 4,
  rare: 6,
  epic: 10,
  unique: 20,
}

export const SPELL_CREATION_COST: Record<string, number> = {
  common: 80,
  uncommon: 140,
  rare: 240,
  epic: 420,
  unique: 750,
}

export function getWordBitRequirement(wordId: string): number {
  const rarity = WORD_MAP.get(wordId)?.rarity ?? 'common'
  return WORD_BIT_REQUIREMENTS[rarity] ?? 2
}

export function getWordBitCost(knownWordCount: number): number {
  const known = Math.max(0, knownWordCount)
  return Math.round(WORD_BIT_BASE_COST + Math.pow(known, 1.45) * 55)
}

export function getSpellCreationCost(spell: Spell, knownSpellCount = 0): number {
  const base = SPELL_CREATION_COST[spell.rarity] ?? 100
  return Math.round(base * (1 + Math.max(0, knownSpellCount) * 0.32))
}

export function getWordSandPerSecond(level: number, inteligencia: number, sabedoria: number): number {
  return 0.06 + Math.max(1, level) * 0.013 + Math.max(0, inteligencia) * 0.02 + Math.max(0, sabedoria) * 0.028
}

interface SpellStore {
  earnedWordIds:  string[]
  wordBits:       Record<string, number>
  wordSand:       number
  /** Free uses of the "generate word bit" button (bought as WB in the market). */
  wordBitCredits: number
  craftedSpellIds: string[]
  spellSlots:     (string | null)[]
  // Cooldowns in battle TURNS (integer ≥ 0; key absent = ready)
  cooldowns:      Record<string, number>
  activeBuffs:    ActiveBuff[]
  activeDebuff:   ActiveDebuff | null
  autoSlots:      AutoCastConfig[]

  earnWord(wordId: string): void
  addWordSand(amount: number): void
  /** Grants `count` bits to random words for free (quest rewards / Pedaços de Palavra). */
  grantRandomWordBits(count: number): void
  /** Grants `count` free uses of the generate-word-bit button (market WB purchase). */
  grantWordBitCredits(count: number): void
  tickWordSand(deltaS: number, level: number, inteligencia: number, sabedoria: number): void
  generateWordBit(): string | null
  createSpellFromWords(wordId1: string, wordId2: string): boolean
  setSpellSlot(slotIndex: number, spellId: string | null): void
  setAutoSlot(slotIndex: number, config: AutoCastConfig): void
  castSpell(spellId: string): void
  addConsumableBuff(statAdds: ActiveBuff['statAdds'], duration: number, durationUnit: NonNullable<ActiveBuff['durationUnit']>): void
  /**
   * Puts a consumable effect on cooldown, sharing the spell cooldown registry
   * (and its per-turn decrement in onBattleTurn). Key format: consumable_cd_*.
   */
  startConsumableCooldown(key: string, turns: number): void
  onBattleTurn(): void       // called each time battleStore.turn increments
  onBattleEnd(): void
  clearEnemyDebuff(): void   // called when a new enemy spawns
  tick(deltaS: number): void // only for buff/debuff durations (seconds)
}

export const useSpellStore = create<SpellStore>()(
  persist(
  immer((set, get) => ({
    earnedWordIds: [],
    wordBits:      {},
    wordSand:      0,
    wordBitCredits: 0,
    craftedSpellIds: [],
    spellSlots:    Array(SPELL_SLOT_COUNT).fill(null),
    cooldowns:     {},
    activeBuffs:   [],
    activeDebuff:  null,
    autoSlots:     Array(SPELL_SLOT_COUNT).fill(null).map(() => ({ ...DEFAULT_AUTO })),

    earnWord: (wordId) => {
      let earned = false
      set((st) => {
        if (!st.earnedWordIds.includes(wordId)) {
          st.earnedWordIds.push(wordId)
          st.wordBits[wordId] = Math.max(st.wordBits[wordId] ?? 0, getWordBitRequirement(wordId))
          earned = true
        }
      })
      if (earned) requestCriticalCloudSave()
    },

    addWordSand: (amount) => set((st) => {
      st.wordSand = Math.max(0, st.wordSand + amount)
    }),

    grantRandomWordBits: (count) => {
      set((st) => {
        for (let i = 0; i < Math.max(0, Math.floor(count)); i++) {
          const word = ALL_WORDS[Math.floor(Math.random() * ALL_WORDS.length)]
          const req = getWordBitRequirement(word.id)
          const next = Math.min(req, (st.wordBits[word.id] ?? 0) + 1)
          st.wordBits[word.id] = next
          if (next >= req && !st.earnedWordIds.includes(word.id)) {
            st.earnedWordIds.push(word.id)
          }
        }
      })
      requestCriticalCloudSave()
    },

    grantWordBitCredits: (count) => {
      set((st) => {
        st.wordBitCredits += Math.max(0, Math.floor(count))
      })
      requestCriticalCloudSave()
    },

    tickWordSand: (deltaS, level, inteligencia, sabedoria) => set((st) => {
      st.wordSand += Math.max(0, deltaS) * getWordSandPerSecond(level, inteligencia, sabedoria)
    }),

    generateWordBit: () => {
      const useCredit = get().wordBitCredits > 0
      const cost = getWordBitCost(getKnownWordIds(get().earnedWordIds, get().wordBits).length)
      // A free credit skips the sand cost; otherwise the player must afford it.
      if (!useCredit && get().wordSand < cost) return null
      const word = ALL_WORDS[Math.floor(Math.random() * ALL_WORDS.length)]
      set((st) => {
        if (useCredit) st.wordBitCredits -= 1
        else st.wordSand -= cost
        const req = getWordBitRequirement(word.id)
        const next = Math.min(req, (st.wordBits[word.id] ?? 0) + 1)
        st.wordBits[word.id] = next
        if (next >= req && !st.earnedWordIds.includes(word.id)) {
          st.earnedWordIds.push(word.id)
        }
      })
      requestCriticalCloudSave()
      return word.id
    },

    createSpellFromWords: (wordId1, wordId2) => {
      if (wordId1 === wordId2) return false
      const known = new Set(getKnownWordIds(get().earnedWordIds, get().wordBits))
      if (!known.has(wordId1) || !known.has(wordId2)) return false

      const spell = findSpell(wordId1, wordId2)
      if (get().craftedSpellIds.includes(spell.id)) return true

      const cost = getSpellCreationCost(spell, get().craftedSpellIds.length)
      if (get().wordSand < cost) return false

      set((st) => {
        st.wordSand -= cost
        if (!st.craftedSpellIds.includes(spell.id)) st.craftedSpellIds.push(spell.id)
      })
      requestCriticalCloudSave()
      return true
    },

    setSpellSlot: (slotIndex, spellId) => set((st) => {
      st.spellSlots[slotIndex] = spellId
    }),

    setAutoSlot: (slotIndex, config) => set((st) => {
      st.autoSlots[slotIndex] = config
    }),

    castSpell: (spellId) => {
      const spell = getSpellById(spellId)
      if (!spell) return
      if (!get().craftedSpellIds.includes(spellId)) return

      // ── Guards ──────────────────────────────────────────────────────
      if ((get().cooldowns[spellId] ?? 0) > 0) return

      const heroState = useHeroStore.getState()
      const weaponState = useInventoryStore.getState()
      const weaponProfile = getWeaponCombatProfile(weaponState.weaponProgress, weaponState.equippedWeapons)
      const isSlotOneSpell = get().spellSlots[0] === spellId
      const manaCost = Math.max(1, Math.round(
        getSpellManaCost(spell) * (isSlotOneSpell ? (1 - weaponProfile.staffSlotOneManaDiscount) : 1),
      ))
      if (heroState.mana < manaCost) return

      // ── Consume mana (outside Immer) ─────────────────────────────────
      heroState.consumeMana(manaCost)

      const { effect } = spell
      const derived = getHeroDerived()

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
      if (spellElement && effect.type !== 'fizzle' && !effect.attackElement && !effect.elementalForm) {
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
      // Restore any previous debuff BEFORE capturing savedAtk — otherwise a
      // chained debuff records the already-debuffed value as "original" and
      // the enemy never recovers its true stats.
      if (effect.mapAction === 'teleportExplored' || effect.mapAction === 'teleportBlueTower') {
        useMapStore.getState().teleportBySpell(
          effect.teleportRadius ?? 4,
          effect.mapAction === 'teleportBlueTower' ? 'blueTower' : 'explored',
        )
      }

      if (shouldDebuff) {
        const prev = get().activeDebuff
        if (prev) useBattleStore.getState().restoreEnemyStats(prev.savedAtk, prev.savedAtkSpeed)
      }
      const savedAtk      = useBattleStore.getState().enemy.atk
      const savedAtkSpeed = useBattleStore.getState().enemy.atkSpeed

      if (shouldDebuff) {
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
        if ((effect.statAdds || effect.attackElement || effect.elementalForm) && effect.duration) {
          // Combat buffs are clamped to the cooldown (no 100% uptime), but
          // utility/exploration buffs are designed to outlast it — their data
          // durations (40-100 turns) and descriptions assume no clamp.
          const effectiveDuration = effect.type === 'utility'
            ? effect.duration
            : Math.min(effect.duration, effectiveCooldown)
          st.activeBuffs = st.activeBuffs.filter(b =>
            b.spellId !== spellId &&
            !(effect.attackElement && b.attackElement) &&
            !(effect.elementalForm && b.elementalForm)
          )
          st.activeBuffs.push({
            spellId,
            statAdds: effect.statAdds,
            attackElement: effect.attackElement,
            elementalForm: effect.elementalForm,
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

    addConsumableBuff: (statAdds, duration, durationUnit) => set((st) => {
      const id = `consumable_${Date.now()}`
      st.activeBuffs = st.activeBuffs.filter(b => !b.spellId.startsWith('consumable_'))
      st.activeBuffs.push({
        spellId: id,
        statAdds,
        remaining: Math.max(1, duration),
        durationUnit,
      })
    }),

    startConsumableCooldown: (key, turns) => set((st) => {
      st.cooldowns[key] = Math.max(st.cooldowns[key] ?? 0, Math.max(1, Math.round(turns)))
    }),

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
          .map(b => b.durationUnit === 'battle' ? b : { ...b, remaining: b.remaining - 1 })
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
      if (battleState.phase === 'over' || battleState.phase === 'empty') return

      const { spellSlots, autoSlots, cooldowns } = get()
      const hpRatio = battleState.player.hp / battleState.player.maxHp

      spellSlots.forEach((sid, i) => {
        if (!sid) return
        const cfg = autoSlots[i] ?? DEFAULT_AUTO
        if (!cfg.enabled) return
        if ((cooldowns[sid] ?? 0) > 0) return
        const spell = getSpellById(sid)
        if (!spell) return
        if (spell.effect.type === 'heal' && hpRatio >= cfg.hpThreshold) return
        get().castSpell(sid)
      })
    },

    onBattleEnd: () => set((st) => {
      st.activeBuffs = st.activeBuffs
        .map(b => b.durationUnit === 'battle' ? { ...b, remaining: b.remaining - 1 } : b)
        .filter(b => b.remaining > 0)
    }),

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
    storage: gameStorage,
    migrate: migrateSave,
    merge: mergeSave,
    partialize: (s) => ({
      earnedWordIds: s.earnedWordIds,
      wordBits:      s.wordBits,
      wordSand:      s.wordSand,
      wordBitCredits: s.wordBitCredits,
      craftedSpellIds: s.craftedSpellIds,
      spellSlots:    s.spellSlots,
      cooldowns:     s.cooldowns,
      activeBuffs:   s.activeBuffs,
      activeDebuff:  s.activeDebuff,
      autoSlots:     s.autoSlots,
    }),
  }
  )
)

// ─── Selectors ────────────────────────────────────────────────────────────────

export function getKnownWordIds(
  earnedWordIdsOrLevel: string[] | number = [],
  wordBitsOrInt: Record<string, number> | number = {},
  _sabedoria?: number,
  legacyEarnedWordIds?: string[],
): string[] {
  const earnedWordIds = Array.isArray(earnedWordIdsOrLevel)
    ? earnedWordIdsOrLevel
    : legacyEarnedWordIds ?? []
  const wordBits = typeof wordBitsOrInt === 'object' && !Array.isArray(wordBitsOrInt)
    ? wordBitsOrInt
    : {}
  const fromBits = ALL_WORDS
    .filter(w => (wordBits[w.id] ?? 0) >= getWordBitRequirement(w.id))
    .map(w => w.id)
  return [...new Set([...earnedWordIds, ...fromBits])]
}

export function getPlayerSpells(knownWordIds: string[], craftedSpellIds: string[] = []) {
  const crafted = new Set(craftedSpellIds)
  return getAvailableSpells(knownWordIds).filter(spell => crafted.has(spell.id))
}

export function getSpellById(spellId: string): Spell | null {
  const crafted = SPELL_MAP.get(spellId)
  if (crafted) return crafted
  const [wordId1, wordId2] = spellId.split('_')
  if (!wordId1 || !wordId2 || !WORD_MAP.has(wordId1) || !WORD_MAP.has(wordId2)) return null
  return findSpell(wordId1, wordId2)
}
