import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useBattleStore } from '../store/battleStore'
import { useHeroStore } from '../store/heroStore'
import { useUIStore } from '../store/uiStore'
import { useMapStore } from '../store/mapStore'
import { useSettingsStore } from '../store/settingsStore'
import { FOREST_MONSTER_MAP } from '../data/monsters'
import { HeroSprite } from './icons/hero/HeroComposer'
import { MonsterSprite, MONSTER_PIXEL_SPRITES } from './icons/MonsterSprites'
import { cn } from '../lib/utils'

// ─── Mini HP bar ──────────────────────────────────────────────────────────────

function MiniHpBar({ label, current, max }: { label: string; current: number; max: number }) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100))
  const bg =
    pct > 60 ? '#22c55e' :
    pct > 30 ? '#eab308' :
               '#ef4444'

  return (
    <div className="relative w-full h-[22px] rounded overflow-hidden bg-slate-800">
      <div
        className="absolute inset-y-0 left-0 rounded transition-[width] duration-200"
        style={{ width: `${pct}%`, background: bg }}
      />
      {/* Gloss */}
      <div className="absolute inset-0 rounded pointer-events-none"
        style={{ background: 'linear-gradient(180deg,rgba(255,255,255,0.12) 0%,transparent 55%)' }} />
      {/* Labels */}
      <div className="absolute inset-0 flex items-center px-1.5 gap-1">
        <span className="text-[9px] font-semibold text-white drop-shadow truncate flex-1 leading-none">
          {label}
        </span>
        <span className="text-[9px] font-bold text-white/90 tabular-nums shrink-0 leading-none">
          {current}/{max}
        </span>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

function MiniAutoBar({ kind }: { kind: 'home' | 'market' }) {
  const sceneAuto = useUIStore(s => s.sceneAuto)
  const lang = useSettingsStore(s => s.lang)
  const isEn = lang === 'en'

  if (!sceneAuto.active || sceneAuto.kind !== kind || sceneAuto.durationMs <= 0) return null

  const pct = Math.max(0, Math.min(100, (sceneAuto.elapsedMs / sceneAuto.durationMs) * 100))
  const sec = Math.ceil(Math.max(0, (sceneAuto.durationMs - sceneAuto.elapsedMs) / 1000))
  const fill = kind === 'market' ? 'bg-indigo-500/80' : 'bg-red-500/80'
  const text = sceneAuto.paused
    ? (isEn ? 'Auto paused' : 'Auto pausado')
    : kind === 'market'
      ? (isEn ? `Leaving in ${sec}s` : `Saindo em ${sec}s`)
      : (isEn ? `New journey in ${sec}s` : `Nova jornada em ${sec}s`)

  return (
    <div className="px-2.5 pb-2.5">
      <div className="h-1.5 rounded-full bg-slate-950/70 overflow-hidden border border-white/10">
        <div className={cn('h-full rounded-full transition-none', fill)} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-[9px] text-slate-400 text-center leading-none">{text}</p>
    </div>
  )
}

export default function MiniBattlePlayer() {
  const show    = useUIStore(s => s.showMiniPlayer)
  const setShow = useUIStore(s => s.setShowMiniPlayer)
  const setActiveTab = useUIStore(s => s.setActiveTab)
  const pauseSceneAuto = useUIStore(s => s.pauseSceneAuto)

  const player   = useBattleStore(s => s.player)
  const enemy    = useBattleStore(s => s.enemy)
  const phase    = useBattleStore(s => s.phase)
  const winner   = useBattleStore(s => s.winner)
  const attacker = useBattleStore(s => s.attacker)
  const log      = useBattleStore(s => s.log)

  const heroConfig = useHeroStore(s => s.heroConfig)
  const gold = useHeroStore(s => s.gold)
  const scene = useMapStore(s => s.scene)
  const defeatPending = useMapStore(s => s.defeatPending)
  const stuckPending = useMapStore(s => s.stuckPending)
  const lang = useSettingsStore(s => s.lang)
  const isEn = lang === 'en'

  // ── Drag ──────────────────────────────────────────────────────────────────
  const [pos, setPos] = useState(() => ({
    x: Math.max(0, window.innerWidth - 256),
    y: Math.max(0, window.innerHeight - 190),
  }))
  const drag = useRef<{ ox: number; oy: number; px: number; py: number } | null>(null)

  const onHeaderMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    drag.current = { ox: e.clientX, oy: e.clientY, px: pos.x, py: pos.y }
  }, [pos])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!drag.current) return
      const W = 236  // component width
      const H = 160  // approximate height
      setPos({
        x: Math.max(0, Math.min(window.innerWidth  - W, drag.current.px + e.clientX - drag.current.ox)),
        y: Math.max(0, Math.min(window.innerHeight - H, drag.current.py + e.clientY - drag.current.oy)),
      })
    }
    const onUp = () => { drag.current = null }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
    }
  }, [])

  // ── Hit flash (key-based to restart animation on every hit) ───────────────
  const [playerHitKey, setPlayerHitKey] = useState(0)
  const [enemyHitKey,  setEnemyHitKey]  = useState(0)

  // ── Floating texts ────────────────────────────────────────────────────────
  interface FloatEntry { id: number; text: string; side: 'player' | 'enemy'; color: string }
  const [floats,     setFloats]     = useState<FloatEntry[]>([])
  const floatIdRef   = useRef(0)
  const lastLogLen   = useRef(0)
  const logLen       = log.length

  useEffect(() => {
    if (logLen <= lastLogLen.current || log.length === 0) {
      lastLogLen.current = logLen
      return
    }
    lastLogLen.current = logLen

    const entry     = log[0]
    const hitsPlayer = entry.defender === player.name

    let text  = ''
    let color = ''

    if (entry.missed) {
      text  = 'MISS'
      color = 'text-slate-400'
    } else if (entry.spell) {
      const { spell } = entry
      if (spell.effectType === 'damage') {
        text  = `-${spell.value}`
        color = 'text-yellow-300'
        setEnemyHitKey(k => k + 1)
      } else if (spell.effectType === 'heal') {
        text  = `+${spell.value}`
        color = 'text-emerald-400'
      } else {
        text  = spell.icon
        color = 'text-blue-300'
      }
    } else if (entry.isCrit) {
      text  = `⚡-${entry.dmg}`
      color = 'text-amber-300 text-[13px]'
      if (hitsPlayer) setPlayerHitKey(k => k + 1)
      else            setEnemyHitKey(k => k + 1)
    } else {
      text  = `-${entry.dmg}`
      color = hitsPlayer ? 'text-red-400' : 'text-yellow-300'
      if (hitsPlayer) setPlayerHitKey(k => k + 1)
      else            setEnemyHitKey(k => k + 1)
    }

    if (!text) return

    const side: 'player' | 'enemy' = hitsPlayer ? 'player' : 'enemy'
    const id = ++floatIdRef.current
    setFloats(prev => [...prev.slice(-4), { id, text, side, color }])
    setTimeout(() => setFloats(prev => prev.filter(f => f.id !== id)), 1100)
  }, [logLen]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Don't render until shown ───────────────────────────────────────────────
  if (!show) return null

  function openBattleTabAndPause() {
    pauseSceneAuto()
    setActiveTab('battle')
    setShow(false)
  }

  function renderSceneMini() {
    if (scene === 'home') {
      const title = stuckPending
        ? (isEn ? 'Map blocked' : 'Mapa bloqueado')
        : defeatPending
          ? (isEn ? 'Defeated' : 'Derrotado')
          : (isEn ? 'At home' : 'Em casa')
      const subtitle = defeatPending || stuckPending
        ? (isEn ? 'Open home to restart' : 'Abra a casa para reiniciar')
        : (isEn ? 'Open home actions' : 'Abrir a casa')

      return (
        <>
          <button
            type="button"
            onClick={openBattleTabAndPause}
            className="w-full text-left px-3 pt-3 pb-2 bg-[linear-gradient(160deg,#1c0f05_0%,#2d1a08_55%,#161006_100%)] hover:brightness-110 transition"
            title={isEn ? 'Open home' : 'Abrir casa'}
          >
            <div className="h-16 rounded-lg border border-amber-800/40 bg-amber-950/30 px-3 py-2 flex flex-col justify-between">
              <div className="flex items-center gap-2 text-2xl leading-none opacity-80">
                <span>🔥</span><span>🪑</span><span>🪵</span><span>🕯️</span>
              </div>
              <div>
                <p className="text-[11px] font-black text-amber-200 leading-none">{title}</p>
                <p className="text-[9px] text-amber-500/70 mt-1 leading-none">{subtitle}</p>
              </div>
            </div>
          </button>
          <MiniAutoBar kind="home" />
        </>
      )
    }

    if (scene === 'market') {
      return (
        <>
          <button
            type="button"
            onClick={openBattleTabAndPause}
            className="w-full text-left px-3 pt-3 pb-2 bg-[linear-gradient(160deg,#0f0c1e_0%,#1a1340_55%,#0c0f1e_100%)] hover:brightness-110 transition"
            title={isEn ? 'Open market' : 'Abrir mercado'}
          >
            <div className="h-16 rounded-lg border border-indigo-700/40 bg-indigo-950/40 px-3 py-2 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg border border-indigo-500/30 bg-indigo-900/50 flex items-center justify-center text-xl">
                ⚑
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-black text-indigo-200 leading-none">
                  {isEn ? 'Market' : 'Mercado'}
                </p>
                <p className="text-[9px] text-indigo-400/70 mt-1 leading-none">
                  {isEn ? 'Open shop actions' : 'Abrir a loja'}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[11px] font-bold text-yellow-400 leading-none">⬡ {gold}</p>
                <p className="text-[8px] text-yellow-600/70 mt-1 leading-none">{isEn ? 'gold' : 'ouro'}</p>
              </div>
            </div>
          </button>
          <MiniAutoBar kind="market" />
        </>
      )
    }

    return null
  }

  const enemyTemplate = FOREST_MONSTER_MAP.get(enemy.monsterType ?? '')
  const playerFloats = floats.filter(f => f.side === 'player')
  const enemyFloats  = floats.filter(f => f.side === 'enemy')

  const playerLabel = player.name
  const enemyLabel  = `${enemy.name}  Nv.${enemy.level}`
  const enemyVisual = enemyTemplate && MONSTER_PIXEL_SPRITES[enemyTemplate.id]
    ? (
      <MonsterSprite
        monsterId={enemyTemplate.id}
        rarity={enemy.rarity}
        enraged={enemy.enraged}
        size={38}
      />
    )
    : (
      <span className="text-[38px] leading-none">
        {enemyTemplate?.emoji ?? '👾'}
      </span>
    )

  const sceneMini = renderSceneMini()

  return createPortal(
    <div
      className="fixed z-[9999] select-none"
      style={{ left: pos.x, top: pos.y, width: 236 }}
    >
      <div className="rounded-xl overflow-hidden shadow-2xl ring-1 ring-slate-600/60 bg-slate-900/95 backdrop-blur-md">

        {/* ── Header / drag handle ──────────────────────────────────────── */}
        <div
          className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-800/80 cursor-grab active:cursor-grabbing border-b border-slate-700/50"
          onMouseDown={onHeaderMouseDown}
        >
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex-1 pointer-events-none">
            {scene === 'home'
              ? (isEn ? 'Home' : 'Casa')
              : scene === 'market'
                ? (isEn ? 'Market' : 'Mercado')
                : `⚔ ${isEn ? 'Battle' : 'Batalha'}`}
          </span>
          <button
            className="text-slate-500 hover:text-slate-200 text-xs leading-none px-0.5 transition-colors"
            onClick={() => setShow(false)}
            onMouseDown={e => e.stopPropagation()}
          >
            ✕
          </button>
        </div>

        {/* ── Emoji arena ───────────────────────────────────────────────── */}
        {sceneMini ?? (
          <>
        <div className="px-3 pt-3 pb-1 relative">
          <div className="relative flex items-end justify-between h-14">

            {/* Player side */}
            <div className="relative flex flex-col items-center">
              {playerFloats.map(f => (
                <span
                  key={f.id}
                  className={cn(
                    'absolute -top-5 left-1/2 -translate-x-1/2 text-[11px] font-black anim-dmg-float whitespace-nowrap pointer-events-none',
                    f.color,
                  )}
                >
                  {f.text}
                </span>
              ))}
              <span
                key={`p-${playerHitKey}`}
                className={cn('leading-none', playerHitKey > 0 && 'anim-flash')}
                style={playerHitKey > 0 ? { animationDuration: '280ms' } : undefined}
              >
                <HeroSprite config={heroConfig} size={38} />
              </span>
            </div>

            {/* Centre indicator */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {phase === 'attacking' && (
                <span className={cn(
                  'text-base font-black leading-none',
                  attacker === 'player' ? 'text-yellow-400' : 'text-red-400',
                )}>
                  {attacker === 'player' ? '→⚔' : '⚔←'}
                </span>
              )}
              {phase === 'over' && (
                <span className="text-xl leading-none">
                  {winner === 'player' ? '🏆' : '💀'}
                </span>
              )}
              {phase === 'idle' && (
                <span className="text-slate-700 dark:text-slate-700 text-[10px] font-bold leading-none">VS</span>
              )}
            </div>

            {/* Enemy side */}
            <div className="relative flex flex-col items-center">
              {enemyFloats.map(f => (
                <span
                  key={f.id}
                  className={cn(
                    'absolute -top-5 left-1/2 -translate-x-1/2 text-[11px] font-black anim-dmg-float whitespace-nowrap pointer-events-none',
                    f.color,
                  )}
                >
                  {f.text}
                </span>
              ))}
              <span
                key={`e-${enemyHitKey}`}
                className={cn('leading-none', enemyHitKey > 0 && 'anim-flash')}
                style={enemyHitKey > 0 ? { animationDuration: '280ms' } : undefined}
              >
                {enemyVisual}
              </span>
            </div>
          </div>
        </div>

        {/* ── HP bars ───────────────────────────────────────────────────── */}
        <div className="px-2.5 pb-2.5 flex flex-col gap-1.5">
          <MiniHpBar label={playerLabel}  current={player.hp} max={player.maxHp} />
          <MiniHpBar label={enemyLabel}   current={enemy.hp}  max={enemy.maxHp}  />
        </div>
          </>
        )}

      </div>
    </div>,
    document.body,
  )
}
