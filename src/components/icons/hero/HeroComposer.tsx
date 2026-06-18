import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { HeroConfig } from '../../../types/hero'
import { DEFAULT_HERO_CONFIG } from '../../../types/hero'
import heroAttackSheet from '../../../assets/hero/Animations/hero_attack_spritesheet_horizontal_12x128.png'

export type { HeroConfig }
export { DEFAULT_HERO_CONFIG }

// Horizontal spritesheet: 12 frames of 128x128.
// Frame 0 is the idle/standing pose; frames 1..11 are the attack swing.
const FRAME_COUNT = 12
const IDLE_FRAME = 0
// Frame order played on attack. The idle frame is held one extra beat at the
// start so the swing stays in sync with the forward lunge — the sprite is still
// translating into position on the first beat, so the strike shouldn't fire yet.
const ATTACK_SEQUENCE = [IDLE_FRAME, ...Array.from({ length: FRAME_COUNT }, (_, k) => k)]
// The character sits inside a 128 frame with some empty margin; this zoom makes
// the hero read at roughly the same on-screen size as the old cropped sprite
// without clipping the raised sword on the attack frames (overflow stays visible).
const FRAME_ZOOM = 1.9425

interface HeroSpriteProps {
  config?: HeroConfig
  size?: number
  className?: string
  /** When true, plays the attack swing once, then holds until released. */
  attacking?: boolean
  /** Total attack window in ms — frames are spread across it. */
  attackDurationMs?: number
}

export function HeroSprite({
  config: _config = DEFAULT_HERO_CONFIG,
  size = 40,
  className,
  attacking = false,
  attackDurationMs,
}: HeroSpriteProps) {
  const [frame, setFrame] = useState(IDLE_FRAME)
  const prevAttacking = useRef(false)
  const timerRef = useRef<number | null>(null)

  // Play the full swing once on the RISING EDGE of `attacking`, then return to
  // idle. A one-shot (rather than tracking the boolean) keeps the whole swing
  // visible even when the attack phase is very short or skipped at high game
  // speeds — the animation always plays start-to-finish.
  useEffect(() => {
    const rising = attacking && !prevAttacking.current
    prevAttacking.current = attacking
    if (!rising) return

    if (timerRef.current !== null) window.clearInterval(timerRef.current)
    let idx = 0
    setFrame(ATTACK_SEQUENCE[0])
    const frameMs = Math.min(50, Math.max(22, Math.round((attackDurationMs ?? 480) / ATTACK_SEQUENCE.length)))
    timerRef.current = window.setInterval(() => {
      idx += 1
      if (idx >= ATTACK_SEQUENCE.length) {
        if (timerRef.current !== null) { window.clearInterval(timerRef.current); timerRef.current = null }
        setFrame(IDLE_FRAME)
        return
      }
      setFrame(ATTACK_SEQUENCE[idx])
    }, frameMs)
  }, [attacking, attackDurationMs])

  useEffect(() => () => { if (timerRef.current !== null) window.clearInterval(timerRef.current) }, [])

  const frameSize = Math.round(size * FRAME_ZOOM)

  // Show one frame of the horizontal sheet. With backgroundSize at 1200% the
  // position percentage maps linearly: frame/(FRAME_COUNT-1) → 0%..100%.
  const spriteStyle: CSSProperties = {
    width: frameSize,
    height: frameSize,
    position: 'absolute',
    bottom: 0,
    left: Math.round((size - frameSize) / 2),
    backgroundImage: `url(${heroAttackSheet})`,
    backgroundSize: `${FRAME_COUNT * 100}% 100%`,
    backgroundPosition: `${(frame / (FRAME_COUNT - 1)) * 100}% 0%`,
    backgroundRepeat: 'no-repeat',
    imageRendering: 'pixelated',
    filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.55))',
  }

  return (
    <span
      className={className}
      style={{
        width: size,
        height: Math.round(size * 1.5),
        display: 'inline-flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        overflow: 'visible',
        position: 'relative',
      }}
      aria-label="Hero"
    >
      <span style={spriteStyle} />
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
