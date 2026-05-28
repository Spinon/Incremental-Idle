import { useState, useEffect } from 'react'
import { useMapStore, gridKey } from '../../store/mapStore'
import { useHeroStore } from '../../store/heroStore'
import { getDerivedStats } from '../../formulas/derived'
import { goblinStats } from '../../store/battleStore'
import { useT } from '../../i18n/useT'
import { useSettingsStore } from '../../store/settingsStore'
import MapViewport from './MapViewport'
import TileDeck from './TileDeck'
import { cn } from '../../lib/utils'
import type { PlacedTile } from '../../types/map'

const ZOOM_MIN = 0.30
const ZOOM_MAX = 2.50
const ZOOM_STEP = 0.05

function clampZoom(z: number) {
  return Math.round(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z)) * 100) / 100
}

export default function MapSection() {
  const [draggingId,  setDraggingId]  = useState<string | null>(null)
  const [zoom,        setZoom]        = useState(1.0)
  const [cameraPos,   setCameraPos]   = useState({ x: 0, y: 0 })
  const [selectedPos, setSelectedPos] = useState<{ x: number; y: number } | null>(null)

  const grid           = useMapStore(s => s.grid)

  // Recenter camera when a new journey resets the grid to the origin
  const gridSize = Object.keys(grid).length
  useEffect(() => {
    if (gridSize === 1) {
      setCameraPos({ x: 0, y: 0 })
      setZoom(1.0)
    }
  }, [gridSize])
  const deck           = useMapStore(s => s.deck)
  const playerPos      = useMapStore(s => s.playerPos)
  const destination    = useMapStore(s => s.destination)
  const deckAccum      = useMapStore(s => s.deckAccum)
  const sightedCells   = useMapStore(s => s.sightedCells)
  const autoExplore    = useMapStore(s => s.autoExplore)
  const tilesPlaced    = useMapStore(s => s.tilesPlaced)
  const placeTile      = useMapStore(s => s.placeTile)
  const setDestination = useMapStore(s => s.setDestination)
  const setAutoExplore = useMapStore(s => s.setAutoExplore)
  const goHome         = useMapStore(s => s.goHome)

  const attrs     = useHeroStore(s => s.attributes)
  const heroLevel = useHeroStore(s => s.level)
  const derived   = getDerivedStats(attrs)
  const t       = useT()

  const maxDeck = Math.min(8, 3 + Math.floor(derived.vision / 50))

  const isPanned     = cameraPos.x !== playerPos.x || cameraPos.y !== playerPos.y
  const selectedTile = selectedPos ? (grid[gridKey(selectedPos.x, selectedPos.y)] ?? null) : null

  function handleTileClick(x: number, y: number) {
    setDestination(x, y)
    setCameraPos({ x: playerPos.x, y: playerPos.y })
    if (selectedPos?.x === x && selectedPos?.y === y) {
      setSelectedPos(null)
    } else {
      setSelectedPos({ x, y })
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <p className="text-[10px] text-slate-400 dark:text-slate-600 uppercase tracking-widest font-semibold">
          {t.map}
        </p>
        <span className="text-[10px] text-slate-500 dark:text-slate-600 italic">
          {t.mapHint}
        </span>
        <span className="text-[10px] text-slate-400 dark:text-slate-600 tabular-nums font-medium">
          ⬛ {tilesPlaced}
        </span>

        <div className="ml-auto flex items-center gap-1">
          {/* Auto-explore toggle */}
          <button
            onClick={() => setAutoExplore(!autoExplore)}
            title={autoExplore ? t.autoExplore : t.stay}
            className={cn(
              'h-6 px-2 rounded text-[10px] font-semibold border transition-colors',
              autoExplore
                ? 'bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-500'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700',
            )}
          >
            {autoExplore ? '⟳ Auto' : '☞ Manual'}
          </button>

          <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-0.5" />

          {/* Home button — goes to home scene */}
          <button
            onClick={goHome}
            title={t.goHome}
            className="w-6 h-6 rounded text-xs border transition-colors bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          >⌂</button>

          {/* Recenter button */}
          <button
            onClick={() => setCameraPos({ x: playerPos.x, y: playerPos.y })}
            disabled={!isPanned}
            title="Centralizar"
            className={cn(
              'w-6 h-6 rounded text-xs border transition-colors',
              !isPanned
                ? 'opacity-30 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700',
            )}
          >◎</button>

          <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-0.5" />

          {/* Zoom controls */}
          <button
            onClick={() => setZoom(z => clampZoom(z - ZOOM_STEP))}
            disabled={zoom <= ZOOM_MIN}
            className={cn(
              'w-6 h-6 rounded text-xs font-bold border transition-colors',
              zoom <= ZOOM_MIN
                ? 'opacity-30 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700',
            )}
          >−</button>
          <span className="text-[10px] text-slate-400 tabular-nums w-8 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(z => clampZoom(z + ZOOM_STEP))}
            disabled={zoom >= ZOOM_MAX}
            className={cn(
              'w-6 h-6 rounded text-xs font-bold border transition-colors',
              zoom >= ZOOM_MAX
                ? 'opacity-30 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700',
            )}
          >+</button>
        </div>
      </div>

      <MapViewport
        grid={grid}
        sightedCells={sightedCells}
        playerPos={playerPos}
        destination={destination}
        selectedPos={selectedPos}
        vision={derived.vision}
        heroLevel={heroLevel}
        zoom={zoom}
        cameraPos={cameraPos}
        draggingId={draggingId}
        onDrop={(tileId, x, y) => { placeTile(tileId, x, y); setDraggingId(null) }}
        onTileClick={handleTileClick}
        onCameraChange={(x, y) => setCameraPos({ x, y })}
        onZoom={dir => setZoom(z => clampZoom(z + dir * ZOOM_STEP))}
      />

      {/* Tile info panel */}
      {selectedTile && (
        <div className="mt-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3">
          <TileInfoPanel tile={selectedTile} onClose={() => setSelectedPos(null)} />
        </div>
      )}

      <TileDeck
        deck={deck}
        deckAccum={deckAccum}
        moveSpeed={derived.moveSpeed}
        maxDeck={maxDeck}
        tilesPlaced={tilesPlaced}
        onDragStart={setDraggingId}
        onDragEnd={() => setDraggingId(null)}
      />
    </div>
  )
}

// ─── Tile info sub-component ─────────────────────────────────────────────────

function TileInfoPanel({ tile, onClose }: { tile: PlacedTile; onClose(): void }) {
  const lang = useSettingsStore(s => s.lang)
  const isEn = lang === 'en'

  const { content, level, explored, x, y } = tile

  const headerLabel =
    content.type === 'market'   ? (isEn ? 'Market' : 'Mercado') :
    content.type === 'monster'  ? (isEn ? 'Monster Lair' : 'Covil') :
    content.type === 'treasure' ? (isEn ? 'Treasure' : 'Tesouro') :
                                   (isEn ? 'Explored' : 'Explorado')

  const headerColor =
    content.type === 'market'   ? 'text-indigo-400' :
    content.type === 'monster'  ? 'text-red-400' :
    content.type === 'treasure' ? 'text-yellow-400' : 'text-slate-400'

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className={cn('text-[10px] font-bold uppercase tracking-widest', headerColor)}>
          {headerLabel}
        </span>
        <span className="text-[10px] text-slate-500 dark:text-slate-600">
          ({x}, {y}) · L{level}
        </span>
        <button
          onClick={onClose}
          className="ml-auto text-[10px] text-slate-400 hover:text-slate-300 transition-colors"
        >✕</button>
      </div>

      {content.type === 'monster' && (() => {
        const lvl = content.monsterLevel ?? level
        const g   = goblinStats(lvl)
        return (
          <div className="flex gap-4 text-[11px] text-slate-400">
            <span>Goblin <span className="text-red-400 font-semibold">Nv.{lvl}</span></span>
            <span>HP <span className="text-slate-300">{g.hp}</span></span>
            <span>ATK <span className="text-slate-300">{g.atk}</span></span>
            <span>DEF <span className="text-slate-300">{g.def}</span></span>
            {explored && <span className="text-green-700 text-[10px]">{isEn ? 'Defeated' : 'Derrotado'}</span>}
          </div>
        )
      })()}

      {content.type === 'treasure' && (
        <div className="text-[11px] text-slate-400">
          {explored
            ? <span className="text-green-700">{isEn ? 'Collected' : 'Coletado'}</span>
            : <span>{isEn ? 'Reward' : 'Recompensa'}: <span className="text-yellow-400 font-semibold">+{content.xpAmount} XP</span></span>
          }
        </div>
      )}

      {content.type === 'empty' && (() => {
        const g = goblinStats(level)
        return (
          <div className="flex gap-3 text-[11px] text-slate-400">
            <span>Goblin <span className="text-red-400 font-semibold">Nv.{level}</span></span>
            <span>HP <span className="text-slate-300">{g.hp}</span></span>
            <span>ATK <span className="text-slate-300">{g.atk}</span></span>
            <span>DEF <span className="text-slate-300">{g.def}</span></span>
          </div>
        )
      })()}

      {content.type === 'market' && (
        <div className="text-[11px] text-indigo-400/80">
          {isEn ? 'Walk here to enter the shop.' : 'Vá até aqui para entrar na loja.'}
        </div>
      )}
    </div>
  )
}
