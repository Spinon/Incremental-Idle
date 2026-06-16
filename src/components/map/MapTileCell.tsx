import type { PlacedTile } from '../../types/map'
import { estimateMonster } from '../../formulas/monsters'
import { FOREST_MONSTER_MAP, FOREST_MONSTERS } from '../../data/monsters'
import { MonsterIcon, TreasureIcon, MarketIcon, TileMarketIcon, QuestIcon, BlueTowerIcon, PlayerMarker } from '../icons/MapIcons'
import { cn } from '../../lib/utils'

export type Visibility = 'clear' | 'penumbra' | 'fog'

interface Props {
  tile: PlacedTile
  isPlayer: boolean
  isDestination: boolean
  isSelected: boolean
  visibility: Visibility
  heroLevel: number
  tileSize: number
  onClick(): void
}

// ── Path colours by tile state ──────────────────────────────────────────────
const PIPE_FRESH    = '#3a3228'   // stone/dirt path — unexplored
const PIPE_EXPLORED = '#2a2420'   // darker stone — explored
const PIPE_MARKET   = '#2a2a3a'   // indigo-tinted stone — market
const PIPE_TILE_MARKET = '#1f3a4a'
const PIPE_QUEST = '#244a38'

// ── Tile background colours ──────────────────────────────────────────────────
// Using inline style instead of Tailwind arbitrary values for precise hex control
function tileBg(content: PlacedTile['content'], explored: boolean): string {
  if (content.type === 'market')   return explored ? '#0c0c18' : '#0d0d1a'
  if (content.type === 'tileMarket') return explored ? '#061622' : '#071c2a'
  if (content.type === 'monster')  return explored ? '#160b0b' : '#1a0d0d'
  if (content.type === 'treasure') return explored ? '#100f08' : '#14130a'
  if (content.type === 'quest')    return explored ? '#06180f' : '#082515'
  if (content.type === 'blueTower') return explored ? '#06192d' : '#07111f'
  if (content.type === 'npcRescue') return explored ? '#13091f' : '#1b0b2e'
  return explored ? '#0b160b' : '#0d1a0d'
}

// ── Junction node colour ─────────────────────────────────────────────────────
function nodeColor(content: PlacedTile['content']): string {
  if (content.type === 'market')   return '#353545'
  if (content.type === 'tileMarket') return '#23566c'
  if (content.type === 'monster')  return '#4a3535'
  if (content.type === 'treasure') return '#5a5035'
  if (content.type === 'quest')    return '#24734e'
  if (content.type === 'blueTower') return '#1e4c78'
  if (content.type === 'npcRescue') return '#6d3aa0'
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
  if (content.type === 'market')   return 'rgba(10, 10, 26, 0.62)'
  if (content.type === 'tileMarket') return 'rgba(5, 23, 35, 0.68)'
  if (content.type === 'monster')  return 'rgba(26, 8, 8, 0.62)'
  if (content.type === 'treasure') return 'rgba(26, 24, 8, 0.62)'
  if (content.type === 'quest')    return 'rgba(5, 35, 18, 0.68)'
  if (content.type === 'blueTower') return 'rgba(5, 18, 40, 0.68)'
  if (content.type === 'npcRescue') return 'rgba(35, 12, 58, 0.7)'
  return 'rgba(10, 26, 10, 0.62)'
}

function visualContent(tile: PlacedTile, isPlayer: boolean): PlacedTile['content'] {
  if (tile.content.type === 'monster' && tile.explored && !isPlayer) {
    return { type: 'empty' }
  }
  return tile.content
}

function buildTitle(tile: PlacedTile): string {
  const base = `Tile Nível ${tile.level}`
  if (tile.content.type === 'monster') {
    const lvl      = tile.content.monsterLevel ?? tile.level
    const template = FOREST_MONSTER_MAP.get(tile.content.monsterType ?? '') ?? FOREST_MONSTERS[0]
    const g        = estimateMonster(template, lvl, 'normal')
    return `${base} — ${template.name} Nv.${lvl}\nHP ${g.hp}  ATK ${g.atk}  DEF ${g.def}`
  }
  if (tile.content.type === 'treasure') return `${base} — Tesouro: Demon Dourado e baú`
  if (tile.content.type === 'market')   return `${base} — Mercado`
  if (tile.content.type === 'tileMarket') return `${base} — Mercado de Tiles`
  if (tile.content.type === 'blueTower') return `${base} — Torre Azul`
  if (tile.content.type === 'npcRescue') {
    const lvl      = tile.content.monsterLevel ?? tile.level + 3
    const template = FOREST_MONSTER_MAP.get(tile.content.monsterType ?? '') ?? FOREST_MONSTERS[0]
    return base + ' - Predador ' + template.name + ' Nv.' + lvl + '\nNPC: ' + (tile.content.rescueNpc?.name ?? 'Desconhecido')
  }
  return base
}

export default function MapTileCell({
  tile, isPlayer, isDestination, isSelected, visibility, heroLevel, tileSize, onClick,
}: Props) {
  const explored = tile.explored && !isPlayer
  const content  = visualContent(tile, isPlayer)
  const pipe     = content.type === 'market'
    ? PIPE_MARKET
    : content.type === 'tileMarket'
    ? PIPE_TILE_MARKET
    : content.type === 'quest'
    ? PIPE_QUEST
    : (explored ? PIPE_EXPLORED : PIPE_FRESH)
  const node     = nodeColor(content)
  const bg       = tileBg(content, explored)

  const showContentIcon =
    visibility === 'clear' &&
    content.type !== 'empty' &&
    (!tile.explored || content.type === 'market' || content.type === 'tileMarket' || content.type === 'quest' || content.type === 'blueTower' || content.type === 'npcRescue')

  // Icon opacity: explored service tiles are dimmed; active towers keep their glow.
  const iconOpacity = tile.explored && content.type !== 'blueTower' ? 0.45 : 1
  const contentIconSize = Math.max(9, Math.min(14, Math.floor(tileSize * 0.28)))
  const centeredContentIcon = content.type === 'blueTower'
  const effectiveIconSize = centeredContentIcon
    ? Math.max(15, Math.min(24, Math.floor(tileSize * 0.46)))
    : contentIconSize
  const playerMarkerSize = Math.max(18, Math.min(32, Math.floor(tileSize * 0.62)))

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
      <svg viewBox="0 0 52 52" className="absolute inset-0 z-20 w-full h-full pointer-events-none">
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
          className={cn(
            'absolute z-30 rounded overflow-hidden pointer-events-none',
            centeredContentIcon ? 'inset-0 flex items-center justify-center' : 'top-0.5 right-0.5',
          )}
          style={{
            opacity: iconOpacity,
            width: centeredContentIcon ? undefined : contentIconSize,
            height: centeredContentIcon ? undefined : contentIconSize,
          }}
        >
          {content.type === 'monster'  && <MonsterIcon  size={effectiveIconSize} />}
          {content.type === 'treasure' && <TreasureIcon size={effectiveIconSize} />}
          {content.type === 'market'   && <MarketIcon   size={effectiveIconSize} />}
          {content.type === 'tileMarket' && <TileMarketIcon size={effectiveIconSize} />}
          {content.type === 'quest'    && <QuestIcon    size={effectiveIconSize} />}
          {content.type === 'blueTower' && <BlueTowerIcon size={effectiveIconSize} />}
          {content.type === 'npcRescue' && <MonsterIcon size={effectiveIconSize} />}
        </div>
      )}

      {/* Level badge — bottom-left */}
      {visibility === 'clear' && (
        <div
          className="absolute bottom-0.5 left-0.5 z-30 rounded px-1"
          style={{
            backgroundColor: levelBadgeBg(content),
            opacity: explored ? 0.55 : 1,
            lineHeight: 1,
            paddingTop: 2,
            paddingBottom: 2,
          }}
        >
          <span
            className="text-[10px] font-black tracking-tight tabular-nums"
            style={{
              color: content.type === 'market'
                ? '#5a5aaa'
                : content.type === 'tileMarket'
                  ? '#38bdf8'
                : content.type === 'quest'
                  ? '#34d399'
                : content.type === 'blueTower'
                  ? '#60a5fa'
                : content.type === 'npcRescue'
                  ? '#c084fc'
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
        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
          <PlayerMarker size={playerMarkerSize} />
        </div>
      )}

      {/* Selected ring */}
      {isSelected && !isDestination && (
        <div className="absolute inset-0 z-40 rounded ring-2 ring-inset ring-sky-400/90 pointer-events-none" />
      )}

      {/* Destination double border */}
      {isDestination && (
        <div className="absolute inset-0 z-40 rounded border-4 border-double border-indigo-300/90 shadow-[inset_0_0_0_1px_rgba(129,140,248,0.7)] pointer-events-none" />
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

