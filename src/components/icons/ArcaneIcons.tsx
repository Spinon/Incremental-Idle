// Icons for the arcane resources (Word Sand / Word Bit).
//
// Two flavours:
//  - WordSandIcon / WordBitIcon: tiny inline SVG glyphs (use `currentColor`),
//    kept for small UI spots like the Spellbook labels where a 128px painted
//    sprite would be illegible.
//  - MarketSpriteIcon: the painted 128x128 sprites from the shared spritesheet,
//    meant for larger showcase spots like the market rows.

import type { CSSProperties } from 'react'
import marketSpritesheet from '../../assets/market_icon_spritesheet.png'

// ─── Painted sprite icons ─────────────────────────────────────────────────────

// Each frame in the spritesheet is 128x128, laid out horizontally.
// To add a new icon: drop another 128px frame on the right of the PNG, bump
// MARKET_SPRITE_FRAME_COUNT, and add its name → index here.
export const MARKET_SPRITE_FRAME = {
  wordSand: 0,
  wordBit: 1,
} as const

export type MarketSpriteName = keyof typeof MARKET_SPRITE_FRAME

export const MARKET_SPRITE_FRAME_COUNT = 2

export function MarketSpriteIcon({
  name,
  size = 32,
  className,
}: {
  name: MarketSpriteName
  size?: number | string
  className?: string
}) {
  const index = MARKET_SPRITE_FRAME[name]
  const style: CSSProperties = {
    width: size,
    height: size,
    backgroundImage: `url(${marketSpritesheet})`,
    backgroundSize: `${MARKET_SPRITE_FRAME_COUNT * 100}% 100%`,
    // Single-frame sheets have no offset to interpolate.
    backgroundPosition: MARKET_SPRITE_FRAME_COUNT > 1
      ? `${(index / (MARKET_SPRITE_FRAME_COUNT - 1)) * 100}% 0%`
      : '0% 0%',
    backgroundRepeat: 'no-repeat',
  }
  return <span role="img" aria-hidden="true" className={className} style={{ display: 'inline-block', ...style }} />
}

// ─── Tiny inline SVG glyphs ───────────────────────────────────────────────────

interface IconProps {
  className?: string
  /** Pixel size for width/height. Defaults to 1em so it follows font-size. */
  size?: number | string
}

/** Word Sand — an hourglass with falling sand. */
export function WordSandIcon({ className, size = '1em' }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* frame */}
      <path d="M6 3h12M6 21h12" />
      <path d="M7 3c0 5 5 6 5 9s-5 4-5 9" />
      <path d="M17 3c0 5-5 6-5 9s5 4 5 9" />
      {/* sand (filled) */}
      <path d="M9 5.5h6c-.4 2.2-3 3.2-3 4.3-1-.9-2.6-2.1-3-4.3Z" fill="currentColor" stroke="none" />
      <path d="M12 14c1.6 1.4 3 2.6 3.3 4.8H8.7C9 16.6 10.4 15.4 12 14Z" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** Word Bit — a faceted crystal shard / fragment. */
export function WordBitIcon({ className, size = '1em' }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* outer shard */}
      <path d="M12 2 19 9 12 22 5 9 12 2Z" fill="currentColor" fillOpacity={0.18} />
      {/* facets */}
      <path d="M5 9h14" />
      <path d="M12 2 9 9l3 13 3-13-3-7Z" />
    </svg>
  )
}
