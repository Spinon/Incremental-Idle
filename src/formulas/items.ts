import type { EquipSlot, Item, ItemRarity, ItemStats, EquipmentSlots, EquipBonuses, Consumable, ConsumableEffect, MarketOffer, AttributeKey } from '../types/item'

// ─── Rarity ──────────────────────────────────────────────────────────────────

const RARITY_MULT: Record<ItemRarity, number> = {
  common:   1,
  uncommon: 1.8,
  rare:     3.2,
  epic:     6.0,
  set:      8.0,    // yellow — above epic
  unique:   12.0,   // orange — top tier
}

function pickRarity(level: number): ItemRarity {
  const uniqueChance   = Math.min(1.5,  0.1  + level * 0.06)
  const setChance      = Math.min(4,    0.3  + level * 0.12)
  const epicChance     = Math.min(12,   1    + level * 0.4)
  const rareChance     = Math.min(28,   5    + level * 0.9)
  const uncommonChance = Math.min(42,   18   + level * 0.5)
  const roll = Math.random() * 100
  if (roll < uniqueChance)                                                             return 'unique'
  if (roll < uniqueChance + setChance)                                                 return 'set'
  if (roll < uniqueChance + setChance + epicChance)                                    return 'epic'
  if (roll < uniqueChance + setChance + epicChance + rareChance)                       return 'rare'
  if (roll < uniqueChance + setChance + epicChance + rareChance + uncommonChance)      return 'uncommon'
  return 'common'
}

// ─── Slot configuration ───────────────────────────────────────────────────────

const SLOT_STATS: Record<EquipSlot, (keyof ItemStats)[]> = {
  head:     ['def', 'vision', 'magicDamage'],
  shoulder: ['def', 'atk'],
  chest:    ['def', 'hp'],
  gloves:   ['atk', 'atkSpeed'],
  legs:     ['moveSpeed', 'def'],
  feet:     ['moveSpeed', 'dropChance'],
  acc:      ['goldMult', 'xpBonus', 'dropChance', 'vision'],
}

const ALL_SLOTS: EquipSlot[] = ['head', 'shoulder', 'chest', 'gloves', 'legs', 'feet', 'acc']

// ─── Item name pools ─────────────────────────────────────────────────────────

const ITEM_NAMES: Record<EquipSlot, string[]> = {
  head:     ['Chapéu', 'Elmo', 'Capuz', 'Coroa'],
  shoulder: ['Espaldeira', 'Pauldron', 'Ombreira'],
  chest:    ['Peitoral', 'Armadura', 'Colete'],
  gloves:   ['Luvas', 'Manoplas', 'Punhos'],
  legs:     ['Calças', 'Grevas', 'Perneiras'],
  feet:     ['Botas', 'Sandálias', 'Sapatos'],
  acc:      ['Anel', 'Amuleto', 'Pingente', 'Talismã'],
}

const RARITY_PREFIXES: Record<'common' | 'uncommon' | 'rare' | 'epic', string[]> = {
  common:   ['Simples', 'Velho', 'Básico'],
  uncommon: ['Resistente', 'Reforçado', 'Sólido'],
  rare:     ['Élfico', 'Arcano', 'Veloz'],
  epic:     ['Lendário', 'Ancestral', 'Divino'],
}

/** Set item prefixes — evoke a shared magical theme */
const SET_PREFIXES = ['Rúnico', 'Cristalino', 'Tempestuoso', 'Etéreo', 'Abissal', 'Celeste', 'Sombrio', 'Solar']

/** Unique item names — one legendary name per slot */
const UNIQUE_NAMES: Record<EquipSlot, string[]> = {
  head:     ['Elmo da Eternidade', 'Corona do Caos', 'Capuz das Sombras', 'Tiara do Destino'],
  shoulder: ['Ombros do Titã', 'Pauldron do Apocalipse', 'Espaldeiras do Dragão'],
  chest:    ['Couraça do Dragão', 'Veste Arcana', 'Armadura da Fênix', 'Peitoral Vivo'],
  gloves:   ['Mãos do Fogo', 'Luvas da Fatalidade', 'Punhos do Trovão'],
  legs:     ['Perneiras do Aço Vivo', 'Grevas do Abismo', 'Calças do Vento Eterno'],
  feet:     ['Botas do Vento', 'Sandálias da Luz', 'Sapatos do Caçador'],
  acc:      ['Anel do Destino', 'Olho do Caos', 'Amuleto do Fim', 'Talismã da Eternidade'],
}

/** Primary attributes that unique items can boost */
const ALL_ATTRS: AttributeKey[] = ['forca', 'vitalidade', 'agilidade', 'destreza', 'inteligencia', 'sabedoria', 'carisma']

const ATTR_LABEL_PT: Record<AttributeKey, string> = {
  forca: 'Força', vitalidade: 'Vitalidade', agilidade: 'Agilidade',
  destreza: 'Destreza', inteligencia: 'Inteligência', sabedoria: 'Sabedoria', carisma: 'Carisma',
}
const ATTR_LABEL_EN: Record<AttributeKey, string> = {
  forca: 'Strength', vitalidade: 'Vitality', agilidade: 'Agility',
  destreza: 'Dexterity', inteligencia: 'Intelligence', sabedoria: 'Wisdom', carisma: 'Charisma',
}
export { ATTR_LABEL_PT, ATTR_LABEL_EN }

// ─── Stat scaling ─────────────────────────────────────────────────────────────

/**
 * Base stat value for an item at a given enemy level.
 * Flat base + gentle per-level scaling so items found later are meaningfully
 * stronger, but rarity multiplier (RARITY_MULT) remains the primary power axis.
 *
 * A common item at Lv10 is ~35 % stronger than at Lv1.
 * A unique item at Lv10 is ~35 % stronger than a unique at Lv1,
 * but still ~12× stronger than a common at the same level.
 */
/**
 * Base stat per item, scaled by enemy level and rarity multiplier.
 * With the armor-ratio formula (k=20) DEF items are tuned to shift the
 * ratio meaningfully; ATK items push raw output; HP items provide a
 * reliable buffer against the ratio-based damage.
 *
 * Reference — rare item (×3.2) at enemy level 10:
 *   ATK 11  DEF 8  HP 112  AtkSpd 0.29  MagicDmg 11
 */
function statBase(stat: keyof ItemStats, level: number): number {
  type S = keyof ItemStats
  const flat: Record<S, number> = {
    atk:         1.5,   def:         1.0,   hp:          25,
    atkSpeed:    0.05,  magicDamage: 1.5,   vision:      8,
    moveSpeed:   0.05,  dropChance:  0.005, goldMult:    0.05,
    xpBonus:     0.03,
  }
  const perLv: Record<S, number> = {
    atk:         0.20,  def:         0.15,  hp:          2.5,
    atkSpeed:    0.006, magicDamage: 0.20,  vision:      0.5,
    moveSpeed:   0.003, dropChance:  0.0003, goldMult:   0.004,
    xpBonus:     0.003,
  }
  return flat[stat] + level * perLv[stat]
}

const FLOAT_STATS = new Set<keyof ItemStats>(['atkSpeed', 'moveSpeed', 'dropChance', 'goldMult', 'xpBonus'])

function pickStats(slot: EquipSlot, rarity: ItemRarity): (keyof ItemStats)[] {
  const possible  = SLOT_STATS[slot]
  // set/unique always roll all available stats for the slot
  const count =
    rarity === 'unique' ? possible.length :
    rarity === 'set'    ? Math.min(3, possible.length) :
    rarity === 'epic'   ? Math.min(3, possible.length) :
    rarity === 'rare'   ? Math.min(2, possible.length) :
    1
  return [...possible].sort(() => Math.random() - 0.5).slice(0, count)
}

// ─── Generator ────────────────────────────────────────────────────────────────

let _idSeq = 0

const ITEM_PRICE_MULT: Record<ItemRarity, number> = {
  common: 1, uncommon: 2.5, rare: 6, epic: 16, set: 30, unique: 60,
}

export function generateItem(level: number, forMarket = false): Item {
  const slot   = ALL_SLOTS[Math.floor(Math.random() * ALL_SLOTS.length)]
  const rarity = pickRarity(level)
  const mult   = RARITY_MULT[rarity]
  const chosen = pickStats(slot, rarity)

  // ── Sub-attribute stats ───────────────────────────────────────────────────
  const stats: ItemStats = {}
  for (const s of chosen) {
    const raw = statBase(s, level) * mult
    ;(stats as Record<string, number>)[s] = FLOAT_STATS.has(s)
      ? Math.round(raw * 1000) / 1000
      : Math.max(1, Math.round(raw))
  }

  // ── Name ──────────────────────────────────────────────────────────────────
  const baseName = ITEM_NAMES[slot][Math.floor(Math.random() * ITEM_NAMES[slot].length)]
  let name: string
  if (rarity === 'unique') {
    const pool = UNIQUE_NAMES[slot]
    name = pool[Math.floor(Math.random() * pool.length)]
  } else if (rarity === 'set') {
    const prefix = SET_PREFIXES[Math.floor(Math.random() * SET_PREFIXES.length)]
    name = `${prefix} ${baseName}`
  } else {
    const prefixes = RARITY_PREFIXES[rarity as 'common' | 'uncommon' | 'rare' | 'epic']
    const prefix   = prefixes[Math.floor(Math.random() * prefixes.length)]
    name = `${prefix} ${baseName}`
  }

  // ── Set bonus (set items only) ─────────────────────────────────────────────
  let setBonus: Item['setBonus']
  if (rarity === 'set') {
    const stat  = chosen[Math.floor(Math.random() * chosen.length)]
    const value = FLOAT_STATS.has(stat)
      ? Math.round(statBase(stat, level) * 0.35 * 1000) / 1000
      : Math.max(1, Math.round(statBase(stat, level) * 0.4))
    setBonus = { stat, value }
  }

  // ── Attribute bonus (unique items only) ───────────────────────────────────
  let attrBonus: Item['attrBonus']
  if (rarity === 'unique') {
    const numAttrs   = Math.random() < 0.6 ? 2 : 1   // 60% chance of 2 attrs
    const shuffled   = [...ALL_ATTRS].sort(() => Math.random() - 0.5)
    const picked     = shuffled.slice(0, numAttrs)
    const perAttr    = Math.random() < 0.5 ? 2 : 1
    attrBonus = {}
    for (const a of picked) attrBonus[a] = perAttr
  }

  const price = forMarket
    ? Math.round((20 + level * 6) * ITEM_PRICE_MULT[rarity])
    : undefined

  return {
    id:     `item_${Date.now()}_${_idSeq++}`,
    name,
    slot,
    rarity,
    level,
    stats,
    price,
    setBonus,
    attrBonus,
  }
}

// ─── Consumable generator ─────────────────────────────────────────────────────

const CONSUMABLE_RARITY_MULT: Record<ItemRarity, number> = {
  common: 1, uncommon: 1.6, rare: 2.8, epic: 5.0, set: 5.0, unique: 5.0,
}
const CONSUMABLE_PRICE_BASE: Record<ConsumableEffect, number> = {
  stamina: 12, mana: 10, skip: 28, xp: 18,
}

const CONSUMABLE_NAMES: Record<ConsumableEffect, Record<string, [string, string]>> = {
  stamina: {
    common:   ['Poção de Vigor',   'Stamina Potion'],
    uncommon: ['Elixir de Vigor',  'Vigor Elixir'],
    rare:     ['Essência Vital',   'Vital Essence'],
    epic:     ['Néctar do Vigor',  'Nectar of Vigor'],
    set:      ['Néctar do Vigor',  'Nectar of Vigor'],
    unique:   ['Néctar do Vigor',  'Nectar of Vigor'],
  },
  mana: {
    common:   ['Poção de Mana',    'Mana Potion'],
    uncommon: ['Elixir Arcano',    'Arcane Elixir'],
    rare:     ['Essência Arcana',  'Arcane Essence'],
    epic:     ['Essência Etérea',  'Ethereal Essence'],
    set:      ['Essência Etérea',  'Ethereal Essence'],
    unique:   ['Essência Etérea',  'Ethereal Essence'],
  },
  skip: {
    common:   ['Turbo Charge',      'Turbo Charge'],
    uncommon: ['Impulso Veloz',     'Quick Boost'],
    rare:     ['Turbo Avançado',    'Advanced Turbo'],
    epic:     ['Overdrive Supremo', 'Supreme Overdrive'],
    set:      ['Overdrive Supremo', 'Supreme Overdrive'],
    unique:   ['Overdrive Supremo', 'Supreme Overdrive'],
  },
  xp: {
    common:   ['Tomo de XP',        'XP Tome'],
    uncommon: ['Manuscrito',        'Manuscript'],
    rare:     ['Tomo Antigo',       'Ancient Tome'],
    epic:     ['Grimório Ancestral','Ancient Grimoire'],
    set:      ['Grimório Ancestral','Ancient Grimoire'],
    unique:   ['Grimório Ancestral','Ancient Grimoire'],
  },
}

const CONSUMABLE_ICONS: Record<ConsumableEffect, string> = {
  stamina: '💪', mana: '🔷', skip: '⏩', xp: '📖',
}

const ALL_EFFECTS: ConsumableEffect[] = ['stamina', 'mana', 'skip', 'xp']

export function generateConsumable(level: number): Consumable {
  // consumables only use common-epic rarity logic
  const rarity = pickRarity(level) === 'unique' ? 'epic' : pickRarity(level) === 'set' ? 'epic' : pickRarity(level)
  const mult   = CONSUMABLE_RARITY_MULT[rarity]
  const effect = ALL_EFFECTS[Math.floor(Math.random() * ALL_EFFECTS.length)]

  let magnitude: number
  switch (effect) {
    case 'stamina':
    case 'mana':
      magnitude = Math.min(1.0, parseFloat(((0.2 + level * 0.025) * mult).toFixed(3)))
      break
    case 'skip':
      magnitude = rarity === 'epic' ? 3 : rarity === 'rare' ? 2 : 1
      break
    case 'xp':
      magnitude = Math.round((25 + level * 12) * mult)
      break
    default:
      magnitude = 1
  }

  const [name, nameEn] = CONSUMABLE_NAMES[effect][rarity]
  const price = Math.round(CONSUMABLE_PRICE_BASE[effect] * mult * (1 + level * 0.15))

  return {
    id:        `con_${Date.now()}_${_idSeq++}`,
    name, nameEn,
    icon:      CONSUMABLE_ICONS[effect],
    effect, magnitude, rarity, level, price,
  }
}

/**
 * Price for a word of the given rarity at the current market tile level.
 * Uses the same base as items (20 + level*6) with a 1.5× premium — words
 * unlock multiple spells simultaneously, so they're worth more than one item.
 *
 *   rare   × 9  (items × 6)
 *   epic   × 24 (items × 16)
 *   unique × 90 (items × 60)
 */
export function wordPrice(rarity: 'rare' | 'epic' | 'unique', tileLevel: number): number {
  const base: Record<string, number> = { rare: 9, epic: 24, unique: 90 }
  return Math.round((20 + tileLevel * 6) * base[rarity])
}

export function generateMarketOffer(level: number): MarketOffer {
  return {
    consumables: [generateConsumable(level), generateConsumable(level)],
    equipment:   [generateItem(level, true), generateItem(level, true)],
    words:       [],   // populated by MarketInterior which has access to known words
  }
}

// ─── Equipment bonus aggregator ───────────────────────────────────────────────

export const ZERO_BONUSES: EquipBonuses = {
  atk: 0, def: 0, hp: 0, atkSpeed: 0, magicDamage: 0,
  vision: 0, moveSpeed: 0, dropChance: 0, goldMult: 0, xpBonus: 0,
  attrBonus: {},
}

export function getEquipmentBonuses(equipment: EquipmentSlots): EquipBonuses {
  const b: EquipBonuses = { ...ZERO_BONUSES, attrBonus: {} }
  const items = [
    equipment.head, equipment.shoulder, equipment.chest,
    equipment.gloves, equipment.legs, equipment.feet,
    equipment.acc1, equipment.acc2, equipment.acc3,
  ]

  // Count equipped set items (needed to scale set bonuses)
  const setCount = items.filter(i => i?.rarity === 'set').length

  for (const item of items) {
    if (!item) continue

    // ── Regular sub-attribute stats ──
    for (const [k, v] of Object.entries(item.stats)) {
      if (k in b) (b as unknown as Record<string, number>)[k] += v as number
    }

    // ── Set bonus: each set item contributes bonus × total set items equipped ──
    if (item.rarity === 'set' && item.setBonus && setCount > 0) {
      const { stat, value } = item.setBonus
      ;(b as unknown as Record<string, number>)[stat] += value * setCount
    }

    // ── Unique: primary attribute bonuses ──
    if (item.rarity === 'unique' && item.attrBonus) {
      for (const [k, v] of Object.entries(item.attrBonus)) {
        const key = k as keyof typeof b.attrBonus
        b.attrBonus[key] = (b.attrBonus[key] ?? 0) + (v as number)
      }
    }
  }

  return b
}
