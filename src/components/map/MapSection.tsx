import { useState, useEffect, useMemo, useRef } from 'react'
import { useMapStore, gridKey } from '../../store/mapStore'
import { useHeroStore } from '../../store/heroStore'
import { useInventoryStore } from '../../store/inventoryStore'
import { useSpellStore } from '../../store/spellStore'
import { useQuestStore } from '../../store/questStore'
import { useUIStore } from '../../store/uiStore'
import { getDerivedStats } from '../../formulas/derived'
import { getEquipmentBonuses } from '../../formulas/items'
import { applySpellBuffs } from '../../formulas/spells'
import { buildMonster, estimateMonster, MONSTER_RARITY_LABEL, MONSTER_RARITY_LABEL_EN, MONSTER_RARITY_COLOR } from '../../formulas/monsters'
import { FOREST_MONSTER_MAP, FOREST_MONSTERS, FOREST_RANDOM_MONSTERS, monsterName, monstersForBiome } from '../../data/monsters'
import { useT } from '../../i18n/useT'
import { useSettingsStore } from '../../store/settingsStore'
import MapViewport from './MapViewport'
import TileDeck from './TileDeck'
import { cn } from '../../lib/utils'
import type { PlacedTile, TileContent } from '../../types/map'
import type { MonsterRarity } from '../../types/monster'
import type { QuestMapMarker, QuestObjectiveExtermination } from '../../types/quest'

const ZOOM_MIN = 0.30
const ZOOM_MAX = 2.50
const ZOOM_STEP = 0.05
const MAP_VIEWPORT_HEIGHT = 468

function clampZoom(z: number) {
  return Math.round(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z)) * 100) / 100
}

function levelColor(tileLv: number, heroLv: number): string {
  const diff = tileLv - heroLv
  if (diff <= -3) return 'text-green-400'
  if (diff <= 2)  return 'text-yellow-300'
  if (diff <= 5)  return 'text-orange-400'
  return 'text-red-400'
}

function stableMonsterForTile(tile: PlacedTile) {
  const hash = Math.abs((tile.x * 73856093) ^ (tile.y * 19349663) ^ (tile.level * 83492791))
  const candidates = monstersForBiome(tile.biome)
  const pool = candidates.length > 0 ? candidates : FOREST_RANDOM_MONSTERS
  return pool[hash % pool.length]
}

function previewEnragedLevel(baseLevel: number, tilesPlaced: number): number {
  const maxBonus = Math.max(2, Math.ceil(tilesPlaced / 100 + 1))
  return baseLevel + Math.ceil(maxBonus / 2)
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
  const riskMode       = useMapStore(s => s.riskMode)
  const tilesPlaced    = useMapStore(s => s.tilesPlaced)
  const placeTile      = useMapStore(s => s.placeTile)
  const setDestination = useMapStore(s => s.setDestination)
  const teleportToBlueTower = useMapStore(s => s.teleportToBlueTower)
  const setAutoExplore = useMapStore(s => s.setAutoExplore)
  const toggleRiskMode = useMapStore(s => s.toggleRiskMode)
  const goHome         = useMapStore(s => s.goHome)
  const teleportSelecting = useUIStore(s => s.blueTowerTeleportSelecting)
  const teleportOrigin = useUIStore(s => s.blueTowerTeleportOrigin)
  const setTeleportSelecting = useUIStore(s => s.setBlueTowerTeleportSelecting)
  const setTeleportOrigin = useUIStore(s => s.setBlueTowerTeleportOrigin)

  useEffect(() => {
    if (!draggingId) return
    const clearDrag = () => setTimeout(() => setDraggingId(null), 0)
    window.addEventListener('pointerup', clearDrag)
    window.addEventListener('pointercancel', clearDrag)
    return () => {
      window.removeEventListener('pointerup', clearDrag)
      window.removeEventListener('pointercancel', clearDrag)
    }
  }, [draggingId])

  const attrs     = useHeroStore(s => s.attributes)
  const heroLevel = useHeroStore(s => s.level)
  const equipment = useInventoryStore(s => s.equipment)
  const activeBuffs = useSpellStore(s => s.activeBuffs)
  const derived   = applySpellBuffs(
    getDerivedStats(attrs, getEquipmentBonuses(equipment), heroLevel),
    activeBuffs,
  )
  const t       = useT()
  const lang    = useSettingsStore(s => s.lang)

  const maxDeck = Math.min(8, 3 + Math.floor(derived.vision / 50))

  const allQuests    = useQuestStore(s => s.quests)
  const questMarkers = useMemo<QuestMapMarker[]>(() => {
    const markers: QuestMapMarker[] = []
    for (const q of allQuests) {
      if (q.status !== 'active') continue
      const obj = q.objective
      if (obj.type === 'escort') {
        if (!obj.reached)
          markers.push({ x: obj.targetX, y: obj.targetY, kind: 'escort', difficulty: q.difficulty, label: q.title })
      } else if (obj.type === 'delivery') {
        if (!obj.reached)
          markers.push({ x: obj.targetX, y: obj.targetY, kind: 'delivery', difficulty: q.difficulty, label: q.title })
      } else if (obj.type === 'bounty') {
        if (!obj.defeated)
          markers.push({ x: obj.targetX, y: obj.targetY, kind: 'bounty', difficulty: q.difficulty, label: obj.targetName })
      } else if (obj.type === 'extermination') {
        const o = obj as QuestObjectiveExtermination
        if (o.killed < o.required) {
          markers.push({ x: o.centerX, y: o.centerY, kind: 'extermination_center', difficulty: q.difficulty, label: q.title })
          for (let dy = -o.radius; dy <= o.radius; dy++) {
            for (let dx = -o.radius; dx <= o.radius; dx++) {
              if ((dx !== 0 || dy !== 0) && Math.max(Math.abs(dx), Math.abs(dy)) <= o.radius)
                markers.push({ x: o.centerX + dx, y: o.centerY + dy, kind: 'extermination_area', difficulty: q.difficulty, label: '' })
            }
          }
        }
      }
    }
    return markers
  }, [allQuests])

  const isPanned     = cameraPos.x !== playerPos.x || cameraPos.y !== playerPos.y
  const selectedTile = selectedPos ? (grid[gridKey(selectedPos.x, selectedPos.y)] ?? null) : null
  const selectedSight = selectedPos && !selectedTile
    ? (sightedCells[gridKey(selectedPos.x, selectedPos.y)] ?? null)
    : null
  const playerTile = grid[gridKey(playerPos.x, playerPos.y)] ?? null
  const playerIsOnBlueTower = playerTile?.content.type === 'blueTower' && playerTile.explored

  useEffect(() => {
    if (!teleportSelecting || !teleportOrigin) return
    setSelectedPos(teleportOrigin)
    setCameraPos(teleportOrigin)
  }, [teleportOrigin, teleportSelecting])

  // Vision radius (same formula as MapViewport)
  const visRadius = Math.max(2, Math.round(derived.vision / 38))

  function handleTileClick(x: number, y: number) {
    if (teleportSelecting) {
      const tile = grid[gridKey(x, y)]
      const isOrigin = teleportOrigin?.x === x && teleportOrigin.y === y
      if (tile?.content.type === 'blueTower' && tile.explored && !isOrigin && !(playerPos.x === x && playerPos.y === y)) {
        if (teleportToBlueTower(x, y)) {
          setSelectedPos({ x, y })
          setCameraPos({ x, y })
          setTeleportSelecting(false)
          setTeleportOrigin(null)
        }
        return
      }
      setSelectedPos({ x, y })
      return
    }

    if (selectedPos?.x === x && selectedPos?.y === y) {
      if (grid[gridKey(x, y)]) setDestination(x, y)
    } else {
      setSelectedPos({ x, y })
    }
  }

  function handleGoToSelected() {
    if (!selectedPos) return
    if (!grid[gridKey(selectedPos.x, selectedPos.y)]) return
    setDestination(selectedPos.x, selectedPos.y)
  }

  function handleEnemySelect(x: number, y: number) {
    if (!grid[gridKey(x, y)]) return
    setDestination(x, y)
    setSelectedPos({ x, y })
    setCameraPos({ x, y })
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
          {/* Auto-explore toggle — cycles Manual → Auto Move → Full Auto */}
          {(() => {
            const cycle: Record<typeof autoExplore, typeof autoExplore> = {
              manual: 'move',
              move:   'full',
              full:   'manual',
            }
            const labels = {
              manual: '☞ Manual',
              move:   '⟳ Auto Move',
              full:   '⚙ Full Auto',
            }
            const styles = {
              manual: 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700',
              move:   'bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-500',
              full:   'bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-500',
            }
            const titles = {
              manual: 'Clique para Auto Move',
              move:   'Clique para Full Auto',
              full:   'Clique para Manual',
            }
            return (
              <button
                onClick={() => setAutoExplore(cycle[autoExplore])}
                title={titles[autoExplore]}
                className={cn('h-6 px-2 rounded text-[10px] font-semibold border transition-colors', styles[autoExplore])}
              >
                {labels[autoExplore]}
              </button>
            )
          })()}

          {/* Risk mode toggle — only relevant when auto-exploring */}
          {autoExplore !== 'manual' && (
            <button
              onClick={toggleRiskMode}
              title={riskMode
                ? 'Arriscado: explora tiles acima do nível. Clique para Seguro'
                : 'Seguro: respeita limite de nível. Clique para Arriscado'}
              className={cn(
                'h-6 px-2 rounded text-[10px] font-semibold border transition-colors',
                riskMode
                  ? 'bg-orange-600 border-orange-500 text-white hover:bg-orange-500'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700',
              )}
            >
              {riskMode ? '⚔ Arriscado' : '🛡 Seguro'}
            </button>
          )}

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

      {/* ── Main: viewport + sidebar ── */}
      <div className="flex gap-3 items-start">
        {/* Left: map viewport + tile info + deck */}
        <div className="flex-none flex flex-col gap-2">
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
            draggedTile={deck.find(tile => tile.id === draggingId) ?? null}
            questMarkers={questMarkers}
            onDrop={(tileId, x, y) => {
              placeTile(tileId, x, y)
              setDraggingId(null)
            }}
            onTileClick={handleTileClick}
            onCameraChange={(x, y) => setCameraPos({ x, y })}
            onZoom={dir => setZoom(z => clampZoom(z + dir * ZOOM_STEP))}
          />

          {/* Tile info panel — shows below viewport when a tile is selected */}
          {selectedPos && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3">
              <ActiveTileInfoPanel
                pos={selectedPos}
                tile={selectedTile}
                sight={selectedSight}
                heroLevel={heroLevel}
                tilesPlaced={tilesPlaced}
                isDestination={!!(destination?.x === selectedPos.x && destination?.y === selectedPos.y)}
                canUseBlueTowerTeleport={playerIsOnBlueTower && selectedPos.x === playerPos.x && selectedPos.y === playerPos.y}
                onGo={handleGoToSelected}
                teleportSelecting={teleportSelecting}
                onTeleport={() => {
                  if (!playerIsOnBlueTower || selectedPos.x !== playerPos.x || selectedPos.y !== playerPos.y) return
                  setTeleportOrigin(selectedPos)
                  setTeleportSelecting(true)
                }}
                onCancelTeleport={() => {
                  setTeleportSelecting(false)
                  setTeleportOrigin(null)
                }}
              />
            </div>
          )}

          {teleportSelecting && !selectedPos && (
            <div className="rounded-xl border border-sky-400/30 bg-sky-950/10 dark:bg-sky-950/25 p-3 flex items-center gap-3">
              <p className="text-xs font-semibold text-sky-600 dark:text-sky-300">
                {lang === 'en' ? 'Select another Blue Tower.' : 'Selecione outra torre Azul.'}
              </p>
              <button
                onClick={() => {
                  setTeleportSelecting(false)
                  setTeleportOrigin(null)
                }}
                className="ml-auto rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-wider border border-slate-300/60 dark:border-slate-600 text-slate-500 hover:bg-slate-500/10 transition-colors"
              >
                {lang === 'en' ? 'Cancel' : 'Cancelar'}
              </button>
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

        {/* Right: enemy list sidebar */}
        <div className="flex-1 min-w-0">
          <NearbyPanel
            grid={grid}
            playerPos={playerPos}
            visRadius={visRadius}
            heroLevel={heroLevel}
            tilesPlaced={tilesPlaced}
            selectedPos={selectedPos}
            onSelect={handleEnemySelect}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Nearby panel (right sidebar) ────────────────────────────────────────────

interface NearbyEntry {
  x: number; y: number
  baseLevel: number
  level: number
  monsterType: string
  monsterRarity: MonsterRarity
  enraged: boolean
  bounty: boolean
  bountyName?: string
  bountyNameEn?: string
  explored: boolean
  dist: number
  /** Pre-computed display stats (stable, no Math.random jitter per-render). */
  stats: { hp: number; atk: number; def: number }
}

interface NearbyPanelProps {
  grid: Record<string, PlacedTile>
  playerPos: { x: number; y: number }
  visRadius: number
  heroLevel: number
  tilesPlaced: number
  selectedPos: { x: number; y: number } | null
  onSelect(x: number, y: number): void
}

function NearbyPanel({ grid, playerPos, visRadius, heroLevel, tilesPlaced, selectedPos, onSelect }: NearbyPanelProps) {
  const lang = useSettingsStore(s => s.lang)
  const isEn = lang === 'en'
  const [collapsed, setCollapsed] = useState(false)

  const entries = useMemo<NearbyEntry[]>(() => {
    const result: NearbyEntry[] = []
    const revealRange = visRadius + 2   // same as MapViewport penumbra edge

    // Collect from placed grid tiles. Every non-service tile can lead to a
    // battle; monster lairs that are still unexplored are the enraged variant.
    for (const [, tile] of Object.entries(grid)) {
      if (tile.content.type === 'market' || tile.content.type === 'quest' || tile.content.type === 'blueTower') continue
      const dist = Math.max(Math.abs(tile.x - playerPos.x), Math.abs(tile.y - playerPos.y))
      if (dist > revealRange) continue
      const isBounty = tile.content.type === 'monster' && !!tile.content.bountyQuestId
      const isEnraged = tile.content.type === 'monster' && !tile.explored && !isBounty
      const baseLevel = tile.content.monsterLevel ?? tile.level
      const lvl       = isEnraged ? previewEnragedLevel(baseLevel, tilesPlaced) : baseLevel
      const fallback  = stableMonsterForTile(tile)
      const mType     = tile.content.monsterType ?? fallback.id
      const mRarity  = (tile.content.monsterRarity ?? 'normal') as MonsterRarity
      const template = FOREST_MONSTER_MAP.get(mType) ?? FOREST_MONSTERS[0]
      const monster  = buildMonster(template, lvl, mRarity, tilesPlaced)
      result.push({
        x: tile.x, y: tile.y, baseLevel, level: lvl,
        monsterType: mType, monsterRarity: mRarity,
        enraged: isEnraged,
        bounty: isBounty,
        bountyName: tile.content.bountyTargetName,
        bountyNameEn: tile.content.bountyTargetNameEn,
        explored: tile.explored,
        dist,
        stats: { hp: monster.maxHp, atk: monster.atk, def: monster.def },
      })
    }

    // Sort: undefeated first, then by distance, then by level
    result.sort((a, b) => {
      if (a.explored !== b.explored) return a.explored ? 1 : -1
      if (a.dist !== b.dist) return a.dist - b.dist
      return a.level - b.level
    })

    return result
  }, [grid, playerPos, visRadius, tilesPlaced])

  const unexploredCount = entries.filter(e => !e.explored).length

  return (
    <div
      className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 flex flex-col min-w-0 overflow-hidden"
      style={{ maxHeight: MAP_VIEWPORT_HEIGHT }}
    >
      <button
        onClick={() => setCollapsed(v => !v)}
        className="h-9 px-3 flex items-center gap-2 border-b border-slate-200 dark:border-slate-700/70 text-left hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors"
        title={collapsed ? (isEn ? 'Show nearby enemies' : 'Mostrar inimigos próximos') : (isEn ? 'Hide nearby enemies' : 'Ocultar inimigos próximos')}
      >
        <span className="text-[9px] text-slate-400 dark:text-slate-600 uppercase tracking-widest font-semibold">
          {isEn ? 'Nearby enemies' : 'Inimigos próximos'}
        </span>
        <span className="ml-auto text-[10px] text-slate-500 dark:text-slate-500 tabular-nums">
          {unexploredCount}/{entries.length}
        </span>
        <span className="w-4 text-center text-xs text-slate-500 dark:text-slate-400">
          {collapsed ? '+' : '-'}
        </span>
      </button>
      <p className="hidden">
        {isEn ? 'Nearby enemies' : 'Inimigos próximos'}
      </p>
      {!collapsed && entries.length === 0 && (
        <div className="p-3 flex items-center justify-center min-h-[120px]">
          <p className="text-[10px] text-slate-400 dark:text-slate-600 italic text-center">
            {isEn ? 'No enemies in sight' : 'Nenhum inimigo a vista'}
          </p>
        </div>
      )}

      {!collapsed && entries.length > 0 && (
        <div className="p-2 flex flex-col gap-1 overflow-y-auto min-h-0">
          {entries.map(e => {
        const template    = FOREST_MONSTER_MAP.get(e.monsterType) ?? FOREST_MONSTERS[0]
        const rarityLabel = isEn ? MONSTER_RARITY_LABEL_EN[e.monsterRarity] : MONSTER_RARITY_LABEL[e.monsterRarity]
        const rarityColor = MONSTER_RARITY_COLOR[e.monsterRarity]
        const isSelected  = selectedPos?.x === e.x && selectedPos?.y === e.y
        const isPlayer    = playerPos.x === e.x && playerPos.y === e.y
        const statusLabel = e.explored
          ? (isEn ? 'Explored' : 'Explorado')
            : (isEn ? 'Unexplored' : 'Não explorado')

        return (
          <button
            key={`${e.x},${e.y}`}
            onClick={() => onSelect(e.x, e.y)}
            title={isEn ? 'Set as movement target' : 'Definir como alvo de movimento'}
            className={cn(
              'w-full text-left rounded-lg px-2 py-1.5 border transition-colors',
              isSelected
                ? 'border-sky-400/60 bg-sky-50 dark:bg-sky-950/30'
                : isPlayer
                  ? 'border-indigo-400/50 bg-indigo-50 dark:bg-indigo-950/20'
                  : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600/40 hover:bg-slate-100 dark:hover:bg-slate-800/40',
              e.explored && 'opacity-50',
            )}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm leading-none shrink-0">{template.emoji}</span>
              <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                {rarityLabel && <span className={cn('mr-1 text-[10px]', rarityColor)}>[{rarityLabel}]</span>}
                {e.bounty ? (isEn ? e.bountyNameEn : e.bountyName) ?? monsterName(template, isEn) : monsterName(template, isEn)}
              </span>
              {e.bounty && (
                <span className="ml-auto text-[9px] font-black uppercase text-emerald-400 shrink-0">
                  {isEn ? 'Bounty' : 'Caçada'}
                </span>
              )}
              {e.enraged && (
                <span className="ml-auto text-[9px] font-black uppercase text-red-400 shrink-0">
                  {isEn ? 'Enraged' : 'Furioso'}
                </span>
              )}
              <span className={cn(e.enraged || e.bounty ? 'ml-1' : 'ml-auto', 'text-[10px] font-black tabular-nums shrink-0', levelColor(e.level, heroLevel))}>
                Nv.{e.enraged ? `${e.baseLevel}+` : e.level}
              </span>
            </div>
            <div className="flex gap-2 mt-0.5 text-[9px] text-slate-500 tabular-nums">
              <span className="text-red-500/80">❤ {e.stats.hp}</span>
              <span className="text-orange-500/80">⚔ {e.stats.atk}</span>
              <span className="text-blue-500/70">🛡 {e.stats.def}</span>
              <span className="text-slate-400">({e.x},{e.y})</span>
              <span className={cn('font-semibold', e.explored ? 'text-green-600' : 'text-sky-500')}>
                {statusLabel}
              </span>
            </div>
          </button>
        )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Tile info sub-component ─────────────────────────────────────────────────

function ActiveTileInfoPanel({
  pos,
  tile,
  sight,
  heroLevel,
  tilesPlaced = 0,
  isDestination,
  canUseBlueTowerTeleport,
  onGo,
  teleportSelecting,
  onTeleport,
  onCancelTeleport,
}: {
  pos: { x: number; y: number }
  tile: PlacedTile | null
  sight: TileContent | null
  heroLevel: number
  tilesPlaced?: number
  isDestination: boolean
  canUseBlueTowerTeleport: boolean
  onGo(): void
  teleportSelecting: boolean
  onTeleport(): void
  onCancelTeleport(): void
}) {
  const lang = useSettingsStore(s => s.lang)
  const isEn = lang === 'en'

  const content = tile?.content ?? sight
  const level = tile?.level ?? content?.monsterLevel ?? null
  const explored = tile?.explored ?? false
  const isBlocked = !tile
  const isUnexplored = !!tile && !explored
  const isBlueTower = content?.type === 'blueTower'

  const stateLabel = isBlocked
    ? (isEn ? 'Obstructed' : 'Obstruido')
    : isUnexplored
      ? (isEn ? 'Unexplored' : 'Inexplorado')
      : (isEn ? 'Explored' : 'Explorado')

  const contentLabel =
    !content                   ? (isEn ? 'Unknown' : 'Desconhecido') :
    content.type === 'market'  ? (isEn ? 'Market' : 'Mercado') :
    content.type === 'monster' && content.bountyQuestId ? (isEn ? 'Bounty Target' : 'Alvo de missão') :
    content.type === 'monster' ? (isEn ? 'Monster Lair' : 'Covil') :
    content.type === 'treasure'? (isEn ? 'Treasure' : 'Tesouro') :
    content.type === 'blueTower'? (isEn ? 'Blue Tower' : 'Torre Azul') :
    content.type === 'quest'   ? 'Quest' :
                                  (isEn ? 'Wild Path' : 'Caminho selvagem')

  const headerColor =
    isBlocked                  ? 'text-slate-400' :
    content?.type === 'market' ? 'text-indigo-400' :
    content?.type === 'monster'? 'text-red-400' :
    content?.type === 'treasure'? 'text-yellow-400' :
    content?.type === 'blueTower'? 'text-sky-400' :
    content?.type === 'quest'  ? 'text-emerald-400' : 'text-slate-400'

  const enemyInfo = tile && content && content.type !== 'market' && content.type !== 'quest' && content.type !== 'blueTower'
    ? (() => {
        const baseLevel = content.monsterLevel ?? tile.level
        const bounty = content.type === 'monster' && !!content.bountyQuestId
        const enraged = !tile.explored && content.type === 'monster' && !bounty
        const lvl = enraged ? previewEnragedLevel(baseLevel, tilesPlaced) : baseLevel
        const rarity = (content.monsterRarity ?? 'normal') as MonsterRarity
        const template = content.monsterType
          ? (FOREST_MONSTER_MAP.get(content.monsterType) ?? stableMonsterForTile(tile))
          : stableMonsterForTile(tile)
        return {
          template,
          stats: estimateMonster(template, lvl, rarity, tilesPlaced),
          level: lvl,
          baseLevel,
          enraged,
          bounty,
          bountyName: content.bountyTargetName,
          bountyNameEn: content.bountyTargetNameEn,
          rarity,
        }
      })()
    : null

  const levelDelta = level == null ? null : level - heroLevel
  const canGo = !!tile && !isDestination
  const canTeleport = !!tile && isBlueTower && explored && canUseBlueTowerTeleport
  const blueTowerDescription = teleportSelecting
    ? (isEn ? 'Select another Blue Tower.' : 'Selecione outra torre Azul.')
    : isBlocked
      ? (isEn ? 'This tower connects to the other blue towers.' : 'Esta torre se conecta com as outras torres azuis.')
      : isUnexplored
        ? (isEn ? 'This tower connects to the others, but this one is still dormant.' : 'Esta torre se conecta com as outras, esta ainda está adormecida.')
        : (isEn ? 'This tower connects to the others. Its windows glow.' : 'Esta torre se conecta com as outras, Suas janelas brilham.')

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className={cn('text-[10px] font-bold uppercase tracking-widest', headerColor)}>
          {stateLabel}
        </span>
        <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
          {contentLabel}
        </span>
        <span className="text-[10px] text-slate-500 dark:text-slate-600 tabular-nums">
          ({pos.x}, {pos.y}){level == null ? '' : ` - L${level}`}
        </span>
        <button
          onClick={onGo}
          disabled={!canGo || teleportSelecting}
          className={cn(
            'ml-auto rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-wider border transition-colors',
            canGo && !teleportSelecting
              ? 'border-sky-400/50 text-sky-500 hover:bg-sky-500/10'
              : 'border-slate-300/50 dark:border-slate-700 text-slate-400 cursor-default',
          )}
        >
          {isDestination ? (isEn ? 'Target' : 'Alvo') : (isEn ? 'Go' : 'Ir')}
        </button>
        {canTeleport && !teleportSelecting && (
          <button
            onClick={onTeleport}
            className="rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-wider border border-sky-400/50 text-sky-500 hover:bg-sky-500/10 transition-colors"
          >
            Teleport
          </button>
        )}
        {teleportSelecting && (
          <button
            onClick={onCancelTeleport}
            className="rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-wider border border-slate-300/60 dark:border-slate-600 text-slate-500 hover:bg-slate-500/10 transition-colors"
          >
            {isEn ? 'Cancel' : 'Cancelar'}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-2 text-[10px] text-slate-500 dark:text-slate-500">
        {levelDelta != null && (
          <span className={cn('rounded border px-1.5 py-0.5 font-semibold border-current/20', levelColor(level ?? heroLevel, heroLevel))}>
            {isEn ? 'Level delta' : 'Dif. nivel'} {levelDelta > 0 ? '+' : ''}{levelDelta}
          </span>
        )}
        {enemyInfo?.enraged && (
          <span className="rounded border border-red-400/20 px-1.5 py-0.5 font-semibold text-red-400">
            {isEn ? 'Enraged' : 'Furioso'} +{enemyInfo.level - enemyInfo.baseLevel}
          </span>
        )}
        {enemyInfo?.bounty && (
          <span className="rounded border border-emerald-400/20 px-1.5 py-0.5 font-semibold text-emerald-400">
            {isEn ? 'Bounty target' : 'Alvo de missão'}
          </span>
        )}
        {enemyInfo && enemyInfo.rarity !== 'normal' && (
          <span className={cn('rounded border px-1.5 py-0.5 font-semibold border-current/20', MONSTER_RARITY_COLOR[enemyInfo.rarity])}>
            {isEn ? MONSTER_RARITY_LABEL_EN[enemyInfo.rarity] : MONSTER_RARITY_LABEL[enemyInfo.rarity]}
          </span>
        )}
      </div>

      {isBlocked && (
        <div className="text-[11px] text-slate-500">
          {isBlueTower
            ? blueTowerDescription
            : (isEn ? 'No valid tile has been placed here yet.' : 'Ainda nao existe tile valido nesta celula.')}
        </div>
      )}

      {isBlueTower && !isBlocked && (
        <div className="text-[11px] text-sky-400/80">
          {blueTowerDescription}
        </div>
      )}

      {enemyInfo && (
        <div className="flex flex-wrap gap-3 text-[11px] text-slate-400">
          <span>{enemyInfo.template.emoji} {monsterName(enemyInfo.template, isEn)} <span className="text-red-400 font-semibold">Nv.{enemyInfo.level}</span></span>
          <span>HP <span className="text-slate-300">{enemyInfo.stats.maxHp}</span></span>
          <span>ATK <span className="text-slate-300">{enemyInfo.stats.atk}</span></span>
          <span>DEF <span className="text-slate-300">{enemyInfo.stats.def}</span></span>
          {explored && <span className="text-green-700 text-[10px]">{isEn ? 'Resolved' : 'Resolvido'}</span>}
        </div>
      )}

      {content?.type === 'treasure' && (
        <div className="text-[11px] text-slate-400">
          {explored
            ? <span className="text-green-700">{isEn ? 'Collected' : 'Coletado'}</span>
            : <span>{isEn ? 'Reward' : 'Recompensa'}: <span className="text-yellow-400 font-semibold">+{content.xpAmount} XP</span></span>
          }
        </div>
      )}

      {content?.type === 'market' && (
        <div className="text-[11px] text-indigo-400/80">
          {isEn ? 'Walk here to enter the shop.' : 'Va ate aqui para entrar na loja.'}
        </div>
      )}
    </div>
  )
}

export function TileInfoPanel({ tile, onClose, tilesPlaced = 0 }: { tile: PlacedTile; onClose(): void; tilesPlaced?: number }) {
  const lang = useSettingsStore(s => s.lang)
  const isEn = lang === 'en'

  const { content, level, explored, x, y } = tile

  // Stable random monster for empty tiles — recomputed only when the tile changes.
  const emptyMonster = useRef<{ template: typeof FOREST_RANDOM_MONSTERS[0]; stats: ReturnType<typeof buildMonster> } | null>(null)
  const emptyTileKey = `${x},${y}`
  const prevKey = useRef('')
  if (content.type === 'empty' && prevKey.current !== emptyTileKey) {
    prevKey.current = emptyTileKey
    const candidates = monstersForBiome(tile.biome)
    const pool = candidates.length > 0 ? candidates : FOREST_RANDOM_MONSTERS
    const tpl = pool[Math.floor(Math.random() * pool.length)]
    emptyMonster.current = { template: tpl, stats: buildMonster(tpl, level, 'normal', tilesPlaced) }
  }

  const headerLabel =
    content.type === 'market'   ? (isEn ? 'Market' : 'Mercado') :
    content.type === 'monster'  ? (isEn ? 'Monster Lair' : 'Covil') :
    content.type === 'treasure' ? (isEn ? 'Treasure' : 'Tesouro') :
    content.type === 'blueTower'? (isEn ? 'Blue Tower' : 'Torre Azul') :
                                   (isEn ? 'Explored' : 'Explorado')

  const headerColor =
    content.type === 'market'   ? 'text-indigo-400' :
    content.type === 'monster'  ? 'text-red-400' :
    content.type === 'treasure' ? 'text-yellow-400' :
    content.type === 'blueTower'? 'text-sky-400' : 'text-slate-400'

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
        const lvl      = content.monsterLevel ?? level
        const template = FOREST_MONSTER_MAP.get(content.monsterType ?? '') ?? FOREST_MONSTERS[0]
        const g        = buildMonster(template, lvl, (content.monsterRarity ?? 'normal') as MonsterRarity, tilesPlaced)
        return (
          <div className="flex gap-4 text-[11px] text-slate-400">
            <span>{template.emoji} {monsterName(template, isEn)} <span className="text-red-400 font-semibold">Nv.{lvl}</span></span>
            <span>HP <span className="text-slate-300">{g.maxHp}</span></span>
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

      {content.type === 'empty' && emptyMonster.current && (() => {
        const { template, stats: g } = emptyMonster.current!
        return (
          <div className="flex gap-3 text-[11px] text-slate-400">
            <span>{template.emoji} {monsterName(template, isEn)} <span className="text-red-400 font-semibold">Nv.{level}</span></span>
            <span>HP <span className="text-slate-300">{g.maxHp}</span></span>
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
