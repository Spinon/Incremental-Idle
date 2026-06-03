import type { CSSProperties } from 'react'
import type { HeroConfig } from '../../../types/hero'
import { DEFAULT_HERO_CONFIG } from '../../../types/hero'
import heroBattle from '../../../assets/hero/hero-pixellab-b6fc494e.png'

export type { HeroConfig }
export { DEFAULT_HERO_CONFIG }

interface HeroSpriteProps {
  config?: HeroConfig
  size?: number
  className?: string
}

export function HeroSprite({
  config: _config = DEFAULT_HERO_CONFIG,
  size = 40,
  className,
}: HeroSpriteProps) {
  const frameSize = Math.round(size * 1.5)
  const sourceSize = 128
  const crop = { x: 32, y: 18, width: 64, height: 104 }
  const scale = frameSize / crop.height
  const imageSize = Math.round(sourceSize * scale)
  const imageLeft = Math.round((size - crop.width * scale) / 2 - crop.x * scale)
  const imageTop = Math.round(-crop.y * scale)

  const imageStyle: CSSProperties = {
    width: imageSize,
    height: imageSize,
    maxWidth: 'none',
    flexShrink: 0,
    position: 'absolute',
    left: imageLeft,
    top: imageTop,
    imageRendering: 'pixelated',
    filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.55))',
  }

  return (
    <span
      className={className}
      style={{
        width: size,
        height: frameSize,
        display: 'inline-flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        overflow: 'visible',
        position: 'relative',
      }}
      aria-label="Hero"
    >
      <img
        src={heroBattle}
        alt=""
        draggable={false}
        style={imageStyle}
      />
    </span>
  )
}

function rand<T extends number>(max: T): T {
  return (Math.floor(Math.random() * max) + 1) as T
}

export function randomHeroConfig(): HeroConfig {
  return {
    head: rand(3),
    hair: rand(4),
    body: rand(3),
    weapon: Math.floor(Math.random() * 4) as 0 | 1 | 2 | 3,
    legs: rand(3),
  }
}
