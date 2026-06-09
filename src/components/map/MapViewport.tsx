import { useRef, useEffect, useState } from 'react'
import type { MapTile, PlacedTile, TileContent } from '../../types/map'
import { gridKey, DIR_DELTA, DIR_OPPOSITE, DIRS } from '../../store/mapStore'
import MapTileCell, { type Visibility } from './MapTileCell'
import { MonsterIcon, TreasureIcon, MarketIcon, QuestIcon, BlueTowerIcon } from '../icons/MapIcons'
import { cn } from '../../lib/utils'
import type { QuestMapMarker, QuestDifficulty } from '../../types/quest'

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
  draggedTile: MapTile | null
  selectedDeckId: string | null
  questMarkers: QuestMapMarker[]
  onDrop(tileId: string, x: number, y: number): void
  onPlaceSelected(x: number, y: number): void
  onTileClick(x: number, y: number): void
  onCameraChange(x: number, y: number): void
  onZoom(dir: 1 | -1): void
  onZoomChange(zoom: number): number
  onUserInteraction(): void
}

// ── Marker colours by difficulty ──────────────────────────────────────────────
const DIFF_RING: Record<QuestDifficulty, string> = {
  easy:   'border-green-400  bg-green-900/60',
  medium: 'border-amber-400  bg-amber-900/60',
  hard:   'border-red-400    bg-red-900/60',
}
const DIFF_TEXT: Record<QuestDifficulty, string> = {
  easy:   'text-green-300',
  medium: 'text-amber-300',
  hard:   'text-red-300',
}

function MarkerIcon({ kind }: { kind: QuestMapMarker['kind'] }) {
  switch (kind) {
    case 'escort':              return <span>🚩</span>
    case 'delivery':            return <span>📦</span>
    case 'bounty':              return <span>⚠</span>
    case 'extermination_center':return <span>⚔</span>
    default:                    return null
  }
}

function ghostBg(content: TileContent): string {
  if (content.type === 'monster')  return 'bg-red-950/30'
  if (content.type === 'treasure') return 'bg-yellow-950/25'
  if (content.type === 'market')   return 'bg-indigo-950/25'
  if (content.type === 'blueTower') return 'bg-sky-950/25'
  return ''
}

export default function MapViewport({
  grid, sightedCells, playerPos, destination, selectedPos, vision, heroLevel, zoom, cameraPos, draggingId, draggedTile, selectedDeckId, questMarkers, onDrop, onPlaceSelected, onTileClick, onCameraChange, onZoom, onZoomChange, onUserInteraction,
}: Props) {
  const tilePx    = Math.round(52 * zoom)
  const previewIconSize = Math.max(10, Math.min(18, Math.floor(tilePx * 0.34)))
  const visRadius = Math.max(2, Math.round(vision / 38))

  // Viewport size — fluid: fills the available width, height clamped by ratio.
  const [vpW, setVpW] = useState(676)
  const [vpH, setVpH] = useState(468)

  // Camera is stored directly in grid units — no rounding, no player follow
  const camX = cameraPos.x
  const camY = cameraPos.y

  // Pixel position of tile (gx, gy)
  const tileLeft = (gx: number) => (gx - camX) * tilePx + vpW / 2 - tilePx / 2
  const tileTop  = (gy: number) => (gy - camY) * tilePx + vpH / 2 - tilePx / 2

  // Range of grid cells to render
  const gxMin = Math.floor(camX - vpW / (2 * tilePx)) - 1
  const gxMax = Math.ceil( camX + vpW / (2 * tilePx)) + 1
  const gyMin = Math.floor(camY - vpH / (2 * tilePx)) - 1
  const gyMax = Math.ceil( camY + vpH / (2 * tilePx)) + 1

  // Background offset — derived from camera position in grid units
  const bgX = (((vpW / 2 - tilePx / 2) - cameraPos.x * tilePx) % tilePx + tilePx) % tilePx
  const bgY = (((vpH / 2 - tilePx / 2) - cameraPos.y * tilePx) % tilePx + tilePx) % tilePx

  // Block page scroll
  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const block = (e: WheelEvent) => { e.preventDefault() }
    el.addEventListener('wheel', block, { passive: false })
    return () => el.removeEventListener('wheel', block)
  }, [])

  // Responsive sizing — measure available width, derive a clamped height.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => {
      const w = el.clientWidth || 676
      setVpW(w)
      setVpH(Math.max(300, Math.min(468, Math.round(w * 0.62))))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Pixel-level pan — stores camera position at drag start
  const panRef = useRef<{ mx: number; my: number; cx: number; cy: number; moved: boolean } | null>(null)
  const pointersRef = useRef(new Map<number, { x: number; y: number }>())
  const pinchRef = useRef<{
    distance: number
    zoom: number
    gridX: number
    gridY: number
  } | null>(null)
  const suppressNextClick = useRef(false)

  function relativePoint(clientX: number, clientY: number) {
    const rect = containerRef.current?.getBoundingClientRect()
    return {
      x: clientX - (rect?.left ?? 0),
      y: clientY - (rect?.top ?? 0),
    }
  }

  function pinchPoints() {
    const points = Array.from(pointersRef.current.values())
    if (points.length < 2) return null
    return [points[0], points[1]] as const
  }

  function startPinch() {
    const points = pinchPoints()
    if (!points) return

    const [a, b] = points
    const anchorX = (a.x + b.x) / 2
    const anchorY = (a.y + b.y) / 2
    const distance = Math.hypot(b.x - a.x, b.y - a.y)
    if (distance <= 0) return

    pinchRef.current = {
      distance,
      zoom,
      gridX: cameraPos.x + (anchorX - vpW / 2) / tilePx,
      gridY: cameraPos.y + (anchorY - vpH / 2) / tilePx,
    }
    panRef.current = null
    suppressNextClick.current = true
  }

  function updatePinch() {
    const pinch = pinchRef.current
    const points = pinchPoints()
    if (!pinch || !points) return

    const [a, b] = points
    const distance = Math.hypot(b.x - a.x, b.y - a.y)
    if (distance <= 0) return
    const anchorX = (a.x + b.x) / 2
    const anchorY = (a.y + b.y) / 2

    const nextZoom = onZoomChange(pinch.zoom * (distance / pinch.distance))
    const nextTilePx = Math.round(52 * nextZoom)
    onCameraChange(
      pinch.gridX - (anchorX - vpW / 2) / nextTilePx,
      pinch.gridY - (anchorY - vpH / 2) / nextTilePx,
    )
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    if (draggingId !== null || e.button !== 0) return
    e.preventDefault()
    onUserInteraction()
    const point = relativePoint(e.clientX, e.clientY)
    pointersRef.current.set(e.pointerId, point)

    if (pointersRef.current.size >= 2) {
      // Entering pinch mode — capture this pointer so we track it even if
      // it leaves the viewport. Single-pointer clicks/pans do NOT capture
      // so that onClick on child tiles still fires normally.
      e.currentTarget.setPointerCapture(e.pointerId)
      startPinch()
      return
    }

    panRef.current = { mx: e.clientX, my: e.clientY, cx: cameraPos.x, cy: cameraPos.y, moved: false }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.set(e.pointerId, relativePoint(e.clientX, e.clientY))
    }

    if (pinchRef.current) {
      e.preventDefault()
      updatePinch()
      return
    }

    if (!panRef.current) return
    const dx = e.clientX - panRef.current.mx
    const dy = e.clientY - panRef.current.my
    if (!panRef.current.moved && Math.hypot(dx, dy) > 4) panRef.current.moved = true
    // Convert pixel drag to grid units
    onCameraChange(panRef.current.cx - dx / tilePx, panRef.current.cy - dy / tilePx)
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId)
    if (pinchRef.current) {
      suppressNextClick.current = true
      pinchRef.current = null
      panRef.current = null
      return
    }
    if (panRef.current?.moved) suppressNextClick.current = true
    panRef.current = null
  }

  function placementState(gx: number, gy: number): 'valid' | 'invalid' | 'none' {
    if (!draggedTile || grid[gridKey(gx, gy)]) return 'none'

    let hasNeighbor = false
    let matchCount = 0
    for (const dir of DIRS) {
      const { dx, dy } = DIR_DELTA[dir]
      const neighbor = grid[gridKey(gx + dx, gy + dy)]
      if (!neighbor) continue

      hasNeighbor = true
      const neighborFacesUs = neighbor.connections.includes(DIR_OPPOSITE[dir])
      const draggedFacesNeighbor = draggedTile.connections.includes(dir)
      if (neighborFacesUs !== draggedFacesNeighbor) return 'invalid'
      if (neighborFacesUs && draggedFacesNeighbor) matchCount++
    }

    if (!hasNeighbor) return 'none'
    return matchCount > 0 ? 'valid' : 'invalid'
  }

  // Build visible cells
  type Cell = {
    gx: number; gy: number
    left: number; top: number
    tile: PlacedTile | null
    sight: TileContent | null
    vis: Visibility
    isValidTarget: boolean
    placement: 'valid' | 'invalid' | 'none'
  }
  const cells: Cell[] = []

  for (let gy = gyMin; gy <= gyMax; gy++) {
    for (let gx = gxMin; gx <= gxMax; gx++) {
      const tile = grid[gridKey(gx, gy)] ?? null
      const dist = Math.max(Math.abs(gx - playerPos.x), Math.abs(gy - playerPos.y))

      const rawVis: Visibility =
        dist <= visRadius     ? 'clear'    :
        dist <= visRadius + 2 ? 'penumbra' :
                                'fog'
      const vis: Visibility =
        tile?.content.type === 'blueTower' && tile.explored
          ? 'clear'
          : rawVis

      const sight = (!tile && vis !== 'fog') ? (sightedCells[gridKey(gx, gy)] ?? null) : null
      const placement = placementState(gx, gy)

      // Valid drop target: empty cell, dragging a tile, AND at least one placed
      // neighbor has an opening facing this cell (so any tile with that connection
      // could connect). The real bidirectional exit-conflict check happens in
      // placeTile — this is just the highlight heuristic.
      const isAdj = !tile && draggingId !== null && (DIRS).some(d => {
        const neighbor = grid[gridKey(gx + DIR_DELTA[d].dx, gy + DIR_DELTA[d].dy)]
        return neighbor?.connections.includes(DIR_OPPOSITE[d])
      })

      cells.push({ gx, gy, left: tileLeft(gx), top: tileTop(gy), tile, sight, vis, isValidTarget: isAdj, placement })
    }
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative rounded-xl border border-slate-200 dark:border-slate-800 select-none',
        draggingId === null ? 'cursor-grab active:cursor-grabbing' : '',
      )}
      style={{ width: '100%', height: vpH, overflow: 'hidden', touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onWheel={e => {
        onUserInteraction()
        onZoom(e.deltaY > 0 ? -1 : 1)
      }}
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

      {/* Quest area tints — rendered below tiles so they don't block clicks */}
      {questMarkers.filter(m => m.kind === 'extermination_area').map(m => {
        const left = tileLeft(m.x)
        const top  = tileTop(m.y)
        if (left < -tilePx || left > vpW || top < -tilePx || top > vpH) return null
        return (
          <div
            key={`qa-${m.x},${m.y}`}
            className="absolute pointer-events-none z-10"
            style={{ left, top, width: tilePx, height: tilePx }}
          >
            <div className="absolute inset-1 rounded bg-red-600/10 border border-red-600/15" />
          </div>
        )
      })}

      {cells.map(({ gx, gy, left, top, tile, sight, vis, isValidTarget, placement }) => (
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
                onUserInteraction()
                onTileClick(gx, gy)
              }}
            />
          ) : (
            <div
              className={cn(
                'w-full h-full rounded relative overflow-hidden transition-colors cursor-pointer hover:bg-slate-800/30',
                sight ? ghostBg(sight) : '',
                (draggingId || selectedDeckId) && placement === 'valid' && 'border-2 border-dashed border-emerald-400/70 bg-emerald-900/20 hover:bg-emerald-900/35 cursor-copy',
                (draggingId || selectedDeckId) && placement === 'invalid' && 'border-2 border-dashed border-red-500/60 bg-red-950/25 hover:bg-red-950/35 cursor-not-allowed',
                (draggingId || selectedDeckId) && placement === 'none' && isValidTarget && 'border-2 border-dashed border-slate-500/35 bg-slate-900/15 cursor-help',
              )}
              onClick={() => {
                if (suppressNextClick.current) { suppressNextClick.current = false; return }
                onUserInteraction()
                if (selectedDeckId) { onPlaceSelected(gx, gy); return }
                onTileClick(gx, gy)
              }}
              onPointerUp={e => {
                if (!draggingId) return
                e.preventDefault()
                e.stopPropagation()
                suppressNextClick.current = true
                onUserInteraction()
                onDrop(draggingId, gx, gy)
              }}
              onDragOver={e => {
                e.preventDefault()
                e.dataTransfer.dropEffect = draggingId !== null ? 'move' : 'none'
              }}
              onDragEnter={e => {
                e.preventDefault()
              }}
              onDrop={e => {
                e.preventDefault()
                const id = e.dataTransfer.getData('tileId') || e.dataTransfer.getData('text/plain') || draggingId
                if (id) {
                  onUserInteraction()
                  onDrop(id, gx, gy)
                }
              }}
            >
              {sight && sight.type !== 'empty' && (
                <div className={cn(
                  sight.type === 'blueTower'
                    ? 'absolute top-0.5 right-0.5 pointer-events-none z-30 rounded overflow-hidden'
                    : 'absolute inset-0 flex items-center justify-center pointer-events-none z-10',
                  vis === 'clear' ? 'opacity-60' : 'opacity-30',
                )}>
                  {sight.type === 'monster'  && <MonsterIcon  size={previewIconSize} />}
                  {sight.type === 'treasure' && <TreasureIcon size={previewIconSize} />}
                  {sight.type === 'market'   && <MarketIcon   size={previewIconSize} />}
                  {sight.type === 'quest'    && <QuestIcon    size={previewIconSize} />}
                  {sight.type === 'blueTower' && <BlueTowerIcon size={previewIconSize} />}
                </div>
              )}
              {vis === 'penumbra' && (
                <div className="absolute inset-0 bg-slate-950/65 rounded pointer-events-none z-20" />
              )}
              {vis === 'fog' && (
                <div className="absolute inset-0 bg-slate-950/70 rounded pointer-events-none z-20" />
              )}
              {selectedPos?.x === gx && selectedPos?.y === gy && !(destination?.x === gx && destination?.y === gy) && (
                <div className="absolute inset-0 z-40 rounded ring-2 ring-inset ring-sky-400/90 pointer-events-none" />
              )}
              {destination?.x === gx && destination?.y === gy && (
                <div className="absolute inset-0 z-40 rounded border-4 border-double border-indigo-300/90 shadow-[inset_0_0_0_1px_rgba(129,140,248,0.7)] pointer-events-none" />
              )}
            </div>
          )}
        </div>
      ))}

      {/* Quest pin markers — rendered above tiles */}
      {questMarkers.filter(m => m.kind !== 'extermination_area').map((m, i) => {
        const left = tileLeft(m.x)
        const top  = tileTop(m.y)
        if (left < -tilePx || left > vpW || top < -tilePx || top > vpH) return null
        const pinSize = Math.max(18, Math.min(28, Math.round(tilePx * 0.48)))
        const isBounty = m.kind === 'bounty'
        return (
          <div
            key={`qm-${i}-${m.x},${m.y}`}
            className="absolute pointer-events-none z-50"
            style={{ left: left + tilePx / 2, top: top + tilePx / 2, transform: 'translate(-50%, -50%)' }}
            title={m.label}
          >
            <div
              className={cn(
                'flex items-center justify-center rounded-full border-2 shadow-lg',
                DIFF_RING[m.difficulty],
                isBounty && 'anim-hp-pulse',
              )}
              style={{ width: pinSize, height: pinSize, fontSize: Math.max(10, pinSize * 0.55) }}
            >
              <MarkerIcon kind={m.kind} />
            </div>
            {/* Coordinate label */}
            <div className={cn(
              'absolute top-full left-1/2 -translate-x-1/2 mt-0.5',
              'text-[7px] font-bold tabular-nums whitespace-nowrap leading-none',
              DIFF_TEXT[m.difficulty],
              'drop-shadow-[0_0_3px_rgba(0,0,0,1)]',
            )}>
              {m.x},{m.y}
            </div>
          </div>
        )
      })}
    </div>
  )
}
