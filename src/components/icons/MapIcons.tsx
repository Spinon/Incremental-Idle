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
