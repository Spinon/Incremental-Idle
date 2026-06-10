import type { CSSProperties } from 'react'
import demon1 from '../../../assets/hero/demon1.png'
import demon2 from '../../../assets/hero/demon2.png'
import demon3 from '../../../assets/hero/demon3.png'
import demon4 from '../../../assets/hero/demon4.png'

const DEMON_FRAMES = [demon1, demon2, demon3, demon4] as const

interface PartyNpcSpriteProps {
  seed?: string
  size?: number
  accent?: string
  className?: string
  style?: CSSProperties
  title?: string
}

function frameIndex(seed?: string) {
  if (!seed) return 0
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return hash % DEMON_FRAMES.length
}

export default function PartyNpcSprite({
  seed,
  size = 48,
  accent = '#38bdf8',
  className,
  style,
  title,
}: PartyNpcSpriteProps) {
  const frameSize = Math.round(size * 1.22)
  const src = DEMON_FRAMES[frameIndex(seed)]
  const imageStyle: CSSProperties = {
    width: frameSize,
    height: frameSize,
    maxWidth: 'none',
    imageRendering: 'pixelated',
    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.55))',
  }

  return (
    <span
      className={className}
      title={title}
      style={{
        ...style,
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible',
        position: 'relative',
      }}
      aria-label={title ?? 'Party NPC'}
    >
      <span
        className="absolute rounded-full"
        style={{
          inset: Math.max(1, Math.round(size * 0.08)),
          backgroundColor: `${accent}22`,
          boxShadow: `inset 0 0 0 1px ${accent}88, 0 0 10px ${accent}33`,
        }}
      />
      <img src={src} alt="" draggable={false} style={imageStyle} />
    </span>
  )
}
