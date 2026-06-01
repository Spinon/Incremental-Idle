import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { buildMonster, pickMonsterRarity } from '../formulas/monsters'
import { FOREST_MONSTER_MAP, FOREST_MONSTERS } from '../data/monsters'
import type { MonsterRarity } from '../types/monster'
import type { ElementType } from '../types/element'
import { elementalModifier, makeStatus, STATUS_ICONS, STATUS_LABEL_PT } from '../types/element'
import type { ActiveStatus } from '../types/element'
export type { ActiveStatus }

export type Speed = number
export type Phase = 'idle' | 'attacking' | 'over'
export type Side = 'player' | 'enemy'

export interface Unit {
  name: string
  level: number
  hp: number
  maxHp: number
  atk: number
  def: number
  atkSpeed: number
  dodgeChance: number
  critChance: number
  critDamage: number
  damageReduction: number
  // Elemental properties
  element?:   ElementType        // physical attack element (monsters only)
  statusChance?: number          // probability to apply element status on hit
  weakTo:     ElementType[]      // takes 1.5× from these
  resIgnea:   number             // resistance 0–0.5
  resGlacial: number
  resSombria: number
  resVital:   number
  rarity?: MonsterRarity
  monsterType?: string
}

export interface DefeatSnapshot {
  killerName: string
  killerLevel: number
  killerMonsterType: string
  log: LogEntry[]
}

export interface SpellLogData {
  name: string
  icon: string
  effectType: 'damage' | 'heal' | 'buff' | 'debuff' | 'utility'
  /** Damage dealt (damage spells) or HP restored (heal spells); 0 for buff/debuff/utility. */
  value: number
}

export interface LogEntry {
  attacker: string
  defender: string
  dmg: number
  /** true when the defender dodged the hit (dmg will be 0) */
  missed?: boolean
  /** true when this hit was a critical strike */
  isCrit?: boolean
  /** Present when this entry was produced by a spell cast, not a physical attack. */
  spell?: SpellLogData
}

interface HeroSync {
  atk: number; def: number; maxHp: number; atkSpeed: number; dodgeChance: number
  critChance: number; critDamage: number; damageReduction: number
  resIgnea: number; resGlacial: number; resSombria: number; resVital: number
}

interface BattleStore {
  player: Unit
  enemy: Unit
  phase: Phase
  attacker: Side
  speed: Speed
  skipAnim: boolean
  winner: Side | null
  log: LogEntry[]
  turn: number
  nextEnemyLevel: number
  nextEnemyType: string
  nextEnemyRarity: MonsterRarity
  nextTilesPlaced: number
  hitsLeft: number
  comboSize: number
  defeatSnapshot: DefeatSnapshot | null
  enemyStatuses: ActiveStatus[]
  heroStatuses:  ActiveStatus[]

  setSpeed(s: Speed): void
  setSkipAnim(v: boolean): void
  setPhase(p: Phase): void
  syncFromHero(stats: HeroSync): void
  queueEnemy(level: number, monsterType?: string, monsterRarity?: MonsterRarity, tilesPlaced?: number): void
  captureDefeat(): void
  applyHit(): void
  switchAttacker(): void
  skipBattle(): void
  reset(): void
  logSpell(data: SpellLogData & { casterName: string }): void
  applyMagicDamage(dmg: number, element?: ElementType): void
  healPlayer(hp: number): void
  applyElementalStatus(status: ActiveStatus, target: 'enemy' | 'hero'): void
  tickStatuses(): void
  clearStatuses(): void
  restoreMidFight(playerHpRatio: number, enemyHpRatio: number, enemyStatuses: ActiveStatus[], heroStatuses: ActiveStatus[]): void
  applyEnemyDebuff(atkMult: number, atkSpeedMult: number): void
  restoreEnemyStats(savedAtk: number, savedAtkSpeed: number): void
}

const INITIAL_PLAYER: Unit = {
  name: 'Hero', level: 0, hp: 30, maxHp: 30,
  atk: 5, def: 2, atkSpeed: 1.0, dodgeChance: 0,
  critChance: 0, critDamage: 1.5, damageReduction: 0,
  weakTo: [], resIgnea: 0, resGlacial: 0, resSombria: 0, resVital: 0,
}

function makeInitialEnemy(): Unit {
  return buildMonster(FOREST_MONSTERS[0], 1, 'normal')
}

/**
 * Armor-ratio damage formula — replaces hybrid linear+percent model.
 *
 * Phase 1 (linear absorption): DEF points subtract directly from ATK, floored
 *   at 15 % of ATK so even 0-damage hits never occur.
 *   → identical to the old formula for low DEF, where it matters most.
 *
 * Armor-ratio k=20 (pure percentage, no absolute subtraction):
 *   damage = atk × 20 / (def + 20)
 *   DEF  0 → 100 %    DEF 10 → 67 %    DEF 20 → 50 %    DEF 40 → 33 %
 *   Natural diminishing returns — no hard cap, no minimum floor.
 *
 * Then defensive efficiency (Destreza, capped 35 %) applied multiplicatively:
 *   damage ×= (1 − d.damageReduction)
 *
 * Then critical hit (Destreza critChance, Força critDamage):
 *   if rand < a.critChance → damage ×= a.critDamage
 *
 * Variance ±15 % last.
 */
function calcDmg(a: Unit, d: Unit): { dmg: number; isCrit: boolean } {
  const K = 20
  const armor  = K / (d.def + K)
  const defEff = 1 - d.damageReduction
  let base = Math.max(1, Math.round(a.atk * armor * defEff))

  // Elemental modifier for physical attacks (e.g. monster with element)
  if (a.element) {
    const mod = elementalModifier(a.element, d.weakTo, d.resIgnea, d.resGlacial, d.resSombria, d.resVital)
    base = Math.max(1, Math.round(base * mod))
  }

  let isCrit = false
  if (a.critChance > 0 && Math.random() < a.critChance) {
    base   = Math.round(base * a.critDamage)
    isCrit = true
  }

  const variance = 0.85 + Math.random() * 0.3
  return { dmg: Math.max(1, Math.round(base * variance)), isCrit }
}

/** Returns true when the defender dodges the hit. */
function checkDodge(defender: Unit): boolean {
  return Math.random() < defender.dodgeChance
}

function calcHits(mySpeed: number, theirSpeed: number): number {
  return Math.max(1, Math.round(mySpeed / theirSpeed))
}

export const useBattleStore = create<BattleStore>()(
  persist(
  immer((set) => ({
    player: { ...INITIAL_PLAYER },
    enemy:  makeInitialEnemy(),
    phase: 'idle',
    attacker: 'player',
    speed: 1,
    skipAnim: false,
    winner: null,
    log: [],
    turn: 0,
    nextEnemyLevel: 1,
    nextEnemyType: 'goblin',
    nextEnemyRarity: 'normal' as MonsterRarity,
    nextTilesPlaced: 0,
    hitsLeft: 1,
    comboSize: 1,
    defeatSnapshot: null,
    enemyStatuses: [],
    heroStatuses:  [],

    setSpeed:    (s) => set((st) => { st.speed    = s }),
    setSkipAnim: (v) => set((st) => { st.skipAnim = v }),
    setPhase:    (p) => set((st) => { st.phase    = p }),

    queueEnemy: (level, monsterType, monsterRarity, tilesPlaced) => set((st) => {
      st.nextEnemyLevel   = level
      st.nextEnemyType    = monsterType   ?? FOREST_MONSTERS[Math.floor(Math.random() * FOREST_MONSTERS.length)].id
      st.nextEnemyRarity  = monsterRarity ?? pickMonsterRarity()
      st.nextTilesPlaced  = tilesPlaced   ?? st.nextTilesPlaced
    }),

    captureDefeat: () => set((st) => {
      st.defeatSnapshot = {
        killerName:        st.enemy.name,
        killerLevel:       st.enemy.level,
        killerMonsterType: st.enemy.monsterType ?? st.nextEnemyType,
        log:               st.log.slice(0, 20),
      }
    }),

    syncFromHero: ({ atk, def, maxHp, atkSpeed, dodgeChance, critChance, critDamage, damageReduction,
                     resIgnea, resGlacial, resSombria, resVital }) => set((st) => {
      st.player.atk             = Math.round(atk)
      st.player.def             = def
      st.player.maxHp           = Math.round(maxHp)
      st.player.atkSpeed        = atkSpeed
      st.player.dodgeChance     = dodgeChance
      st.player.critChance      = critChance
      st.player.critDamage      = critDamage
      st.player.damageReduction = damageReduction
      st.player.resIgnea        = resIgnea
      st.player.resGlacial      = resGlacial
      st.player.resSombria      = resSombria
      st.player.resVital        = resVital
      if (st.player.hp > st.player.maxHp) st.player.hp = st.player.maxHp
    }),

    applyHit: () => set((st) => {
      const atkUnit = st.attacker === 'player' ? st.player : st.enemy
      const defUnit = st.attacker === 'player' ? st.enemy  : st.player
      // Statuses active on the attacker and defender
      const atkSt = st.attacker === 'player' ? st.heroStatuses  : st.enemyStatuses
      const defSt = st.attacker === 'player' ? st.enemyStatuses : st.heroStatuses

      // ── Blind: 10 % miss chance for the attacker ──────────────────────────
      if (atkSt.some(s => s.type === 'blind') && Math.random() < 0.10) {
        st.log.unshift({ attacker: atkUnit.name, defender: defUnit.name, dmg: 0, missed: true })
        st.hitsLeft -= 1
        return
      }

      // ── Shock: defender cannot dodge ─────────────────────────────────────
      const shocked = defSt.some(s => s.type === 'shock')
      if (!shocked && checkDodge(defUnit)) {
        st.log.unshift({ attacker: atkUnit.name, defender: defUnit.name, dmg: 0, missed: true })
        st.hitsLeft -= 1
        return
      }

      // ── Build effective copies with status modifiers ──────────────────────
      const effAtk = { ...atkUnit }
      const effDef = { ...defUnit }

      // Blind → attacker cannot crit
      if (atkSt.some(s => s.type === 'blind')) effAtk.critChance = 0

      // Distortion → attacker's ATK swapped with destreza-equivalent
      // (critChance + damageReduction) × 100 replaces raw ATK:
      //   forca-dominant monsters (high ATK, low dex) become very weak
      //   destreza-dominant monsters (spider) are barely affected
      if (atkSt.some(s => s.type === 'distortion')) {
        effAtk.atk = Math.max(1, Math.round((atkUnit.critChance + atkUnit.damageReduction) * 100))
      }

      // Curse → defender's damage reduction zeroed
      if (defSt.some(s => s.type === 'curse')) effDef.damageReduction = 0

      // ── Compute base damage ───────────────────────────────────────────────
      const { dmg: rawDmg, isCrit } = calcDmg(effAtk, effDef)

      // Marked  → defender takes 1.5× damage (eternum brands the target)
      // Blessed → defender takes 0.5× damage (caelum protects the hero)
      const marked  = defSt.some(s => s.type === 'marked')  ? 1.5 : 1.0
      const blessed = defSt.some(s => s.type === 'blessed') ? 0.5 : 1.0
      const dmg = Math.max(1, Math.round(rawDmg * marked * blessed))

      const newHp = Math.max(0, defUnit.hp - dmg)
      if (st.attacker === 'player') st.enemy.hp  = newHp
      else                          st.player.hp = newHp

      st.log.unshift({ attacker: atkUnit.name, defender: defUnit.name, dmg, isCrit })
      st.hitsLeft -= 1
      if (newHp === 0) { st.winner = st.attacker; st.phase = 'over' }

      // ── Elemental status from physical attack (e.g. venomous monster) ─────
      if (atkUnit.element && atkUnit.statusChance && Math.random() < atkUnit.statusChance) {
        const status = makeStatus(atkUnit.element, 0, atkUnit.level)
        const arr = st.attacker === 'player' ? st.enemyStatuses : st.heroStatuses
        const idx = arr.findIndex(s => s.element === status.element)
        if (idx >= 0) { if (status.power >= arr[idx].power) arr[idx] = { ...status } }
        else arr.push({ ...status })
      }

    }),

    switchAttacker: () => set((st) => {
      if (st.phase === 'over') return

      const candidate = st.attacker === 'player' ? 'enemy' : 'player'
      st.phase = 'idle'
      st.turn += 1

      // Gravity: enemy loses their entire turn (stun)
      if (candidate === 'enemy') {
        const gIdx = st.enemyStatuses.findIndex(s => s.type === 'gravity')
        if (gIdx >= 0) {
          // Consume the gravity turn and skip back to player
          st.enemyStatuses[gIdx].turnsLeft -= 1
          if (st.enemyStatuses[gIdx].turnsLeft <= 0) {
            st.enemyStatuses.splice(gIdx, 1)
          }
          // Enemy turn skipped — player attacks again
          st.attacker = 'player'
        } else {
          st.attacker = 'enemy'
        }
      } else {
        st.attacker = 'player'
      }

      const next = st.attacker === 'player' ? st.player : st.enemy
      const opp  = st.attacker === 'player' ? st.enemy  : st.player
      // Freeze: attacker's atkSpeed reduced to 35 % while frozen
      // Makes fast enemies lose their combo advantage (e.g. goblin 2→1 hits/turn)
      const nextSt = st.attacker === 'player' ? st.heroStatuses : st.enemyStatuses
      const frozen = nextSt.some(s => s.type === 'freeze')
      const effSpeed = frozen ? Math.max(0.1, next.atkSpeed * 0.35) : next.atkSpeed
      st.hitsLeft  = calcHits(effSpeed, opp.atkSpeed)
      st.comboSize = st.hitsLeft
    }),

    skipBattle: () => set((st) => {
      if (st.phase === 'over') return
      let pHp = st.player.hp, eHp = st.enemy.hp
      let cur: Side = st.attacker
      let hitsLeft  = st.hitsLeft
      let guard = 2000

      while (pHp > 0 && eHp > 0 && guard-- > 0) {
        if (cur === 'player') {
          if (checkDodge(st.enemy)) {
            st.log.unshift({ attacker: st.player.name, defender: st.enemy.name, dmg: 0, missed: true })
          } else {
            const { dmg, isCrit } = calcDmg(st.player, st.enemy)
            eHp = Math.max(0, eHp - dmg)
            st.log.unshift({ attacker: st.player.name, defender: st.enemy.name, dmg, isCrit })
          }
        } else {
          if (checkDodge(st.player)) {
            st.log.unshift({ attacker: st.enemy.name, defender: st.player.name, dmg: 0, missed: true })
          } else {
            const { dmg, isCrit } = calcDmg(st.enemy, st.player)
            pHp = Math.max(0, pHp - dmg)
            st.log.unshift({ attacker: st.enemy.name, defender: st.player.name, dmg, isCrit })
          }
        }
        hitsLeft--
        if (hitsLeft <= 0) {
          cur = cur === 'player' ? 'enemy' : 'player'
          const next = cur === 'player' ? st.player : st.enemy
          const opp  = cur === 'player' ? st.enemy  : st.player
          hitsLeft = calcHits(next.atkSpeed, opp.atkSpeed)
        }
      }

      st.player.hp = pHp; st.enemy.hp = eHp
      st.winner = pHp <= 0 ? 'enemy' : 'player'
      st.phase  = 'over'
    }),

    logSpell: ({ casterName, name, icon, effectType, value }) => set((st) => {
      // For damage/debuff the target is the enemy; for heal/buff the caster benefits
      const defender = (effectType === 'damage' || effectType === 'debuff')
        ? st.enemy.name
        : casterName
      st.log.unshift({
        attacker: casterName,
        defender,
        dmg: effectType === 'damage' ? value : 0,
        spell: { name, icon, effectType, value },
      })
    }),

    applyMagicDamage: (dmg, element) => set((st) => {
      if (st.phase === 'over') return
      let effective = dmg
      if (element) {
        const mod = elementalModifier(
          element, st.enemy.weakTo,
          st.enemy.resIgnea, st.enemy.resGlacial, st.enemy.resSombria, st.enemy.resVital,
        )
        effective = Math.max(1, Math.round(dmg * mod))
      }
      const newHp = Math.max(0, st.enemy.hp - effective)
      st.enemy.hp = newHp
      if (newHp === 0) { st.winner = 'player'; st.phase = 'over' }
    }),

    applyElementalStatus: (status, target) => set((st) => {
      const arr = target === 'enemy' ? st.enemyStatuses : st.heroStatuses
      const idx = arr.findIndex(s => s.element === status.element)
      if (idx >= 0) {
        // Replace only if same or stronger power ("fire replaces with the strongest")
        if (status.power >= arr[idx].power) arr[idx] = { ...status }
      } else {
        arr.push({ ...status })
      }
    }),

    tickStatuses: () => set((st) => {
      if (st.phase === 'over') return

      // ── DoTs on enemy ─────────────────────────────────────────────────────
      for (const s of st.enemyStatuses) {
        if (s.type === 'burn' || s.type === 'poison') {
          const dmg   = Math.max(1, Math.round(s.power))
          const newHp = Math.max(0, st.enemy.hp - dmg)
          st.enemy.hp = newHp
          st.log.unshift({
            attacker: STATUS_ICONS[s.type] + ' ' + STATUS_LABEL_PT[s.type],
            defender: st.enemy.name,
            dmg,
            spell: {
              name: STATUS_LABEL_PT[s.type],
              icon: STATUS_ICONS[s.type],
              effectType: 'damage',
              value: dmg,
            },
          })
          if (newHp === 0) { st.winner = 'player'; st.phase = 'over' }
          // Poison grows each tick
          if (s.type === 'poison') s.power = Math.round(s.power * 1.3)
        }
      }

      // ── Regen on hero ──────────────────────────────────────────────────────
      for (const s of st.heroStatuses) {
        if (s.type === 'regen') {
          const healed = Math.max(1, s.power)
          st.player.hp = Math.min(st.player.maxHp, st.player.hp + healed)
          st.log.unshift({
            attacker: STATUS_ICONS.regen + ' ' + STATUS_LABEL_PT.regen,
            defender: st.player.name,
            dmg: 0,
            spell: {
              name: STATUS_LABEL_PT.regen,
              icon: STATUS_ICONS.regen,
              effectType: 'heal',
              value: healed,
            },
          })
        }
      }

      // ── Decrement all statuses, remove expired ─────────────────────────────
      st.enemyStatuses = st.enemyStatuses
        .map(s => ({ ...s, turnsLeft: s.turnsLeft - 1 }))
        .filter(s => s.turnsLeft > 0)
      st.heroStatuses = st.heroStatuses
        .map(s => ({ ...s, turnsLeft: s.turnsLeft - 1 }))
        .filter(s => s.turnsLeft > 0)

    }),

    clearStatuses: () => set((st) => {
      st.enemyStatuses = []
      st.heroStatuses  = []
    }),

    restoreMidFight: (playerHpRatio, enemyHpRatio, enemyStatuses, heroStatuses) => set((st) => {
      st.player.hp     = Math.max(1, Math.min(st.player.maxHp, Math.round(st.player.maxHp * playerHpRatio)))
      st.enemy.hp      = Math.max(1, Math.min(st.enemy.maxHp,  Math.round(st.enemy.maxHp  * enemyHpRatio)))
      st.enemyStatuses = enemyStatuses
      st.heroStatuses  = heroStatuses
    }),


    healPlayer: (hp) => set((st) => {
      st.player.hp = Math.min(st.player.maxHp, st.player.hp + hp)
    }),

    applyEnemyDebuff: (atkMult, atkSpeedMult) => set((st) => {
      st.enemy.atk      = Math.max(1, Math.round(st.enemy.atk      * atkMult))
      st.enemy.atkSpeed = Math.max(0.1, st.enemy.atkSpeed * atkSpeedMult)
    }),

    restoreEnemyStats: (savedAtk, savedAtkSpeed) => set((st) => {
      st.enemy.atk      = savedAtk
      st.enemy.atkSpeed = savedAtkSpeed
    }),

    reset: () => set((st) => {
      const template = FOREST_MONSTER_MAP.get(st.nextEnemyType) ?? FOREST_MONSTERS[0]
      st.player.hp    = st.player.maxHp
      st.enemy        = buildMonster(template, st.nextEnemyLevel, st.nextEnemyRarity, st.nextTilesPlaced)
      st.phase        = 'idle'
      st.attacker     = 'player'
      st.winner       = null
      st.log          = []
      st.turn         = 0
      st.skipAnim     = false
      st.defeatSnapshot = null
      st.enemyStatuses  = []
      st.heroStatuses   = []
      const hits      = calcHits(st.player.atkSpeed, st.enemy.atkSpeed)
      st.hitsLeft     = hits
      st.comboSize    = hits
    }),
  })),
  {
    name: 'incremental-idle-battle',
    partialize: (state) => ({
      speed:                state.speed,
      nextEnemyLevel:       state.nextEnemyLevel,
      nextEnemyType:        state.nextEnemyType,
      nextEnemyRarity:      state.nextEnemyRarity,
      nextTilesPlaced:      state.nextTilesPlaced,
      defeatSnapshot:       state.defeatSnapshot,
    }),
  }
  )
)
