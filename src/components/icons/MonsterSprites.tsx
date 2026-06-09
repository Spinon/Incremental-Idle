import type { CSSProperties } from 'react'
import type { MonsterRarity } from '../../types/monster'

import bandit1 from '../../assets/monster-sprites/Bandit1.svg'
import bandit2 from '../../assets/monster-sprites/Bandit2.svg'
import bandit3 from '../../assets/monster-sprites/Bandit3.svg'
import bandit4 from '../../assets/monster-sprites/Bandit4.svg'
import demon1 from '../../assets/monster-sprites/Demon1.png'
import demon2 from '../../assets/monster-sprites/Demon2.png'
import demon3 from '../../assets/monster-sprites/Demon3.png'
import demon4 from '../../assets/monster-sprites/Demon4.png'
import goblin1 from '../../assets/monster-sprites/Goblin1.svg'
import goblin2 from '../../assets/monster-sprites/Goblin2.svg'
import goblin3 from '../../assets/monster-sprites/Goblin3.svg'
import goblin4 from '../../assets/monster-sprites/Goblin4.svg'
import slime1 from '../../assets/monster-sprites/Slime1.svg'
import slime2 from '../../assets/monster-sprites/Slime2.svg'
import slime3 from '../../assets/monster-sprites/Slime3.svg'
import slime4 from '../../assets/monster-sprites/Slime4.svg'
import spider1 from '../../assets/monster-sprites/Spider1.svg'
import spider2 from '../../assets/monster-sprites/Spider2.svg'
import spider3 from '../../assets/monster-sprites/Spider3.svg'
import spider4 from '../../assets/monster-sprites/Spider4.svg'
import wolf1 from '../../assets/monster-sprites/Wolf1.svg'
import wolf2 from '../../assets/monster-sprites/Wolf2.svg'
import wolf3 from '../../assets/monster-sprites/Wolf3.svg'
import wolf4 from '../../assets/monster-sprites/Wolf4.svg'
import wolf5 from '../../assets/monster-sprites/Wolf5.svg'

export interface MonsterSpriteProps {
  monsterId: string
  rarity?: MonsterRarity
  enraged?: boolean
  variant?: 'golden'
  size?: number
}

type SpriteSet = {
  normal: string
  uncommon: string
  rare: string
  epic: string
  unique: string
  flipToFaceLeft?: boolean
  visualScale?: number
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
    normal: wolf1,
    uncommon: wolf2,
    rare: wolf3,
    epic: wolf4,
    unique: wolf5,
    flipToFaceLeft: true,
    visualScale: 1.14,
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
  size = 80,
}: MonsterSpriteProps) {
  const spriteSet = SPRITES[monsterId]
  if (!spriteSet) return null

  const src = spriteSet[rarity] ?? spriteSet.normal
  const transform = [
    spriteSet.flipToFaceLeft ? 'scaleX(-1)' : null,
    spriteSet.visualScale ? `scale(${spriteSet.visualScale})` : null,
  ].filter(Boolean).join(' ') || undefined
  const glow = variant === 'golden'
    ? 'drop-shadow(0 0 9px rgba(250, 204, 21, 0.85))'
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

  return (
    <span
      className="relative inline-flex items-end justify-center overflow-visible"
      style={{ width: size, height: size }}
      aria-label={monsterId}
    >
      <img
        src={src}
        alt=""
        draggable={false}
        style={style}
      />
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
    </span>
  )
}
