export type Direction = 'N' | 'S' | 'E' | 'W'
export type Biome = 'forest'

export interface TileContent {
  type: 'empty' | 'monster' | 'treasure' | 'market'
  xpAmount?: number
  monsterLevel?: number
  /** Monster template ID (e.g. 'goblin', 'wolf') */
  monsterType?: string
  /** Monster rarity string (MonsterRarity) */
  monsterRarity?: string
}

export interface MapTile {
  id: string
  connections: Direction[]
  biome: Biome
  level: number
  content: TileContent
}

export interface PlacedTile extends MapTile {
  x: number
  y: number
  explored: boolean
}
