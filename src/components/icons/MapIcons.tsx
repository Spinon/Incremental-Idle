interface IconProps {
  size?: number
  className?: string
}

export function MonsterIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <circle cx="12" cy="10" r="5" fill="#aa3333" />
      <circle cx="10" cy="9"  r="1.5" fill="#cc5555" />
      <circle cx="14" cy="9"  r="1.5" fill="#cc5555" />
      <circle cx="10" cy="9"  r="0.7" fill="#ff9999" />
      <circle cx="14" cy="9"  r="0.7" fill="#ff9999" />
      <path d="M9 12 Q12 15 15 12" stroke="#cc3333" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M8 6 L6 3M16 6 L18 3" stroke="#aa3333" strokeWidth="2" strokeLinecap="round" />
      <path d="M7 15 L5 20M17 15 L19 20" stroke="#883333" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function TreasureIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <rect x="4"  y="11" width="16" height="10" rx="2" fill="#c9a227" />
      <rect x="4"  y="11" width="16" height="3"  rx="1" fill="#a07a10" />
      <rect x="3"  y="9"  width="18" height="4"  rx="2" fill="#e8c547" />
      <path d="M9 9 Q12 5 15 9" fill="#c9a227" stroke="#a07a10" strokeWidth="1" />
      <line x1="12" y1="14" x2="12" y2="20" stroke="#a07a10" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="8"  y1="17" x2="16" y2="17" stroke="#a07a10" strokeWidth="1"   strokeLinecap="round" />
    </svg>
  )
}

export function MarketIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <rect x="4"  y="8"  width="16" height="13" rx="2" fill="#4a4a9a" />
      <rect x="4"  y="8"  width="16" height="4"  rx="2" fill="#3a3a8a" />
      <path d="M8 8V6a4 4 0 018 0v2" stroke="#7a7acc" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <line x1="4"  y1="14" x2="20" y2="14" stroke="#3a3a7a" strokeWidth="1" />
      <circle cx="12" cy="16.5" r="2" fill="#7a7acc" />
    </svg>
  )
}

export function TileMarketIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <rect x="4" y="5" width="16" height="14" rx="2" fill="#0e7490" />
      <rect x="4" y="5" width="16" height="4" rx="2" fill="#155e75" />
      <path d="M7 12h10M12 8v10" stroke="#67e8f9" strokeWidth="1.4" strokeLinecap="round" />
      <rect x="7" y="9" width="4" height="4" rx="0.8" fill="#164e63" stroke="#67e8f9" strokeWidth="0.8" />
      <rect x="13" y="9" width="4" height="4" rx="0.8" fill="#164e63" stroke="#67e8f9" strokeWidth="0.8" />
      <rect x="7" y="15" width="4" height="3" rx="0.8" fill="#164e63" stroke="#67e8f9" strokeWidth="0.8" />
      <rect x="13" y="15" width="4" height="3" rx="0.8" fill="#164e63" stroke="#67e8f9" strokeWidth="0.8" />
      <path d="M8 5V3.5M16 5V3.5" stroke="#a5f3fc" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="19" cy="17" r="3" fill="#facc15" stroke="#854d0e" strokeWidth="0.8" />
      <path d="M18.2 17h1.6M19 16.2v1.6" stroke="#854d0e" strokeWidth="0.8" strokeLinecap="round" />
    </svg>
  )
}

/** Marcador do jogador — losango dourado com dois anéis */
export function PlayerMarker({ size = 24 }: { size?: number }) {
  const half = size / 2
  const ring1 = half * 0.9
  const ring2 = half * 0.68
  const outer = half * 0.52
  const inner = half * 0.34
  const shine = half * 0.12

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} xmlns="http://www.w3.org/2000/svg" aria-label="Jogador">
      {/* anéis */}
      <circle cx={half} cy={half} r={ring1} fill="none" stroke="#c9a227" strokeWidth="1.5" opacity="0.3" />
      <circle cx={half} cy={half} r={ring2} fill="none" stroke="#c9a227" strokeWidth="1.5" opacity="0.6" />
      {/* losango */}
      <polygon
        points={`${half},${half - outer} ${half + outer},${half} ${half},${half + outer} ${half - outer},${half}`}
        fill="#c9a227"
      />
      <polygon
        points={`${half},${half - inner} ${half + inner},${half} ${half},${half + inner} ${half - inner},${half}`}
        fill="#f0d060"
      />
      {/* brilho */}
      <circle cx={half - shine} cy={half - shine} r={shine} fill="#fff8d0" opacity="0.8" />
    </svg>
  )
}

export function QuestIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      {/* Scroll body */}
      <rect x="5" y="4" width="14" height="16" rx="2" fill="#c8a86b" />
      <rect x="5" y="4" width="14" height="16" rx="2" stroke="#8a6a30" strokeWidth="1" />
      {/* Rolled ends */}
      <rect x="3" y="5" width="4" height="14" rx="2" fill="#b8904a" stroke="#8a6a30" strokeWidth="0.8" />
      <rect x="17" y="5" width="4" height="14" rx="2" fill="#b8904a" stroke="#8a6a30" strokeWidth="0.8" />
      {/* Lines of text */}
      <line x1="8" y1="9"  x2="16" y2="9"  stroke="#8a6a30" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="8" y1="12" x2="16" y2="12" stroke="#8a6a30" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="8" y1="15" x2="13" y2="15" stroke="#8a6a30" strokeWidth="1.2" strokeLinecap="round" />
      {/* Exclamation mark badge */}
      <circle cx="17" cy="7" r="4" fill="#e8a020" />
      <rect x="16.2" y="4.5" width="1.6" height="4" rx="0.6" fill="white" />
      <circle cx="17" cy="9.8" r="0.9" fill="white" />
    </svg>
  )
}

export function BlueTowerIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M7 21V8l2-3h6l2 3v13H7Z" fill="#1d4ed8" stroke="#60a5fa" strokeWidth="1" />
      <path d="M9 8h6M10 5V3h4v2" stroke="#93c5fd" strokeWidth="1.2" strokeLinecap="round" />
      <rect x="10" y="10" width="1.8" height="3" rx="0.5" fill="#bfdbfe" />
      <rect x="12.2" y="10" width="1.8" height="3" rx="0.5" fill="#bfdbfe" />
      <rect x="10" y="15" width="1.8" height="3" rx="0.5" fill="#60a5fa" />
      <rect x="12.2" y="15" width="1.8" height="3" rx="0.5" fill="#60a5fa" />
      <path d="M5 21h14" stroke="#93c5fd" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
