import { cn } from '../lib/utils'

interface Props {
  side: 'player' | 'enemy'
  isHit: boolean
  hitDuration: string
}

function KnightSvg() {
  return (
    <svg viewBox="0 0 48 76" width="72" height="112" aria-label="Knight">
      {/* Helmet plume */}
      <rect x="20" y="0" width="8" height="8" rx="2" fill="#e74c3c" />
      {/* Helmet */}
      <rect x="14" y="6" width="20" height="18" rx="4" fill="#7f8c9a" />
      {/* Visor slit */}
      <rect x="14" y="15" width="20" height="4" rx="1" fill="#2c3e50" />
      {/* Chin guard */}
      <rect x="16" y="22" width="16" height="5" rx="2" fill="#6a7a88" />
      {/* Neck */}
      <rect x="19" y="27" width="10" height="4" fill="#5a6a78" />
      {/* Breastplate */}
      <rect x="10" y="31" width="28" height="22" rx="3" fill="#3d6fa0" />
      {/* Chest detail */}
      <rect x="15" y="35" width="18" height="6" rx="2" fill="#4a85c0" />
      <rect x="22" y="33" width="4" height="18" rx="1" fill="#4a85c0" />
      {/* Shield — left arm */}
      <rect x="2" y="30" width="9" height="16" rx="4" fill="#c0392b" />
      <rect x="4" y="33" width="5" height="10" rx="2" fill="#a93226" />
      <rect x="6" y="38" width="1" height="4" fill="#e74c3c" />
      {/* Sword arm — right */}
      <rect x="37" y="28" width="7" height="18" rx="3" fill="#3d6fa0" />
      {/* Sword crossguard */}
      <rect x="33" y="25" width="15" height="4" rx="2" fill="#95a5a6" />
      {/* Sword blade */}
      <rect x="40" y="5" width="5" height="24" rx="2" fill="#dce3e8" />
      <rect x="41" y="5" width="2" height="22" rx="1" fill="#ecf0f1" />
      {/* Tassets / hip armor */}
      <rect x="11" y="53" width="11" height="6" rx="2" fill="#2e5a8a" />
      <rect x="26" y="53" width="11" height="6" rx="2" fill="#2e5a8a" />
      {/* Legs */}
      <rect x="12" y="57" width="10" height="14" rx="2" fill="#2e5a8a" />
      <rect x="26" y="57" width="10" height="14" rx="2" fill="#2e5a8a" />
      {/* Boots */}
      <rect x="10" y="68" width="14" height="7" rx="3" fill="#1a3a5c" />
      <rect x="24" y="68" width="14" height="7" rx="3" fill="#1a3a5c" />
    </svg>
  )
}

function GoblinSvg() {
  return (
    <svg viewBox="0 0 48 76" width="72" height="112" aria-label="Goblin" style={{ transform: 'scaleX(-1)' }}>
      {/* Left ear */}
      <ellipse cx="8" cy="12" rx="6" ry="10" fill="#3a7a2a" />
      {/* Right ear */}
      <ellipse cx="40" cy="12" rx="6" ry="10" fill="#3a7a2a" />
      {/* Head */}
      <ellipse cx="24" cy="16" rx="16" ry="14" fill="#4a9a36" />
      {/* Brow ridge */}
      <ellipse cx="24" cy="9" rx="13" ry="5" fill="#3a7a2a" />
      {/* Left eye */}
      <ellipse cx="16" cy="14" rx="5" ry="4" fill="#c0392b" />
      <circle cx="16" cy="14" r="2.5" fill="#8b0000" />
      <circle cx="17" cy="13" r="1" fill="#ff6b6b" />
      {/* Right eye */}
      <ellipse cx="32" cy="14" rx="5" ry="4" fill="#c0392b" />
      <circle cx="32" cy="14" r="2.5" fill="#8b0000" />
      <circle cx="33" cy="13" r="1" fill="#ff6b6b" />
      {/* Nose */}
      <ellipse cx="24" cy="21" rx="4" ry="3" fill="#3a7a2a" />
      <circle cx="22" cy="21" r="1.5" fill="#2a5a1a" />
      <circle cx="26" cy="21" r="1.5" fill="#2a5a1a" />
      {/* Mouth / tusks */}
      <path d="M16 26 Q24 30 32 26" stroke="#2a5a1a" strokeWidth="2" fill="none" />
      <rect x="17" y="26" width="4" height="6" rx="2" fill="#f0e68c" />
      <rect x="27" y="26" width="4" height="6" rx="2" fill="#f0e68c" />
      {/* Neck */}
      <rect x="19" y="30" width="10" height="5" fill="#3a7a2a" />
      {/* Body — leather vest */}
      <rect x="8" y="35" width="32" height="22" rx="4" fill="#5a4a2a" />
      <rect x="14" y="39" width="20" height="12" rx="3" fill="#6a5a3a" />
      {/* Club arm — right (appears left when mirrored) */}
      <rect x="36" y="25" width="8" height="26" rx="4" fill="#6b4c10" />
      {/* Club head */}
      <ellipse cx="40" cy="22" rx="11" ry="7" fill="#5d3e0a" />
      <circle cx="33" cy="19" r="3" fill="#4a3008" />
      <circle cx="40" cy="15" r="3" fill="#4a3008" />
      <circle cx="47" cy="19" r="3" fill="#4a3008" />
      {/* Off arm — left (appears right when mirrored) */}
      <rect x="4" y="35" width="8" height="16" rx="4" fill="#4a9a36" />
      {/* Legs */}
      <rect x="10" y="57" width="12" height="15" rx="3" fill="#4a9a36" />
      <rect x="26" y="57" width="12" height="15" rx="3" fill="#4a9a36" />
      {/* Feet */}
      <ellipse cx="16" cy="72" rx="9" ry="4" fill="#3a7a2a" />
      <ellipse cx="32" cy="72" rx="9" ry="4" fill="#3a7a2a" />
    </svg>
  )
}

export default function UnitSprite({ side, isHit, hitDuration }: Props) {
  return (
    <div
      className={cn('relative', isHit && 'anim-shake')}
      style={isHit ? { animationDuration: hitDuration } : undefined}
    >
      <div
        className={cn(isHit && 'anim-flash')}
        style={isHit ? { animationDuration: hitDuration } : undefined}
      >
        {side === 'player' ? <KnightSvg /> : <GoblinSvg />}
      </div>
    </div>
  )
}
