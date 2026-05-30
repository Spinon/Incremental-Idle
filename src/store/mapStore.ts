import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { useBattleStore } from './battleStore'
import { pickForestMonster } from '../data/monsters'
import { pickMonsterRarity } from '../formulas/monsters'
import type { MonsterRarity } from '../types/monster'
import type { Direction, MapTile, PlacedTile, TileContent } from '../types/map'

export const DIR_OPPOSITE: Record<Direction, Direction> = { N: 'S', S: 'N', E: 'W', W: 'E' }
export const DIR_DELTA: Record<Direction, { dx: number; dy: number }> = {
  N: { dx: 0, dy: -1 },
  S: { dx: 0, dy:  1 },
  E: { dx:  1, dy: 0 },
  W: { dx: -1, dy: 0 },
}

export const DIRS: Direction[] = ['N', 'S', 'E', 'W']

export function gridKey(x: number, y: number): string { return `${x},${y}` }

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Picks a tile level centred on `heroLevel` with a ±5 triangular distribution.
 * The sum of two uniform [-5, +5] samples produces a tent-shaped probability
 * curve: levels near the centre are ~3× more likely than the extremes.
 */
function heroRelativeLevel(heroLevel: number): number {
  // Biased triangular distribution: peak at heroLevel-1, range heroLevel-5 to heroLevel+3.
  // ~16% of generated tiles exceed heroLevel (was ~41% with the ±5 centred formula).
  const offset = Math.round((Math.random() + Math.random() - 1) * 3.5) - 1
  return Math.max(1, heroLevel + offset)
}

export function generateContent(level: number, tilesPlaced = 0): TileContent {
  const r = Math.random()
  if (r < 0.015) return { type: 'market' }
  if (r < 0.04) {
    return {
      type: 'treasure',
      xpAmount: Math.round((8 + level * 4) * (0.8 + Math.random() * 0.4)),
    }
  }
  if (r < 0.10) {
    return {
      type: 'monster',
      monsterLevel: level,
      monsterType:   pickForestMonster().id,
      monsterRarity: pickMonsterRarity(tilesPlaced),
    }
  }
  return { type: 'empty' }
}

let _uid = 0
export function generateTile(level: number): MapTile {
  // 1 exit: ~4%  |  2 exits: 46%  |  3 exits: 36%  |  4 exits: 14%
  const r = Math.random()
  const count = r < 0.04 ? 1 : r < 0.50 ? 2 : r < 0.86 ? 3 : 4
  const connections = shuffle(DIRS).slice(0, count) as Direction[]

  return {
    id: `t${Date.now()}_${_uid++}`,
    connections,
    biome: 'forest',
    level,
    content: { type: 'empty' },
  }
}

// ms to generate one tile at moveSpeed 1.0 (after early-game factor normalises)
export const TILE_GEN_BASE_MS = 18000

const INITIAL_TILE: PlacedTile = {
  id: 't0', x: 0, y: 0,
  connections: ['N', 'S', 'E', 'W'],
  biome: 'forest', level: 1,
  content: { type: 'empty' },
  explored: true,
}

// BFS: find the nearest unexplored tile reachable via connected paths (returns the target, not the step).
// When maxLevel is provided (auto-explore mode), unexplored tiles above that level are treated as
// barriers: they are neither returned as targets nor traversed further.
function findNearestUnexplored(
  grid: Record<string, PlacedTile>,
  from: { x: number; y: number },
  maxLevel?: number,
): { x: number; y: number } | null {
  const visited = new Set<string>()
  const queue: Array<{ x: number; y: number }> = [{ x: from.x, y: from.y }]
  visited.add(gridKey(from.x, from.y))

  while (queue.length) {
    const { x, y } = queue.shift()!
    const tile = grid[gridKey(x, y)]
    if (!tile) continue

    for (const dir of tile.connections) {
      const { dx, dy } = DIR_DELTA[dir]
      const nx = x + dx, ny = y + dy
      const key = gridKey(nx, ny)
      if (visited.has(key)) continue
      visited.add(key)
      const neighbor = grid[key]
      if (!neighbor?.connections.includes(DIR_OPPOSITE[dir])) continue
      if (!neighbor.explored) {
        // If over the level cap, treat as a barrier — don't enter or path through
        if (maxLevel !== undefined && neighbor.level > maxLevel) continue
        return { x: nx, y: ny }
      }
      queue.push({ x: nx, y: ny })
    }
  }
  return null
}

// BFS: find the first step toward a specific destination via connected paths.
function findNextStep(
  grid: Record<string, PlacedTile>,
  from: { x: number; y: number },
  destination: { x: number; y: number },
): { x: number; y: number } | null {
  const visited = new Set<string>()
  const queue: Array<{ x: number; y: number; first: { x: number; y: number } | null }> = [
    { x: from.x, y: from.y, first: null },
  ]
  visited.add(gridKey(from.x, from.y))

  while (queue.length) {
    const { x, y, first } = queue.shift()!
    const tile = grid[gridKey(x, y)]
    if (!tile) continue

    for (const dir of tile.connections) {
      const { dx, dy } = DIR_DELTA[dir]
      const nx = x + dx, ny = y + dy
      const key = gridKey(nx, ny)
      if (visited.has(key)) continue
      visited.add(key)
      const neighbor = grid[key]
      if (!neighbor?.connections.includes(DIR_OPPOSITE[dir])) continue
      const step = first ?? { x: nx, y: ny }
      if (nx === destination.x && ny === destination.y) return step
      queue.push({ x: nx, y: ny, first: step })
    }
  }
  return null
}

/**
 * Returns every valid (tileId, x, y) placement the current deck can make on
 * the grid.  Used by auto-place to pick a random legal move.
 */
function findValidPlacements(
  grid: Record<string, PlacedTile>,
  deck: MapTile[],
): { tileId: string; x: number; y: number }[] {
  const results: { tileId: string; x: number; y: number }[] = []
  const seen = new Set<string>()

  for (const gridTile of Object.values(grid)) {
    for (const dir of gridTile.connections) {
      const { dx, dy } = DIR_DELTA[dir]
      const nx = gridTile.x + dx
      const ny = gridTile.y + dy
      if (grid[gridKey(nx, ny)]) continue   // slot already occupied

      for (const deckTile of deck) {
        const combo = `${deckTile.id}:${nx},${ny}`
        if (seen.has(combo)) continue

        let matchCount = 0, conflict = false
        for (const d of DIRS) {
          const { dx: ddx, dy: ddy } = DIR_DELTA[d]
          const neighbor = grid[gridKey(nx + ddx, ny + ddy)]
          if (!neighbor) continue
          const neighborFacesUs = neighbor.connections.includes(DIR_OPPOSITE[d])
          const weFaceNeighbor  = deckTile.connections.includes(d)
          if (neighborFacesUs !== weFaceNeighbor) { conflict = true; break }
          if (neighborFacesUs && weFaceNeighbor)  matchCount++
        }
        if (!conflict && matchCount > 0) {
          seen.add(combo)
          results.push({ tileId: deckTile.id, x: nx, y: ny })
        }
      }
    }
  }
  return results
}


interface MapStore {
  grid: Record<string, PlacedTile>
  deck: MapTile[]
  playerPos: { x: number; y: number }
  destination: { x: number; y: number } | null
  deckAccum: number
  pendingXp: number
  pendingGold: number
  /** Monster-specific XP kept separate so a hero-level range check can be applied. */
  pendingMonsterXp: { xp: number; monsterLevel: number } | null
  sightedCells: Record<string, TileContent>
  /**
   * 'manual'   — player controls everything (no automation)
   * 'move'     — auto-pathfinding to unexplored tiles (original Auto behaviour)
   * 'full'     — auto-pathfinding + auto-tile-placement + auto-restart when stuck
   */
  autoExplore: 'manual' | 'move' | 'full'
  scene: 'map' | 'home' | 'market'
  tilesPlaced: number
  defeatPending: boolean
  /**
   * Set when auto-explore detects the map is fully enclosed and triggers a
   * forced home transition so the journey can be restarted automatically.
   * Not persisted — cleared on every resetMap / leaveScene.
   */
  stuckPending: boolean
  /** Flat bonus added to the position-based level formula when a new journey starts. */
  levelOffset: number
  /**
   * How many more deck tiles should spawn at heroLevel-5 before the normal
   * hero-relative distribution kicks in.  Reset to 5 at every journey start
   * so the player can't immediately face a too-strong enemy after a defeat.
   */
  easyTilesRemaining: number
  /**
   * When true, auto-explore ignores the hero-level cap and paths into tiles
   * above the hero's level.  Persisted so the choice survives page reloads.
   */
  riskMode: boolean

  placeTile(tileId: string, x: number, y: number): void
  setDestination(x: number, y: number): void
  setAutoExplore(v: 'manual' | 'move' | 'full'): void
  toggleRiskMode(): void
  drainXp(): number
  drainGold(): number
  drainMonsterXp(): { xp: number; monsterLevel: number } | null
  goHome(): void
  leaveScene(): void
  exitMarket(): void
  /**
   * Called when the scene transitions market→map.
   * Marks the exit tile as explored, queues first-encounter rewards and the
   * correct enemy — fixing the bug where market exits skipped tile processing.
   */
  processMarketExitTile(): void
  handleDefeat(): void
  /**
   * Try to place a random valid deck tile on the grid.
   * When `maxTileLevel` is provided only tiles at or below that level are
   * considered — keeps placed tiles within the hero's auto-explore range so
   * `findNearestUnexplored` can always find a reachable destination.
   * Returns true if a tile was placed.
   */
  tryAutoPlace(maxTileLevel?: number): boolean
  /** Returns true if ANY deck tile can be legally placed (no level filter). */
  canAutoPlace(): boolean
  /** Send the player home and mark the map as stuck (triggers auto-restart UI). */
  handleStuck(): void
  /**
   * Spell effect — add `count` tiles at exactly `heroLevel` to the deck,
   * ignoring the normal deck-size cap (bonus tiles from magic).
   */
  generateSpellTiles(count: number, heroLevel: number): void
  /**
   * Spell effect — discard the `count` highest-level tiles from the deck
   * (the ones most likely to be above the hero's auto-explore range) then
   * generate that many fresh tiles at `heroLevel`.
   */
  refreshSpellDeck(count: number, heroLevel: number): void
  moveOneStep(heroLevel?: number): void
  resetMap(startLevel?: number): void
  tickMap(deltaMs: number, moveSpeed: number, maxDeck: number, vision: number, heroLevel: number): void
}

export const useMapStore = create<MapStore>()(
  persist(
    immer((set, get) => ({
      grid: { [gridKey(0, 0)]: { ...INITIAL_TILE } },
      deck: Array.from({ length: 3 }, () => generateTile(1)),
      playerPos: { x: 0, y: 0 },
      destination: null,
      deckAccum: 0,
      pendingXp: 0,
      pendingGold: 0,
      pendingMonsterXp: null,
      sightedCells: {},
      autoExplore: 'move' as 'manual' | 'move' | 'full',
      scene: 'map' as 'map' | 'home' | 'market',
      tilesPlaced: 0,
      defeatPending: false,
      stuckPending: false,
      levelOffset: 0,
      easyTilesRemaining: 5,
      riskMode: false,

      setAutoExplore:  (v) => set((st) => { st.autoExplore = v }),
      toggleRiskMode:  ()  => set((st) => { st.riskMode = !st.riskMode }),

      goHome:     () => set((st) => { st.scene = 'home'; st.destination = null }),
      leaveScene: () => set((st) => { st.scene = 'map'; st.stuckPending = false }),

      tryAutoPlace: (maxTileLevel?: number): boolean => {
        const { grid, deck } = get()
        // Only consider tiles within the hero's reachable level — tiles above
        // the cap would be invisible to findNearestUnexplored, making the hero
        // stand still with "no destination" after placing them.
        const eligible = maxTileLevel !== undefined
          ? deck.filter(t => t.level <= maxTileLevel)
          : deck
        const placements = findValidPlacements(grid, eligible)
        if (placements.length === 0) return false
        const choice = placements[Math.floor(Math.random() * placements.length)]
        get().placeTile(choice.tileId, choice.x, choice.y)
        return true
      },

      canAutoPlace: (): boolean => {
        const { grid, deck } = get()
        return findValidPlacements(grid, deck).length > 0
      },

      handleStuck: () => set((st) => {
        st.scene        = 'home'
        st.destination  = null
        st.stuckPending = true
      }),

      generateSpellTiles: (count, heroLevel) => set((st) => {
        for (let i = 0; i < count; i++) {
          st.deck.push(generateTile(heroLevel))
        }
      }),

      refreshSpellDeck: (count, heroLevel) => set((st) => {
        if (st.deck.length === 0) {
          // Deck already empty — just generate fresh tiles
          for (let i = 0; i < count; i++) st.deck.push(generateTile(heroLevel))
          return
        }
        // Remove the `count` highest-level tiles (the ones that are most likely
        // to be stuck above the hero's auto-explore level cap)
        const byLevelDesc = [...st.deck].sort((a, b) => b.level - a.level)
        const remove = new Set(byLevelDesc.slice(0, Math.min(count, st.deck.length)).map(t => t.id))
        st.deck = st.deck.filter(t => !remove.has(t.id))
        // Replace with fresh tiles at hero level
        for (let i = 0; i < count; i++) st.deck.push(generateTile(heroLevel))
      }),

      // Process the tile the hero is standing on after a market exit.
      // Mirrors moveOneStep's tile-entry logic: marks explored, grants first-
      // encounter rewards, and queues the correct enemy (with tilesPlaced so
      // the stealth buff is applied).
      processMarketExitTile: () => {
        let queueLevel:       number | null = null
        let queueType:        string | undefined
        let queueRarity:      MonsterRarity | undefined
        let queueTilesPlaced  = 0

        set((st) => {
          const tile = st.grid[gridKey(st.playerPos.x, st.playerPos.y)]
          if (!tile || tile.content.type === 'market') return

          const isMonster        = tile.content.type === 'monster'
          const isFirstEncounter = isMonster && !tile.explored
          const enemyLevel       = isFirstEncounter
            ? tile.level + Math.ceil(Math.random() * 5)
            : tile.level

          queueLevel       = Math.max(1, enemyLevel)
          queueType        = tile.content.monsterType
          queueRarity      = tile.content.monsterRarity as MonsterRarity | undefined
          queueTilesPlaced = st.tilesPlaced

          if (isFirstEncounter) {
            st.pendingGold += Math.round((15 + enemyLevel * 8) * (0.8 + Math.random() * 0.4))
            st.pendingMonsterXp = {
              xp:          Math.round((10 + enemyLevel * 4) * (0.8 + Math.random() * 0.4)),
              monsterLevel: enemyLevel,
            }
          }

          if (!tile.explored) {
            tile.explored = true
            if (tile.content.type === 'treasure' && tile.content.xpAmount) {
              st.pendingXp   += tile.content.xpAmount
              tile.content    = { type: 'empty' }
            }
          }
        })

        if (queueLevel !== null) {
          useBattleStore.getState().queueEnemy(queueLevel, queueType, queueRarity, queueTilesPlaced)
        }
      },

      // Exit market: move the player to a random connected adjacent tile and
      // return to the map.  No enemy is queued here — the next battle starts
      // naturally when moveOneStep processes the hero's first step after the
      // market.  Treasure on the exit tile is still collected (non-combat).
      exitMarket: () => {
        set((st) => {
          const pos  = st.playerPos
          const tile = st.grid[gridKey(pos.x, pos.y)]

          const exits: { x: number; y: number }[] = []
          if (tile) {
            for (const dir of tile.connections) {
              const { dx, dy } = DIR_DELTA[dir]
              const nx = pos.x + dx, ny = pos.y + dy
              const neighbor = st.grid[gridKey(nx, ny)]
              if (neighbor && neighbor.connections.includes(DIR_OPPOSITE[dir])) {
                exits.push({ x: nx, y: ny })
              }
            }
          }

          if (exits.length > 0) {
            // Prefer the exit toward the current destination (if any, and if it's not the market itself)
            const dest         = st.destination
            const destIsMarket = dest && dest.x === pos.x && dest.y === pos.y
            let chosenExit: { x: number; y: number } | null = null

            if (dest && !destIsMarket) {
              const nextStep = findNextStep(st.grid, pos, dest)
              if (nextStep && exits.some(e => e.x === nextStep.x && e.y === nextStep.y)) {
                chosenExit = nextStep
              }
            }
            if (!chosenExit) chosenExit = exits[Math.floor(Math.random() * exits.length)]

            st.playerPos = chosenExit
            if (!dest || destIsMarket) st.destination = null

            // Collect treasure on exit tile (non-combat pickup) but do NOT
            // queue a monster fight — that happens via the normal moveOneStep.
            const exitTile = st.grid[gridKey(chosenExit.x, chosenExit.y)]
            if (exitTile && !exitTile.explored && exitTile.content.type === 'treasure') {
              exitTile.explored = true
              if (exitTile.content.xpAmount) {
                st.pendingXp       += exitTile.content.xpAmount
                exitTile.content    = { type: 'empty' }
              }
            }
          }

          st.scene = 'map'
        })
        // intentionally no queueEnemy call — battle starts on next moveOneStep
      },

      handleDefeat: () => set((st) => {
        st.scene          = 'home'
        st.destination    = null
        st.defeatPending  = true
      }),

      setDestination: (x, y) => set((st) => {
        if (st.playerPos.x === x && st.playerPos.y === y) return
        if (!st.grid[gridKey(x, y)]) return
        st.destination = { x, y }
      }),

      placeTile: (tileId, x, y) => set((st) => {
        const key = gridKey(x, y)
        if (st.grid[key]) return
        const idx = st.deck.findIndex(t => t.id === tileId)
        if (idx === -1) return
        const tile = st.deck[idx]

        let matchCount = 0
        let conflict   = false
        for (const dir of DIRS) {
          const { dx, dy } = DIR_DELTA[dir]
          const neighbor = st.grid[gridKey(x + dx, y + dy)]
          if (!neighbor) continue
          const neighborFacesUs = neighbor.connections.includes(DIR_OPPOSITE[dir])
          const weFaceNeighbor  = tile.connections.includes(dir)
          // A neighbor exists on this side — both directions must agree:
          //   • neighbor opens toward us but we don't open back → we're blocking their exit
          //   • we open toward neighbor but they don't open back → our exit hits their wall
          if (neighborFacesUs !== weFaceNeighbor) { conflict = true; break }
          if (neighborFacesUs && weFaceNeighbor)  matchCount++
        }
        if (conflict || matchCount === 0) return

        // Preserve the content TYPE shown in the fog (monster/treasure/market) so
        // what the player saw in the preview matches what they get — but recalculate
        // any level-dependent values (monsterLevel, xpAmount) from tileLevel so
        // the difficulty is always consistent with the tile's badge.
        const tileLevel = tile.level
        const sighted   = st.sightedCells[key]
        let content: TileContent
        if (sighted) {
          if (sighted.type === 'monster') {
            content = {
              type: 'monster',
              monsterLevel:  tileLevel,
              monsterType:   sighted.monsterType   ?? pickForestMonster().id,
              monsterRarity: sighted.monsterRarity ?? pickMonsterRarity(),
            }
          } else if (sighted.type === 'treasure') {
            content = { type: 'treasure', xpAmount: Math.round((20 + tileLevel * 10) * (0.8 + Math.random() * 0.4)) }
          } else {
            content = { type: sighted.type } as TileContent   // market or empty — level-independent
          }
        } else {
          content = generateContent(tileLevel, st.tilesPlaced)
        }
        delete st.sightedCells[key]

        st.deck.splice(idx, 1)
        st.grid[key] = { ...tile, x, y, explored: false, content }
        st.tilesPlaced += 1
      }),

      drainXp: () => {
        const xp = get().pendingXp
        if (xp > 0) set((st) => { st.pendingXp = 0 })
        return xp
      },

      drainGold: () => {
        const gold = get().pendingGold
        if (gold > 0) set((st) => { st.pendingGold = 0 })
        return gold
      },

      drainMonsterXp: () => {
        const m = get().pendingMonsterXp
        if (m) set((st) => { st.pendingMonsterXp = null })
        return m
      },

      moveOneStep: (heroLevel?: number) => {
        let queueLevel:       number | null = null
        let queueType:        string | undefined
        let queueRarity:      MonsterRarity | undefined
        let queueTilesPlaced  = 0

        set((st) => {
          if (!st.destination && st.autoExplore !== 'manual') {
            // In risk mode the level cap is lifted — the hero willingly enters
            // tiles above its level.  In safe mode the cap prevents pathing
            // into unexplored tiles above heroLevel.
            const cap    = (heroLevel !== undefined && !st.riskMode) ? heroLevel : undefined
            const target = findNearestUnexplored(st.grid, st.playerPos, cap)
            if (target) st.destination = target
          }

          if (!st.destination) return

          const next = findNextStep(st.grid, st.playerPos, st.destination)
          if (next) {
            st.playerPos = next
            if (next.x === st.destination.x && next.y === st.destination.y) {
              st.destination = null
            }
            const tile = st.grid[gridKey(next.x, next.y)]
            if (tile) {
              if (tile.content.type === 'market') {
                st.scene = 'market'
                if (!tile.explored) tile.explored = true
              } else {
                const isMonster        = tile.content.type === 'monster'
                const isFirstEncounter = isMonster && !tile.explored
                const enemyLevel = isFirstEncounter
                  ? tile.level + Math.ceil(Math.random() * 5)
                  : tile.level
                queueLevel       = Math.max(1, enemyLevel)
                queueType        = tile.content.monsterType
                queueRarity      = tile.content.monsterRarity as MonsterRarity | undefined
                queueTilesPlaced = st.tilesPlaced

                if (isFirstEncounter) {
                  st.pendingGold     += Math.round((15 + enemyLevel * 8) * (0.8 + Math.random() * 0.4))
                  st.pendingMonsterXp = {
                    xp:          Math.round((10 + enemyLevel * 4) * (0.8 + Math.random() * 0.4)),
                    monsterLevel: enemyLevel,
                  }
                }

                if (!tile.explored) {
                  tile.explored = true
                  if (tile.content.type === 'treasure' && tile.content.xpAmount) {
                    st.pendingXp += tile.content.xpAmount
                    tile.content = { type: 'empty' }
                  }
                }
              }
            }
          } else {
            st.destination = null
          }
        })

        if (queueLevel !== null) {
          useBattleStore.getState().queueEnemy(queueLevel, queueType, queueRarity, queueTilesPlaced)
        }
      },

      resetMap: (startLevel) => set((st) => {
        // First tiles are always 5 levels below the hero to avoid defeat loops
        const deckLevel = Math.max(1, (startLevel ?? 1) - 5)
        st.grid               = { [gridKey(0, 0)]: { ...INITIAL_TILE, level: deckLevel } }
        st.deck               = Array.from({ length: 3 }, () => generateTile(deckLevel))
        st.playerPos          = { x: 0, y: 0 }
        st.destination        = null
        st.deckAccum          = 0
        st.pendingXp          = 0
        st.pendingGold        = 0
        st.pendingMonsterXp   = null
        st.sightedCells       = {}
        st.scene              = 'map'
        st.tilesPlaced        = 0
        st.defeatPending      = false
        st.stuckPending       = false
        st.levelOffset        = 0
        // 5 more easy tiles generated by tickMap after the 3 initial deck tiles
        st.easyTilesRemaining = 5
      }),

      tickMap: (deltaMs, moveSpeed, maxDeck, vision, heroLevel) => set((st) => {
        const speed = Math.max(0.5, moveSpeed)

        // Tile deck generation
        if (st.deck.length < maxDeck) {
          st.deckAccum += deltaMs
          // Early-game slowdown: starts at ~40% speed, normalises around 20 placed tiles
          const earlyFactor = Math.min(1, 0.4 + st.tilesPlaced * 0.03)
          const interval = TILE_GEN_BASE_MS / (speed * earlyFactor)
          while (st.deckAccum >= interval && st.deck.length < maxDeck) {
            st.deckAccum -= interval
            let lvl: number
            if (st.easyTilesRemaining > 0) {
              // Warm-up phase: stay 5 levels below the hero to avoid defeat loops
              lvl = Math.max(1, heroLevel - 5)
              st.easyTilesRemaining -= 1
            } else {
              // Normal phase: ±5 triangular distribution around hero level
              lvl = heroRelativeLevel(heroLevel)
            }
            st.deck.push(generateTile(lvl))
          }
        }

        // Reveal empty cells within vision range (fog of war on the grid)
        const visRadius = Math.max(2, Math.round(vision / 38))
        const revealRange = visRadius + 2  // matches penumbra edge in viewport
        const { x: px, y: py } = st.playerPos
        for (let dy = -revealRange; dy <= revealRange; dy++) {
          for (let dx = -revealRange; dx <= revealRange; dx++) {
            const dist = Math.max(Math.abs(dx), Math.abs(dy))
            if (dist > revealRange) continue
            const gx = px + dx, gy = py + dy
            const key = gridKey(gx, gy)
            if (st.grid[key] || st.sightedCells[key]) continue
            // Fog content also hero-relative so previewed areas feel appropriate
            const lvl = heroRelativeLevel(heroLevel)
            st.sightedCells[key] = generateContent(lvl, st.tilesPlaced)
          }
        }
      }),
    })),
    {
      name: 'incremental-idle-map',
      version: 1,
      migrate: (raw, version) => {
        const s = raw as Record<string, unknown>
        // v0 stored autoExplore as boolean — migrate to the 3-state string
        if (version < 1 && typeof s.autoExplore === 'boolean') {
          s.autoExplore = s.autoExplore ? 'move' : 'manual'
        }
        return s as unknown as MapStore
      },
    },
  ),
)
