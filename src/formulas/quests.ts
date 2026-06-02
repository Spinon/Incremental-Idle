import type { PlacedTile } from '../types/map'
import type {
  Quest, QuestType, QuestDifficulty, QuestRewards,
} from '../types/quest'
import { FOREST_MONSTERS } from '../data/monsters'
import type { MonsterRarity } from '../types/monster'

// ── Name tables ───────────────────────────────────────────────────────────────

const NPC_NAMES = [
  'Aldric', 'Morrigan', 'Bryn', 'Servius', 'Kael',
  'Elda', 'Vorn', 'Thira', 'Gareth', 'Lysa',
  'Davan', 'Seris', 'Oryn', 'Mira', 'Roth',
]

const NPC_TITLES_PT = [
  'o Traidor', 'o Desertor', 'a Vigarista', 'o Contrabandista',
  'o Fugitivo', 'o Mercenário Renegado', 'a Criminosa', 'o Explorador Corrupto',
  'o Impostor', 'a Saqueadora',
]

const NPC_TITLES_EN = [
  'the Traitor', 'the Deserter', 'the Swindler', 'the Smuggler',
  'the Fugitive', 'the Renegade Mercenary', 'the Criminal', 'the Corrupt Scout',
  'the Impostor', 'the Plunderer',
]

const MONSTER_EPITHETS_PT = [
  'Cruel', 'Sombrio', 'Maldito', 'Feroz', 'Ancião',
  'Chefe', 'Tirano', 'Furioso', 'Amaldiçoado', 'Implacável',
]

const MONSTER_EPITHETS_EN = [
  'Cruel', 'Shadowy', 'Cursed', 'Fierce', 'Elder',
  'Chief', 'Tyrant', 'Furious', 'Damned', 'Relentless',
]

const ESCORT_LOCATIONS_PT = [
  'Posto Avançado', 'Ponto de Observação', 'Acampamento Abandonado',
  'Ruínas Antigas', 'Clareira Misteriosa', 'Borda da Floresta',
]
const ESCORT_LOCATIONS_EN = [
  'Forward Post', 'Lookout Point', 'Abandoned Camp',
  'Ancient Ruins', 'Mysterious Clearing', 'Forest Edge',
]

const DELIVERY_TARGETS_PT = [
  'Suprimentos Urgentes', 'Correspondência Selada', 'Pacote Misterioso',
  'Ervas Medicinais', 'Mapa Secreto',
]
const DELIVERY_TARGETS_EN = [
  'Urgent Supplies', 'Sealed Letter', 'Mysterious Package',
  'Medicinal Herbs', 'Secret Map',
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

export function pickQuestDifficulty(): QuestDifficulty {
  const r = Math.random()
  if (r < 0.50) return 'easy'
  if (r < 0.80) return 'medium'
  return 'hard'
}

const DIFFICULTY_MULT: Record<QuestDifficulty, number> = { easy: 1, medium: 2.5, hard: 5 }

export const DIFFICULTY_LABEL_PT: Record<QuestDifficulty, string> = { easy: 'Fácil', medium: 'Média', hard: 'Difícil' }
export const DIFFICULTY_LABEL_EN: Record<QuestDifficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }

export const DIFFICULTY_COLOR: Record<QuestDifficulty, string> = {
  easy:   'text-green-500',
  medium: 'text-amber-500',
  hard:   'text-red-500',
}

function baseRewards(tileLevel: number, difficulty: QuestDifficulty): QuestRewards {
  const mult = DIFFICULTY_MULT[difficulty]
  return {
    xp:   Math.round((20 + tileLevel * 15) * mult * (0.8 + Math.random() * 0.4)),
    gold: Math.round((25 + tileLevel * 10) * mult * (0.8 + Math.random() * 0.4)),
  }
}

function pickQuestType(grid: Record<string, PlacedTile>, playerPos: { x: number; y: number }): QuestType {
  const tiles = Object.values(grid)
  const hasUnexplored = tiles.some(t => !t.explored && !(t.x === playerPos.x && t.y === playerPos.y))
  const hasExplored   = tiles.some(t => t.explored  && !(t.x === playerPos.x && t.y === playerPos.y))
  const hasMonster    = tiles.some(t => !t.explored && t.content.type === 'monster')

  const weights: [QuestType, number][] = [
    ['escort',         hasUnexplored ? 22 : 0],
    ['delivery',       hasExplored   ? 20 : 0],
    ['extermination',  hasMonster    ? 20 : 0],
    ['bounty_monster', hasMonster    ? 15 : 0],
    ['bounty_npc',     hasMonster    ? 10 : 0],
    ['collection',     18],
  ]
  const valid = weights.filter(([, w]) => w > 0)
  if (valid.length === 0) return 'collection'

  const total = valid.reduce((s, [, w]) => s + w, 0)
  let r = Math.random() * total
  for (const [type, weight] of valid) {
    r -= weight
    if (r <= 0) return type
  }
  return valid[valid.length - 1][0]
}

function pickBountyRarity(tileLevel: number): MonsterRarity {
  if (tileLevel >= 20 && Math.random() < 0.15) return 'epic'
  if (tileLevel >= 10 && Math.random() < 0.30) return 'rare'
  if (tileLevel >= 5  && Math.random() < 0.50) return 'uncommon'
  return 'normal'
}

// ── Quest generators ──────────────────────────────────────────────────────────

function makeEscort(tileLevel: number, difficulty: QuestDifficulty, grid: Record<string, PlacedTile>, playerPos: { x: number; y: number }): Quest | null {
  const candidates = Object.values(grid).filter(t =>
    !t.explored && !(t.x === playerPos.x && t.y === playerPos.y)
  )
  if (candidates.length === 0) return null
  const target = pickRandom(candidates)
  const loc_pt = pickRandom(ESCORT_LOCATIONS_PT)
  const loc_en = pickRandom(ESCORT_LOCATIONS_EN)
  return {
    id: uid(), type: 'escort', difficulty, status: 'active', tileLevel,
    title:       `Escolta: ${loc_pt}`,
    titleEn:     `Escort: ${loc_en}`,
    description: `Chegue ao tile (${target.x},${target.y}) sem morrer.`,
    descriptionEn: `Reach tile (${target.x},${target.y}) without dying.`,
    objective:   { type: 'escort', targetX: target.x, targetY: target.y, reached: false },
    rewards:     baseRewards(tileLevel, difficulty),
  }
}

function makeDelivery(tileLevel: number, difficulty: QuestDifficulty, grid: Record<string, PlacedTile>, playerPos: { x: number; y: number }): Quest | null {
  const candidates = Object.values(grid).filter(t =>
    t.explored && !(t.x === playerPos.x && t.y === playerPos.y)
  )
  if (candidates.length === 0) return null
  const target = pickRandom(candidates)
  const item_pt = pickRandom(DELIVERY_TARGETS_PT)
  const item_en = pickRandom(DELIVERY_TARGETS_EN)
  return {
    id: uid(), type: 'delivery', difficulty, status: 'active', tileLevel,
    title:       `Entrega: ${item_pt}`,
    titleEn:     `Delivery: ${item_en}`,
    description: `Leve os itens até (${target.x},${target.y}).`,
    descriptionEn: `Bring the items to (${target.x},${target.y}).`,
    objective:   { type: 'delivery', targetX: target.x, targetY: target.y, reached: false },
    rewards:     baseRewards(tileLevel, difficulty),
  }
}

function makeExtermination(tileLevel: number, difficulty: QuestDifficulty, grid: Record<string, PlacedTile>, playerPos: { x: number; y: number }): Quest | null {
  const monsterTiles = Object.values(grid).filter(t =>
    !t.explored && t.content.type === 'monster' &&
    !(t.x === playerPos.x && t.y === playerPos.y)
  )
  if (monsterTiles.length === 0) return null
  const center = pickRandom(monsterTiles)
  const radius = difficulty === 'easy' ? 2 : difficulty === 'medium' ? 3 : 4
  const required = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 6 : 10
  return {
    id: uid(), type: 'extermination', difficulty, status: 'active', tileLevel,
    title:       'Limpar a Área',
    titleEn:     'Clear the Area',
    description: `Derrote ${required} criaturas em raio ${radius} de (${center.x},${center.y}).`,
    descriptionEn: `Defeat ${required} creatures within radius ${radius} of (${center.x},${center.y}).`,
    objective: {
      type: 'extermination',
      centerX: center.x, centerY: center.y,
      radius, required, killed: 0,
    },
    rewards: baseRewards(tileLevel, difficulty),
  }
}

function makeBountyMonster(tileLevel: number, difficulty: QuestDifficulty, grid: Record<string, PlacedTile>, playerPos: { x: number; y: number }): Quest | null {
  const candidates = Object.values(grid).filter(t =>
    !t.explored && t.content.type === 'monster' &&
    !(t.x === playerPos.x && t.y === playerPos.y)
  )
  if (candidates.length === 0) return null
  const target   = pickRandom(candidates)
  const template = FOREST_MONSTERS.find(m => m.id === target.content.monsterType) ?? FOREST_MONSTERS[0]
  const epithetPt = pickRandom(MONSTER_EPITHETS_PT)
  const epithetEn = pickRandom(MONSTER_EPITHETS_EN)
  const namePt = `${template.namePt} ${epithetPt}`
  const nameEn = `${epithetEn} ${template.nameEn}`
  const rarity = pickBountyRarity(tileLevel)
  const rewardMult = difficulty === 'easy' ? 1.5 : difficulty === 'medium' ? 3 : 6
  return {
    id: uid(), type: 'bounty_monster', difficulty, status: 'active', tileLevel,
    title:       `Caçada: ${namePt}`,
    titleEn:     `Hunt: ${nameEn}`,
    description: `Procurado em (${target.x},${target.y}).`,
    descriptionEn: `Wanted at (${target.x},${target.y}).`,
    objective: {
      type: 'bounty',
      targetX: target.x, targetY: target.y,
      targetName: namePt, targetNameEn: nameEn,
      monsterType: template.id,
      targetLevel: tileLevel + (difficulty === 'hard' ? 4 : difficulty === 'medium' ? 2 : 1),
      targetRarity: rarity,
      isNpc: false, defeated: false,
    },
    rewards: {
      xp:   Math.round((40 + tileLevel * 20) * rewardMult * (0.8 + Math.random() * 0.4)),
      gold: Math.round((50 + tileLevel * 15) * rewardMult * (0.8 + Math.random() * 0.4)),
    },
  }
}

function makeBountyNpc(tileLevel: number, difficulty: QuestDifficulty, grid: Record<string, PlacedTile>, playerPos: { x: number; y: number }): Quest | null {
  const candidates = Object.values(grid).filter(t =>
    !t.explored && t.content.type === 'monster' &&
    !(t.x === playerPos.x && t.y === playerPos.y)
  )
  if (candidates.length === 0) return null
  const target = pickRandom(candidates)
  const firstName  = pickRandom(NPC_NAMES)
  const titleIdx   = Math.floor(Math.random() * NPC_TITLES_PT.length)
  const namePt     = `${firstName} ${NPC_TITLES_PT[titleIdx]}`
  const nameEn     = `${firstName} ${NPC_TITLES_EN[titleIdx]}`
  const rarity     = pickBountyRarity(tileLevel)
  const rewardMult = difficulty === 'easy' ? 1.5 : difficulty === 'medium' ? 3 : 6
  return {
    id: uid(), type: 'bounty_npc', difficulty, status: 'active', tileLevel,
    title:       `Fugitivo: ${namePt}`,
    titleEn:     `Fugitive: ${nameEn}`,
    description: `Capturar em (${target.x},${target.y}).`,
    descriptionEn: `Capture at (${target.x},${target.y}).`,
    objective: {
      type: 'bounty',
      targetX: target.x, targetY: target.y,
      targetName: namePt, targetNameEn: nameEn,
      monsterType: 'bandit',
      targetLevel: tileLevel + (difficulty === 'hard' ? 4 : difficulty === 'medium' ? 2 : 1),
      targetRarity: rarity,
      isNpc: true, defeated: false,
    },
    rewards: {
      xp:   Math.round((40 + tileLevel * 20) * rewardMult * (0.8 + Math.random() * 0.4)),
      gold: Math.round((50 + tileLevel * 15) * rewardMult * (0.8 + Math.random() * 0.4)),
    },
  }
}

function makeCollection(tileLevel: number, difficulty: QuestDifficulty, grid: Record<string, PlacedTile>): Quest {
  const monsterTiles = Object.values(grid).filter(t => t.content.type === 'monster')
  const types = [...new Set(monsterTiles.map(t => t.content.monsterType).filter(Boolean))] as string[]
  const monsterType = types.length > 0 ? pickRandom(types) : null
  const template = monsterType ? FOREST_MONSTERS.find(m => m.id === monsterType) : null
  const required = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 7 : 15

  const namePt = template ? template.namePt : 'Criatura'
  const nameEn = template ? template.nameEn : 'Creature'
  return {
    id: uid(), type: 'collection', difficulty, status: 'active', tileLevel,
    title:       `Coleta: ${required}× ${namePt}`,
    titleEn:     `Hunt: ${required}× ${nameEn}`,
    description: monsterType
      ? `Derrote ${required} ${namePt}s.`
      : `Derrote ${required} criaturas.`,
    descriptionEn: monsterType
      ? `Defeat ${required} ${nameEn}s.`
      : `Defeat ${required} creatures.`,
    objective: { type: 'collection', monsterType, required, collected: 0 },
    rewards: baseRewards(tileLevel, difficulty),
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function generateQuest(
  tileLevel: number,
  grid: Record<string, PlacedTile>,
  playerPos: { x: number; y: number },
): Quest | null {
  const difficulty = pickQuestDifficulty()
  const type       = pickQuestType(grid, playerPos)

  switch (type) {
    case 'escort':         return makeEscort(tileLevel, difficulty, grid, playerPos)
    case 'delivery':       return makeDelivery(tileLevel, difficulty, grid, playerPos)
    case 'extermination':  return makeExtermination(tileLevel, difficulty, grid, playerPos)
    case 'bounty_monster': return makeBountyMonster(tileLevel, difficulty, grid, playerPos)
    case 'bounty_npc':     return makeBountyNpc(tileLevel, difficulty, grid, playerPos)
    case 'collection':     return makeCollection(tileLevel, difficulty, grid)
  }
}

export interface BountyTileEntry {
  questId: string
  targetName: string
  targetNameEn: string
  monsterType: string
  targetLevel: number
  targetRarity: MonsterRarity
  isNpc: boolean
}
