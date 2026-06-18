import type { PlacedTile } from '../types/map'
import type {
  Quest, QuestType, QuestDifficulty, QuestRewards,
} from '../types/quest'
import { FOREST_MONSTERS, FOREST_RANDOM_MONSTERS } from '../data/monsters'
import type { MonsterRarity } from '../types/monster'
import type { Item, Consumable } from '../types/item'
import { generateItem, generateConsumable } from './items'
import { xpForLevel } from '../store/heroStore'

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
const DISTANCE_BY_DIFFICULTY: Record<QuestDifficulty, { min: number; max: number }> = {
  easy:   { min: 5,  max: 7 },
  medium: { min: 8,  max: 10 },
  hard:   { min: 11, max: 16 },
}

export const DIFFICULTY_LABEL_PT: Record<QuestDifficulty, string> = { easy: 'Fácil', medium: 'Média', hard: 'Difícil' }
export const DIFFICULTY_LABEL_EN: Record<QuestDifficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }

export const DIFFICULTY_COLOR: Record<QuestDifficulty, string> = {
  easy:   'text-green-500',
  medium: 'text-amber-500',
  hard:   'text-red-500',
}

// ── Reward tuning ───────────────────────────────────────────────────────────
// Quest XP is anchored to the hero level curve (xpForLevel) so it stays
// meaningful as the curve changes: an easy quest ≈ 10 % of a level at its
// tile level, a hard bounty ≈ 75 %. Gold, Word Sand, Word Bits, equipment and
// consumables are layered on so completing quests is worth the detour.
const XP_FRACTION:        Record<QuestDifficulty, number> = { easy: 0.10, medium: 0.25, hard: 0.50 }
const BOUNTY_XP_FRACTION: Record<QuestDifficulty, number> = { easy: 0.18, medium: 0.40, hard: 0.75 }
const SAND_MULT:          Record<QuestDifficulty, number> = { easy: 1,    medium: 2,    hard: 3.5  }
const WORD_BITS:          Record<QuestDifficulty, number> = { easy: 0,    medium: 1,    hard: 2    }
const ITEM_CHANCE:        Record<QuestDifficulty, number> = { easy: 0.25, medium: 0.60, hard: 1    }
const CONSUMABLE_CHANCE:  Record<QuestDifficulty, number> = { easy: 0.35, medium: 0.70, hard: 1    }

/** ±15 % variance applied to every numeric reward. */
function rewardVariance(): number {
  return 0.85 + Math.random() * 0.3
}

function rollQuestRewards(tileLevel: number, difficulty: QuestDifficulty, bounty = false): QuestRewards {
  const lvl = Math.max(1, tileLevel)

  const xpFrac = (bounty ? BOUNTY_XP_FRACTION : XP_FRACTION)[difficulty]
  const xp = Math.max(1, Math.round(xpForLevel(lvl) * xpFrac * rewardVariance()))

  const goldMult = DIFFICULTY_MULT[difficulty] * (bounty ? 1.6 : 1)
  const gold = Math.round((30 + lvl * 14) * goldMult * rewardVariance())

  const rewards: QuestRewards = { xp, gold }

  // Areia de Palavra — always granted.
  const sandMult = SAND_MULT[difficulty] * (bounty ? 1.5 : 1)
  rewards.wordSand = Math.max(1, Math.round((11 + lvl * 3) * sandMult * rewardVariance()))

  // Pedaços de Palavra — medium quests and up.
  const bits = WORD_BITS[difficulty] + (bounty ? 1 : 0)
  if (bits > 0) rewards.wordBits = bits

  // Loot is rolled one or two tile levels above the quest for a slight premium.
  const lootLevel = lvl + (difficulty === 'hard' ? 2 : difficulty === 'medium' ? 1 : 0) + (bounty ? 1 : 0)

  const items: Item[] = []
  if (Math.random() < ITEM_CHANCE[difficulty] + (bounty ? 0.25 : 0)) items.push(generateItem(lootLevel))
  if (bounty && difficulty === 'hard' && Math.random() < 0.5) items.push(generateItem(lootLevel))
  if (items.length > 0) rewards.items = items

  const consumables: Consumable[] = []
  if (Math.random() < CONSUMABLE_CHANCE[difficulty]) consumables.push(generateConsumable(lootLevel))
  if (difficulty === 'hard' && Math.random() < 0.4) consumables.push(generateConsumable(lootLevel))
  if (consumables.length > 0) rewards.consumables = consumables

  return rewards
}

function tileDistance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y))
}

interface QuestTarget {
  x: number
  y: number
  level: number
  tile?: PlacedTile
  monsterType?: string
  monsterRarity?: MonsterRarity
  future: boolean
}

function placedTargets(
  grid: Record<string, PlacedTile>,
  playerPos: { x: number; y: number },
  difficulty: QuestDifficulty,
  predicate: (tile: PlacedTile) => boolean,
): QuestTarget[] {
  const range = DISTANCE_BY_DIFFICULTY[difficulty]
  return Object.values(grid)
    .filter(t => !(t.x === playerPos.x && t.y === playerPos.y) && predicate(t))
    .map(t => ({ x: t.x, y: t.y, level: t.level, tile: t, future: false }))
    .filter(t => {
      const d = tileDistance(t, playerPos)
      return d >= range.min && d <= range.max
    })
}

function fallbackPlacedTargets(
  grid: Record<string, PlacedTile>,
  playerPos: { x: number; y: number },
  predicate: (tile: PlacedTile) => boolean,
): QuestTarget[] {
  return Object.values(grid)
    .filter(t => !(t.x === playerPos.x && t.y === playerPos.y) && predicate(t))
    .map(t => ({ x: t.x, y: t.y, level: t.level, tile: t, future: false }))
    .sort((a, b) => tileDistance(a, playerPos) - tileDistance(b, playerPos))
}

function futureTargets(
  grid: Record<string, PlacedTile>,
  playerPos: { x: number; y: number },
  difficulty: QuestDifficulty,
  tileLevel: number,
): QuestTarget[] {
  const range = DISTANCE_BY_DIFFICULTY[difficulty]
  const occupied = new Set(Object.values(grid).map(t => `${t.x},${t.y}`))
  const candidates: QuestTarget[] = []

  for (let y = playerPos.y - range.max; y <= playerPos.y + range.max; y++) {
    for (let x = playerPos.x - range.max; x <= playerPos.x + range.max; x++) {
      const d = tileDistance({ x, y }, playerPos)
      if (d < range.min || d > range.max) continue
      if (occupied.has(`${x},${y}`)) continue
      candidates.push({ x, y, level: Math.max(1, tileLevel + (difficulty === 'hard' ? 2 : 1)), future: true })
    }
  }
  return candidates
}

function pickQuestTarget(
  tileLevel: number,
  difficulty: QuestDifficulty,
  grid: Record<string, PlacedTile>,
  playerPos: { x: number; y: number },
  predicate: (tile: PlacedTile) => boolean,
  allowFuture = false,
): QuestTarget | null {
  const placed = placedTargets(grid, playerPos, difficulty, predicate)
  const future = allowFuture ? futureTargets(grid, playerPos, difficulty, tileLevel) : []

  if (difficulty === 'hard' && future.length > 0 && (placed.length === 0 || Math.random() < 0.70)) {
    return pickRandom(future)
  }
  if (difficulty === 'medium' && future.length > 0 && Math.random() < 0.25) {
    return pickRandom(future)
  }
  if (placed.length > 0) return pickRandom(placed)
  if (future.length > 0) return pickRandom(future)

  const fallback = fallbackPlacedTargets(grid, playerPos, predicate)
  return fallback[0] ?? null
}

function pickQuestType(grid: Record<string, PlacedTile>, playerPos: { x: number; y: number }, difficulty: QuestDifficulty): QuestType {
  const tiles = Object.values(grid)
  const hasUnexplored = tiles.some(t => !t.explored && !(t.x === playerPos.x && t.y === playerPos.y))
  const hasExplored   = tiles.some(t => t.explored  && !(t.x === playerPos.x && t.y === playerPos.y))
  const hasMonster    = tiles.some(t => !t.explored && t.content.type === 'monster')
  const canUseFuture  = difficulty !== 'easy'

  const weights: [QuestType, number][] = [
    ['escort',         hasUnexplored || canUseFuture ? 22 : 0],
    ['delivery',       hasExplored   || canUseFuture ? 20 : 0],
    ['extermination',  hasMonster    || canUseFuture ? 20 : 0],
    ['bounty_monster', hasMonster    || canUseFuture ? 15 : 0],
    ['bounty_npc',     hasMonster    || canUseFuture ? 10 : 0],
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
  const target = pickQuestTarget(tileLevel, difficulty, grid, playerPos, t => !t.explored, difficulty !== 'easy')
  if (!target) return null
  const loc_pt = pickRandom(ESCORT_LOCATIONS_PT)
  const loc_en = pickRandom(ESCORT_LOCATIONS_EN)
  return {
    id: uid(), type: 'escort', difficulty, status: 'active', tileLevel,
    title:       `Escolta: ${loc_pt}`,
    titleEn:     `Escort: ${loc_en}`,
    description: `Chegue ao tile (${target.x},${target.y}) sem morrer.`,
    descriptionEn: `Reach tile (${target.x},${target.y}) without dying.`,
    objective:   { type: 'escort', targetX: target.x, targetY: target.y, reached: false },
    rewards:     rollQuestRewards(tileLevel, difficulty),
  }
}

function makeDelivery(tileLevel: number, difficulty: QuestDifficulty, grid: Record<string, PlacedTile>, playerPos: { x: number; y: number }): Quest | null {
  const target = pickQuestTarget(tileLevel, difficulty, grid, playerPos, t => t.explored, difficulty !== 'easy')
  if (!target) return null
  const item_pt = pickRandom(DELIVERY_TARGETS_PT)
  const item_en = pickRandom(DELIVERY_TARGETS_EN)
  return {
    id: uid(), type: 'delivery', difficulty, status: 'active', tileLevel,
    title:       `Entrega: ${item_pt}`,
    titleEn:     `Delivery: ${item_en}`,
    description: `Leve os itens até (${target.x},${target.y}).`,
    descriptionEn: `Bring the items to (${target.x},${target.y}).`,
    objective:   { type: 'delivery', targetX: target.x, targetY: target.y, reached: false },
    rewards:     rollQuestRewards(tileLevel, difficulty),
  }
}

function makeExtermination(tileLevel: number, difficulty: QuestDifficulty, grid: Record<string, PlacedTile>, playerPos: { x: number; y: number }): Quest | null {
  const center = pickQuestTarget(tileLevel, difficulty, grid, playerPos, t => !t.explored && t.content.type === 'monster', difficulty !== 'easy')
  if (!center) return null
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
    rewards: rollQuestRewards(tileLevel, difficulty),
  }
}

function makeBountyMonster(tileLevel: number, difficulty: QuestDifficulty, grid: Record<string, PlacedTile>, playerPos: { x: number; y: number }): Quest | null {
  const target = pickQuestTarget(tileLevel, difficulty, grid, playerPos, t => !t.explored && t.content.type === 'monster', difficulty !== 'easy')
  if (!target) return null
  const template = target.tile
    ? (FOREST_MONSTERS.find(m => m.id === target.tile!.content.monsterType) ?? FOREST_MONSTERS[0])
    : pickRandom(FOREST_RANDOM_MONSTERS)
  const epithetPt = pickRandom(MONSTER_EPITHETS_PT)
  const epithetEn = pickRandom(MONSTER_EPITHETS_EN)
  const namePt = `${template.namePt} ${epithetPt}`
  const nameEn = `${epithetEn} ${template.nameEn}`
  const rarity = pickBountyRarity(tileLevel)
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
    rewards: rollQuestRewards(tileLevel, difficulty, true),
  }
}

function makeBountyNpc(tileLevel: number, difficulty: QuestDifficulty, grid: Record<string, PlacedTile>, playerPos: { x: number; y: number }): Quest | null {
  const target = pickQuestTarget(tileLevel, difficulty, grid, playerPos, t => !t.explored && t.content.type === 'monster', difficulty !== 'easy')
  if (!target) return null
  const firstName  = pickRandom(NPC_NAMES)
  const titleIdx   = Math.floor(Math.random() * NPC_TITLES_PT.length)
  const namePt     = `${firstName} ${NPC_TITLES_PT[titleIdx]}`
  const nameEn     = `${firstName} ${NPC_TITLES_EN[titleIdx]}`
  const rarity     = pickBountyRarity(tileLevel)
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
    rewards: rollQuestRewards(tileLevel, difficulty, true),
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
    rewards: rollQuestRewards(tileLevel, difficulty),
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function generateQuest(
  tileLevel: number,
  grid: Record<string, PlacedTile>,
  playerPos: { x: number; y: number },
): Quest | null {
  const difficulty = pickQuestDifficulty()
  const type       = pickQuestType(grid, playerPos, difficulty)

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
