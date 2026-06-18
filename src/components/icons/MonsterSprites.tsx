import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { MonsterRarity } from '../../types/monster'

import bandit1 from '../../assets/monster-sprites/Bandit1.png'
import bandit2 from '../../assets/monster-sprites/Bandit2.png'
import bandit3 from '../../assets/monster-sprites/Bandit3.png'
import bandit4 from '../../assets/monster-sprites/Bandit4.png'
import demon1 from '../../assets/monster-sprites/Demon1.png'
import demon2 from '../../assets/monster-sprites/Demon2.png'
import demon3 from '../../assets/monster-sprites/Demon3.png'
import demon4 from '../../assets/monster-sprites/Demon4.png'
import goblin1 from '../../assets/monster-sprites/Goblin1.png'
import goblin2 from '../../assets/monster-sprites/Goblin2.png'
import goblin3 from '../../assets/monster-sprites/Goblin3.png'
import goblin4 from '../../assets/monster-sprites/Goblin4.png'
import slime1 from '../../assets/monster-sprites/Slime1.png'
import slime2 from '../../assets/monster-sprites/Slime2.png'
import slime3 from '../../assets/monster-sprites/Slime3.png'
import slime4 from '../../assets/monster-sprites/Slime4.png'
import spider1 from '../../assets/monster-sprites/Spider1.png'
import spider2 from '../../assets/monster-sprites/Spider2.png'
import spider3 from '../../assets/monster-sprites/Spider3.png'
import spider4 from '../../assets/monster-sprites/Spider4.png'
import wolfAttackSheet from '../../assets/monster-sprites/Animations/Wolf_spritesheet.png'

export interface MonsterSpriteProps {
  monsterId: string
  rarity?: MonsterRarity
  enraged?: boolean
  variant?: 'golden' | 'predator' | 'boss'
  size?: number
  attacking?: boolean
  attackDurationMs?: number
}

type SpriteSet = {
  normal: string
  uncommon: string
  rare: string
  epic: string
  unique: string
  flipToFaceLeft?: boolean
  animationFlipToFaceLeft?: boolean
  visualScale?: number
  animationSheet?: string
}

const WOLF_FRAME_COUNT = 4
const WOLF_ROW_COUNT = 5
const IDLE_FRAME = 0
const WOLF_ATTACK_SEQUENCE = [0, 1, 2, 3]
const WOLF_RARITY_ROW: Record<MonsterRarity, number> = {
  normal: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  unique: 4,
}

const SPRITES: Record<string, SpriteSet> = {
  goblin: {
    normal: goblin1,
    uncommon: goblin2,
    rare: goblin3,
    epic: goblin4,
    unique: goblin4,
    flipToFaceLeft: true,
    visualScale: 1.18,
  },
  wolf: {
    normal: wolfAttackSheet,
    uncommon: wolfAttackSheet,
    rare: wolfAttackSheet,
    epic: wolfAttackSheet,
    unique: wolfAttackSheet,
    flipToFaceLeft: true,
    animationFlipToFaceLeft: false,
    visualScale: 1.14,
    animationSheet: wolfAttackSheet,
  },
  slime: {
    normal: slime1,
    uncommon: slime2,
    rare: slime3,
    epic: slime4,
    unique: slime4,
    flipToFaceLeft: true,
    visualScale: 1.18,
  },
  bandit: {
    normal: bandit1,
    uncommon: bandit2,
    rare: bandit3,
    epic: bandit4,
    unique: bandit4,
    flipToFaceLeft: true,
    visualScale: 1.16,
  },
  giant_spider: {
    normal: spider1,
    uncommon: spider2,
    rare: spider3,
    epic: spider4,
    unique: spider4,
    flipToFaceLeft: true,
    visualScale: 1.04,
  },
  demon: {
    normal: demon1,
    uncommon: demon2,
    rare: demon3,
    epic: demon4,
    unique: demon4,
    flipToFaceLeft: true,
    visualScale: 1.18,
  },
}

const RARITY_GLOW: Partial<Record<MonsterRarity, string>> = {
  uncommon: 'drop-shadow(0 0 5px rgba(74, 204, 68, 0.35))',
  rare: 'drop-shadow(0 0 6px rgba(68, 136, 238, 0.42))',
  epic: 'drop-shadow(0 0 7px rgba(187, 68, 238, 0.48))',
  unique: 'drop-shadow(0 0 8px rgba(255, 204, 34, 0.52))',
}

export const MONSTER_PIXEL_SPRITES = SPRITES

export function MonsterSprite({
  monsterId,
  rarity = 'normal',
  enraged = false,
  variant,
  size = 88,
  attacking = false,
  attackDurationMs,
}: MonsterSpriteProps) {
  const spriteSet = SPRITES[monsterId]
  const [frame, setFrame] = useState(IDLE_FRAME)
  const timerRef = useRef<number | null>(null)
  const delayRef = useRef<number | null>(null)

  useEffect(() => {
    if (!spriteSet?.animationSheet) return
    if (timerRef.current !== null) window.clearInterval(timerRef.current)
    timerRef.current = null
    if (delayRef.current !== null) window.clearTimeout(delayRef.current)
    delayRef.current = null

    if (!attacking) {
      setFrame(IDLE_FRAME)
      return
    }

    setFrame(WOLF_ATTACK_SEQUENCE[0])
    const totalMs = attackDurationMs ?? 480
    const midpointDelayMs = Math.max(0, Math.round(totalMs * 0.5))
    const remainingMs = Math.max(80, totalMs - midpointDelayMs)
    const frameMs = Math.min(90, Math.max(28, Math.round(remainingMs / WOLF_ATTACK_SEQUENCE.length)))
    const startDelayMs = Math.max(0, midpointDelayMs - frameMs * 2)

    delayRef.current = window.setTimeout(() => {
      let idx = 0
      setFrame(WOLF_ATTACK_SEQUENCE[0])
      timerRef.current = window.setInterval(() => {
        idx += 1
        if (idx >= WOLF_ATTACK_SEQUENCE.length) {
          if (timerRef.current !== null) { window.clearInterval(timerRef.current); timerRef.current = null }
          setFrame(IDLE_FRAME)
          return
        }
        setFrame(WOLF_ATTACK_SEQUENCE[idx])
      }, frameMs)
    }, startDelayMs)
  }, [attacking, attackDurationMs, spriteSet])

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current)
    if (delayRef.current !== null) window.clearTimeout(delayRef.current)
  }, [])

  if (!spriteSet) return null

  const src = spriteSet[rarity] ?? spriteSet.normal
  const transform = [
    spriteSet.flipToFaceLeft ? 'scaleX(-1)' : null,
    spriteSet.visualScale ? `scale(${spriteSet.visualScale})` : null,
  ].filter(Boolean).join(' ') || undefined
  const glow = variant === 'golden'
    ? 'drop-shadow(0 0 9px rgba(250, 204, 21, 0.85))'
    : variant === 'predator'
    ? 'drop-shadow(0 0 10px rgba(168, 85, 247, 0.9))'
    : enraged
    ? 'drop-shadow(0 0 8px rgba(248, 80, 36, 0.75))'
    : RARITY_GLOW[rarity]

  const style: CSSProperties = {
    width: size,
    height: size,
    imageRendering: 'pixelated',
    transform,
    transformOrigin: 'center bottom',
    filter: glow,
  }
  const row = WOLF_RARITY_ROW[rarity] ?? 0
  const animatedTransform = [
    spriteSet.animationFlipToFaceLeft ? 'scaleX(-1)' : null,
    spriteSet.visualScale ? `scale(${spriteSet.visualScale})` : null,
  ].filter(Boolean).join(' ') || undefined
  const animatedStyle: CSSProperties = {
    ...style,
    transform: animatedTransform,
    backgroundImage: spriteSet.animationSheet ? `url(${spriteSet.animationSheet})` : undefined,
    backgroundSize: `${WOLF_FRAME_COUNT * 100}% ${WOLF_ROW_COUNT * 100}%`,
    backgroundPosition: `${(frame / (WOLF_FRAME_COUNT - 1)) * 100}% ${(row / (WOLF_ROW_COUNT - 1)) * 100}%`,
    backgroundRepeat: 'no-repeat',
  }

  return (
    <span
      className="relative inline-flex items-end justify-center overflow-visible"
      style={{ width: size, height: size }}
      aria-label={monsterId}
    >
      {spriteSet.animationSheet ? (
        <span aria-hidden="true" style={animatedStyle} />
      ) : (
        <img
          src={src}
          alt=""
          draggable={false}
          style={style}
        />
      )}
      {enraged && (
        <span
          className="pointer-events-none absolute inset-0 rounded-full border border-red-400/45 bg-red-500/10"
          style={{ boxShadow: '0 0 14px rgba(248, 80, 36, 0.35) inset' }}
        />
      )}
      {variant === 'golden' && (
        <span
          className="pointer-events-none absolute inset-0 rounded-full border border-yellow-300/50 bg-yellow-300/15 mix-blend-screen"
          style={{ boxShadow: '0 0 16px rgba(250, 204, 21, 0.45) inset' }}
        />
      )}
      {variant === 'predator' && (
        <span
          className="pointer-events-none absolute inset-0 rounded-full border border-purple-300/55 bg-purple-500/12 mix-blend-screen"
          style={{ boxShadow: '0 0 18px rgba(168, 85, 247, 0.45) inset' }}
        />
      )}
    </span>
  )
}
