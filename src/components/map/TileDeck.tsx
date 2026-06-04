import type { MapTile } from '../../types/map'
import { TILE_GEN_BASE_MS } from '../../store/mapStore'
import { MonsterIcon, TreasureIcon } from '../icons/MapIcons'
import { cn } from '../../lib/utils'

// ── Path colour (stone/dirt) ─────────────────────────────────────────────────
const PIPE_NORMAL  = '#3a3228'
const PIPE_MONSTER = '#3a2828'

interface Props {
  deck: MapTile[]
  deckAccum: number
  moveSpeed: number
  maxDeck: number
  tilesPlaced: number
  onDragStart(id: string): void
  onDragEnd(): void
}

export default function TileDeck({
  deck, deckAccum, moveSpeed, maxDeck, tilesPlaced, onDragStart, onDragEnd,
}: Props) {
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
  const isMonster  = tile.content.type === 'monster'
  const isTreasure = tile.content.type === 'treasure'

  const pipe    = isMonster ? PIPE_MONSTER : PIPE_NORMAL
  const node    = isMonster ? '#4a3535' : '#4a4035'
  const baseBg  = isMonster ? '#1a0d0d' : '#0d1a0d'
  const border  = isMonster ? '#3a1a1a' : '#1e3a1e'
  const hoverBg = isMonster ? '#1e1010' : '#0f1e0f'

  return (
    <div
      onPointerDown={() => onDragStart(tile.id)}
      onPointerUp={onDragEnd}
      onPointerCancel={onDragEnd}
      className="relative w-[52px] h-[52px] rounded-lg cursor-grab active:cursor-grabbing select-none transition-colors"
      style={{ backgroundColor: baseBg, border: `1px solid ${border}`, touchAction: 'none' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = hoverBg }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = baseBg  }}
      title={`Tile Nível ${tile.level} — ${
        tile.content.type === 'treasure' ? 'Tesouro' :
        tile.content.type === 'monster'  ? `Monstro L${tile.content.monsterLevel}` :
        'Vazio'
      }`}
    >
      {/* Paths + junction node */}
      <svg viewBox="0 0 52 52" className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
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
        <circle cx="26" cy="26" r="5" fill={node} />
      </svg>

      {/* Content icon — top-right */}
      {(isMonster || isTreasure) && (
        <div className="absolute top-0.5 right-0.5 z-10" style={{ width: 16, height: 16 }}>
          {isMonster  && <MonsterIcon  size={16} />}
          {isTreasure && <TreasureIcon size={16} />}
        </div>
      )}

      {/* Level badge — bottom-left */}
      <div
        className="absolute bottom-0.5 left-0.5 z-10 rounded px-1"
        style={{
          backgroundColor: isMonster ? '#1a0808' : '#0a1a0a',
          lineHeight: 1,
          paddingTop: 2,
          paddingBottom: 2,
        }}
      >
        <span
          className="text-[9px] font-black tabular-nums"
          style={{
            color: isMonster ? '#cc4444' : '#4a8a4a',
            fontFamily: 'monospace',
          }}
        >
          {tile.level}
        </span>
      </div>
    </div>
  )
}
