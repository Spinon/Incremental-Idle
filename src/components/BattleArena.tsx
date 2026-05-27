import { useEffect, useRef, useState } from 'react'
import { useBattleStore } from '../store/battleStore'
import { useHeroStore } from '../store/heroStore'
import { useT } from '../i18n/useT'
import UnitSprite from './UnitSprite'
import HpBar from './HpBar'
import SpeedControls from './SpeedControls'

const ATTACK_MS = 1100
const IDLE_MS   = 950

export default function BattleArena() {
  const store      = useBattleStore()
  const gainXp     = useHeroStore((s) => s.gainXp)
  const xpGranted  = useRef(false)
  const t          = useT()
  const timerA     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timerB     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timerC     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [impact, setImpact] = useState(false)

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
        gainXp(store.enemy.maxHp)
      }
      timerA.current = setTimeout(() => {
        if (!cancelled) { xpGranted.current = false; store.reset() }
      }, 1800 / store.speed)
      return () => { cancelled = true; clearTimers() }
    }

    if (store.phase === 'idle') {
      timerA.current = setTimeout(() => {
        if (!cancelled) store.setPhase('attacking')
      }, IDLE_MS / store.speed)
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
        if (state.phase !== 'over') store.switchAttacker()
      }, full)
    }

    return () => { cancelled = true; clearTimers() }
  }, [store.phase, store.speed, store.skipAnim])

  const isPlayerAttacking = store.attacker === 'player' && store.phase === 'attacking'
  const isEnemyAttacking  = store.attacker === 'enemy'  && store.phase === 'attacking'
  const playerHit = store.attacker === 'enemy'  && impact
  const enemyHit  = store.attacker === 'player' && impact

  const attackDur = `${ATTACK_MS / store.speed}ms`
  const hitDur    = `${(ATTACK_MS / store.speed) * 0.22}ms`

  return (
    <div className="w-full">
      <SpeedControls />

      {/* ── Arena ─────────────────────────────────────────── */}
      <div className="relative h-80 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-xl select-none arena-bg">

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

        {/* VS */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-8
          text-slate-400/30 dark:text-slate-600/50 font-black text-2xl tracking-widest pointer-events-none">
          VS
        </div>

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
          <HpBar name={store.enemy.name} current={store.enemy.hp} max={store.enemy.maxHp} side="enemy" />
          <div
            key={`enemy-${store.turn}`}
            className={isEnemyAttacking ? 'anim-attack-left' : ''}
            style={isEnemyAttacking ? { animationDuration: attackDur } : undefined}
          >
            <UnitSprite side="enemy" isHit={enemyHit} hitDuration={hitDur} />
          </div>
        </div>

        {/* Battle over overlay */}
        {store.phase === 'over' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 dark:bg-black/65 backdrop-blur-[2px]">
            <p className={`text-5xl font-black mb-3 tracking-tight drop-shadow-lg
              ${store.winner === 'player' ? 'text-yellow-500 dark:text-yellow-400' : 'text-red-500 dark:text-red-400'}`}>
              {store.winner === 'player' ? t.victory : t.defeat}
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-3">{t.nextBattle}</p>
            <div className="w-48 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                key={store.turn}
                className="h-full rounded-full bg-indigo-500 anim-fill-bar"
                style={{ animationDuration: `${1800 / store.speed}ms` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Battle log */}
      <div className="mt-3 h-28 overflow-y-auto bg-slate-50 dark:bg-slate-900/70 rounded-xl px-4 py-3 border border-slate-200 dark:border-slate-800">
        <p className="text-[10px] text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-2 font-semibold">{t.log}</p>
        {store.log.length === 0
          ? <p className="text-sm text-slate-400 dark:text-slate-600 italic">{t.awaiting}</p>
          : store.log.map((entry, i) => (
              <p key={i} className={`text-sm leading-snug ${i === 0 ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}>
                {t.strike(entry.attacker, entry.defender, entry.dmg)}
              </p>
            ))
        }
      </div>
    </div>
  )
}
