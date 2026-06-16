export type Direction = 'N' | 'S' | 'E' | 'W'
export type Biome = 'forest'

import type { PartyNpc } from './party'

export interface TileContent {
  type: 'empty' | 'monster' | 'treasure' | 'market' | 'tileMarket' | 'quest' | 'blueTower' | 'npcRescue'
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
