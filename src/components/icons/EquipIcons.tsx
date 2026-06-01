interface IconProps {
  size?: number
  className?: string
}

export function HeadIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M4 14C4 9.6 7.6 6 12 6s8 3.6 8 8v2H4v-2z" fill="#5aaa5a" />
      <rect x="3"  y="16" width="18" height="3" rx="1.5" fill="#3a7a3a" />
      <rect x="7"  y="19" width="10" height="2" rx="1"   fill="#2a5a2a" />
    </svg>
  )
}

export function ShoulderIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <ellipse cx="8"  cy="10" rx="5" ry="6" fill="#5aaa5a" />
      <ellipse cx="16" cy="10" rx="5" ry="6" fill="#5aaa5a" />
      <rect x="9" y="15" width="6" height="3" rx="1" fill="#3a7a3a" />
      <ellipse cx="8"  cy="9" rx="3" ry="4" fill="#4a9a4a" />
      <ellipse cx="16" cy="9" rx="3" ry="4" fill="#4a9a4a" />
    </svg>
  )
}

export function ChestIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M5 7h14l1 12H4L5 7z" fill="#5aaa5a" />
      <path d="M9 7l3 4 3-4" fill="none" stroke="#3a7a3a" strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="10" y="12" width="4" height="5" rx="1" fill="#3a7a3a" />
      <line x1="5" y1="10" x2="19" y2="10" stroke="#3a7a3a" strokeWidth="1" />
    </svg>
  )
}

export function GlovesIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M7 10V7a1 1 0 012 0v3"  stroke="#5aaa5a" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10 9V6a1 1 0 012 0v3"  stroke="#5aaa5a" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M13 9V6a1 1 0 012 0v3"  stroke="#5aaa5a" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M16 10V8a1 1 0 012 0v4l-1 6H7l-1-6V9" fill="#5aaa5a" stroke="#3a7a3a" strokeWidth="1" />
      <rect x="6" y="14" width="12" height="2" rx="1" fill="#3a7a3a" />
    </svg>
  )
}

export function LegsIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M7 5h10l-1 8H8L7 5z" fill="#5aaa5a" />
      <rect x="7"  y="13" width="4" height="7" rx="1" fill="#4a9a4a" />
      <rect x="13" y="13" width="4" height="7" rx="1" fill="#4a9a4a" />
      <line x1="12" y1="5" x2="12" y2="13" stroke="#3a7a3a" strokeWidth="1.5" />
    </svg>
  )
}

export function FeetIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M6 8h5v8l3 3H6V8z"    fill="#5aaa5a" />
      <path d="M13 10h5l-1 9h-4v-9z" fill="#4a9a4a" />
      <rect x="5"  y="7"  width="7" height="2" rx="1" fill="#3a7a3a" />
      <rect x="12" y="9"  width="6" height="2" rx="1" fill="#3a7a3a" />
    </svg>
  )
}

export function AccIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <circle cx="12" cy="14" r="6"  stroke="#5aaa5a" strokeWidth="2" />
      <circle cx="12" cy="14" r="3"  stroke="#3a7a3a" strokeWidth="1" />
      <polygon points="12,5 14,9 18,9 15,12 16,16 12,13 8,16 9,12 6,9 10,9" fill="#5aaa5a" opacity="0.7" />
      <polygon points="12,7 13.5,10 17,10 14.3,12 15.3,15.5 12,13.5 8.7,15.5 9.7,12 7,10 10.5,10" fill="#7acc7a" />
    </svg>
  )
}

export function SwordIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      {/* blade */}
      <line x1="6" y1="20" x2="21" y2="5" stroke="#9090dd" strokeWidth="2.2" strokeLinecap="round" />
      {/* edge highlight */}
      <line x1="7.5" y1="18.5" x2="21" y2="5" stroke="#ccccff" strokeWidth="0.8" strokeLinecap="round" opacity="0.5" />
      {/* crossguard */}
      <line x1="10" y1="7"  x2="17" y2="14" stroke="#5555aa" strokeWidth="2.5" strokeLinecap="round" />
      {/* grip */}
      <line x1="6"  y1="20" x2="9.5" y2="16.5" stroke="#3a3a8a" strokeWidth="2.5" strokeLinecap="round" />
      {/* pommel */}
      <circle cx="5" cy="21" r="2.5" fill="#5555aa" />
    </svg>
  )
}

export function DaggerIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <line x1="8"  y1="18" x2="19" y2="7"  stroke="#7acc7a" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="9"  y1="17" x2="19" y2="7"  stroke="#aaffaa" strokeWidth="0.7" strokeLinecap="round" opacity="0.5" />
      <line x1="7"  y1="11" x2="13" y2="17" stroke="#4a9a4a" strokeWidth="2"   strokeLinecap="round" />
      <line x1="8"  y1="18" x2="10.5" y2="15.5" stroke="#2a7a2a" strokeWidth="2" strokeLinecap="round" />
      <circle cx="7" cy="19" r="2" fill="#4a9a4a" />
    </svg>
  )
}

export function AxeIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <line x1="7"  y1="17" x2="17" y2="7"  stroke="#5aaa5a" strokeWidth="2" strokeLinecap="round" />
      <path d="M13 5l4 1-1 4-5-5z"          fill="#5aaa5a" />
      <path d="M15 7l-4 4"                   stroke="#3a7a3a" strokeWidth="1" strokeLinecap="round" />
      <path d="M6 16l1-3 3 3-4 0z"           fill="#4a9a4a" />
    </svg>
  )
}

export function StaffIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <line x1="12" y1="20" x2="12" y2="8"  stroke="#8a4acc" strokeWidth="2" strokeLinecap="round" />
      <polygon points="12,4 14,7 17,7 15,9 16,12 12,10 8,12 9,9 7,7 10,7"                         fill="#aa5aee" />
      <polygon points="12,5.5 13.5,8 16,8 14,9.5 14.8,12 12,10.5 9.2,12 10,9.5 8,8 10.5,8"       fill="#cc88ff" />
    </svg>
  )
}

export function BowIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M7 4 Q14 12 7 20"                       stroke="#5aaa5a" strokeWidth="2" fill="none" strokeLinecap="round" />
      <line x1="7"  y1="4"  x2="7"  y2="20"           stroke="#3a7a3a" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="8"  y1="12" x2="19" y2="12"           stroke="#8aaa8a" strokeWidth="1.5" strokeLinecap="round" />
      <polygon points="19,12 16,10.5 16,13.5"          fill="#5aaa5a" />
    </svg>
  )
}

export function ShieldIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M12 3L4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3z"  fill="#5aaa5a" />
      <path d="M12 5L6 7.5V12c0 3.5 6 7 6 7s6-3.5 6-7V7.5L12 5z" fill="#4a9a4a" />
      <line x1="12" y1="7"  x2="12" y2="17" stroke="#3a7a3a" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="7"  y1="12" x2="17" y2="12" stroke="#3a7a3a" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
