import type { PlacedTile } from '../../types/map'
import { goblinStats } from '../../store/battleStore'
import { cn } from '../../lib/utils'

export type Visibility = 'clear' | 'penumbra' | 'fog'

interface Props {
  tile: PlacedTile
  isPlayer: boolean
  isDestination: boolean
  isSelected: boolean
  visibility: Visibility
  heroLevel: number
  onClick(): void
}

const PIPE_FRESH    = '#4ade80'
const PIPE_EXPLORED = '#166534'
const PIPE_MARKET   = '#818cf8'

const BG_FRESH    = 'bg-green-950/60'
const BG_EXPLORED = 'bg-green-950/90'
const BG_MARKET   = 'bg-indigo-950/70'

function buildTitle(tile: PlacedTile): string {
  const base = `Tile Nível ${tile.level}`
  if (tile.content.type === 'monster') {
    const lvl = tile.content.monsterLevel ?? tile.level
    const g   = goblinStats(lvl)
    return `${base} — Goblin Nv.${lvl}\nHP ${g.hp}  ATK ${g.atk}  DEF ${g.def}`
  }
  if (tile.content.type === 'treasure') return `${base} — Tesouro: ${tile.content.xpAmount} XP`
  if (tile.content.type === 'market')   return `${base} — Mercado`
  return base
}

function levelColor(tileLv: number, heroLv: number): string {
  const diff = tileLv - heroLv
  if (diff <= -3) return 'text-green-400'
  if (diff <= 2)  return 'text-yellow-300'
  if (diff <= 5)  return 'text-orange-400'
  return 'text-red-400'
}

export default function MapTileCell({ tile, isPlayer, isDestination, isSelected, visibility, heroLevel, onClick }: Props) {
  const isMarket = tile.content.type === 'market'
  const explored = tile.explored && !isPlayer
  const pipe     = isMarket ? PIPE_MARKET : (explored ? PIPE_EXPLORED : PIPE_FRESH)
  const bg       = isMarket ? BG_MARKET   : (explored ? BG_EXPLORED   : BG_FRESH)

  const contentIcon =
    tile.content.type === 'treasure' ? '✦' :
    tile.content.type === 'market'   ? '⚑' :
    tile.content.type === 'monster'  ? '⚔' : null

  const iconColor =
    tile.content.type === 'treasure' ? 'text-yellow-400' :
    tile.content.type === 'market'   ? 'text-indigo-300' : 'text-red-400'

  return (
    <div
      onClick={onClick}
      title={visibility !== 'fog' ? buildTitle(tile) : undefined}
      className={cn(
        'relative w-full h-full rounded',
        bg,
        !isPlayer && 'cursor-pointer hover:brightness-125 transition-[filter] duration-100',
        !explored && !isMarket && visibility === 'clear' && 'ring-1 ring-inset ring-green-400/25',
      )}
    >
      {/* Pipe paths */}
      <svg viewBox="0 0 52 52" className="absolute inset-0 w-full h-full">
        {tile.connections.includes('N') && (
          <line x1="26" y1="26" x2="26" y2="2" stroke={pipe} strokeWidth="7" strokeLinecap="round" />
        )}
        {tile.connections.includes('S') && (
          <line x1="26" y1="26" x2="26" y2="50" stroke={pipe} strokeWidth="7" strokeLinecap="round" />
        )}
        {tile.connections.includes('E') && (
          <line x1="26" y1="26" x2="50" y2="26" stroke={pipe} strokeWidth="7" strokeLinecap="round" />
        )}
        {tile.connections.includes('W') && (
          <line x1="26" y1="26" x2="2"  y2="26" stroke={pipe} strokeWidth="7" strokeLinecap="round" />
        )}
        <circle cx="26" cy="26" r="5" fill={pipe} />
      </svg>

      {/* Content icon */}
      {visibility === 'clear' && !tile.explored && contentIcon && (
        <span className={cn('absolute top-0.5 right-0.5 text-[10px] leading-none font-bold z-10', iconColor)}>
          {contentIcon}
        </span>
      )}

      {/* Market always shows icon even when explored */}
      {visibility === 'clear' && isMarket && tile.explored && (
        <span className="absolute top-0.5 right-0.5 text-[10px] leading-none font-bold z-10 text-indigo-300/60">
          ⚑
        </span>
      )}

      {/* Level badge */}
      {visibility === 'clear' && (
        <div className={cn(
          'absolute bottom-0.5 left-0.5 px-1 py-0.5 rounded z-10',
          'bg-black/55 leading-none',
          explored && 'opacity-50',
        )}>
          <span className={cn(
            'text-[10px] font-black tracking-tight',
            isMarket ? 'text-indigo-300' : levelColor(tile.level, heroLevel),
          )}>
            {tile.level}
          </span>
        </div>
      )}

      {/* Selected ring */}
      {isSelected && (
        <div className="absolute inset-0 rounded ring-2 ring-inset ring-sky-400/90 pointer-events-none z-20" />
      )}

      {/* Destination ring */}
      {isDestination && !isSelected && (
        <div className="absolute inset-0 rounded ring-2 ring-inset ring-indigo-400/80 pointer-events-none z-20" />
      )}

      {/* Penumbra fog */}
      {visibility === 'penumbra' && (
        <div className="absolute inset-0 bg-slate-950/78 rounded pointer-events-none z-10" />
      )}

      {/* Full fog */}
      {visibility === 'fog' && (
        <div className="absolute inset-0 bg-slate-950/95 rounded pointer-events-none z-10" />
      )}

      {/* Player dot */}
      {isPlayer && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <div className="w-4 h-4 rounded-full bg-indigo-500 border-2 border-white/80 shadow-md shadow-indigo-500/60" />
        </div>
      )}
    </div>
  )
}
