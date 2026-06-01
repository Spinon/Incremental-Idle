import React from 'react'
import { FOREST_MONSTER_MAP } from '../data/monsters'
import { cn } from '../lib/utils'
import { HeroSprite } from './icons/hero/HeroComposer'
import { useHeroStore } from '../store/heroStore'

interface Props {
  side: 'player' | 'enemy'
  isHit: boolean
  hitDuration: string
  monsterType?: string  // template id — only used when side === 'enemy'
}

// ─── Player sprite — reads heroConfig from store ──────────────────────────────

function HeroSvg() {
  const config = useHeroStore(s => s.heroConfig)
  return <HeroSprite config={config} size={72} />
}


// ─── Goblin ───────────────────────────────────────────────────────────────────

function GoblinSvg() {
  return (
    <svg viewBox="0 0 52 80" width="72" height="112" aria-label="Goblin" style={{ transform: 'scaleX(-1)' }}>
      {/* Ears */}
      <ellipse cx="7" cy="14" rx="7" ry="11" fill="#27ae60" />
      <ellipse cx="45" cy="14" rx="7" ry="11" fill="#27ae60" />
      <ellipse cx="7" cy="14" rx="4" ry="7" fill="#2ecc71" />
      <ellipse cx="45" cy="14" rx="4" ry="7" fill="#2ecc71" />
      {/* Head */}
      <ellipse cx="26" cy="18" rx="18" ry="16" fill="#2ecc71" />
      <ellipse cx="26" cy="10" rx="14" ry="6" fill="#27ae60" />
      <ellipse cx="26" cy="24" rx="14" ry="8" fill="#27ae60" opacity="0.3" />
      {/* Eyes */}
      <ellipse cx="17" cy="15" rx="6" ry="5" fill="#c0392b" />
      <ellipse cx="35" cy="15" rx="6" ry="5" fill="#c0392b" />
      <circle cx="17" cy="15" r="3" fill="#7b241c" />
      <circle cx="35" cy="15" r="3" fill="#7b241c" />
      <circle cx="18" cy="14" r="1.2" fill="#ff8080" />
      <circle cx="36" cy="14" r="1.2" fill="#ff8080" />
      {/* Nose */}
      <ellipse cx="26" cy="22" rx="4" ry="3" fill="#27ae60" />
      <circle cx="24" cy="22" r="1.8" fill="#1e8449" />
      <circle cx="28" cy="22" r="1.8" fill="#1e8449" />
      {/* Mouth + fangs */}
      <path d="M18 28 Q26 34 34 28" stroke="#1e8449" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <rect x="19" y="27" width="4" height="7" rx="2" fill="#f9e4b7" />
      <rect x="29" y="27" width="4" height="7" rx="2" fill="#f9e4b7" />
      {/* Neck */}
      <rect x="20" y="34" width="12" height="5" rx="2" fill="#2ecc71" />
      {/* Body */}
      <rect x="9" y="39" width="34" height="23" rx="5" fill="#6d4c2a" />
      <rect x="14" y="43" width="24" height="14" rx="4" fill="#7d5a36" />
      <rect x="24" y="39" width="4" height="22" rx="2" fill="#5d3d1e" />
      {/* Club arm */}
      <rect x="39" y="28" width="9" height="28" rx="4.5" fill="#7d5a36" />
      <ellipse cx="44" cy="24" rx="12" ry="8" fill="#6d4c2a" />
      <circle cx="36" cy="20" r="3.5" fill="#5d3d1e" />
      <circle cx="44" cy="16" r="3.5" fill="#5d3d1e" />
      <circle cx="52" cy="20" r="3.5" fill="#5d3d1e" />
      {/* Off arm */}
      <rect x="4" y="39" width="9" height="18" rx="4.5" fill="#2ecc71" />
      {/* Legs */}
      <rect x="11" y="62" width="13" height="15" rx="4" fill="#2ecc71" />
      <rect x="28" y="62" width="13" height="15" rx="4" fill="#2ecc71" />
      <ellipse cx="18" cy="77" rx="10" ry="5" fill="#27ae60" />
      <ellipse cx="35" cy="77" rx="10" ry="5" fill="#27ae60" />
    </svg>
  )
}

// ─── Wolf ─────────────────────────────────────────────────────────────────────

function WolfSvg() {
  return (
    <svg viewBox="0 0 64 72" width="80" height="112" aria-label="Wolf" style={{ transform: 'scaleX(-1)' }}>
      {/* Tail */}
      <path d="M54 58 Q70 42 62 30 Q56 36 58 50 Q58 54 54 58z" fill="#7f8c8d" />
      <path d="M58 46 Q62 38 60 32 Q57 37 58 46z" fill="#95a5a6" />
      {/* Body */}
      <ellipse cx="34" cy="52" rx="22" ry="14" fill="#7f8c8d" />
      <ellipse cx="30" cy="47" rx="14" ry="7" fill="#95a5a6" opacity="0.5" />
      {/* Back legs */}
      <rect x="46" y="60" width="9" height="14" rx="4" fill="#6c7a89" />
      <rect x="46" y="70" width="11" height="5" rx="3" fill="#5d6d7e" />
      {/* Front legs */}
      <rect x="10" y="56" width="9" height="16" rx="4" fill="#6c7a89" />
      <rect x="8" y="68" width="11" height="5" rx="3" fill="#5d6d7e" />
      <rect x="22" y="56" width="9" height="16" rx="4" fill="#6c7a89" />
      <rect x="20" y="68" width="11" height="5" rx="3" fill="#5d6d7e" />
      {/* Neck */}
      <ellipse cx="20" cy="46" rx="11" ry="10" fill="#7f8c8d" />
      <ellipse cx="20" cy="44" rx="8" ry="7" fill="#95a5a6" opacity="0.4" />
      {/* Ears */}
      <polygon points="6,22 14,6 20,22" fill="#7f8c8d" />
      <polygon points="22,22 28,8 34,22" fill="#7f8c8d" />
      <polygon points="8,22 14,10 19,22" fill="#c0392b" />
      <polygon points="24,22 28,11 32,22" fill="#c0392b" />
      {/* Head */}
      <ellipse cx="20" cy="26" rx="17" ry="14" fill="#7f8c8d" />
      <ellipse cx="20" cy="24" rx="12" ry="9" fill="#95a5a6" opacity="0.4" />
      {/* Snout */}
      <ellipse cx="8" cy="32" rx="9" ry="7" fill="#6c7a89" />
      <ellipse cx="7" cy="30" rx="5" ry="4" fill="#7f8c8d" />
      <ellipse cx="4" cy="28" rx="4" ry="3" fill="#2c3e50" />
      <circle cx="3" cy="27" r="1.2" fill="#34495e" />
      {/* Eyes */}
      <ellipse cx="16" cy="22" rx="4" ry="3.5" fill="#f39c12" />
      <circle cx="16" cy="22" r="2" fill="#e67e22" />
      <circle cx="16" cy="21.5" r="1" fill="#f1c40f" />
      <ellipse cx="26" cy="22" rx="4" ry="3.5" fill="#f39c12" />
      <circle cx="26" cy="22" r="2" fill="#e67e22" />
      <circle cx="26" cy="21.5" r="1" fill="#f1c40f" />
      {/* Fangs */}
      <polygon points="5,34 8,34 6.5,40" fill="#ecf0f1" />
      <polygon points="10,34 13,34 11.5,40" fill="#ecf0f1" />
    </svg>
  )
}

// ─── Slime ────────────────────────────────────────────────────────────────────

function SlimeSvg() {
  return (
    <svg viewBox="0 0 64 72" width="80" height="112" aria-label="Slime" style={{ transform: 'scaleX(-1)' }}>
      {/* Shadow */}
      <ellipse cx="32" cy="72" rx="24" ry="5" fill="#000" opacity="0.2" />
      {/* Main body */}
      <path d="M8 55 Q4 38 12 26 Q20 10 32 8 Q44 10 52 26 Q60 38 56 55 Q50 68 32 70 Q14 68 8 55z"
        fill="#27ae60" />
      {/* Body highlight */}
      <path d="M16 28 Q20 16 32 14 Q44 16 46 28 Q40 22 32 22 Q24 22 16 28z"
        fill="#2ecc71" opacity="0.7" />
      {/* Drips */}
      <ellipse cx="14" cy="62" rx="5" ry="8" fill="#27ae60" />
      <ellipse cx="50" cy="62" rx="5" ry="8" fill="#27ae60" />
      <ellipse cx="8" cy="58" rx="4" ry="6" fill="#219a52" />
      <ellipse cx="56" cy="58" rx="4" ry="6" fill="#219a52" />
      {/* Eyes */}
      <ellipse cx="22" cy="38" rx="9" ry="10" fill="#ecf0f1" />
      <ellipse cx="42" cy="38" rx="9" ry="10" fill="#ecf0f1" />
      <circle cx="24" cy="40" r="6" fill="#2c3e50" />
      <circle cx="44" cy="40" r="6" fill="#2c3e50" />
      <circle cx="26" cy="37" r="2.5" fill="#7f8c8d" />
      <circle cx="46" cy="37" r="2.5" fill="#7f8c8d" />
      <circle cx="27" cy="36" r="1.2" fill="#ecf0f1" />
      <circle cx="47" cy="36" r="1.2" fill="#ecf0f1" />
      {/* Mouth */}
      <path d="M20 52 Q26 57 32 54 Q38 57 44 52" stroke="#1e8449" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      {/* Bubbles */}
      <circle cx="18" cy="25" r="3" fill="#2ecc71" opacity="0.6" />
      <circle cx="46" cy="20" r="2" fill="#2ecc71" opacity="0.5" />
      <circle cx="38" cy="16" r="2.5" fill="#2ecc71" opacity="0.4" />
    </svg>
  )
}

// ─── Bandit ───────────────────────────────────────────────────────────────────

function BanditSvg() {
  return (
    <svg viewBox="0 0 52 80" width="72" height="112" aria-label="Bandit" style={{ transform: 'scaleX(-1)' }}>
      {/* Hood */}
      <ellipse cx="26" cy="12" rx="19" ry="14" fill="#2c3e50" />
      <path d="M7 12 Q10 0 26 0 Q42 0 45 12 Q42 6 26 8 Q10 6 7 12z" fill="#34495e" />
      {/* Head */}
      <ellipse cx="26" cy="20" rx="14" ry="13" fill="#d5a068" />
      {/* Shadow mask */}
      <rect x="13" y="16" width="26" height="9" rx="2" fill="#2c3e50" />
      {/* Eyes */}
      <ellipse cx="20" cy="19" rx="3.5" ry="3" fill="#f39c12" />
      <ellipse cx="32" cy="19" rx="3.5" ry="3" fill="#f39c12" />
      <circle cx="20" cy="19" r="1.8" fill="#e67e22" />
      <circle cx="32" cy="19" r="1.8" fill="#e67e22" />
      <circle cx="21" cy="18" r="0.8" fill="#f1c40f" />
      <circle cx="33" cy="18" r="0.8" fill="#f1c40f" />
      {/* Lower face */}
      <ellipse cx="26" cy="28" rx="11" ry="7" fill="#d5a068" />
      <path d="M21 30 Q26 35 31 30" stroke="#a07040" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Neck */}
      <rect x="20" y="32" width="12" height="5" rx="2" fill="#c49258" />
      {/* Cloak */}
      <path d="M6 37 Q10 58 8 75 L26 78 L44 75 Q42 58 46 37 Q38 32 26 34 Q14 32 6 37z" fill="#2c3e50" />
      <path d="M8 38 Q12 56 10 73 L26 76 L18 50 Q12 42 8 38z" fill="#34495e" opacity="0.5" />
      {/* Dagger arm */}
      <rect x="2" y="36" width="8" height="22" rx="4" fill="#34495e" />
      <rect x="1" y="20" width="5" height="20" rx="2" fill="#bdc3c7" />
      <rect x="2" y="21" width="2" height="18" rx="1" fill="#ecf0f1" />
      <rect x="-1" y="36" width="10" height="4" rx="2" fill="#95a5a6" />
      <polygon points="1,20 6,20 3.5,14" fill="#bdc3c7" />
      {/* Sword arm */}
      <rect x="42" y="36" width="8" height="22" rx="4" fill="#34495e" />
      <rect x="44" y="8" width="5" height="30" rx="2" fill="#bdc3c7" />
      <rect x="45" y="9" width="2.5" height="28" rx="1" fill="#ecf0f1" />
      <rect x="41" y="34" width="12" height="4" rx="2" fill="#95a5a6" />
      <polygon points="44,8 49,8 46.5,2" fill="#bdc3c7" />
      {/* Boots */}
      <rect x="10" y="70" width="14" height="9" rx="4" fill="#1a252f" />
      <rect x="28" y="70" width="14" height="9" rx="4" fill="#1a252f" />
    </svg>
  )
}

// ─── Giant Spider ─────────────────────────────────────────────────────────────

function SpiderSvg() {
  return (
    <svg viewBox="0 0 80 72" width="96" height="112" aria-label="Giant Spider" style={{ transform: 'scaleX(-1)' }}>
      {/* Web strand */}
      <line x1="40" y1="2" x2="40" y2="20" stroke="#bdc3c7" strokeWidth="1" opacity="0.5" />
      {/* Legs — back pair */}
      <path d="M30 38 Q16 30 4 16" stroke="#2c3e50" strokeWidth="4" fill="none" strokeLinecap="round"/>
      <path d="M50 38 Q64 30 76 16" stroke="#2c3e50" strokeWidth="4" fill="none" strokeLinecap="round"/>
      {/* Legs — middle-back */}
      <path d="M28 42 Q12 40 2 52" stroke="#2c3e50" strokeWidth="4" fill="none" strokeLinecap="round"/>
      <path d="M52 42 Q68 40 78 52" stroke="#2c3e50" strokeWidth="4" fill="none" strokeLinecap="round"/>
      {/* Legs — middle-front */}
      <path d="M28 46 Q12 50 4 64" stroke="#2c3e50" strokeWidth="4" fill="none" strokeLinecap="round"/>
      <path d="M52 46 Q68 50 76 64" stroke="#2c3e50" strokeWidth="4" fill="none" strokeLinecap="round"/>
      {/* Legs — front pair */}
      <path d="M32 50 Q20 58 16 70" stroke="#2c3e50" strokeWidth="4" fill="none" strokeLinecap="round"/>
      <path d="M48 50 Q60 58 64 70" stroke="#2c3e50" strokeWidth="4" fill="none" strokeLinecap="round"/>
      {/* Abdomen */}
      <ellipse cx="40" cy="54" rx="18" ry="16" fill="#2c3e50" />
      <ellipse cx="40" cy="50" rx="12" ry="10" fill="#34495e" opacity="0.6" />
      <ellipse cx="40" cy="54" rx="8" ry="10" fill="#e74c3c" opacity="0.3" />
      {/* Thorax */}
      <ellipse cx="40" cy="36" rx="14" ry="11" fill="#34495e" />
      {/* Head */}
      <ellipse cx="40" cy="24" rx="12" ry="10" fill="#2c3e50" />
      {/* Chelicerae */}
      <rect x="34" y="30" width="5" height="8" rx="2.5" fill="#1a252f" />
      <rect x="41" y="30" width="5" height="8" rx="2.5" fill="#1a252f" />
      <circle cx="35" cy="38" r="2.5" fill="#2c3e50" />
      <circle cx="45" cy="38" r="2.5" fill="#2c3e50" />
      {/* 6 eyes */}
      <circle cx="32" cy="20" r="4" fill="#e74c3c" />
      <circle cx="40" cy="18" r="4.5" fill="#e74c3c" />
      <circle cx="48" cy="20" r="4" fill="#e74c3c" />
      <circle cx="33" cy="28" r="2.5" fill="#c0392b" />
      <circle cx="47" cy="28" r="2.5" fill="#c0392b" />
      <circle cx="32" cy="20" r="1.8" fill="#ff6b6b" />
      <circle cx="40" cy="18" r="2" fill="#ff6b6b" />
      <circle cx="48" cy="20" r="1.8" fill="#ff6b6b" />
    </svg>
  )
}

// ─── Generic emoji fallback ───────────────────────────────────────────────────

function EnemyEmoji({ emoji }: { emoji: string }) {
  return (
    <div style={{ width: 80, height: 112 }} className="flex items-end justify-center pb-1">
      <span
        style={{ fontSize: 72, lineHeight: 1, display: 'block', transform: 'scaleX(-1)', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.6))' }}
        role="img"
      >
        {emoji}
      </span>
    </div>
  )
}

// ─── Sprite registry ──────────────────────────────────────────────────────────

type SvgComponent = () => React.JSX.Element

const MONSTER_SVGS: Record<string, SvgComponent> = {
  goblin:       GoblinSvg,
  wolf:         WolfSvg,
  slime:        SlimeSvg,
  bandit:       BanditSvg,
  giant_spider: SpiderSvg,
}

export default function UnitSprite({ side, isHit, hitDuration, monsterType }: Props) {
  function renderSprite() {
    if (side === 'player') return <HeroSvg />

    const template = monsterType ? FOREST_MONSTER_MAP.get(monsterType) : null
    if (!template) return <GoblinSvg />

    const SvgComponent = MONSTER_SVGS[template.id]
    if (SvgComponent) return <SvgComponent />
    return <EnemyEmoji emoji={template.emoji} />
  }

  return (
    <div
      className={cn('relative', isHit && 'anim-shake')}
      style={isHit ? { animationDuration: hitDuration } : undefined}
    >
      <div
        className={cn(isHit && 'anim-flash')}
        style={isHit ? { animationDuration: hitDuration } : undefined}
      >
        {renderSprite()}
      </div>
    </div>
  )
}
