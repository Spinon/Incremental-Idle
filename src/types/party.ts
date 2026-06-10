import type { Attributes } from './hero'

export type PartyMemberSource = 'npc' | 'friend'
export type PartyMemberMode = 'follow' | 'explore'
export type NpcClass = 'guardian' | 'ranger' | 'arcanist' | 'cleric' | 'rogue'
export type NpcRace = 'human' | 'elf' | 'dwarf' | 'orc' | 'fae'

export interface PartyNpc {
  id: string
  source: PartyMemberSource
  name: string
  nameEn: string
  race: NpcRace
  class: NpcClass
  levelOffset: number
  attributes: Attributes
  spellIds: string[]
  color: string
  discoveredAt: number
  explorerPos: { x: number; y: number }
  explorerWins: number
  explorerLosses: number
  lastRewardText: string | null
}

export interface PartySlot {
  id: string
  memberId: string | null
  mode: PartyMemberMode
}

export interface PartyFightLog {
  id: string
  createdAt: number
  npcId: string
  npcName: string
  npcNameEn: string
  slotId: string
  won: boolean
  enemyName: string
  enemyNameEn: string
  enemyLevel: number
  x: number
  y: number
  xp: number
  gold: number
  itemFound: boolean
}

export interface PartyExplorerMarker {
  id: string
  name: string
  nameEn: string
  class: NpcClass
  color: string
  slotId: string
  x: number
  y: number
}

export interface PartyRecruitOffer {
  npc: PartyNpc
  rescuedAt: number
}
