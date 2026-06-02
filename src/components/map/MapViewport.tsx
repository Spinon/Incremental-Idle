import { useRef, useEffect } from 'react'
import type { PlacedTile, Direction, TileContent } from '../../types/map'
import { gridKey, DIR_DELTA, DIR_OPPOSITE, DIRS } from '../../store/mapStore'
import MapTileCell, { type Visibility } from './MapTileCell'
import { MonsterIcon, TreasureIcon, MarketIcon } from '../icons/MapIcons'
import { cn } from '../../lib/utils'

const VP_W = 676
const VP_H = 468

interface Props {
  grid: Record<string, PlacedTile>
  sightedCells: Record<string, TileContent>
  playerPos: { x: number; y: number }
  destination: { x: number; y: number } | null
  selectedPos: { x: number; y: number } | null
  vision: number
  heroLevel: number
  zoom: number
  cameraPos: { x: number; y: number }  // grid units (float); camera centre
  draggingId: string | null
  onDrop(tileId: string, x: number, y: number): void
  onTileClick(x: number, y: number): void
  onCameraChange(x: number, y: number): void
  onZoom(dir: 1 | -1): void
}

function ghostBg(content: TileContent): string {
  if (content.type === 'monster')  return 'bg-red-950/30'
  if (content.type === 'treasure') return 'bg-yellow-950/25'
  if (content.type === 'market')   return 'bg-indigo-950/25'
  return ''
}

export default function MapViewport({
  grid, sightedCells, playerPos, destination, selectedPos, vision, heroLevel, zoom, cameraPos, draggingId, onDrop, onTileClick, onCameraChange, onZoom,
}: Props) {
  const tilePx    = Math.round(52 * zoom)
  const previewIconSize = Math.max(10, Math.min(18, Math.floor(tilePx * 0.34)))
  const visRadius = Math.max(2, Math.round(vision / 38))

  // Camera is stored directly in grid units — no rounding, no player follow
  const camX = cameraPos.x
  const camY = cameraPos.y

  // Pixel position of tile (gx, gy)
  const tileLeft = (gx: number) => (gx - camX) * tilePx + VP_W / 2 - tilePx / 2
  const tileTop  = (gy: number) => (gy - camY) * tilePx + VP_H / 2 - tilePx / 2

  // Range of grid cells to render
  const gxMin = Math.floor(camX - VP_W / (2 * tilePx)) - 1
  const gxMax = Math.ceil( camX + VP_W / (2 * tilePx)) + 1
  const gyMin = Math.floor(camY - VP_H / (2 * tilePx)) - 1
  const gyMax = Math.ceil( camY + VP_H / (2 * tilePx)) + 1

  // Background offset — derived from camera position in grid units
  const bgX = (((VP_W / 2 - tilePx / 2) - cameraPos.x * tilePx) % tilePx + tilePx) % tilePx
  const bgY = (((VP_H / 2 - tilePx / 2) - cameraPos.y * tilePx) % tilePx + tilePx) % tilePx

  // Block page scroll
  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const block = (e: WheelEvent) => { e.preventDefault() }
    el.addEventListener('wheel', block, { passive: false })
    return () => el.removeEventListener('wheel', block)
  }, [])

  // Pixel-level pan — stores camera position at drag start
  const panRef = useRef<{ mx: number; my: number; cx: number; cy: number; moved: boolean } | null>(null)
  const suppressNextClick = useRef(false)

  const handleMouseDown = (e: React.MouseEvent) => {
    if (draggingId !== null || e.button !== 0) return
    e.preventDefault()
    panRef.current = { mx: e.clientX, my: e.clientY, cx: cameraPos.x, cy: cameraPos.y, moved: false }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!panRef.current) return
    const dx = e.clientX - panRef.current.mx
    const dy = e.clientY - panRef.current.my
    if (!panRef.current.moved && Math.hypot(dx, dy) > 4) panRef.current.moved = true
    // Convert pixel drag to grid units
    onCameraChange(panRef.current.cx - dx / tilePx, panRef.current.cy - dy / tilePx)
  }

  const handleMouseUp = () => {
    if (panRef.current?.moved) suppressNextClick.current = true
    panRef.current = null
  }

  // Build visible cells
  type Cell = {
    gx: number; gy: number
    left: number; top: number
    tile: PlacedTile | null
    sight: TileContent | null
    vis: Visibility
    isValidTarget: boolean
  }
  const cells: Cell[] = []

  for (let gy = gyMin; gy <= gyMax; gy++) {
    for (let gx = gxMin; gx <= gxMax; gx++) {
      const tile = grid[gridKey(gx, gy)] ?? null
      const dist = Math.max(Math.abs(gx - playerPos.x), Math.abs(gy - playerPos.y))

      const vis: Visibility =
        dist <= visRadius     ? 'clear'    :
        dist <= visRadius + 2 ? 'penumbra' :
                                'fog'

      const sight = (!tile && vis !== 'fog') ? (sightedCells[gridKey(gx, gy)] ?? null) : null

      // Valid drop target: empty cell, dragging a tile, AND at least one placed
      // neighbor has an opening facing this cell (so any tile with that connection
      // could connect). The real bidirectional exit-conflict check happens in
      // placeTile — this is just the highlight heuristic.
      const isAdj = !tile && draggingId !== null && (DIRS as Direction[]).some(d => {
        const neighbor = grid[gridKey(gx + DIR_DELTA[d].dx, gy + DIR_DELTA[d].dy)]
        return neighbor?.connections.includes(DIR_OPPOSITE[d])
      })

      cells.push({ gx, gy, left: tileLeft(gx), top: tileTop(gy), tile, sight, vis, isValidTarget: isAdj })
    }
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative rounded-xl border border-slate-200 dark:border-slate-800 select-none',
        draggingId === null ? 'cursor-grab active:cursor-grabbing' : '',
      )}
      style={{ width: VP_W, height: VP_H, overflow: 'hidden' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={e => onZoom(e.deltaY > 0 ? -1 : 1)}
    >
      {/* Grid background */}
      <div
        className="absolute inset-0 rounded-xl"
        style={{
          backgroundImage:
            'linear-gradient(rgba(100,116,139,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(100,116,139,.07) 1px,transparent 1px)',
          backgroundSize: `${tilePx}px ${tilePx}px`,
          backgroundPosition: `${bgX}px ${bgY}px`,
          backgroundColor: 'rgb(2 6 23)',
        }}
      />

      {cells.map(({ gx, gy, left, top, tile, sight, vis, isValidTarget }) => (
        <div
          key={`${gx},${gy}`}
          className="absolute"
          style={{ left, top, width: tilePx, height: tilePx, padding: 2 }}
        >
          {tile ? (
            <MapTileCell
              tile={tile}
              isPlayer={gx === playerPos.x && gy === playerPos.y}
              isDestination={!!(destination?.x === gx && destination?.y === gy)}
              isSelected={!!(selectedPos?.x === gx && selectedPos?.y === gy)}
              heroLevel={heroLevel}
              visibility={vis}
              tileSize={tilePx}
              onClick={() => {
                if (suppressNextClick.current) { suppressNextClick.current = false; return }
                onTileClick(gx, gy)
              }}
            />
          ) : (sight || isValidTarget) ? (
            <div
              className={cn(
                'w-full h-full rounded relative overflow-hidden transition-colors',
                sight ? ghostBg(sight) : '',
                isValidTarget && 'border-2 border-dashed border-indigo-500/50 hover:border-indigo-400 hover:bg-indigo-900/25 cursor-copy',
              )}
              onDragOver={isValidTarget ? e => e.preventDefault() : undefined}
              onDrop={isValidTarget ? e => {
                e.preventDefault()
                const id = e.dataTransfer.getData('tileId')
                if (id) onDrop(id, gx, gy)
              } : undefined}
            >
              {sight && sight.type !== 'empty' && (
                <div className={cn(
                  'absolute inset-0 flex items-center justify-center pointer-events-none z-10',
                  vis === 'clear' ? 'opacity-60' : 'opacity-30',
                )}>
                  {sight.type === 'monster'  && <MonsterIcon  size={previewIconSize} />}
                  {sight.type === 'treasure' && <TreasureIcon size={previewIconSize} />}
                  {sight.type === 'market'   && <MarketIcon   size={previewIconSize} />}
                </div>
              )}
              {vis === 'penumbra' && (
                <div className="absolute inset-0 bg-slate-950/65 rounded pointer-events-none z-20" />
              )}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}
