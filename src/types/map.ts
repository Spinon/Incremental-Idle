export type Direction = 'N' | 'S' | 'E' | 'W'
export type Biome = 'forest'

import type { PartyNpc } from './party'
import type { MonsterRarity } from './monster'

export type SpecialEncounterVariant = 'normal' | 'golden' | 'predator' | 'boss'
export type SpecialVictoryScript = 'redTowerDungeonSuccess'

export interface RedTowerVictoryRewards {
  gold: number
  xp: number
  wordSand: number
  itemName: string
  itemNameEn: string
  itemRarity: string
  materialTier: number
  materialCount: number
}

export interface SpecialEncounter {
  variant: SpecialEncounterVariant
  monsterType?: string
  monsterLevel?: number
  monsterRarity?: MonsterRarity
  bossSpellIds?: string[]
  victoryScript?: SpecialVictoryScript
}

export interface TileContent {
  type: 'empty' | 'monster' | 'treasure' | 'market' | 'tileMarket' | 'quest' | 'blueTower' | 'redTower' | 'npcRescue' | 'dungeonObstacle' | 'dungeonEvent'
  xpAmount?: number
  monsterLevel?: number
  /** Monster template ID (e.g. 'goblin', 'wolf') */
  monsterType?: string
  /** Monster rarity string (MonsterRarity) */
  monsterRarity?: string
  /** Bounty quest bound to this tile; makes the monster encounter special. */
  bountyQuestId?: string
  bountyTargetName?: string
  bountyTargetNameEn?: string
  bountyIsNpc?: boolean
  rescueNpc?: PartyNpc
  dungeonBossSpellIds?: string[]
  dungeonOriginKey?: string
  specialEncounter?: SpecialEncounter
}

export interface MapTile {
  id: string
  connections: Direction[]
  biome: Biome
  level: number
  content: TileContent
}

export interface TileMarketOffer {
  tiles: Array<MapTile & { price: number }>
  /** IDs already bought from this persisted tile market. */
  boughtIds?: string[]
}

export interface PlacedTile extends MapTile {
  x: number
  y: number
  explored: boolean
}
