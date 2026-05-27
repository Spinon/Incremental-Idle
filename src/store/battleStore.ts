import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

export type Speed = 1 | 2 | 3 | 4
export type Phase = 'idle' | 'attacking' | 'over'
export type Side = 'player' | 'enemy'

export interface Unit {
  name: string
  hp: number
  maxHp: number
  atk: number
  def: number
}

interface BattleStore {
  player: Unit
  enemy: Unit
  phase: Phase
  attacker: Side
  speed: Speed
  skipAnim: boolean
  winner: Side | null
  log: string[]
  turn: number

  setSpeed(s: Speed): void
  setSkipAnim(v: boolean): void
  setPhase(p: Phase): void
  applyHit(): void
  switchAttacker(): void
  skipBattle(): void
  reset(): void
}

const INITIAL_PLAYER: Unit = { name: 'Hero', hp: 30, maxHp: 30, atk: 8, def: 3 }
const INITIAL_ENEMY: Unit = { name: 'Goblin', hp: 24, maxHp: 24, atk: 6, def: 1 }

function calcDmg(a: Unit, d: Unit) {
  return Math.max(1, a.atk - d.def)
}

export const useBattleStore = create<BattleStore>()(
  immer((set) => ({
    player: { ...INITIAL_PLAYER },
    enemy: { ...INITIAL_ENEMY },
    phase: 'idle',
    attacker: 'player',
    speed: 1,
    skipAnim: false,
    winner: null,
    log: [],
    turn: 0,

    setSpeed: (s) => set((st) => { st.speed = s }),
    setSkipAnim: (v) => set((st) => { st.skipAnim = v }),
    setPhase: (p) => set((st) => { st.phase = p }),

    applyHit: () => set((st) => {
      const atkUnit = st.attacker === 'player' ? st.player : st.enemy
      const defUnit = st.attacker === 'player' ? st.enemy : st.player
      const dmg = calcDmg(atkUnit, defUnit)
      const newHp = Math.max(0, defUnit.hp - dmg)

      if (st.attacker === 'player') st.enemy.hp = newHp
      else st.player.hp = newHp

      st.log.unshift(`${atkUnit.name} strikes ${defUnit.name} for ${dmg} damage!`)

      if (newHp === 0) {
        st.winner = st.attacker
        st.phase = 'over'
      }
    }),

    switchAttacker: () => set((st) => {
      if (st.phase === 'over') return
      st.attacker = st.attacker === 'player' ? 'enemy' : 'player'
      st.phase = 'idle'
      st.turn += 1
    }),

    skipBattle: () => set((st) => {
      if (st.phase === 'over') return
      let pHp = st.player.hp
      let eHp = st.enemy.hp
      let cur: Side = st.attacker
      let guard = 500

      while (pHp > 0 && eHp > 0 && guard-- > 0) {
        if (cur === 'player') {
          const dmg = calcDmg(st.player, st.enemy)
          eHp = Math.max(0, eHp - dmg)
          st.log.unshift(`${st.player.name} strikes ${st.enemy.name} for ${dmg} damage!`)
        } else {
          const dmg = calcDmg(st.enemy, st.player)
          pHp = Math.max(0, pHp - dmg)
          st.log.unshift(`${st.enemy.name} strikes ${st.player.name} for ${dmg} damage!`)
        }
        cur = cur === 'player' ? 'enemy' : 'player'
      }

      st.player.hp = pHp
      st.enemy.hp = eHp
      st.winner = pHp <= 0 ? 'enemy' : 'player'
      st.phase = 'over'
    }),

    reset: () => set((st) => {
      st.player = { ...INITIAL_PLAYER }
      st.enemy = { ...INITIAL_ENEMY }
      st.phase = 'idle'
      st.attacker = 'player'
      st.winner = null
      st.log = []
      st.turn = 0
      st.skipAnim = false
    }),
  }))
)
