import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { useBattleStore } from './battleStore'
import { useQuestStore } from './questStore'
import { FOREST_RANDOM_MONSTERS, monstersForBiome, pickMonsterForBiome } from '../data/monsters'
import { pickMonsterRarity } from '../formulas/monsters'
import { generateQuest } from '../formulas/quests'
import { createTreasureChest } from '../formulas/chests'
import { generateNpc } from '../formulas/npcs'
import type { BountyTileEntry } from '../formulas/quests'
import type { MonsterRarity } from '../types/monster'
import type { Biome, Direction, MapTile, PlacedTile, TileContent } from '../types/map'
import type { MarketOffer, TreasureChest } from '../types/item'
import type { WeaponMaterialDrop } from '../types/weapon'
import type { PartyNpc } from '../types/party'
import { SAVE_KEYS, SAVE_SCHEMA_VERSION, mergeSave, migrateSave } from './save'
import type { QuestObjectiveBounty } from '../types/quest'

export const DIR_OPPOSITE: Record<Direction, Direction> = { N: 'S', S: 'N', E: 'W', W: 'E' }
export const DIR_DELTA: Record<Direction, { dx: number; dy: number }> = {
  N: { dx: 0, dy: -1 },
  S: { dx: 0, dy:  1 },
  E: { dx:  1, dy: 0 },
  W: { dx: -1, dy: 0 },
}

export const DIRS: Direction[] = ['N', 'S', 'E', 'W']

export function gridKey(x: number, y: number): string { return `${x},${y}` }

type Point = { x: number; y: number }

function samePoint(a: Point | null | undefined, b: Point | null | undefined): boolean {
  return !!a && !!b && a.x === b.x && a.y === b.y
}

function chebyshevDistance(a: Point, b: Point): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y))
}

function connectedExits(grid: Record<string, PlacedTile>, current: Point): Point[] {
  const tile = grid[gridKey(current.x, current.y)]
  if (!tile) return []

  const exits: Point[] = []
  for (const dir of tile.connections) {
    const delta = DIR_DELTA[dir]
    const next = { x: current.x + delta.dx, y: current.y + delta.dy }
    const neighbor = grid[gridKey(next.x, next.y)]
    if (neighbor?.connections.includes(DIR_OPPOSITE[dir])) exits.push(next)
  }
  return exits
}

function chooseTowerExit(grid: Record<string, PlacedTile>, current: Point, entryFrom: Point | null, target: Point | null): Point | null {
  const exits = connectedExits(grid, current)
  if (exits.length === 0) return null

  const withoutEntry = exits.filter(exit => !samePoint(exit, entryFrom))
  const candidates = withoutEntry.length > 0 ? withoutEntry : exits
  if (!target) return candidates[0]

  return candidates.reduce((best, exit) => (
    chebyshevDistance(exit, target) < chebyshevDistance(best, target) ? exit : best
  ), candidates[0])
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Picks a tile level with a triangular distribution peaking at heroLevel-1,
 * spanning roughly heroLevel-5 to heroLevel+3. Only ~16% of generated tiles
 * exceed the hero's level.
 */
function heroRelativeLevel(heroLevel: number): number {
  // Biased triangular distribution: peak at heroLevel-1, range heroLevel-5 to heroLevel+3.
  // ~16% of generated tiles exceed heroLevel (was ~41% with the ±5 centred formula).
  const offset = Math.round((Math.random() + Math.random() - 1) * 3.5) - 1
  return Math.max(1, heroLevel + offset)
}

function enragedLevelBonus(tilesPlaced: number): number {
  const maxBonus = Math.max(2, Math.ceil(tilesPlaced / 100 + 1))
  return 1 + Math.floor(Math.random() * maxBonus)
}

function stableMonsterForTile(tile: PlacedTile) {
  const hash = Math.abs((tile.x * 73856093) ^ (tile.y * 19349663) ^ (tile.level * 83492791))
  const candidates = monstersForBiome(tile.biome)
  const pool = candidates.length > 0 ? candidates : FOREST_RANDOM_MONSTERS
  return pool[hash % pool.length]
}

interface TileEnemyQueue {
  level: number
  baseLevel: number
  type?: string
  rarity?: MonsterRarity
  tilesPlaced: number
  enraged: boolean
  questId?: string
  targetName?: string
  targetNameEn?: string
  isNpc?: boolean
  variant?: 'golden' | 'predator'
  rescueNpc?: PartyNpc
}

interface TileEntryResult {
  enemy: TileEnemyQueue | null
  questTileLevel: number | null
}

type TileEntryState = Pick<MapStore, 'pendingGold' | 'pendingMonsterXp' | 'pendingNpcRecruit' | 'pendingXp' | 'pendingWeaponMaterials' | 'pendingChests' | 'tilesPlaced' | 'bountyTiles' | 'blueTowerBossPending' | 'scene'>

function pickPredatorRarity(tilesPlaced = 0): MonsterRarity {
  const unlocked: MonsterRarity[] = ['uncommon']
  if (tilesPlaced >= 40) unlocked.push('rare')
  if (tilesPlaced >= 70) unlocked.push('epic')
  if (tilesPlaced >= 100) unlocked.push('unique')
  const weights = unlocked.map(r => r === 'uncommon' ? 74 : r === 'rare' ? 20 : r === 'epic' ? 5 : 1)
  const total = weights.reduce((sum, value) => sum + value, 0)
  let roll = Math.random() * total
  for (let i = 0; i < unlocked.length; i++) {
    roll -= weights[i]
    if (roll <= 0) return unlocked[i]
  }
  return unlocked[0]
}

function makeRescueContent(tileLevel: number, tilesPlaced: number): TileContent {
  const monster = pickMonsterForBiome('forest')
  return {
    type: 'npcRescue',
    monsterLevel: tileLevel + 3 + Math.floor(Math.random() * 3),
    monsterType: monster.id,
    monsterRarity: pickPredatorRarity(tilesPlaced),
    rescueNpc: generateNpc(`npc_rescue_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`, tileLevel + 3),
  }
}

function contentFromBounty(bounty: BountyTileEntry): TileContent {
  return {
    type: 'monster',
    monsterLevel: bounty.targetLevel,
    monsterType: bounty.monsterType,
    monsterRarity: bounty.targetRarity,
    bountyQuestId: bounty.questId,
    bountyTargetName: bounty.targetName,
    bountyTargetNameEn: bounty.targetNameEn,
    bountyIsNpc: bounty.isNpc,
  }
}

function bountyFromTileContent(tile: PlacedTile): BountyTileEntry | null {
  if (tile.content.type !== 'monster' || !tile.content.bountyQuestId) return null
  return {
    questId: tile.content.bountyQuestId,
    targetName: tile.content.bountyTargetName ?? tile.content.monsterType ?? 'Bounty',
    targetNameEn: tile.content.bountyTargetNameEn ?? tile.content.bountyTargetName ?? tile.content.monsterType ?? 'Bounty',
    monsterType: tile.content.monsterType ?? 'bandit',
    targetLevel: tile.content.monsterLevel ?? tile.level,
    targetRarity: (tile.content.monsterRarity ?? 'normal') as MonsterRarity,
    isNpc: !!tile.content.bountyIsNpc,
  }
}

function bountyFromQuest(questId: string, objective: QuestObjectiveBounty): BountyTileEntry {
  return {
    questId,
    targetName: objective.targetName,
    targetNameEn: objective.targetNameEn,
    monsterType: objective.monsterType,
    targetLevel: objective.targetLevel,
    targetRarity: objective.targetRarity as MonsterRarity,
    isNpc: objective.isNpc,
  }
}

function applyBountyToTile(tile: PlacedTile | undefined, bounty: BountyTileEntry): void {
  if (!tile || tile.explored) return
  tile.content = contentFromBounty(bounty)
  tile.level = Math.max(tile.level, bounty.targetLevel)
}

function reconcileActiveBounties(st: Pick<MapStore, 'bountyTiles' | 'grid'>): void {
  const activeBountyKeys = new Set<string>()
  const quests = useQuestStore.getState().quests
  for (const quest of quests) {
    if (quest.status !== 'active' || quest.objective.type !== 'bounty') continue
    const objective = quest.objective as QuestObjectiveBounty
    const key = gridKey(objective.targetX, objective.targetY)
    const bounty = st.bountyTiles[key] ?? bountyFromQuest(quest.id, objective)
    st.bountyTiles[key] = bounty
    applyBountyToTile(st.grid[key], bounty)
    activeBountyKeys.add(key)
  }

  for (const key of Object.keys(st.bountyTiles)) {
    if (!activeBountyKeys.has(key)) delete st.bountyTiles[key]
  }
}

function processTileEntry(st: TileEntryState, tile: PlacedTile): TileEntryResult {
  const tileKey = `${tile.x},${tile.y}`
  const bounty  = st.bountyTiles[tileKey] ?? bountyFromTileContent(tile)
  let questTileLevel: number | null = null

  if (!bounty && tile.content.type === 'market') {
    st.scene = 'market'
    if (!tile.explored) tile.explored = true
    return { enemy: null, questTileLevel: null }
  }

  // Quest board tile: grant the quest, then resolve the normal tile encounter.
  if (!bounty && tile.content.type === 'quest') {
    questTileLevel = tile.level
    if (!tile.explored) {
      tile.explored = true
      tile.content  = { type: 'empty' }
    }
  }

  if (!bounty && tile.content.type === 'blueTower') {
    if (tile.explored) {
      st.scene = 'tower'
      return { enemy: null, questTileLevel: null }
    }

    const baseLevel  = Math.max(1, tile.level)
    const enemyLevel = baseLevel + 5
    const tileMult   = 1 + Math.floor(st.tilesPlaced / 10) * 0.05

    st.blueTowerBossPending[tileKey] = true
    st.pendingGold += Math.round((25 + enemyLevel * 10) * tileMult * (0.8 + Math.random() * 0.4))
    st.pendingMonsterXp.push({
      xp:           Math.round((18 + enemyLevel * 5) * tileMult * (0.8 + Math.random() * 0.4)),
      monsterLevel: enemyLevel,
    })

    return {
      enemy: {
        level:       enemyLevel,
        baseLevel,
        type:        'demon',
        rarity:      'unique',
        tilesPlaced: st.tilesPlaced,
        enraged:     true,
      },
      questTileLevel: null,
    }
  }

  if (!bounty && tile.content.type === 'npcRescue') {
    if (tile.explored) return { enemy: null, questTileLevel: null }

    const baseLevel = Math.max(1, tile.level)
    const enemyLevel = Math.max(baseLevel + 3, tile.content.monsterLevel ?? baseLevel + 3)
    st.pendingNpcRecruit = tile.content.rescueNpc ?? null
    if (!tile.explored) tile.explored = true

    return {
      enemy: {
        level: enemyLevel,
        baseLevel,
        type: tile.content.monsterType ?? pickMonsterForBiome(tile.biome).id,
        rarity: (tile.content.monsterRarity ?? 'uncommon') as MonsterRarity,
        tilesPlaced: st.tilesPlaced,
        enraged: false,
        variant: 'predator',
        rescueNpc: tile.content.rescueNpc,
      },
      questTileLevel: null,
    }
  }

  const baseLevel        = Math.max(1, tile.level)
  const isMonster        = tile.content.type === 'monster'
  const isTreasure       = tile.content.type === 'treasure'
  const generatesBattle  = bounty || isMonster || tile.content.type === 'empty' || tile.content.type === 'treasure'
  if (!generatesBattle) return { enemy: null, questTileLevel }

  const isFirstEncounter = isMonster && !tile.explored
  const fallbackMonster  = stableMonsterForTile(tile)

  const enemyLevel = isFirstEncounter
    ? (bounty ? bounty.targetLevel : baseLevel + enragedLevelBonus(st.tilesPlaced))
    : (bounty ? bounty.targetLevel : baseLevel)

  const tileEnemy: TileEnemyQueue = {
    level:       enemyLevel,
    baseLevel:   baseLevel,
    type:        isTreasure ? 'demon' : bounty ? bounty.monsterType : (tile.content.monsterType ?? fallbackMonster.id),
    rarity:      isTreasure ? 'normal' : bounty ? bounty.targetRarity as MonsterRarity : (tile.content.monsterRarity ?? 'normal') as MonsterRarity,
    tilesPlaced: st.tilesPlaced,
    enraged:     isFirstEncounter && !bounty,
    questId:     bounty?.questId,
    targetName:  bounty?.targetName,
    targetNameEn: bounty?.targetNameEn,
    isNpc:       bounty?.isNpc,
    variant:     isTreasure ? 'golden' : undefined,
  }
  if (isTreasure) tileEnemy.enraged = false

  if (bounty) {
    delete st.bountyTiles[tileKey]
  }

  if (isFirstEncounter) {
    const tileMult = 1 + Math.floor(st.tilesPlaced / 10) * 0.05
    st.pendingGold += Math.round((15 + enemyLevel * 8) * tileMult * (0.8 + Math.random() * 0.4))
    st.pendingMonsterXp.push({
      xp:           Math.round((10 + enemyLevel * 4) * tileMult * (0.8 + Math.random() * 0.4)),
      monsterLevel: enemyLevel,
    })
  }

  if (!tile.explored) {
    tile.explored = true
    // Exploration XP trickle — feeds the pendingXp → drainXp → xpBonus
    // pipeline (which existed but was never fed). Modest next to monster
    // first-encounter XP, but makes exploring itself rewarding.
    st.pendingXp += Math.round((4 + tile.level * 2) * (0.8 + Math.random() * 0.4))
    // Treasure tiles keep their content until the golden demon is actually
    // defeated — the chest is granted via claimTreasureAt() on victory, and a
    // lost fight can be retried by re-entering the tile.
  }

  return { enemy: tileEnemy, questTileLevel }
}

function startTileBattle(enemy: TileEnemyQueue | null): void {
  if (!enemy) return
  useBattleStore.getState().startBattle({
    level:          enemy.level,
    monsterType:    enemy.type,
    monsterRarity:  enemy.rarity,
    tilesPlaced:    enemy.tilesPlaced,
    enraged:        enemy.enraged,
    baseLevel:      enemy.baseLevel,
    questId:        enemy.questId,
    questName:      enemy.targetName,
    questNameEn:    enemy.targetNameEn,
    questNpc:       enemy.isNpc,
    monsterVariant: enemy.variant,
  })
}

function createQuestFromTile(tileLevel: number): void {
  const { grid, playerPos } = useMapStore.getState()
  const quest = generateQuest(tileLevel, grid, playerPos)
  if (!quest) return
  if (quest.objective.type === 'bounty') {
    useMapStore.getState().registerBountyTile(quest.id, quest.objective)
  }
  useQuestStore.getState().addQuest(quest)
}

export function generateContent(level: number, tilesPlaced = 0, biome: Biome = 'forest'): TileContent {
  const r = Math.random()
  if (r < 0.008) return { type: 'quest' }
  if (r < 0.016) return { type: 'market' }
  if (r < 0.022) return { type: 'blueTower' }
  if (r < 0.047) return { type: 'treasure' }
  if (r < 0.10) {
    return {
      type: 'monster',
      monsterLevel: level,
      monsterType:   pickMonsterForBiome(biome).id,
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

function normalizeTileToLevel(tile: MapTile | PlacedTile | undefined, heroLevel: number): boolean {
  if (!tile) return false
  const nextLevel = Math.max(1, Math.round(heroLevel))
  tile.level = nextLevel
  if (tile.content.type === 'monster') tile.content.monsterLevel = nextLevel
  return true
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
  pendingWeaponMaterials: WeaponMaterialDrop[]
  pendingChests: TreasureChest[]
  /** Monster-specific XP kept separate so a hero-level range check can be applied (per entry). */
  pendingMonsterXp: { xp: number; monsterLevel: number }[]
  pendingNpcRecruit: PartyNpc | null
  sightedCells: Record<string, TileContent>
  blueTowerBossPending: Record<string, boolean>
  blueTowerAutoTarget: { x: number; y: number } | null
  blueTowerEntryFrom: { x: number; y: number } | null
  /**
   * 'manual'   — player controls everything (no automation)
   * 'move'     — auto-pathfinding to unexplored tiles (original Auto behaviour)
   * 'full'     — auto-pathfinding + auto-tile-placement + auto-restart when stuck
   */
  autoExplore: 'manual' | 'move' | 'full'
  scene: 'map' | 'home' | 'market' | 'tower'
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
  /**
   * Market offers keyed by "x,y" of the market tile.
   * Persisted so the same shop is shown on every visit — prevents
   * refresh-to-reroll exploits.  Cleared on new journey (resetMap).
   */
  marketOffers: Record<string, MarketOffer>
  /** Tiles reserved for bounty quests: key = "x,y", value = bounty data */
  bountyTiles: Record<string, BountyTileEntry>

  placeTile(tileId: string, x: number, y: number): boolean
  normalizePlacedTileLevel(x: number, y: number, heroLevel: number): boolean
  normalizeDeckTileLevel(tileId: string, heroLevel: number): boolean
  saveMarketOffer(key: string, offer: MarketOffer): void
  setDestination(x: number, y: number): void
  setAutoExplore(v: 'manual' | 'move' | 'full'): void
  toggleRiskMode(): void
  /**
   * Grants the chest of a treasure tile after its golden demon is defeated.
   * Converts the tile content to empty so it can't be farmed. Returns true
   * if a chest was queued.
   */
  claimTreasureAt(x: number, y: number): boolean
  drainXp(): number
  drainGold(): number
  drainWeaponMaterials(): WeaponMaterialDrop[]
  drainChests(): TreasureChest[]
  drainMonsterXp(): { xp: number; monsterLevel: number }[]
  drainNpcRecruit(): PartyNpc | null
  goHome(): void
  leaveScene(): void
  exitMarket(): void
  exitBlueTower(): void
  autoExitBlueTower(): void
  /**
   * Called when the scene transitions market→map.
   * Marks the exit tile as explored, grants first-encounter rewards and starts
   * correct enemy — fixing the bug where market exits skipped tile processing.
   */
  processMarketExitTile(): void
  handleDefeat(): void
  registerBountyTile(questId: string, objective: import('../types/quest').QuestObjectiveBounty): void
  activatePendingBlueTower(): boolean
  teleportToBlueTower(x: number, y: number): boolean
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
      pendingWeaponMaterials: [],
      pendingChests: [],
      pendingMonsterXp: [],
      pendingNpcRecruit: null,
      sightedCells: {},
      blueTowerBossPending: {},
      blueTowerAutoTarget: null,
      blueTowerEntryFrom: null,
      autoExplore: 'move' as 'manual' | 'move' | 'full',
      scene: 'map' as 'map' | 'home' | 'market' | 'tower',
      tilesPlaced: 0,
      defeatPending: false,
      stuckPending: false,
      levelOffset: 0,
      easyTilesRemaining: 5,
      riskMode: false,
      marketOffers: {},
      bountyTiles: {},

      setAutoExplore:  (v) => set((st) => { st.autoExplore = v }),
      toggleRiskMode:  ()  => set((st) => { st.riskMode = !st.riskMode }),
      saveMarketOffer: (key, offer) => set((st) => { st.marketOffers[key] = offer }),
      normalizePlacedTileLevel: (x, y, heroLevel): boolean => {
        let changed = false
        set((st) => {
          changed = normalizeTileToLevel(st.grid[gridKey(x, y)], heroLevel)
        })
        return changed
      },
      normalizeDeckTileLevel: (tileId, heroLevel): boolean => {
        let changed = false
        set((st) => {
          changed = normalizeTileToLevel(st.deck.find(t => t.id === tileId), heroLevel)
        })
        return changed
      },

      goHome:     () => set((st) => { st.scene = 'home'; st.destination = null }),
      leaveScene: () => set((st) => {
        st.scene = 'map'
        st.stuckPending = false
        st.blueTowerAutoTarget = null
        st.blueTowerEntryFrom = null
      }),

      tryAutoPlace: (maxTileLevel?: number): boolean => {
        set((st) => { reconcileActiveBounties(st) })
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
      // encounter rewards, and starts the correct enemy (with tilesPlaced so
      // the stealth buff is applied).
      processMarketExitTile: () => {
        let result: TileEntryResult = { enemy: null, questTileLevel: null }

        set((st) => {
          reconcileActiveBounties(st)
          const tile = st.grid[gridKey(st.playerPos.x, st.playerPos.y)]
          if (!tile) return
          result = processTileEntry(st, tile)
        })

        startTileBattle(result.enemy)
        if (result.questTileLevel !== null) createQuestFromTile(result.questTileLevel)
      },

      // Exit market: move the player to a random connected adjacent tile and
      // return to the map. No enemy starts here; scene transition processing
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
          }

          st.scene = 'map'
        })
        // intentionally no battle start here; market->map transition handles the landing tile
      },

      exitBlueTower: () => {
        let movedToX: number | null = null
        let movedToY: number | null = null
        let tileResult: TileEntryResult = { enemy: null, questTileLevel: null }
        set((st) => {
          reconcileActiveBounties(st)
          const exit = chooseTowerExit(st.grid, st.playerPos, st.blueTowerEntryFrom, null)
          if (exit) {
            st.playerPos = exit
            st.destination = null
            movedToX = exit.x
            movedToY = exit.y
            const tile = st.grid[gridKey(exit.x, exit.y)]
            if (tile) tileResult = processTileEntry(st, tile)
          }
          if (st.scene === 'tower') st.scene = 'map'
          st.blueTowerAutoTarget = null
          st.blueTowerEntryFrom = null
        })
        startTileBattle(tileResult.enemy)
        if (tileResult.questTileLevel !== null) createQuestFromTile(tileResult.questTileLevel)
        if (movedToX !== null && movedToY !== null) useQuestStore.getState().onPlayerMove(movedToX, movedToY)
      },

      autoExitBlueTower: () => {
        let movedToX: number | null = null
        let movedToY: number | null = null
        let tileResult: TileEntryResult = { enemy: null, questTileLevel: null }
        set((st) => {
          reconcileActiveBounties(st)
          const current = st.playerPos
          const target = st.blueTowerAutoTarget ?? st.destination
          let bestTower: PlacedTile | null = null
          let bestTowerDist = Infinity

          if (target) {
            const currentDist = chebyshevDistance(current, target)
            for (const tile of Object.values(st.grid)) {
              if (tile.content.type !== 'blueTower' || !tile.explored) continue
              if (tile.x === current.x && tile.y === current.y) continue
              const dist = chebyshevDistance(tile, target)
              if (dist < bestTowerDist) {
                bestTower = tile
                bestTowerDist = dist
              }
            }

            if (bestTower && bestTowerDist < currentDist) {
              st.playerPos = { x: bestTower.x, y: bestTower.y }
              st.destination = target
              movedToX = bestTower.x
              movedToY = bestTower.y
              const tile = st.grid[gridKey(bestTower.x, bestTower.y)]
              if (tile) tileResult = processTileEntry(st, tile)
              st.blueTowerAutoTarget = null
              st.blueTowerEntryFrom = null
              return
            }
          }

          const exit = chooseTowerExit(st.grid, current, st.blueTowerEntryFrom, target ?? null)
          if (exit) {
            st.playerPos = exit
            st.destination = target ?? null
            movedToX = exit.x
            movedToY = exit.y
            const tile = st.grid[gridKey(exit.x, exit.y)]
            if (tile) tileResult = processTileEntry(st, tile)
          }
          if (st.scene === 'tower') st.scene = 'map'
          st.blueTowerAutoTarget = null
          st.blueTowerEntryFrom = null
        })
        startTileBattle(tileResult.enemy)
        if (tileResult.questTileLevel !== null) createQuestFromTile(tileResult.questTileLevel)
        if (movedToX !== null && movedToY !== null) useQuestStore.getState().onPlayerMove(movedToX, movedToY)
      },

      handleDefeat: () => {
        set((st) => {
          st.scene         = 'home'
          st.destination   = null
          st.defeatPending = true
          st.pendingNpcRecruit = null
        })
        useQuestStore.getState().failAllQuests()
      },

      registerBountyTile: (questId, objective) => set((st) => {
        const key = `${objective.targetX},${objective.targetY}`
        const bounty = bountyFromQuest(questId, objective)
        st.bountyTiles[key] = bounty
        applyBountyToTile(st.grid[key], bounty)
      }),

      activatePendingBlueTower: (): boolean => {
        let activated = false
        set((st) => {
          const key = gridKey(st.playerPos.x, st.playerPos.y)
          if (!st.blueTowerBossPending[key]) return
          const tile = st.grid[key]
          if (tile?.content.type === 'blueTower') {
            tile.explored = true
            st.scene = 'tower'
            st.destination = null
            st.blueTowerAutoTarget = null
            activated = true
          }
          delete st.blueTowerBossPending[key]
        })
        return activated
      },

      teleportToBlueTower: (x, y): boolean => {
        let moved = false
        set((st) => {
          const tile = st.grid[gridKey(x, y)]
          if (!tile || !tile.explored || tile.content.type !== 'blueTower') return
          if (st.playerPos.x === x && st.playerPos.y === y) return
          st.playerPos = { x, y }
          st.destination = null
          st.scene = 'tower'
          st.blueTowerAutoTarget = null
          st.blueTowerEntryFrom = null
          moved = true
        })
        if (moved) useQuestStore.getState().onPlayerMove(x, y)
        return moved
      },

      setDestination: (x, y) => set((st) => {
        if (st.playerPos.x === x && st.playerPos.y === y) return
        if (!st.grid[gridKey(x, y)]) return
        st.destination = { x, y }
      }),

      placeTile: (tileId, x, y): boolean => {
        let placed = false
        set((st) => {
        reconcileActiveBounties(st)
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
        // any level-dependent values from tileLevel so
        // the difficulty is always consistent with the tile's badge.
        const bounty = st.bountyTiles[key]
        const tileLevel = bounty ? Math.max(tile.level, bounty.targetLevel) : tile.level
        const sighted   = st.sightedCells[key]
        let content: TileContent
        if (bounty) {
          content = contentFromBounty(bounty)
        } else if (sighted) {
          if (sighted.type === 'monster') {
            content = {
              type: 'monster',
              monsterLevel:  tileLevel,
              monsterType:   sighted.monsterType   ?? pickMonsterForBiome(tile.biome).id,
              monsterRarity: sighted.monsterRarity ?? pickMonsterRarity(st.tilesPlaced),
            }
          } else if (sighted.type === 'treasure') {
            content = { type: 'treasure' }
          } else if (sighted.type === 'npcRescue') {
            content = {
              type: 'npcRescue',
              monsterLevel: tileLevel + 3 + Math.floor(Math.random() * 3),
              monsterType: sighted.monsterType ?? pickMonsterForBiome(tile.biome).id,
              monsterRarity: sighted.monsterRarity ?? pickPredatorRarity(st.tilesPlaced),
              rescueNpc: sighted.rescueNpc ?? generateNpc(`npc_rescue_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`, tileLevel + 3),
            }
          } else {
            content = { type: sighted.type } as TileContent   // market, blue tower or empty — level-independent
          }
        } else {
          content = generateContent(tileLevel, st.tilesPlaced, tile.biome)
        }
        if (!bounty && !sighted && content.type === 'empty' && Math.random() < 0.01) {
          content = makeRescueContent(tileLevel, st.tilesPlaced)
        }
        delete st.sightedCells[key]

        st.deck.splice(idx, 1)
        st.grid[key] = { ...tile, level: tileLevel, x, y, explored: false, content }
        st.tilesPlaced += 1
        placed = true
        })
        return placed
      },

      claimTreasureAt: (x, y): boolean => {
        let claimed = false
        set((st) => {
          const tile = st.grid[gridKey(x, y)]
          if (!tile || tile.content.type !== 'treasure') return
          st.pendingChests.push(createTreasureChest(tile.level))
          tile.content = { type: 'empty' }
          claimed = true
        })
        return claimed
      },

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

      drainWeaponMaterials: () => {
        const drops = get().pendingWeaponMaterials
        if (drops.length > 0) set((st) => { st.pendingWeaponMaterials = [] })
        return drops
      },

      drainChests: () => {
        const chests = get().pendingChests
        if (chests.length > 0) set((st) => { st.pendingChests = [] })
        return chests
      },

      drainMonsterXp: () => {
        const m = get().pendingMonsterXp
        if (m.length > 0) set((st) => { st.pendingMonsterXp = [] })
        return m
      },

      drainNpcRecruit: () => {
        const npc = get().pendingNpcRecruit
        if (npc) set((st) => { st.pendingNpcRecruit = null })
        return npc
      },

      moveOneStep: (heroLevel?: number) => {
        let tileResult: TileEntryResult = { enemy: null, questTileLevel: null }
        let didMove = false

        set((st) => {
          reconcileActiveBounties(st)
          if (!st.destination && st.autoExplore !== 'manual') {
            const cap    = (heroLevel !== undefined && !st.riskMode) ? heroLevel : undefined
            const target = findNearestUnexplored(st.grid, st.playerPos, cap)
            if (target) st.destination = target
          }

          if (!st.destination) return

          const previous = { ...st.playerPos }
          const destinationBeforeStep = { ...st.destination }
          const next = findNextStep(st.grid, st.playerPos, st.destination)
          if (next) {
            st.playerPos = next
            didMove = true
            if (next.x === st.destination.x && next.y === st.destination.y) {
              st.destination = null
            }
            const tile = st.grid[gridKey(next.x, next.y)]
            if (tile) {
              if (tile.content.type === 'market') {
                st.scene = 'market'
                if (!tile.explored) tile.explored = true
              } else if (tile.content.type === 'blueTower') {
                st.blueTowerEntryFrom = previous
                st.blueTowerAutoTarget = samePoint(destinationBeforeStep, next) ? null : destinationBeforeStep
                tileResult = processTileEntry(st, tile)
              } else {
                tileResult = processTileEntry(st, tile)
              }
            }
          } else {
            st.destination = null
          }
        })

        startTileBattle(tileResult.enemy)
        if (didMove) {
          const { x, y } = useMapStore.getState().playerPos
          useQuestStore.getState().onPlayerMove(x, y)
        }
        if (tileResult.questTileLevel !== null) createQuestFromTile(tileResult.questTileLevel)
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
        st.pendingWeaponMaterials = []
        st.pendingChests      = []
        st.pendingMonsterXp   = []
        st.pendingNpcRecruit  = null
        st.sightedCells       = {}
        st.blueTowerBossPending = {}
        st.blueTowerAutoTarget = null
        st.blueTowerEntryFrom = null
        st.scene              = 'map'
        st.tilesPlaced        = 0
        st.defeatPending      = false
        st.stuckPending       = false
        st.levelOffset        = 0
        st.marketOffers       = {}   // new journey → fresh shops
        st.bountyTiles        = {}
        // 5 more easy tiles generated by tickMap after the 3 initial deck tiles
        st.easyTilesRemaining = 5
      }),

      tickMap: (deltaMs, moveSpeed, maxDeck, vision, heroLevel) => set((st) => {
        reconcileActiveBounties(st)
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
            st.sightedCells[key] = generateContent(lvl, st.tilesPlaced, 'forest')
          }
        }
      }),
    })),
    {
      name: SAVE_KEYS.map,
      version: SAVE_SCHEMA_VERSION,
      // mergeSave + normalization: pendingMonsterXp was `object | null` in old
      // saves (and migrate only runs on version bumps), so coerce to array here.
      merge: (persisted, current) => {
        const merged = mergeSave(persisted, current) as MapStore
        const pmx = merged.pendingMonsterXp as unknown
        merged.pendingMonsterXp = Array.isArray(pmx) ? pmx : pmx ? [pmx as { xp: number; monsterLevel: number }] : []
        return merged
      },
      migrate: (raw, version) => {
        const s = migrateSave<Record<string, unknown>>(raw)
        // v0 stored autoExplore as boolean — migrate to the 3-state string
        if (version < 1 && typeof s.autoExplore === 'boolean') {
          s.autoExplore = s.autoExplore ? 'move' : 'manual'
        }
        return s as unknown as MapStore
      },
    },
  ),
)
