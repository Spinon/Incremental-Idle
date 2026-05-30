export type MonsterRarity = 'normal' | 'uncommon' | 'rare' | 'epic' | 'unique'

export interface MonsterPreferences {
  forca:        number
  vitalidade:   number
  agilidade:    number
  destreza:     number
  inteligencia: number
  sabedoria:    number
}

import type { ElementType } from './element'

export interface MonsterTemplate {
  id:             string
  name:           string
  emoji:          string
  /** Attribute points distributed at level 0 */
  basePoints:     number
  /** Attribute points gained per level */
  pointsPerLevel: number
  preferences:    MonsterPreferences
  /** Physical attack element — applies elemental status on hits */
  element?:       ElementType
  /** Probability of applying the element's status per physical hit */
  statusChance?:  number
  /** Takes 1.5× damage from these elements */
  weakTo?:        ElementType[]
}
