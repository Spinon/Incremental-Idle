import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { buildMonster, pickMonsterRarity } from '../formulas/monsters'
import { FOREST_MONSTER_MAP, FOREST_MONSTERS } from '../data/monsters'
import type { MonsterRarity } from '../types/monster'

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
  dodgeChance: number       // 0–1  (Agilidade for hero, destreza-derived for monsters)
  critChance: number        // 0–0.5 probability of a critical hit
  critDamage: number        // multiplier on crit (1.5 = 150% damage)
  damageReduction: number   // 0–0.35 flat fraction of ALL incoming damage negated
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
  hitsLeft: number
  comboSize: number
  defeatSnapshot: DefeatSnapshot | null

  setSpeed(s: Speed): void
  setSkipAnim(v: boolean): void
  setPhase(p: Phase): void
  syncFromHero(stats: HeroSync): void
  queueEnemy(level: number, monsterType?: string, monsterRarity?: MonsterRarity): void
  captureDefeat(): void
  applyHit(): void
  switchAttacker(): void
  skipBattle(): void
  reset(): void
  logSpell(data: SpellLogData & { casterName: string }): void
  applyMagicDamage(dmg: number): void
  healPlayer(hp: number): void
  applyEnemyDebuff(atkMult: number, atkSpeedMult: number): void
  restoreEnemyStats(savedAtk: number, savedAtkSpeed: number): void
}

const INITIAL_PLAYER: Unit = {
  name: 'Hero', level: 0, hp: 30, maxHp: 30,
  atk: 5, def: 2, atkSpeed: 1.0, dodgeChance: 0,
  critChance: 0, critDamage: 1.5, damageReduction: 0,
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
    hitsLeft: 1,
    comboSize: 1,
    defeatSnapshot: null,

    setSpeed:    (s) => set((st) => { st.speed    = s }),
    setSkipAnim: (v) => set((st) => { st.skipAnim = v }),
    setPhase:    (p) => set((st) => { st.phase    = p }),

    queueEnemy: (level, monsterType, monsterRarity) => set((st) => {
      st.nextEnemyLevel  = level
      st.nextEnemyType   = monsterType  ?? FOREST_MONSTERS[Math.floor(Math.random() * FOREST_MONSTERS.length)].id
      st.nextEnemyRarity = monsterRarity ?? pickMonsterRarity()
    }),

    captureDefeat: () => set((st) => {
      st.defeatSnapshot = {
        killerName:        st.enemy.name,
        killerLevel:       st.enemy.level,
        killerMonsterType: st.enemy.monsterType ?? st.nextEnemyType,
        log:               st.log.slice(0, 20),
      }
    }),

    syncFromHero: ({ atk, def, maxHp, atkSpeed, dodgeChance, critChance, critDamage, damageReduction }) => set((st) => {
      st.player.atk             = Math.round(atk)
      st.player.def             = def
      st.player.maxHp           = Math.round(maxHp)
      st.player.atkSpeed        = atkSpeed
      st.player.dodgeChance     = dodgeChance
      st.player.critChance      = critChance
      st.player.critDamage      = critDamage
      st.player.damageReduction = damageReduction
      if (st.player.hp > st.player.maxHp) st.player.hp = st.player.maxHp
    }),

    applyHit: () => set((st) => {
      const atkUnit = st.attacker === 'player' ? st.player : st.enemy
      const defUnit = st.attacker === 'player' ? st.enemy  : st.player

      if (checkDodge(defUnit)) {
        st.log.unshift({ attacker: atkUnit.name, defender: defUnit.name, dmg: 0, missed: true })
        st.hitsLeft -= 1
        return
      }

      const { dmg, isCrit } = calcDmg(atkUnit, defUnit)
      const newHp = Math.max(0, defUnit.hp - dmg)

      if (st.attacker === 'player') st.enemy.hp  = newHp
      else                          st.player.hp = newHp

      st.log.unshift({ attacker: atkUnit.name, defender: defUnit.name, dmg, isCrit })
      st.hitsLeft -= 1

      if (newHp === 0) { st.winner = st.attacker; st.phase = 'over' }
    }),

    switchAttacker: () => set((st) => {
      if (st.phase === 'over') return
      st.attacker = st.attacker === 'player' ? 'enemy' : 'player'
      st.phase    = 'idle'
      st.turn    += 1
      const next    = st.attacker === 'player' ? st.player : st.enemy
      const opp     = st.attacker === 'player' ? st.enemy  : st.player
      const hits    = calcHits(next.atkSpeed, opp.atkSpeed)
      st.hitsLeft   = hits
      st.comboSize  = hits
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

    applyMagicDamage: (dmg) => set((st) => {
      if (st.phase === 'over') return
      const newHp = Math.max(0, st.enemy.hp - dmg)
      st.enemy.hp = newHp
      if (newHp === 0) { st.winner = 'player'; st.phase = 'over' }
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
      st.enemy        = buildMonster(template, st.nextEnemyLevel, st.nextEnemyRarity)
      st.phase        = 'idle'
      st.attacker     = 'player'
      st.winner       = null
      st.log          = []
      st.turn         = 0
      st.skipAnim     = false
      st.defeatSnapshot = null
      const hits      = calcHits(st.player.atkSpeed, st.enemy.atkSpeed)
      st.hitsLeft     = hits
      st.comboSize    = hits
    }),
  })),
  {
    name: 'incremental-idle-battle',
    partialize: (state) => ({
      speed:            state.speed,
      nextEnemyLevel:   state.nextEnemyLevel,
      nextEnemyType:    state.nextEnemyType,
      nextEnemyRarity:  state.nextEnemyRarity,
      defeatSnapshot:   state.defeatSnapshot,
    }),
  }
  )
)
