import type { Attributes } from './hero'

export type PartyMemberSource = 'npc' | 'friend'
export type PartyMemberMode = 'follow' | 'explore'
export type NpcClass = 'guardian' | 'ranger' | 'arcanist' | 'cleric' | 'rogue'
export type NpcRace = 'human' | 'elf' | 'dwarf' | 'orc' | 'fae'

/**
 * Companion taxonomy: NPCs today, Pets next. Pets will reuse the same slot
 * mechanics (follow bonus / explore farming) with their own progression, so
 * everything slot-related speaks in "companions" instead of NPCs.
 */
export type CompanionKind = 'npc' | 'pet'

export function companionKind(member: Pick<PartyNpc, 'kind'>): CompanionKind {
  return member.kind ?? 'npc'
}

export interface PartyNpc {
  id: string
  /** Companion kind — absent on old saves, meaning 'npc'. */
  kind?: CompanionKind
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
  /** Which companion kinds the slot accepts — absent means NPCs only. */
  allowedKinds?: CompanionKind[]
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
