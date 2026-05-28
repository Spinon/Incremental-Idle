import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

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
}

export interface LogEntry {
  attacker: string
  defender: string
  dmg: number
}

interface HeroSync { atk: number; def: number; maxHp: number; atkSpeed: number }

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
  hitsLeft: number
  comboSize: number

  setSpeed(s: Speed): void
  setSkipAnim(v: boolean): void
  setPhase(p: Phase): void
  syncFromHero(stats: HeroSync): void
  queueEnemy(level: number): void
  applyHit(): void
  switchAttacker(): void
  skipBattle(): void
  reset(): void
}

const INITIAL_PLAYER: Unit = { name: 'Hero', level: 0, hp: 30, maxHp: 30, atk: 5, def: 2, atkSpeed: 1.0 }

export function goblinStats(level: number): Unit {
  return {
    name: 'Goblin',
    level,
    hp:       16 + level * 8,
    maxHp:    16 + level * 8,
    atk:       4 + level * 2,
    def:       level,
    atkSpeed:  0.8 + level * 0.15,
  }
}

function calcDmg(a: Unit, d: Unit) {
  return Math.max(1, Math.round(a.atk - d.def))
}

function calcHits(mySpeed: number, theirSpeed: number): number {
  return Math.max(1, Math.round(mySpeed / theirSpeed))
}

export const useBattleStore = create<BattleStore>()(
  persist(
  immer((set) => ({
    player: { ...INITIAL_PLAYER },
    enemy:  goblinStats(1),
    phase: 'idle',
    attacker: 'player',
    speed: 1,
    skipAnim: false,
    winner: null,
    log: [],
    turn: 0,
    nextEnemyLevel: 1,
    hitsLeft: 1,
    comboSize: 1,

    setSpeed:    (s) => set((st) => { st.speed    = s }),
    setSkipAnim: (v) => set((st) => { st.skipAnim = v }),
    setPhase:    (p) => set((st) => { st.phase    = p }),
    queueEnemy:  (level) => set((st) => { st.nextEnemyLevel = level }),

    syncFromHero: ({ atk, def, maxHp, atkSpeed }) => set((st) => {
      st.player.atk      = Math.round(atk)
      st.player.def      = def
      st.player.maxHp    = Math.round(maxHp)
      st.player.atkSpeed = atkSpeed
      if (st.player.hp > st.player.maxHp) st.player.hp = st.player.maxHp
    }),

    applyHit: () => set((st) => {
      const atkUnit = st.attacker === 'player' ? st.player : st.enemy
      const defUnit = st.attacker === 'player' ? st.enemy  : st.player
      const dmg     = calcDmg(atkUnit, defUnit)
      const newHp   = Math.max(0, defUnit.hp - dmg)

      if (st.attacker === 'player') st.enemy.hp  = newHp
      else                          st.player.hp = newHp

      st.log.unshift({ attacker: atkUnit.name, defender: defUnit.name, dmg })
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
          const dmg = calcDmg(st.player, st.enemy)
          eHp = Math.max(0, eHp - dmg)
          st.log.unshift({ attacker: st.player.name, defender: st.enemy.name, dmg })
        } else {
          const dmg = calcDmg(st.enemy, st.player)
          pHp = Math.max(0, pHp - dmg)
          st.log.unshift({ attacker: st.enemy.name, defender: st.player.name, dmg })
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

    reset: () => set((st) => {
      st.player.hp = st.player.maxHp
      st.enemy     = goblinStats(st.nextEnemyLevel)
      st.phase     = 'idle'
      st.attacker  = 'player'
      st.winner    = null
      st.log       = []
      st.turn      = 0
      st.skipAnim  = false
      const hits   = calcHits(st.player.atkSpeed, st.enemy.atkSpeed)
      st.hitsLeft  = hits
      st.comboSize = hits
    }),
  })),
  {
    name: 'incremental-idle-battle',
    partialize: (state) => ({ speed: state.speed }),
  }
  )
)
