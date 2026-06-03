// Equipment slot types — 6 body slots + 3 accessory slots
export type EquipSlot = 'head' | 'shoulder' | 'chest' | 'gloves' | 'legs' | 'feet' | 'acc'

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'set' | 'unique'

/** Primary attribute keys (mirrors Attributes in hero.ts) */
export type AttributeKey =
  | 'forca' | 'vitalidade' | 'agilidade' | 'destreza'
  | 'inteligencia' | 'sabedoria' | 'carisma'

export interface ItemStats {
  atk?: number
  def?: number
  hp?: number
  atkSpeed?: number
  magicDamage?: number
  vision?: number
  moveSpeed?: number
  dropChance?: number
  goldMult?: number
  xpBonus?: number
}

/** Set items: bonus to one sub-stat per equipped set item */
export interface SetBonus {
  stat:  keyof ItemStats
  value: number   // added for every set-rarity item currently equipped
}

export interface Item {
  id:    string
  name:  string
  nameEn?: string
  slot:  EquipSlot
  rarity: ItemRarity
  level: number
  stats: ItemStats
  /** Market sell price (set when generated for market offers; absent for drops). */
  price?: number
  /** Set items only: bonus applied once per equipped set item (including this one). */
  setBonus?: SetBonus
  /** Unique items only: flat bonuses applied directly to primary attributes. */
  attrBonus?: Partial<Record<AttributeKey, number>>
}

// The 9 named equipment slots (acc items occupy acc1/acc2/acc3)
export interface EquipmentSlots {
  head?: Item
  shoulder?: Item
  chest?: Item
  gloves?: Item
  legs?: Item
  feet?: Item
  acc1?: Item
  acc2?: Item
  acc3?: Item
}

export type EquipmentKey = keyof EquipmentSlots

// ─── Consumables ─────────────────────────────────────────────────────────────

export type ConsumableEffect = 'stamina' | 'mana' | 'skip' | 'xp'

export interface Consumable {
  id:        string
  name:      string       // PT
  nameEn:    string       // EN
  icon:      string
  effect:    ConsumableEffect
  /** stamina/mana → fraction of max (0–1); skip → charge count; xp → flat amount */
  magnitude: number
  rarity:    ItemRarity
  level:     number
  price:     number
}

export interface WordOffer {
  wordId: string
  price:  number
}

/** Fresh offer generated each time the player enters a market. */
export interface MarketOffer {
  consumables: Consumable[]   // 2 entries
  equipment:   Item[]         // 2 entries
  words:       WordOffer[]    // 0-2 entries, filtered by progression
  /** IDs already bought from this persisted market tile. */
  boughtIds?:   string[]
}

// ─── Equipment bonuses ────────────────────────────────────────────────────────

// Flat bonuses summed from all equipped items — added on top of derived stats
export interface EquipBonuses {
  atk: number
  def: number
  hp: number
  atkSpeed: number
  magicDamage: number
  vision: number
  moveSpeed: number
  dropChance: number
  goldMult: number
  xpBonus: number
  resIgnea?:   number
  resGlacial?: number
  resSombria?: number
  resVital?:   number
  /** From unique items: flat bonuses to primary attributes, applied before deriving stats */
  attrBonus: Partial<Record<AttributeKey, number>>
}
