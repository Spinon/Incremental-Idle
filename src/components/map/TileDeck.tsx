import type { MapTile } from '../../types/map'
import { TILE_GEN_BASE_MS } from '../../store/mapStore'
import { cn } from '../../lib/utils'

const PIPE = '#4ade80'

interface Props {
  deck: MapTile[]
  deckAccum: number
  moveSpeed: number
  maxDeck: number
  tilesPlaced: number
  onDragStart(id: string): void
  onDragEnd(): void
}

export default function TileDeck({ deck, deckAccum, moveSpeed, maxDeck, tilesPlaced, onDragStart, onDragEnd }: Props) {
  // Must match tickMap exactly: earlyFactor slows generation at game start
  const earlyFactor = Math.min(1, 0.4 + tilesPlaced * 0.03)
  const interval    = TILE_GEN_BASE_MS / (Math.max(0.5, moveSpeed) * earlyFactor)
  const isFull      = deck.length >= maxDeck
  const progress    = isFull ? 100 : Math.min(100, (deckAccum / interval) * 100)
  const timeLeft    = isFull ? 0   : Math.max(0, (interval - deckAccum) / 1000)

  return (
    <div className="mt-3">
      {/* Header + progress bar */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] text-slate-400 dark:text-slate-600 uppercase tracking-widest font-semibold">
          Deck
        </span>
        <span className="text-[10px] text-slate-500 tabular-nums">{deck.length}/{maxDeck}</span>
        <div className="flex-1 h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-[width] duration-200',
              isFull ? 'bg-slate-400 dark:bg-slate-600' : 'bg-indigo-500',
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        {!isFull && (
          <span className="text-[10px] text-slate-400 tabular-nums">{timeLeft.toFixed(0)}s</span>
        )}
      </div>

      {/* Tile cards */}
      <div className="flex gap-2 flex-wrap">
        {deck.map(tile => (
          <TileCard key={tile.id} tile={tile} onDragStart={onDragStart} onDragEnd={onDragEnd} />
        ))}
        {/* Empty slots */}
        {Array.from({ length: maxDeck - deck.length }).map((_, i) => (
          <div
            key={`empty_${i}`}
            className="w-[52px] h-[52px] rounded-lg border border-dashed border-slate-700/40 dark:border-slate-700/30"
          />
        ))}
      </div>
    </div>
  )
}

function TileCard({
  tile,
  onDragStart,
  onDragEnd,
}: { tile: MapTile; onDragStart(id: string): void; onDragEnd(): void }) {
  const hasContent = tile.content.type !== 'empty'
  const icon =
    tile.content.type === 'treasure' ? '✦'
    : tile.content.type === 'monster' ? '⚔'
    : ''
  const iconColor =
    tile.content.type === 'treasure' ? 'text-yellow-400'
    : 'text-red-400'

  return (
    <div
      draggable
      onDragStart={e => {
        e.dataTransfer.setData('tileId', tile.id)
        e.dataTransfer.effectAllowed = 'move'
        onDragStart(tile.id)
      }}
      onDragEnd={onDragEnd}
      className={cn(
        'relative w-[52px] h-[52px] rounded-lg cursor-grab active:cursor-grabbing select-none',
        'bg-green-950/70 border border-green-800/50 text-green-400',
        'hover:border-green-600 hover:bg-green-900/60 transition-colors',
      )}
      title={`Tile Nível ${tile.level} — ${
        tile.content.type === 'treasure' ? 'Tesouro' :
        tile.content.type === 'monster'  ? `Monstro L${tile.content.monsterLevel}` :
        'Vazio'
      }`}
    >
      <svg viewBox="0 0 52 52" className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
        {tile.connections.includes('N') && (
          <line x1="26" y1="26" x2="26" y2="2" stroke={PIPE} strokeWidth="7" strokeLinecap="round" />
        )}
        {tile.connections.includes('S') && (
          <line x1="26" y1="26" x2="26" y2="50" stroke={PIPE} strokeWidth="7" strokeLinecap="round" />
        )}
        {tile.connections.includes('E') && (
          <line x1="26" y1="26" x2="50" y2="26" stroke={PIPE} strokeWidth="7" strokeLinecap="round" />
        )}
        {tile.connections.includes('W') && (
          <line x1="26" y1="26" x2="2"  y2="26" stroke={PIPE} strokeWidth="7" strokeLinecap="round" />
        )}
        <circle cx="26" cy="26" r="5" fill={PIPE} />
      </svg>

      {hasContent && (
        <span className={cn('absolute top-0.5 right-0.5 text-[10px] leading-none font-bold z-10', iconColor)}>
          {icon}
        </span>
      )}
      <span className="absolute bottom-0.5 left-0.5 text-[8px] leading-none text-green-700/70 z-10">
        L{tile.level}
      </span>
    </div>
  )
}
