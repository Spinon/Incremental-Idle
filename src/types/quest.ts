export type QuestType =
  | 'escort'
  | 'delivery'
  | 'extermination'
  | 'bounty_monster'
  | 'bounty_npc'
  | 'collection'

export type QuestDifficulty = 'easy' | 'medium' | 'hard'
export type QuestStatus     = 'active' | 'completed' | 'failed'

export interface QuestObjectiveEscort {
  type: 'escort'
  targetX: number
  targetY: number
  reached: boolean
}

export interface QuestObjectiveDelivery {
  type: 'delivery'
  targetX: number
  targetY: number
  reached: boolean
}

export interface QuestObjectiveExtermination {
  type: 'extermination'
  centerX: number
  centerY: number
  radius: number
  required: number
  killed: number
}

export interface QuestObjectiveBounty {
  type: 'bounty'
  targetX: number
  targetY: number
  targetName: string
  targetNameEn: string
  monsterType: string
  targetLevel: number
  targetRarity: string
  isNpc: boolean
  defeated: boolean
}

export interface QuestObjectiveCollection {
  type: 'collection'
  monsterType: string | null
  required: number
  collected: number
}

export type QuestObjective =
  | QuestObjectiveEscort
  | QuestObjectiveDelivery
  | QuestObjectiveExtermination
  | QuestObjectiveBounty
  | QuestObjectiveCollection

export interface QuestRewards {
  xp: number
  gold: number
}

export interface Quest {
  id: string
  type: QuestType
  difficulty: QuestDifficulty
  status: QuestStatus
  tileLevel: number
  title: string
  titleEn: string
  description: string
  descriptionEn: string
  objective: QuestObjective
  rewards: QuestRewards
}

export type QuestMarkerKind =
  | 'escort'
  | 'delivery'
  | 'bounty'
  | 'extermination_center'
  | 'extermination_area'

export interface QuestMapMarker {
  x: number
  y: number
  kind: QuestMarkerKind
  difficulty: QuestDifficulty
  label: string
}
