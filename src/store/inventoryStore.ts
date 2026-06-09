import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { Item, ItemRarity, EquipSlot, EquipmentSlots, EquipmentKey, AutoConsumableConfig, Consumable, TreasureChest } from '../types/item'
import type { EquippedWeapons, WeaponHand, WeaponMaterials, WeaponProgress, WeaponType } from '../types/weapon'
import {
  canEquipWeapon,
  createWeaponProgress,
  enforceWeaponLoadout,
  equippedWeaponTypes,
  hasWeaponMaterial,
  isWeaponAtForgeCap,
  normalizeEquippedWeapons,
  normalizeWeaponProgress,
  weaponForgeCost,
  weaponForgeMaterialTier,
  weaponMaxLevelForTier,
  weaponXpForLevel,
  WEAPON_MAX_TIER,
  WEAPON_TYPES,
} from '../formulas/weapons'
import { SAVE_KEYS, SAVE_SCHEMA_VERSION, mergeSave, migrateSave } from './save'
import { requestCriticalCloudSave } from '../lib/cloudAutosave'

const BASE_SLOTS      = 12
const EXPAND_SLOTS    = 6
const EXPAND_BASE     = 50
const MAX_CONSUMABLES = 8
const QUICKSLOT_COUNT = 4

const ACC_KEYS: EquipmentKey[] = ['acc1', 'acc2', 'acc3']
const NON_ACC_KEYS: EquipmentKey[] = ['head', 'shoulder', 'chest', 'gloves', 'legs', 'feet']

const RARITY_RANK: Record<ItemRarity, number> = { common: 1, uncommon: 2, rare: 3, epic: 4, set: 5, unique: 6 }
const SELL_MULT:   Record<ItemRarity, number> = { common: 1, uncommon: 3, rare: 8, epic: 20, set: 35, unique: 60 }

/**
 * Normalized weights per stat — each unit contributes proportionally.
 * Rarity dominates the score (×10000), then level (×50), then actual stat power.
 */
const STAT_SCORE_WEIGHT: Record<string, number> = {
  atk: 3, def: 2, hp: 0.15, atkSpeed: 55, magicDamage: 2.5,
  vision: 0.4, moveSpeed: 80, dropChance: 250, goldMult: 45, xpBonus: 45,
}

function statScore(item: Item): number {
  let s = 0
  for (const [k, v] of Object.entries(item.stats)) {
    s += (v as number) * (STAT_SCORE_WEIGHT[k] ?? 1)
  }
  // Set bonus: estimate with 3 set items equipped as baseline
  if (item.rarity === 'set' && item.setBonus) {
    s += item.setBonus.value * 3 * (STAT_SCORE_WEIGHT[item.setBonus.stat] ?? 1)
  }
  // Unique attr bonus: each primary attribute point ≈ 20 score units
  if (item.attrBonus) {
    for (const v of Object.values(item.attrBonus)) s += (v as number) * 20
  }
  return s
}

function itemScore(item: Item):  number {
  return RARITY_RANK[item.rarity] * 10000 + item.level * 50 + statScore(item)
}
function sellPrice(item: Item):  number { return Math.max(1, Math.floor(item.level * SELL_MULT[item.rarity])) }

export interface AutoSellConfig {
  enabled:  boolean
  rarities: ItemRarity[]   // sell items whose rarity is in this list
  maxLevel: number         // 0 = no level filter; else sell if level ≤ maxLevel
}

const DEFAULT_AUTO_SELL: AutoSellConfig = {
  enabled:  false,
  rarities: ['common'],
  maxLevel: 0,
}

const DEFAULT_CONSUMABLE_AUTO: AutoConsumableConfig = {
  enabled: false,
  threshold: 0.35,
}

interface InventoryStore {
  inventory:    Item[]
  equipment:    EquipmentSlots
  maxSlots:     number
  expansions:   number
  autoSell:     AutoSellConfig
  consumables:  Consumable[]
  chests:       TreasureChest[]
  openingChest: TreasureChest | null
  chestProgressMs: number
  /** IDs of consumables assigned to quickslots 0-3 (null = empty slot). */
  quickslots:   (string | null)[]
  consumableAutoSlots: AutoConsumableConfig[]
  weaponProgress: Record<WeaponType, WeaponProgress>
  equippedWeapons: EquippedWeapons
  weaponMaterials: WeaponMaterials

  /** Returns true if added successfully; false if inventory is full. */
  addItem(item: Item): boolean
  /** Equips an item from inventory into its natural slot (or first free acc slot). */
  equipItem(id: string): void
  /** Moves an equipped item back to inventory. No-ops if inventory full. */
  unequipSlot(key: EquipmentKey): void
  /** Permanently removes an item from inventory. */
  dropItem(id: string): void
  /** Expands inventory size (caller must deduct gold first). */
  expandSlots(): void
  /** Cost of the next expansion in gold. */
  getExpandCost(): number
  /** Update auto-sell config (partial merge). */
  setAutoSell(patch: Partial<AutoSellConfig>): void
  /**
   * Sell inventory items matching the auto-sell rules.
   * Returns total gold earned — caller must credit it to hero store.
   */
  performAutoSell(): number
  /** Equip the best-scored item from inventory for each slot. */
  optimizeEquipment(): void

  // ── Consumables ───────────────────────────────────────────────────────────
  /** Returns true if added; false if consumable bag is full (MAX_CONSUMABLES). */
  addConsumable(c: Consumable): boolean
  /** Removes a consumable from the bag (and clears any quickslot). Returns the removed item or null. */
  removeConsumable(id: string): Consumable | null
  /** Assigns or clears a quickslot. Moves any duplicate assignment first. */
  assignQuickslot(slot: number, id: string | null): void
  setConsumableAutoSlot(slot: number, config: AutoConsumableConfig): void
  addChest(chest: TreasureChest): void
  startOpeningChest(chestId: string): boolean
  cancelOpeningChest(): void
  advanceOpeningChest(deltaMs: number): void
  clearOpenedChest(): void
  equipWeapon(hand: WeaponHand, type: WeaponType): void
  grantWeaponXp(amount: number): void
  addWeaponMaterial(tier: number, count?: number): void
  forgeWeapon(type: WeaponType): boolean

  // ── Manual sell mode ──────────────────────────────────────────────────────
  sellMode: boolean
  selectedForSale: string[]    // item IDs selected for manual sale
  setSellMode(v: boolean): void
  toggleSellSelection(id: string): void
  /** Sells all selectedForSale items; returns gold earned. Clears sellMode. */
  confirmSale(): number

  // ── Upgrade detection ─────────────────────────────────────────────────────
  /**
   * Returns true if `item` scores higher than whatever is currently equipped
   * in its natural slot. Always true if the slot is empty.
   */
  isItemUpgrade(item: Item): boolean
}

export const useInventoryStore = create<InventoryStore>()(
  persist(
    immer((set, get) => ({
      inventory:       [],
      equipment:       {},
      maxSlots:        BASE_SLOTS,
      expansions:      0,
      autoSell:        { ...DEFAULT_AUTO_SELL },
      consumables:     [],
      chests:          [],
      openingChest:    null,
      chestProgressMs: 0,
      quickslots:      Array(QUICKSLOT_COUNT).fill(null) as (string | null)[],
      consumableAutoSlots: Array.from({ length: QUICKSLOT_COUNT }, () => ({ ...DEFAULT_CONSUMABLE_AUTO })),
      weaponProgress:  Object.fromEntries(WEAPON_TYPES.map(t => [t, createWeaponProgress(t)])) as Record<WeaponType, WeaponProgress>,
      equippedWeapons: { mainHand: 'sword', offHand: 'shield' },
      weaponMaterials: {},
      sellMode:        false,
      selectedForSale: [],

      getExpandCost() {
        return Math.round(EXPAND_BASE * Math.pow(1.8, get().expansions))
      },

      addItem: (item) => {
        let added = false
        set((st) => {
          if (st.inventory.length < st.maxSlots) {
            st.inventory.push(item)
            added = true
          }
        })
        if (added) requestCriticalCloudSave()
        return added
      },

      equipItem: (id) => set((st) => {
        const idx = st.inventory.findIndex(i => i.id === id)
        if (idx === -1) return
        const item = st.inventory[idx]

        let key: EquipmentKey
        if (item.slot === 'acc') {
          const emptyAcc = ACC_KEYS.find(k => !st.equipment[k])
          key = emptyAcc ?? 'acc1'
        } else {
          key = item.slot as EquipmentKey
        }

        const displaced = st.equipment[key]
        st.inventory.splice(idx, 1)
        if (displaced && st.inventory.length < st.maxSlots) {
          st.inventory.push(displaced)
        }
        st.equipment[key] = item
      }),

      unequipSlot: (key) => set((st) => {
        const item = st.equipment[key]
        if (!item) return
        if (st.inventory.length >= st.maxSlots) return
        st.inventory.push(item)
        delete st.equipment[key]
      }),

      dropItem: (id) => set((st) => {
        st.inventory = st.inventory.filter(i => i.id !== id)
      }),

      expandSlots: () => set((st) => {
        st.maxSlots   += EXPAND_SLOTS
        st.expansions += 1
      }),

      setAutoSell: (patch) => set((st) => {
        Object.assign(st.autoSell, patch)
      }),

      performAutoSell: () => {
        const { autoSell, inventory } = get()
        if (!autoSell.enabled || (autoSell.rarities.length === 0)) return 0

        let gold = 0
        const toKeep: Item[] = []

        for (const item of inventory) {
          const rarityMatch = autoSell.rarities.includes(item.rarity)
          const levelMatch  = autoSell.maxLevel === 0 || item.level <= autoSell.maxLevel
          if (rarityMatch && levelMatch) {
            gold += sellPrice(item)
          } else {
            toKeep.push(item)
          }
        }

        if (gold > 0) {
          set((st) => { st.inventory = toKeep })
        }
        return gold
      },

      // ── Consumables ─────────────────────────────────────────────────────────

      addConsumable: (c) => {
        let added = false
        set((st) => {
          if (st.consumables.length < MAX_CONSUMABLES) {
            st.consumables.push(c)
            added = true
          }
        })
        return added
      },

      removeConsumable: (id) => {
        let found: Consumable | null = null
        set((st) => {
          const idx = st.consumables.findIndex(c => c.id === id)
          if (idx === -1) return
          found = st.consumables[idx]
          st.consumables.splice(idx, 1)
          // Clear any quickslot pointing to this item
          st.quickslots = st.quickslots.map(qid => qid === id ? null : qid)
        })
        return found
      },

      assignQuickslot: (slot, id) => set((st) => {
        // If this id is already in another slot, clear it
        if (id !== null) {
          st.quickslots = st.quickslots.map((qid, i) => (i !== slot && qid === id) ? null : qid)
        }
        st.quickslots[slot] = id
      }),

      setConsumableAutoSlot: (slot, config) => set((st) => {
        st.consumableAutoSlots[slot] = {
          enabled: config.enabled,
          threshold: Math.min(1, Math.max(0.05, config.threshold)),
        }
      }),

      // ── Manual sell mode ────────────────────────────────────────────────────

      addChest: (chest) => {
        set((st) => {
          const existing = st.chests.find(c => c.level === chest.level && c.rarity === chest.rarity)
          if (existing) existing.qty += Math.max(1, chest.qty)
          else st.chests.push({ ...chest, qty: Math.max(1, chest.qty) })
        })
        requestCriticalCloudSave()
      },

      startOpeningChest: (chestId) => {
        let started = false
        set((st) => {
          if (st.openingChest) return
          const idx = st.chests.findIndex(c => c.id === chestId)
          if (idx === -1) return
          const chest = st.chests[idx]
          st.openingChest = { ...chest, id: `${chest.id}_open_${Date.now()}`, qty: 1 }
          st.chestProgressMs = 0
          chest.qty -= 1
          if (chest.qty <= 0) st.chests.splice(idx, 1)
          started = true
        })
        if (started) requestCriticalCloudSave()
        return started
      },

      cancelOpeningChest: () => {
        let cancelled: TreasureChest | null = null
        set((st) => {
          if (!st.openingChest) return
          cancelled = st.openingChest
          st.openingChest = null
          st.chestProgressMs = 0
          const existing = st.chests.find(c => c.level === cancelled!.level && c.rarity === cancelled!.rarity)
          if (existing) existing.qty += 1
          else st.chests.push({ ...cancelled!, id: `chest_${Date.now()}`, qty: 1 })
        })
        if (cancelled) requestCriticalCloudSave()
      },

      advanceOpeningChest: (deltaMs) => set((st) => {
        if (!st.openingChest) return
        st.chestProgressMs += Math.max(0, deltaMs)
      }),

      clearOpenedChest: () => set((st) => {
        st.openingChest = null
        st.chestProgressMs = 0
      }),

      equipWeapon: (hand, type) => set((st) => {
        st.weaponProgress = normalizeWeaponProgress(st.weaponProgress)
        st.equippedWeapons = normalizeEquippedWeapons(st.equippedWeapons)
        if (!canEquipWeapon(hand, type, st.equippedWeapons)) return

        if (hand === 'mainHand') {
          st.equippedWeapons.mainHand = type
        } else {
          st.equippedWeapons.offHand = type
        }
        st.equippedWeapons = enforceWeaponLoadout(st.equippedWeapons)
      }),

      grantWeaponXp: (amount) => {
        let leveledUp = false
        set((st) => {
          st.weaponProgress = normalizeWeaponProgress(st.weaponProgress)
          st.equippedWeapons = normalizeEquippedWeapons(st.equippedWeapons)
          const equipped = equippedWeaponTypes(st.equippedWeapons)
          if (equipped.length === 0) return

          for (const type of equipped) {
            const p = st.weaponProgress[type]
            if (isWeaponAtForgeCap(p)) continue
            const share = equipped.length === 1 ? 1 : (type === st.equippedWeapons.mainHand ? 0.75 : 0.55)
            p.xp += Math.max(1, Math.round(amount * share))

            while (p.xp >= p.xpToNext && p.level < p.maxLevel) {
              p.xp -= p.xpToNext
              p.level += 1
              p.xpToNext = weaponXpForLevel(p.level, p.tier)
              leveledUp = true
            }
            if (p.level >= p.maxLevel) {
              p.level = p.maxLevel
              p.xp = 0
              p.xpToNext = weaponXpForLevel(p.level, p.tier)
            }
          }
        })
        if (leveledUp) requestCriticalCloudSave()
      },

      addWeaponMaterial: (tier, count = 1) => {
        set((st) => {
          const key = Math.max(1, Math.round(tier))
          st.weaponMaterials[key] = (st.weaponMaterials[key] ?? 0) + Math.max(1, Math.round(count))
        })
        requestCriticalCloudSave()
      },

      forgeWeapon: (type) => {
        let forged = false
        set((st) => {
          st.weaponProgress = normalizeWeaponProgress(st.weaponProgress)
          const p = st.weaponProgress[type]
          if (!p || p.tier >= WEAPON_MAX_TIER || !isWeaponAtForgeCap(p)) return
          const materialTier = weaponForgeMaterialTier(p)
          const cost = weaponForgeCost(p)
          if (!hasWeaponMaterial(st.weaponMaterials, materialTier, cost)) return

          st.weaponMaterials[materialTier] -= cost
          p.tier += 1
          p.maxLevel = weaponMaxLevelForTier(p.tier)
          p.xp = 0
          p.xpToNext = weaponXpForLevel(p.level, p.tier)
          forged = true
        })
        if (forged) requestCriticalCloudSave()
        return forged
      },

      setSellMode: (v) => set((st) => {
        st.sellMode        = v
        st.selectedForSale = []
      }),

      toggleSellSelection: (id) => set((st) => {
        const idx = st.selectedForSale.indexOf(id)
        if (idx === -1) st.selectedForSale.push(id)
        else st.selectedForSale.splice(idx, 1)
      }),

      confirmSale: () => {
        let gold = 0
        set((st) => {
          const ids = new Set(st.selectedForSale)
          for (const item of st.inventory) {
            if (ids.has(item.id)) gold += sellPrice(item)
          }
          st.inventory       = st.inventory.filter(i => !ids.has(i.id))
          st.selectedForSale = []
          st.sellMode        = false
        })
        return gold
      },

      isItemUpgrade: (item) => {
        const { equipment } = get()
        if (item.slot === 'acc') {
          // Upgrade if any acc slot is empty or item beats worst equipped acc
          const accItems = (['acc1', 'acc2', 'acc3'] as const)
            .map(k => equipment[k])
            .filter(Boolean) as Item[]
          if (accItems.length < 3) return true
          const worstScore = Math.min(...accItems.map(itemScore))
          return itemScore(item) > worstScore
        }
        const equipped = equipment[item.slot as keyof typeof equipment]
        if (!equipped) return true
        return itemScore(item) > itemScore(equipped as Item)
      },

      optimizeEquipment: () => set((st) => {
        // ── Non-acc slots ─────────────────────────────────────────────────
        for (const key of NON_ACC_KEYS) {
          const slotType = key as EquipSlot
          const candidates = st.inventory.filter(i => i.slot === slotType)
          const current    = st.equipment[key]
          if (candidates.length === 0) continue

          const pool = [...candidates, ...(current ? [current] : [])]
          pool.sort((a, b) => itemScore(b) - itemScore(a))

          const [best, ...rest] = pool
          // Clear slot and remove all candidates from inventory
          delete st.equipment[key]
          st.inventory = st.inventory.filter(i => i.slot !== slotType)
          // Equip best
          st.equipment[key] = best
          // Return others to inventory
          for (const item of rest) {
            if (st.inventory.length < st.maxSlots) st.inventory.push(item)
          }
        }

        // ── Acc slots — pick top-3 from all acc items ─────────────────────
        const accInInv  = st.inventory.filter(i => i.slot === 'acc')
        const accEquip  = ACC_KEYS.map(k => st.equipment[k]).filter(Boolean) as Item[]
        const allAcc    = [...accInInv, ...accEquip]

        if (allAcc.length === 0) return

        allAcc.sort((a, b) => itemScore(b) - itemScore(a))

        // Clear existing acc equipment and inventory acc items
        for (const k of ACC_KEYS) delete st.equipment[k]
        st.inventory = st.inventory.filter(i => i.slot !== 'acc')

        const top    = allAcc.slice(0, 3)
        const others = allAcc.slice(3)

        top.forEach((item, i) => { st.equipment[ACC_KEYS[i]] = item })
        for (const item of others) {
          if (st.inventory.length < st.maxSlots) st.inventory.push(item)
        }
      }),
    })),
    {
      name: SAVE_KEYS.inventory,
      version: SAVE_SCHEMA_VERSION,
      migrate: migrateSave,
      merge: mergeSave,
    }
  )
)
