export type MonsterRarity = 'normal' | 'uncommon' | 'rare' | 'epic' | 'unique'

export interface MonsterPreferences {
  forca:        number
  vitalidade:   number
  agilidade:    number
  destreza:     number
  inteligencia: number
  sabedoria:    number
}

export interface MonsterTemplate {
  id:             string
  name:           string
  emoji:          string
  /** Attribute points distributed at level 0 */
  basePoints:     number
  /** Attribute points gained per level */
  pointsPerLevel: number
  preferences:    MonsterPreferences
}
