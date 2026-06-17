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

export function pickItemRarity(level: number): ItemRarity {
  // Set/unique deliberately rare: with endgame dropChance (~30 % per kill)
  // the old caps (4 % / 1.5 %) handed out a set every ~50 kills.
  // Now: unique ≈ 1 in 1 250 drops, set ≈ 1 in 280 at the cap.
  const uniqueChance   = Math.min(0.6,  0.03 + level * 0.012)
  const setChance      = Math.min(1.6,  0.1  + level * 0.035)
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

// ─── Sub-attribute registry ───────────────────────────────────────────────────
// Single source of truth for every rollable sub-attribute: scaling values and
// formatting. New sub-attributes only need an entry here + a slot pool below.

interface SubAttributeDef {
  flat: number     // base value at level 0
  perLv: number    // added per enemy level
  float?: boolean  // keep 3 decimals instead of rounding to integer
}

export const SUB_ATTRIBUTES: Record<keyof ItemStats, SubAttributeDef> = {
  atk:         { flat: 1.5,   perLv: 0.20 },
  def:         { flat: 1.0,   perLv: 0.15 },
  hp:          { flat: 25,    perLv: 2.5 },
  atkSpeed:    { flat: 0.05,  perLv: 0.006,  float: true },
  magicDamage: { flat: 1.0,   perLv: 0.12 },
  vision:      { flat: 8,     perLv: 0.5 },
  moveSpeed:   { flat: 0.05,  perLv: 0.003,  float: true },
  dropChance:  { flat: 0.003, perLv: 0.00018, float: true },
  goldMult:    { flat: 0.05,  perLv: 0.004,  float: true },
  xpBonus:     { flat: 0.03,  perLv: 0.003,  float: true },
  critChance:  { flat: 0.004, perLv: 0.0004, float: true },
  accuracy:    { flat: 0.004, perLv: 0.0004, float: true },
  resIgnea:    { flat: 0.006, perLv: 0.0005, float: true },
  resGlacial:  { flat: 0.006, perLv: 0.0005, float: true },
  resSombria:  { flat: 0.006, perLv: 0.0005, float: true },
  resVital:    { flat: 0.006, perLv: 0.0005, float: true },
}

export const ALL_SUB_ATTRIBUTES = Object.keys(SUB_ATTRIBUTES) as (keyof ItemStats)[]

// ─── Slot configuration ───────────────────────────────────────────────────────

const SLOT_STATS: Record<EquipSlot, (keyof ItemStats)[]> = {
  head:     ['def', 'vision', 'magicDamage', 'resSombria'],
  shoulder: ['def', 'atk', 'resIgnea'],
  chest:    ['def', 'hp', 'resIgnea', 'resVital'],
  gloves:   ['atk', 'atkSpeed', 'critChance', 'accuracy'],
  legs:     ['moveSpeed', 'def', 'resGlacial'],
  feet:     ['moveSpeed', 'dropChance', 'resGlacial'],
  acc:      ['goldMult', 'xpBonus', 'dropChance', 'vision', 'critChance', 'accuracy', 'resSombria', 'resVital'],
}

const ALL_SLOTS: EquipSlot[] = ['head', 'shoulder', 'chest', 'gloves', 'legs', 'feet', 'acc']

// ─── Item name pools ─────────────────────────────────────────────────────────

const ITEM_NAMES: Record<EquipSlot, { pt: string[]; en: string[] }> = {
  head:     { pt: ['Chapéu', 'Elmo', 'Capuz', 'Coroa'], en: ['Hat', 'Helm', 'Hood', 'Crown'] },
  shoulder: { pt: ['Espaldeira', 'Ombreira', 'Guarda-ombro'], en: ['Spaulder', 'Shoulder Guard', 'Pauldron'] },
  chest:    { pt: ['Peitoral', 'Armadura', 'Colete'], en: ['Breastplate', 'Armor', 'Vest'] },
  gloves:   { pt: ['Luvas', 'Manoplas', 'Punhos'], en: ['Gloves', 'Gauntlets', 'Bracers'] },
  legs:     { pt: ['Calças', 'Grevas', 'Perneiras'], en: ['Pants', 'Greaves', 'Legguards'] },
  feet:     { pt: ['Botas', 'Sandálias', 'Sapatos'], en: ['Boots', 'Sandals', 'Shoes'] },
  acc:      { pt: ['Anel', 'Amuleto', 'Pingente', 'Talismã'], en: ['Ring', 'Amulet', 'Pendant', 'Talisman'] },
}

const RARITY_PREFIXES: Record<'common' | 'uncommon' | 'rare' | 'epic', { pt: string[]; en: string[] }> = {
  common:   { pt: ['Simples', 'Velho', 'Básico'], en: ['Simple', 'Old', 'Basic'] },
  uncommon: { pt: ['Resistente', 'Reforçado', 'Sólido'], en: ['Sturdy', 'Reinforced', 'Solid'] },
  rare:     { pt: ['Élfico', 'Arcano', 'Veloz'], en: ['Elven', 'Arcane', 'Swift'] },
  epic:     { pt: ['Lendário', 'Ancestral', 'Divino'], en: ['Legendary', 'Ancestral', 'Divine'] },
}

/** Set item prefixes - evoke a shared magical theme */
const SET_PREFIXES = {
  pt: ['Rúnico', 'Cristalino', 'Tempestuoso', 'Etéreo', 'Abissal', 'Celeste', 'Sombrio', 'Solar'],
  en: ['Runic', 'Crystal', 'Stormforged', 'Ethereal', 'Abyssal', 'Celestial', 'Shadowed', 'Solar'],
}

/** Unique item names - one legendary name per slot */
const UNIQUE_NAMES: Record<EquipSlot, { pt: string[]; en: string[] }> = {
  head: {
    pt: ['Elmo da Eternidade', 'Coroa do Caos', 'Capuz das Sombras', 'Tiara do Destino'],
    en: ['Helm of Eternity', 'Crown of Chaos', 'Hood of Shadows', 'Tiara of Fate'],
  },
  shoulder: {
    pt: ['Ombreiras do Titã', 'Espaldeira do Apocalipse', 'Guarda-ombros do Dragão'],
    en: ['Titan Shoulders', 'Pauldron of the Apocalypse', 'Dragon Shoulder Guards'],
  },
  chest: {
    pt: ['Couraça do Dragão', 'Veste Arcana', 'Armadura da Fênix', 'Peitoral Vivo'],
    en: ['Dragon Cuirass', 'Arcane Vestment', 'Phoenix Armor', 'Living Breastplate'],
  },
  gloves: {
    pt: ['Mãos do Fogo', 'Luvas da Fatalidade', 'Punhos do Trovão'],
    en: ['Hands of Fire', 'Gloves of Doom', 'Bracers of Thunder'],
  },
  legs: {
    pt: ['Perneiras do Aço Vivo', 'Grevas do Abismo', 'Calças do Vento Eterno'],
    en: ['Legguards of Living Steel', 'Greaves of the Abyss', 'Pants of Eternal Wind'],
  },
  feet: {
    pt: ['Botas do Vento', 'Sandálias da Luz', 'Sapatos do Caçador'],
    en: ['Boots of Wind', 'Sandals of Light', 'Hunter Shoes'],
  },
  acc: {
    pt: ['Anel do Destino', 'Olho do Caos', 'Amuleto do Fim', 'Talismã da Eternidade'],
    en: ['Ring of Fate', 'Eye of Chaos', 'Amulet of the End', 'Talisman of Eternity'],
  },
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
  const def = SUB_ATTRIBUTES[stat]
  return def.flat + level * def.perLv
}

const FLOAT_STATS = new Set<keyof ItemStats>(
  ALL_SUB_ATTRIBUTES.filter(s => SUB_ATTRIBUTES[s].float),
)

/** Fisher-Yates — the `sort(() => Math.random() - 0.5)` idiom is biased. */
function shuffled<T>(arr: readonly T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pickStats(slot: EquipSlot, rarity: ItemRarity): (keyof ItemStats)[] {
  const possible  = SLOT_STATS[slot]
  // Stat count by rarity (acc slots have a wide pool, so unique caps at 4)
  const count =
    rarity === 'unique' ? Math.min(4, possible.length) :
    rarity === 'set'    ? Math.min(3, possible.length) :
    rarity === 'epic'   ? Math.min(3, possible.length) :
    rarity === 'rare'   ? Math.min(2, possible.length) :
    1
  return shuffled(possible).slice(0, count)
}

// ─── Generator ────────────────────────────────────────────────────────────────

let _idSeq = 0

const ITEM_PRICE_MULT: Record<ItemRarity, number> = {
  common: 1, uncommon: 2.5, rare: 6, epic: 16, set: 30, unique: 60,
}

export function generateItem(level: number, forMarket = false): Item {
  const slot   = ALL_SLOTS[Math.floor(Math.random() * ALL_SLOTS.length)]
  const rarity = pickItemRarity(level)
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
  const baseNames = ITEM_NAMES[slot]
  const baseIdx = Math.floor(Math.random() * baseNames.pt.length)
  const baseNamePt = baseNames.pt[baseIdx]
  const baseNameEn = baseNames.en[baseIdx]
  let name: string
  let nameEn: string
  if (rarity === 'unique') {
    const pool = UNIQUE_NAMES[slot]
    const idx = Math.floor(Math.random() * pool.pt.length)
    name = pool.pt[idx]
    nameEn = pool.en[idx]
  } else if (rarity === 'set') {
    const idx = Math.floor(Math.random() * SET_PREFIXES.pt.length)
    name = `${baseNamePt} ${SET_PREFIXES.pt[idx]}`
    nameEn = `${SET_PREFIXES.en[idx]} ${baseNameEn}`
  } else {
    const prefixes = RARITY_PREFIXES[rarity as 'common' | 'uncommon' | 'rare' | 'epic']
    const idx = Math.floor(Math.random() * prefixes.pt.length)
    name = `${baseNamePt} ${prefixes.pt[idx]}`
    nameEn = `${prefixes.en[idx]} ${baseNameEn}`
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
    const picked     = shuffled(ALL_ATTRS).slice(0, numAttrs)
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
    nameEn,
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

function normalizeLegacyPtItemName(name: string): string {
  return name
    .replace(/\bPauldron\b/g, 'Ombreira')
    .replace(/\bCorona\b/g, 'Coroa')
}

function legacyItemNameEn(item: Pick<Item, 'name' | 'slot' | 'rarity'>): string {
  const base = ITEM_NAMES[item.slot].en[0]
  if (item.rarity === 'unique') return `Unique ${base}`
  if (item.rarity === 'set') return `Runic ${base}`
  const prefixes = item.rarity === 'common' || item.rarity === 'uncommon' || item.rarity === 'rare' || item.rarity === 'epic'
    ? RARITY_PREFIXES[item.rarity].en
    : ['Basic']
  return `${prefixes[0]} ${base}`
}

export function getItemDisplayName(item: Pick<Item, 'name' | 'nameEn' | 'slot' | 'rarity'>, isEn: boolean): string {
  return isEn
    ? (item.nameEn ?? legacyItemNameEn(item))
    : normalizeLegacyPtItemName(item.name)
}

const CONSUMABLE_RARITY_MULT: Record<ItemRarity, number> = {
  common: 1, uncommon: 1.6, rare: 2.8, epic: 5.0, set: 5.0, unique: 5.0,
}
const CONSUMABLE_PRICE_BASE: Record<ConsumableEffect, number> = {
  stamina: 14, mana: 12, skip: 32, xp: 20,
  resetAttrs: 95, normalizeTile: 70, shield: 38, statBuff: 45,
  physicalDamage: 34, enemyDebuff: 42,
}

const CONSUMABLE_NAMES: Partial<Record<ConsumableEffect, Record<string, [string, string]>>> = {
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

const CONSUMABLE_ICONS: Partial<Record<ConsumableEffect, string>> = {
  stamina: '💪', mana: '🔷', skip: '⏩', xp: '📖',
  shield: '🛡', statBuff: '⚗️', physicalDamage: '💥', enemyDebuff: '☠️',
  resetAttrs: '🔄', normalizeTile: '🗺️',
}

const ALL_EFFECTS: ConsumableEffect[] = [
  'stamina', 'mana', 'skip', 'xp',
  'shield', 'statBuff', 'physicalDamage', 'enemyDebuff',
  'normalizeTile', 'resetAttrs',
]

const BUFF_STATS: (keyof ItemStats)[] = ['atk', 'def', 'atkSpeed', 'magicDamage', 'dropChance', 'xpBonus']
const PERCENT_STATS = new Set<keyof ItemStats>(['atkSpeed', 'dropChance', 'xpBonus'])

const CONSUMABLE_FALLBACK_NAMES: Record<ConsumableEffect, [string, string]> = {
  stamina: ['Pocao de Vigor', 'Stamina Potion'],
  mana: ['Pocao de Mana', 'Mana Potion'],
  skip: ['Turbo Charge', 'Turbo Charge'],
  xp: ['Tomo de XP', 'XP Tome'],
  resetAttrs: ['Orbe de Reaprendizado', 'Respec Orb'],
  normalizeTile: ['Marca de Sincronia', 'Sync Mark'],
  shield: ['Ampola de Escudo', 'Shield Vial'],
  statBuff: ['Tonico de Combate', 'Combat Tonic'],
  physicalDamage: ['Bomba de Impacto', 'Impact Bomb'],
  enemyDebuff: ['Frasco Debilitante', 'Weakening Flask'],
}

export function generateConsumable(level: number): Consumable {
  // consumables only use common-epic rarity logic
  const rolled = pickItemRarity(level)
  const rarity = rolled === 'unique' || rolled === 'set' ? 'epic' : rolled
  const mult   = CONSUMABLE_RARITY_MULT[rarity]
  const effect = ALL_EFFECTS[Math.floor(Math.random() * ALL_EFFECTS.length)]

  let magnitude: number
  let stat: keyof ItemStats | undefined
  let durationTurns: number | undefined
  let durationUnit: Consumable['durationUnit']
  let cooldownTurns: number | undefined
  switch (effect) {
    case 'stamina':
    case 'mana':
      magnitude = Math.min(1.0, parseFloat(((0.16 + level * 0.018) * mult).toFixed(3)))
      break
    case 'skip':
      magnitude = rarity === 'epic' || rarity === 'rare' ? 2 : 1
      break
    case 'xp':
      magnitude = Math.round((18 + level * 8) * mult)
      break
    case 'resetAttrs':
      magnitude = Math.max(1, Math.round(mult))
      break
    case 'normalizeTile':
      magnitude = 1
      break
    case 'shield':
      magnitude = Math.round((18 + level * 8) * mult)
      durationTurns = 1
      cooldownTurns = 4
      break
    case 'statBuff': {
      stat = BUFF_STATS[Math.floor(Math.random() * BUFF_STATS.length)]
      const scalar = 1 + level * 0.04
      magnitude = PERCENT_STATS.has(stat)
        ? parseFloat((0.03 * mult * scalar).toFixed(3))
        : Math.round(3 * mult * scalar)
      // Rounds of combat, scaled by rarity — at 1 turn the tonic expired
      // before it could matter (auto-use fires at battle start)
      durationTurns = rarity === 'epic' ? 6 : rarity === 'rare' ? 5 : rarity === 'uncommon' ? 4 : 3
      durationUnit = stat === 'xpBonus' ? 'turn' : 'battle'
      // No 100% uptime: cooldown outlasts the buff by 2 turns (same
      // philosophy as spell buffs, which are clamped to their cooldown)
      cooldownTurns = durationTurns + 2
      break
    }
    case 'physicalDamage':
      magnitude = Math.round((14 + level * 7) * mult)
      cooldownTurns = Math.max(2, 5 - Math.min(3, Math.floor(level / 12)))
      break
    case 'enemyDebuff':
      magnitude = parseFloat((0.08 + Math.min(0.32, level * 0.006) + (mult - 1) * 0.04).toFixed(3))
      durationTurns = rarity === 'epic' ? 4 : rarity === 'rare' ? 3 : 2
      cooldownTurns = 4
      break
    default:
      magnitude = 1
  }

  const [name, nameEn] = CONSUMABLE_NAMES[effect]?.[rarity] ?? CONSUMABLE_FALLBACK_NAMES[effect]
  const price = Math.round(CONSUMABLE_PRICE_BASE[effect] * mult * (1 + level * 0.15))

  return {
    id:        `con_${Date.now()}_${_idSeq++}`,
    name, nameEn,
    icon:      CONSUMABLE_ICONS[effect] ?? '*',
    effect, magnitude, stat, durationTurns, durationUnit, cooldownTurns, rarity, level, price,
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

export function wordSandPrice(amount: number, tileLevel: number): number {
  return Math.max(1, Math.round(amount * (1.45 + tileLevel * 0.025)))
}

// A Word Bit is sold as free uses of the generate-bit button. Each use is worth
// a full word-bit roll (otherwise paid in Word Sand), so it is priced well above
// the old "instant random bit" value and scales steeply with the shop level.
export function wordBitPrice(amount: number, tileLevel: number): number {
  return Math.max(1, Math.round(amount * (300 + tileLevel * 55)))
}

/** Word Sand sold per shop — large bundles that scale with the shop level. */
export function wordSandOfferAmount(tileLevel: number, tilesPlaced = 0): number {
  return Math.round(120 + tileLevel * 22 + Math.min(tilesPlaced, 150) * 0.8)
}

/** Word Bit generation credits sold per shop (1–5, scaling with progress). */
export function wordBitOfferAmount(tileLevel: number, tilesPlaced = 0): number {
  return Math.max(1, Math.min(5, Math.floor(1 + tileLevel / 18 + tilesPlaced / 90)))
}

export function generateMarketOffer(level: number): MarketOffer {
  const sandAmount = wordSandOfferAmount(level)
  const bitAmount = wordBitOfferAmount(level)
  return {
    consumables: [generateConsumable(level), generateConsumable(level)],
    equipment:   [generateItem(level, true), generateItem(level, true)],
    words:       [],   // legacy: markets no longer sell full words
    wordSand:    [{ id: `ws_${Date.now()}_${_idSeq++}`, amount: sandAmount, price: wordSandPrice(sandAmount, level) }],
    wordBits:    [{ id: `wb_${Date.now()}_${_idSeq++}`, amount: bitAmount, price: wordBitPrice(bitAmount, level) }],
  }
}

// ─── Equipment bonus aggregator ───────────────────────────────────────────────

export const ZERO_BONUSES: EquipBonuses = {
  atk: 0, def: 0, hp: 0, atkSpeed: 0, magicDamage: 0,
  vision: 0, moveSpeed: 0, dropChance: 0, goldMult: 0, xpBonus: 0,
  critChance: 0, accuracy: 0,
  resIgnea: 0, resGlacial: 0, resSombria: 0, resVital: 0,
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
