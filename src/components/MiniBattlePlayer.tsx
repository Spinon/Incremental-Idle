import { useState, useRef, useEffect, useCallback } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { useBattleStore } from '../store/battleStore'
import { useHeroStore } from '../store/heroStore'
import { useInventoryStore } from '../store/inventoryStore'
import { useSpellStore, getKnownWordIds, getPlayerSpells } from '../store/spellStore'
import { useUIStore } from '../store/uiStore'
import { useMapStore } from '../store/mapStore'
import { useSettingsStore } from '../store/settingsStore'
import { SPELL_ICONS, WORD_ICONS } from '../data/spells'
import { getSpellManaCost } from '../formulas/spells'
import { FOREST_MONSTER_MAP } from '../data/monsters'
import { getEquipmentBonuses } from '../formulas/items'
import { getEffectiveDerivedStatsFromBonuses } from '../formulas/effectiveStats'
import { HeroSprite } from './icons/hero/HeroComposer'
import { MonsterSprite, MONSTER_PIXEL_SPRITES } from './icons/MonsterSprites'
import { cn } from '../lib/utils'
import type { Consumable } from '../types/item'

const MINI_RARITY_BORDER: Record<string, string> = {
  common:   'border-slate-500/70',
  uncommon: 'border-green-500/70',
  rare:     'border-blue-500/70',
  epic:     'border-purple-500/70',
  set:      'border-yellow-400/70',
  unique:   'border-orange-500/70',
}

const MINI_EFFECT_ICON: Record<string, string> = {
  damage: '⚔',
  heal: '✦',
  buff: '▲',
  debuff: '▼',
  utility: '◎',
  fizzle: '∅',
}

const MINI_PLAYER_DEFAULT_WIDTH = 236
const MINI_PLAYER_MIN_WIDTH = 190
const MINI_PLAYER_MAX_WIDTH = 360
const MINI_PLAYER_SAFE_HEIGHT = 270
const MINI_PLAYER_EDGE_GAP = 20

function clampMiniWidth(width: number): number {
  if (typeof window === 'undefined') return MINI_PLAYER_DEFAULT_WIDTH
  const viewportMax = Math.max(MINI_PLAYER_MIN_WIDTH, window.innerWidth - MINI_PLAYER_EDGE_GAP * 2)
  return Math.max(MINI_PLAYER_MIN_WIDTH, Math.min(Math.min(MINI_PLAYER_MAX_WIDTH, viewportMax), width))
}

// ─── Mini HP bar ──────────────────────────────────────────────────────────────

function MiniHpBar({ label, current, max }: { label: string; current: number; max: number }) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100))
  const bg =
    pct > 60 ? '#22c55e' :
    pct > 30 ? '#eab308' :
               '#ef4444'

  return (
    <div className="relative w-full h-[18px] rounded overflow-hidden bg-slate-800">
      <div
        className="absolute inset-y-0 left-0 rounded transition-[width] duration-200"
        style={{ width: `${pct}%`, background: bg }}
      />
      {/* Gloss */}
      <div className="absolute inset-0 rounded pointer-events-none"
        style={{ background: 'linear-gradient(180deg,rgba(255,255,255,0.12) 0%,transparent 55%)' }} />
      {/* Labels */}
      <div className="absolute inset-0 flex items-center px-1.5 gap-1">
        <span className="text-[8px] font-semibold text-white drop-shadow truncate flex-1 leading-none">
          {label}
        </span>
        <span className="text-[8px] font-bold text-white/90 tabular-nums shrink-0 leading-none">
          {current}/{max}
        </span>
      </div>
    </div>
  )
}

function MiniManaBar({ current, max, label, color = 'bg-blue-500' }: { current: number; max: number; label: string; color?: string }) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100))

  return (
    <div className="relative w-full h-[14px] rounded overflow-hidden bg-slate-800">
      <div
        className={cn('absolute inset-y-0 left-0 rounded transition-[width] duration-200', color)}
        style={{ width: `${pct}%` }}
      />
      <div
        className="absolute inset-0 rounded pointer-events-none"
        style={{ background: 'linear-gradient(180deg,rgba(255,255,255,0.12) 0%,transparent 55%)' }}
      />
      <div className="absolute inset-0 flex items-center px-1.5 gap-1">
        <span className="text-[7px] font-semibold text-white drop-shadow truncate flex-1 leading-none">
          {label}
        </span>
        <span className="text-[7px] font-bold text-white/90 tabular-nums shrink-0 leading-none">
          {Math.floor(current)}/{Math.round(max)}
        </span>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

function MiniAutoBar({ kind }: { kind: 'home' | 'market' | 'tower' }) {
  const sceneAuto = useUIStore(s => s.sceneAuto)
  const lang = useSettingsStore(s => s.lang)
  const blueTowerAutoTarget = useMapStore(s => s.blueTowerAutoTarget)
  const isEn = lang === 'en'

  if (!sceneAuto.active || sceneAuto.kind !== kind || sceneAuto.durationMs <= 0) return null

  const pct = Math.max(0, Math.min(100, (sceneAuto.elapsedMs / sceneAuto.durationMs) * 100))
  const sec = Math.ceil(Math.max(0, (sceneAuto.durationMs - sceneAuto.elapsedMs) / 1000))
  const fill = kind === 'tower' ? 'bg-sky-500/80' : kind === 'market' ? 'bg-indigo-500/80' : 'bg-red-500/80'
  const text = sceneAuto.paused
    ? (isEn ? 'Auto paused' : 'Auto pausado')
    : kind === 'tower'
      ? blueTowerAutoTarget
        ? (isEn ? `Teleporting in ${sec}s` : `Teleportando em ${sec}s`)
        : (isEn ? `Leaving in ${sec}s` : `Saindo em ${sec}s`)
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
  const heroLevel = useHeroStore(s => s.level)
  const attrs = useHeroStore(s => s.attributes)
  const mana = useHeroStore(s => s.mana)
  const restoreStamina = useHeroStore(s => s.restoreStamina)
  const restoreMana = useHeroStore(s => s.restoreMana)
  const gainSkipCharge = useHeroStore(s => s.gainSkipCharge)
  const gainXp = useHeroStore(s => s.gainXp)
  const gold = useHeroStore(s => s.gold)
  const equipment = useInventoryStore(s => s.equipment)
  const weaponProgress = useInventoryStore(s => s.weaponProgress)
  const equippedWeapons = useInventoryStore(s => s.equippedWeapons)
  const consumables = useInventoryStore(s => s.consumables)
  const quickslots = useInventoryStore(s => s.quickslots)
  const removeConsumable = useInventoryStore(s => s.removeConsumable)
  const earnedWordIds = useSpellStore(s => s.earnedWordIds)
  const spellSlots = useSpellStore(s => s.spellSlots)
  const cooldowns = useSpellStore(s => s.cooldowns)
  const autoSlots = useSpellStore(s => s.autoSlots)
  const activeBuffs = useSpellStore(s => s.activeBuffs)
  const castSpell = useSpellStore(s => s.castSpell)
  const scene = useMapStore(s => s.scene)
  const defeatPending = useMapStore(s => s.defeatPending)
  const stuckPending = useMapStore(s => s.stuckPending)
  const lang = useSettingsStore(s => s.lang)
  const isEn = lang === 'en'
  const equipBonuses = getEquipmentBonuses(equipment)
  const derivedStats = getEffectiveDerivedStatsFromBonuses(
    attrs,
    equipBonuses,
    heroLevel,
    weaponProgress,
    equippedWeapons,
    activeBuffs,
  )
  const knownWordIds = getKnownWordIds(heroLevel, attrs.inteligencia, attrs.sabedoria, earnedWordIds)
  const availableSpells = getPlayerSpells(knownWordIds)

  // ── Drag ──────────────────────────────────────────────────────────────────
  const [miniWidth, setMiniWidth] = useState(() => clampMiniWidth(MINI_PLAYER_DEFAULT_WIDTH))
  const [pos, setPos] = useState(() => ({
    x: Math.max(MINI_PLAYER_EDGE_GAP, window.innerWidth - MINI_PLAYER_DEFAULT_WIDTH - MINI_PLAYER_EDGE_GAP),
    y: Math.max(MINI_PLAYER_EDGE_GAP, window.innerHeight - MINI_PLAYER_SAFE_HEIGHT - MINI_PLAYER_EDGE_GAP),
  }))
  const [openQuickslots, setOpenQuickslots] = useState<'consumables' | 'spells' | null>(null)
  const drag = useRef<{ ox: number; oy: number; px: number; py: number; pointerId: number } | null>(null)
  const resize = useRef<{ ox: number; ow: number; pointerId: number } | null>(null)

  const clampMiniPos = useCallback((x: number, y: number, width = miniWidth) => ({
    x: Math.max(MINI_PLAYER_EDGE_GAP, Math.min(window.innerWidth - width - MINI_PLAYER_EDGE_GAP, x)),
    y: Math.max(MINI_PLAYER_EDGE_GAP, Math.min(window.innerHeight - MINI_PLAYER_SAFE_HEIGHT - MINI_PLAYER_EDGE_GAP, y)),
  }), [miniWidth])

  const onHeaderPointerDown = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    if (e.button !== undefined && e.button !== 0) return
    e.preventDefault()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    drag.current = { ox: e.clientX, oy: e.clientY, px: pos.x, py: pos.y, pointerId: e.pointerId }
  }, [pos])

  const onResizePointerDown = useCallback((e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.button !== undefined && e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    resize.current = { ox: e.clientX, ow: miniWidth, pointerId: e.pointerId }
  }, [miniWidth])

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (resize.current && resize.current.pointerId === e.pointerId) {
        const width = clampMiniWidth(resize.current.ow + e.clientX - resize.current.ox)
        setMiniWidth(width)
        setPos(p => clampMiniPos(p.x, p.y, width))
        return
      }
      if (drag.current && drag.current.pointerId === e.pointerId) {
        setPos(clampMiniPos(drag.current.px + e.clientX - drag.current.ox, drag.current.py + e.clientY - drag.current.oy))
      }
    }
    const onUp = (e: PointerEvent) => {
      if (drag.current?.pointerId === e.pointerId) drag.current = null
      if (resize.current?.pointerId === e.pointerId) resize.current = null
    }
    const onWindowResize = () => {
      setMiniWidth(w => clampMiniWidth(w))
      setPos(p => clampMiniPos(p.x, p.y))
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    window.addEventListener('resize', onWindowResize)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      window.removeEventListener('resize', onWindowResize)
    }
  }, [clampMiniPos])

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
      if (entry.weaponEffect) text = `${entry.weaponEffect.icon} ${text}`
      color = 'text-amber-300 text-[13px]'
      if (hitsPlayer) setPlayerHitKey(k => k + 1)
      else            setEnemyHitKey(k => k + 1)
    } else if (entry.weaponEffect) {
      text  = entry.dmg > 0 ? `${entry.weaponEffect.icon} -${entry.dmg}` : entry.weaponEffect.icon
      color = hitsPlayer ? 'text-red-400' : 'text-yellow-300'
      if (entry.dmg > 0) {
        if (hitsPlayer) setPlayerHitKey(k => k + 1)
        else            setEnemyHitKey(k => k + 1)
      }
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

  function toggleQuickslotDrawer(kind: 'consumables' | 'spells') {
    setOpenQuickslots(current => current === kind ? null : kind)
  }

  function useMiniConsumable(c: Consumable) {
    removeConsumable(c.id)
    switch (c.effect) {
      case 'stamina':
        restoreStamina(derivedStats.maxStamina * c.magnitude, derivedStats.maxStamina)
        break
      case 'mana':
        restoreMana(derivedStats.maxMana * c.magnitude, derivedStats.maxMana)
        break
      case 'skip':
        for (let i = 0; i < c.magnitude; i++) gainSkipCharge()
        break
      case 'xp':
        gainXp(Math.round(c.magnitude))
        break
    }
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

    if (scene === 'tower') {
      return (
        <>
          <button
            type="button"
            onClick={openBattleTabAndPause}
            className="w-full text-left px-3 pt-3 pb-2 bg-[linear-gradient(160deg,#06192d_0%,#082f55_55%,#040b16_100%)] hover:brightness-110 transition"
            title={isEn ? 'Open blue tower' : 'Abrir torre azul'}
          >
            <div className="h-16 rounded-lg border border-sky-600/40 bg-sky-950/40 px-3 py-2 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg border border-sky-400/30 bg-sky-900/50 flex items-center justify-center text-xl">
                T
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-black text-sky-100 leading-none">
                  {isEn ? 'Blue Tower' : 'Torre Azul'}
                </p>
                <p className="text-[9px] text-sky-400/70 mt-1 leading-none">
                  {isEn ? 'Open tower interior' : 'Abrir interior da torre'}
                </p>
              </div>
            </div>
          </button>
          <MiniAutoBar kind="tower" />
        </>
      )
    }

    return null
  }

  const enemyTemplate = FOREST_MONSTER_MAP.get(enemy.monsterType ?? '')
  const playerFloats = floats.filter(f => f.side === 'player')
  const enemyFloats  = floats.filter(f => f.side === 'enemy')

  const playerLabel = player.name
  const enemyName   = isEn ? (enemy.nameEn ?? enemy.name) : (enemy.namePt ?? enemy.name)
  const enemyLabel  = `${enemyName}  ${isEn ? 'Lv.' : 'Nv.'}${enemy.level}`
  const enemyResourceLabel = isEn ? 'FURY' : 'FURIA'
  const enemyVisual = enemyTemplate && MONSTER_PIXEL_SPRITES[enemyTemplate.id]
    ? (
      <MonsterSprite
        monsterId={enemyTemplate.id}
        rarity={enemy.rarity}
        enraged={enemy.enraged}
        size={44}
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
      style={{ left: pos.x, top: pos.y, width: miniWidth, touchAction: 'none' }}
    >
      <div className="relative rounded-xl overflow-hidden shadow-2xl ring-1 ring-slate-600/60 bg-slate-900/95 backdrop-blur-md">

        {/* ── Header / drag handle ──────────────────────────────────────── */}
        <div
          className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-800/80 cursor-grab active:cursor-grabbing border-b border-slate-700/50 touch-none"
          onPointerDown={onHeaderPointerDown}
        >
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex-1 pointer-events-none">
            {scene === 'home'
              ? (isEn ? 'Home' : 'Casa')
              : scene === 'market'
                ? (isEn ? 'Market' : 'Mercado')
                : scene === 'tower'
                  ? (isEn ? 'Blue Tower' : 'Torre Azul')
                  : `⚔ ${isEn ? 'Battle' : 'Batalha'}`}
          </span>
          <button
            className="text-slate-500 hover:text-slate-200 text-xs leading-none px-0.5 transition-colors"
            onClick={() => setShow(false)}
            onPointerDown={e => e.stopPropagation()}
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
              <button
                type="button"
                onClick={openBattleTabAndPause}
                title={isEn ? 'Open battle tab' : 'Abrir aba de batalha'}
                key={`p-${playerHitKey}`}
                className={cn('leading-none rounded-md transition hover:brightness-125 active:scale-95 focus:outline-none focus:ring-1 focus:ring-slate-400/60', playerHitKey > 0 && 'anim-flash')}
                style={playerHitKey > 0 ? { animationDuration: '280ms' } : undefined}
              >
                <HeroSprite config={heroConfig} size={38} />
              </button>
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
        <div className="px-2.5 pb-2.5 flex flex-col gap-1">
          <MiniHpBar label={playerLabel} current={player.hp} max={player.maxHp} />
          <MiniManaBar label={isEn ? 'MANA' : 'MANA'} current={mana} max={derivedStats.maxMana} />
          <MiniHpBar label={enemyLabel} current={enemy.hp} max={enemy.maxHp} />
          <MiniManaBar label={enemyResourceLabel} current={enemy.fury} max={enemy.furyMax} color="bg-red-500" />
          <div className="grid grid-cols-2 gap-1 pt-0.5">
            <button
              type="button"
              onClick={() => toggleQuickslotDrawer('consumables')}
              className={cn(
                'h-6 rounded border text-[9px] font-black uppercase tracking-wide transition-colors',
                openQuickslots === 'consumables'
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200'
                  : 'bg-slate-800/80 border-slate-700/70 text-slate-400 hover:text-slate-200',
              )}
            >
              {isEn ? 'Items' : 'Consumíveis'}
            </button>
            <button
              type="button"
              onClick={() => toggleQuickslotDrawer('spells')}
              className={cn(
                'h-6 rounded border text-[9px] font-black uppercase tracking-wide transition-colors',
                openQuickslots === 'spells'
                  ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-200'
                  : 'bg-slate-800/80 border-slate-700/70 text-slate-400 hover:text-slate-200',
              )}
            >
              {isEn ? 'Spells' : 'Magias'}
            </button>
          </div>
          {openQuickslots === 'consumables' && (
            <div className="grid grid-cols-4 gap-1 pt-0.5">
              {quickslots.map((qid, slot) => {
                const c = qid ? consumables.find(x => x.id === qid) : null
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => c && useMiniConsumable(c)}
                    disabled={!c}
                    title={c ? `[${slot + 1}] ${isEn ? c.nameEn : c.name}` : (isEn ? `Quickslot ${slot + 1} empty` : `Atalho ${slot + 1} vazio`)}
                    className={cn(
                      'h-8 rounded border flex items-center justify-center transition',
                      c
                        ? cn(MINI_RARITY_BORDER[c.rarity], 'bg-slate-800 hover:bg-slate-700 active:scale-95')
                        : 'border-dashed border-slate-700 bg-slate-800/40 opacity-45 cursor-not-allowed',
                    )}
                  >
                    <span className="text-base leading-none">{c ? c.icon : slot + 1}</span>
                  </button>
                )
              })}
            </div>
          )}
          {openQuickslots === 'spells' && (
            <div className="grid grid-cols-6 gap-1 pt-0.5">
              {spellSlots.map((sid, slot) => {
                const spell = sid ? availableSpells.find(s => s.id === sid) : null
                const cd = sid ? (cooldowns[sid] ?? 0) : 0
                const canCast = spell && mana >= getSpellManaCost(spell) && cd === 0
                const isAuto = autoSlots[slot]?.enabled ?? false
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => spell && castSpell(spell.id)}
                    disabled={!spell || !canCast}
                    title={spell
                      ? `[${slot + 5}] ${spell.name} - ${getSpellManaCost(spell)} mana${cd > 0 ? ` (${cd} ${isEn ? 'left' : 'rest.'})` : ''}`
                      : (isEn ? `Spell slot ${slot + 1} empty` : `Slot de magia ${slot + 1} vazio`)}
                    className={cn(
                      'relative h-8 rounded border flex items-center justify-center transition',
                      spell
                        ? cn(
                            MINI_RARITY_BORDER[spell.rarity],
                            'bg-slate-800',
                            canCast ? 'hover:bg-slate-700 active:scale-95' : 'opacity-50 cursor-not-allowed',
                          )
                        : 'border-dashed border-slate-700 bg-slate-800/40 opacity-45 cursor-not-allowed',
                    )}
                  >
                    {spell ? (
                      <>
                        <span className="text-sm leading-none">
                          {SPELL_ICONS[spell.id] ?? WORD_ICONS[spell.word1Id] ?? MINI_EFFECT_ICON[spell.effect.type]}
                        </span>
                        {isAuto && cd === 0 && (
                          <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-indigo-400" />
                        )}
                        {cd > 0 && (
                          <span className="absolute inset-0 rounded bg-black/55 flex items-center justify-center text-[9px] font-black text-white">
                            {cd}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-[9px] font-bold text-slate-500">✦</span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
          </>
        )}

        <button
          type="button"
          aria-label={isEn ? 'Resize mini battle' : 'Redimensionar mini batalha'}
          title={isEn ? 'Resize mini battle' : 'Redimensionar mini batalha'}
          onPointerDown={onResizePointerDown}
          className="absolute bottom-0 right-0 z-20 h-6 w-6 cursor-nwse-resize touch-none rounded-tl-lg border-l border-t border-slate-600/60 bg-slate-800/80 text-slate-400 hover:text-slate-100 active:text-slate-100"
        >
          <span className="absolute bottom-1 right-1 h-2.5 w-2.5 border-b-2 border-r-2 border-current" />
        </button>
      </div>
    </div>,
    document.body,
  )
}
