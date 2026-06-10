import type { Attributes } from '../types/hero'
import type { NpcClass, NpcRace, PartyNpc } from '../types/party'

const CLASS_LABELS: Record<NpcClass, { pt: string; en: string; color: string; spells: string[]; weights: Attributes }> = {
  guardian: {
    pt: 'Guardiao', en: 'Guardian', color: '#60a5fa',
    spells: ['fortis_scutum', 'vitae_scutum'],
    weights: { forca: 4, vitalidade: 7, agilidade: 1, destreza: 2, inteligencia: 0, sabedoria: 2, carisma: 1 },
  },
  ranger: {
    pt: 'Batedor', en: 'Ranger', color: '#34d399',
    spells: ['glacies_sagitta', 'fulgur_sagitta'],
    weights: { forca: 2, vitalidade: 2, agilidade: 5, destreza: 6, inteligencia: 1, sabedoria: 2, carisma: 1 },
  },
  arcanist: {
    pt: 'Arcanista', en: 'Arcanist', color: '#a78bfa',
    spells: ['arcanum_sagitta', 'arcanum_vortex', 'tempus_aura'],
    weights: { forca: 0, vitalidade: 2, agilidade: 1, destreza: 2, inteligencia: 7, sabedoria: 4, carisma: 1 },
  },
  cleric: {
    pt: 'Clerigo', en: 'Cleric', color: '#facc15',
    spells: ['vitae_manus', 'lux_unda', 'caelum_vitae'],
    weights: { forca: 1, vitalidade: 3, agilidade: 1, destreza: 1, inteligencia: 3, sabedoria: 7, carisma: 2 },
  },
  rogue: {
    pt: 'Lamina', en: 'Rogue', color: '#fb7185',
    spells: ['toxicum_sagitta', 'umbra_manus'],
    weights: { forca: 3, vitalidade: 2, agilidade: 6, destreza: 6, inteligencia: 1, sabedoria: 1, carisma: 2 },
  },
}

const RACE_LABELS: Record<NpcRace, { pt: string; en: string; bonus: Partial<Attributes> }> = {
  human: { pt: 'Humano', en: 'Human', bonus: { carisma: 2, destreza: 1 } },
  elf:   { pt: 'Elfo', en: 'Elf', bonus: { agilidade: 2, sabedoria: 1 } },
  dwarf: { pt: 'Anao', en: 'Dwarf', bonus: { vitalidade: 3 } },
  orc:   { pt: 'Orc', en: 'Orc', bonus: { forca: 3 } },
  fae:   { pt: 'Fae', en: 'Fae', bonus: { inteligencia: 2, sabedoria: 1 } },
}

const NPC_NAMES = [
  ['Mira', 'Mira'], ['Toren', 'Toren'], ['Lysa', 'Lysa'], ['Brann', 'Brann'],
  ['Nara', 'Nara'], ['Kael', 'Kael'], ['Iria', 'Iria'], ['Doran', 'Doran'],
] as const

const ATTR_KEYS = ['forca', 'vitalidade', 'agilidade', 'destreza', 'inteligencia', 'sabedoria', 'carisma'] as const

function emptyAttrs(): Attributes {
  return { forca: 0, vitalidade: 0, agilidade: 0, destreza: 0, inteligencia: 0, sabedoria: 0, carisma: 0 }
}

function hashText(value: string): number {
  let hash = 2166136261
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash)
}

export function npcLevel(playerLevel: number, npc: Pick<PartyNpc, 'levelOffset'>): number {
  return Math.max(1, playerLevel + npc.levelOffset)
}

export function npcClassLabel(npcClass: NpcClass, isEn: boolean): string {
  const label = CLASS_LABELS[npcClass]
  return isEn ? label.en : label.pt
}

export function npcRaceLabel(race: NpcRace, isEn: boolean): string {
  const label = RACE_LABELS[race]
  return isEn ? label.en : label.pt
}

export function generateNpc(id: string, playerLevel: number, npcClass?: NpcClass, race?: NpcRace): PartyNpc {
  const hash = hashText(id)
  const classes = Object.keys(CLASS_LABELS) as NpcClass[]
  const races = Object.keys(RACE_LABELS) as NpcRace[]
  const resolvedClass = npcClass ?? classes[hash % classes.length]
  const resolvedRace = race ?? races[Math.floor(hash / 7) % races.length]
  const namePair = NPC_NAMES[Math.floor(hash / 13) % NPC_NAMES.length]
  const classDef = CLASS_LABELS[resolvedClass]
  const raceDef = RACE_LABELS[resolvedRace]
  const levelOffset = -1 - (hash % 5)
  const level = Math.max(1, playerLevel + levelOffset)
  const points = 8 + level * 4
  const weights = classDef.weights
  const totalWeight = ATTR_KEYS.reduce((sum, key) => sum + weights[key], 0)
  const attributes = emptyAttrs()
  let spent = 0
  for (const key of ATTR_KEYS) {
    const value = Math.max(0, Math.round(points * weights[key] / totalWeight))
    attributes[key] = value
    spent += value
  }
  attributes[ATTR_KEYS[hash % ATTR_KEYS.length]] += points - spent
  for (const key of ATTR_KEYS) {
    attributes[key] += raceDef.bonus[key] ?? 0
  }

  const name = `${namePair[0]} ${raceDef.pt}`
  const nameEn = `${namePair[1]} the ${raceDef.en}`
  return {
    id,
    source: 'npc',
    name,
    nameEn,
    race: resolvedRace,
    class: resolvedClass,
    levelOffset,
    attributes,
    spellIds: classDef.spells,
    color: classDef.color,
    discoveredAt: Date.now(),
    explorerPos: { x: 0, y: 0 },
    explorerDestination: null,
    explorerWins: 0,
    explorerLosses: 0,
    lastRewardText: null,
  }
}
