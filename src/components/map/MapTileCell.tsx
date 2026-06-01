import type { PlacedTile } from '../../types/map'
import { buildMonster } from '../../formulas/monsters'
import { FOREST_MONSTER_MAP, FOREST_MONSTERS } from '../../data/monsters'
import { MonsterIcon, TreasureIcon, MarketIcon, PlayerMarker } from '../icons/MapIcons'
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

// ── Path colours by tile state ──────────────────────────────────────────────
const PIPE_FRESH    = '#3a3228'   // stone/dirt path — unexplored
const PIPE_EXPLORED = '#2a2420'   // darker stone — explored
const PIPE_MARKET   = '#2a2a3a'   // indigo-tinted stone — market

// ── Tile background colours ──────────────────────────────────────────────────
// Using inline style instead of Tailwind arbitrary values for precise hex control
function tileBg(content: PlacedTile['content'], explored: boolean): string {
  if (content.type === 'market')   return explored ? '#0c0c18' : '#0d0d1a'
  if (content.type === 'monster')  return explored ? '#160b0b' : '#1a0d0d'
  if (content.type === 'treasure') return explored ? '#100f08' : '#14130a'
  return explored ? '#0b160b' : '#0d1a0d'
}

// ── Junction node colour ─────────────────────────────────────────────────────
function nodeColor(content: PlacedTile['content']): string {
  if (content.type === 'market')   return '#353545'
  if (content.type === 'monster')  return '#4a3535'
  if (content.type === 'treasure') return '#5a5035'
  return '#4a4035'
}

// ── Level badge colour ───────────────────────────────────────────────────────
function levelColor(tileLv: number, heroLv: number): string {
  const diff = tileLv - heroLv
  if (diff <= -3) return '#4aaa4a'   // easy — green
  if (diff <=  2) return '#c9a227'   // even — gold
  if (diff <=  5) return '#cc7733'   // hard — orange
  return '#cc3333'                   // very hard — red
}

function levelBadgeBg(content: PlacedTile['content']): string {
  if (content.type === 'market')   return '#0a0a1a'
  if (content.type === 'monster')  return '#1a0808'
  if (content.type === 'treasure') return '#1a1808'
  return '#0a1a0a'
}

function buildTitle(tile: PlacedTile): string {
  const base = `Tile Nível ${tile.level}`
  if (tile.content.type === 'monster') {
    const lvl      = tile.content.monsterLevel ?? tile.level
    const template = FOREST_MONSTER_MAP.get(tile.content.monsterType ?? '') ?? FOREST_MONSTERS[0]
    const g        = buildMonster(template, lvl, 'normal')
    return `${base} — ${template.name} Nv.${lvl}\nHP ${g.hp}  ATK ${g.atk}  DEF ${g.def}`
  }
  if (tile.content.type === 'treasure') return `${base} — Tesouro: ${tile.content.xpAmount} XP`
  if (tile.content.type === 'market')   return `${base} — Mercado`
  return base
}

export default function MapTileCell({
  tile, isPlayer, isDestination, isSelected, visibility, heroLevel, onClick,
}: Props) {
  const explored = tile.explored && !isPlayer
  const pipe     = tile.content.type === 'market'
    ? PIPE_MARKET
    : (explored ? PIPE_EXPLORED : PIPE_FRESH)
  const node     = nodeColor(tile.content)
  const bg       = tileBg(tile.content, explored)

  const showContentIcon =
    visibility === 'clear' &&
    tile.content.type !== 'empty' &&
    (!tile.explored || tile.content.type === 'market')

  // Icon opacity: explored market is dimmed
  const iconOpacity = tile.explored ? 0.45 : 1

  return (
    <div
      onClick={onClick}
      title={visibility !== 'fog' ? buildTitle(tile) : undefined}
      style={{ backgroundColor: bg }}
      className={cn(
        'relative w-full h-full rounded',
        !isPlayer && 'cursor-pointer hover:brightness-125 transition-[filter] duration-100',
      )}
    >
      {/* Paths + junction node */}
      <svg viewBox="0 0 52 52" className="absolute inset-0 w-full h-full">
        {tile.connections.includes('N') && (
          <rect x="21" y="0"  width="10" height="26" rx="2" fill={pipe} />
        )}
        {tile.connections.includes('S') && (
          <rect x="21" y="26" width="10" height="26" rx="2" fill={pipe} />
        )}
        {tile.connections.includes('E') && (
          <rect x="26" y="21" width="26" height="10" rx="2" fill={pipe} />
        )}
        {tile.connections.includes('W') && (
          <rect x="0"  y="21" width="26" height="10" rx="2" fill={pipe} />
        )}
        <circle cx="26" cy="26" r="6" fill={node} />
      </svg>

      {/* Content icon — top-right badge */}
      {showContentIcon && (
        <div
          className="absolute top-0.5 right-0.5 z-10 rounded overflow-hidden"
          style={{ opacity: iconOpacity, width: 18, height: 18 }}
        >
          {tile.content.type === 'monster'  && <MonsterIcon  size={18} />}
          {tile.content.type === 'treasure' && <TreasureIcon size={18} />}
          {tile.content.type === 'market'   && <MarketIcon   size={18} />}
        </div>
      )}

      {/* Level badge — bottom-left */}
      {visibility === 'clear' && (
        <div
          className="absolute bottom-0.5 left-0.5 z-10 rounded px-1"
          style={{
            backgroundColor: levelBadgeBg(tile.content),
            opacity: explored ? 0.55 : 1,
            lineHeight: 1,
            paddingTop: 2,
            paddingBottom: 2,
          }}
        >
          <span
            className="text-[10px] font-black tracking-tight tabular-nums"
            style={{
              color: tile.content.type === 'market'
                ? '#5a5aaa'
                : levelColor(tile.level, heroLevel),
              fontFamily: 'monospace',
            }}
          >
            {tile.level}
          </span>
        </div>
      )}

      {/* Player marker */}
      {isPlayer && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <PlayerMarker size={36} />
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

      {/* Penumbra overlay */}
      {visibility === 'penumbra' && (
        <div className="absolute inset-0 bg-slate-950/78 rounded pointer-events-none z-10" />
      )}

      {/* Full fog overlay */}
      {visibility === 'fog' && (
        <div className="absolute inset-0 bg-slate-950/95 rounded pointer-events-none z-10" />
      )}
    </div>
  )
}
