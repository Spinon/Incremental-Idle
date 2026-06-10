import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { FOREST_MONSTER_MAP, FOREST_RANDOM_MONSTERS } from '../data/monsters'
import { generateNpc, npcLevel } from '../formulas/npcs'
import { generateItem } from '../formulas/items'
import { buildMonster } from '../formulas/monsters'
import { partySlotColor } from '../lib/partySlots'
import { useHeroStore } from './heroStore'
import { useInventoryStore } from './inventoryStore'
import { useMapStore, DIRS, DIR_DELTA, DIR_OPPOSITE, gridKey } from './mapStore'
import { SAVE_KEYS, SAVE_SCHEMA_VERSION, mergeSave, migrateSave } from './save'
import type { Attributes } from '../types/hero'
import type { PlacedTile } from '../types/map'
import type { MonsterRarity } from '../types/monster'
import type { PartyExplorerMarker, PartyFightLog, PartyMemberMode, PartyNpc, PartyRecruitOffer, PartySlot } from '../types/party'

const PARTY_SLOT_COUNT = 3
const STARTER_NPCS = ['npc_mira_guardian', 'npc_kael_ranger', 'npc_iria_arcanist']

interface PartyStore {
  knownNpcs: PartyNpc[]
  slots: PartySlot[]
  fightLog: PartyFightLog[]
  recruitOffers: PartyRecruitOffer[]
  addKnownNpc(npc: PartyNpc): void
  addRecruitOffer(npc: PartyNpc): void
  acceptRecruit(npcId: string): void
  dismissRecruit(npcId: string): void
  assignToSlot(slotId: string, memberId: string | null): void
  setSlotMode(slotId: string, mode: PartyMemberMode): void
  removeFromSlot(slotId: string): void
  ensureStarterNpcs(playerLevel: number): void
  getFollowAttributeBonus(playerLevel: number): Attributes
  getActiveFollowers(): PartyNpc[]
  getExplorerMarkers(): PartyExplorerMarker[]
  simulateExplorersAfterPlayerVictory(): void
}

const ATTR_KEYS = ['forca', 'vitalidade', 'agilidade', 'destreza', 'inteligencia', 'sabedoria', 'carisma'] as const

function emptyAttrs(): Attributes {
  return { forca: 0, vitalidade: 0, agilidade: 0, destreza: 0, inteligencia: 0, sabedoria: 0, carisma: 0 }
}

function starterSlots(): PartySlot[] {
  return Array.from({ length: PARTY_SLOT_COUNT }, (_, index) => ({
    id: `slot_${index + 1}`,
    memberId: null,
    mode: index === 0 ? 'follow' : 'explore',
  }))
}

function activeSlotFor(slots: PartySlot[], memberId: string): PartySlot | undefined {
  return slots.find(slot => slot.memberId === memberId)
}

function connectedNeighbors(grid: Record<string, PlacedTile>, pos: { x: number; y: number }) {
  const tile = grid[gridKey(pos.x, pos.y)]
  if (!tile) return []
  const result: { x: number; y: number }[] = []
  for (const dir of DIRS) {
    if (!tile.connections.includes(dir)) continue
    const delta = DIR_DELTA[dir]
    const next = { x: pos.x + delta.dx, y: pos.y + delta.dy }
    const neighbor = grid[gridKey(next.x, next.y)]
    if (neighbor?.connections.includes(DIR_OPPOSITE[dir])) result.push(next)
  }
  return result
}

function isNpcExploreTarget(tile: PlacedTile, npcLevelValue: number) {
  if (tile.explored || tile.level > npcLevelValue) return false
  return tile.content.type === 'monster' || tile.content.type === 'treasure'
}

function findNpcStep(grid: Record<string, PlacedTile>, start: { x: number; y: number }, npcLevelValue: number) {
  const queue: { pos: { x: number; y: number }; first: { x: number; y: number } | null; dist: number }[] = [
    { pos: start, first: null, dist: 0 },
  ]
  const seen = new Set([gridKey(start.x, start.y)])

  const startTile = grid[gridKey(start.x, start.y)]
  if (startTile && isNpcExploreTarget(startTile, npcLevelValue)) return start

  while (queue.length > 0) {
    const current = queue.shift()!
    const tile = grid[gridKey(current.pos.x, current.pos.y)]
    if (tile && tile.level <= npcLevelValue && current.dist > 0) {
      if (isNpcExploreTarget(tile, npcLevelValue)) {
        return current.first ?? current.pos
      }
    }

    for (const next of connectedNeighbors(grid, current.pos)) {
      const key = gridKey(next.x, next.y)
      if (seen.has(key)) continue
      const nextTile = grid[key]
      if (!nextTile || nextTile.level > npcLevelValue) continue
      if (!nextTile.explored && !isNpcExploreTarget(nextTile, npcLevelValue)) continue
      seen.add(key)
      if (isNpcExploreTarget(nextTile, npcLevelValue)) return current.first ?? next
      if (nextTile.explored) queue.push({ pos: next, first: current.first ?? next, dist: current.dist + 1 })
    }
  }

  return null
}

function monsterTypeForTile(tile: PlacedTile) {
  if (tile.content.monsterType) return tile.content.monsterType
  const hash = Math.abs((tile.x * 73856093) ^ (tile.y * 19349663) ^ (tile.level * 83492791))
  return FOREST_RANDOM_MONSTERS[hash % FOREST_RANDOM_MONSTERS.length].id
}

function simulateNpcBattle(npc: PartyNpc, playerLevel: number, tile: PlacedTile, tilesPlaced: number) {
  const level = npcLevel(playerLevel, npc)
  const template = FOREST_MONSTER_MAP.get(monsterTypeForTile(tile)) ?? FOREST_RANDOM_MONSTERS[0]
  const rarity = (tile.content.monsterRarity ?? 'normal') as MonsterRarity
  const enemyLevel = Math.max(1, tile.content.monsterLevel ?? tile.level)
  const enemy = buildMonster(template, enemyLevel, rarity, tilesPlaced)
  const npcPower = level * 12
    + npc.attributes.forca * 3
    + npc.attributes.vitalidade * 2.2
    + npc.attributes.agilidade * 2
    + npc.attributes.destreza * 2
    + npc.attributes.inteligencia * 2.4
    + npc.attributes.sabedoria * 1.8
    + npc.spellIds.length * 8
  const enemyPower = enemy.level * 14 + enemy.atk * 2 + enemy.def * 2 + enemy.maxHp * 0.35 + enemy.magicDamage * 2
  const chance = Math.max(0.2, Math.min(0.92, 0.5 + (npcPower - enemyPower) / Math.max(80, enemyPower * 2)))
  return { won: Math.random() < chance, enemy }
}

export const usePartyStore = create<PartyStore>()(
  persist(
    immer((set, get) => ({
      knownNpcs: [],
      slots: starterSlots(),
      fightLog: [],
      recruitOffers: [],

      addKnownNpc: (npc) => set((st) => {
        if (!st.knownNpcs.some(existing => existing.id === npc.id)) st.knownNpcs.push(npc)
      }),

      addRecruitOffer: (npc) => set((st) => {
        if (st.knownNpcs.some(existing => existing.id === npc.id)) return
        if (st.recruitOffers.some(offer => offer.npc.id === npc.id)) return
        st.recruitOffers.unshift({ npc, rescuedAt: Date.now() })
        st.recruitOffers = st.recruitOffers.slice(0, 8)
      }),

      acceptRecruit: (npcId) => set((st) => {
        const idx = st.recruitOffers.findIndex(offer => offer.npc.id === npcId)
        if (idx < 0) return
        const [offer] = st.recruitOffers.splice(idx, 1)
        if (!st.knownNpcs.some(existing => existing.id === offer.npc.id)) st.knownNpcs.push(offer.npc)
      }),

      dismissRecruit: (npcId) => set((st) => {
        st.recruitOffers = st.recruitOffers.filter(offer => offer.npc.id !== npcId)
      }),

      assignToSlot: (slotId, memberId) => set((st) => {
        for (const slot of st.slots) {
          if (memberId && slot.memberId === memberId) slot.memberId = null
          if (slot.id === slotId) slot.memberId = memberId
        }
      }),

      setSlotMode: (slotId, mode) => set((st) => {
        const slot = st.slots.find(s => s.id === slotId)
        if (slot) slot.mode = mode
      }),

      removeFromSlot: (slotId) => set((st) => {
        const slot = st.slots.find(s => s.id === slotId)
        if (slot) slot.memberId = null
      }),

      ensureStarterNpcs: (playerLevel) => set((st) => {
        for (const id of STARTER_NPCS) {
          if (!st.knownNpcs.some(npc => npc.id === id)) st.knownNpcs.push(generateNpc(id, playerLevel))
        }
        if (st.slots.length === 0) st.slots = starterSlots()
      }),

      getFollowAttributeBonus: (playerLevel) => {
        const state = get()
        const bonus = emptyAttrs()
        for (const slot of state.slots) {
          if (slot.mode !== 'follow' || !slot.memberId) continue
          const npc = state.knownNpcs.find(n => n.id === slot.memberId)
          if (!npc) continue
          const scale = Math.max(1, npcLevel(playerLevel, npc)) / Math.max(1, playerLevel)
          for (const key of ATTR_KEYS) bonus[key] += npc.attributes[key] * scale * 0.05
        }
        return bonus
      },

      getActiveFollowers: () => {
        const state = get()
        return state.slots
          .filter(slot => slot.mode === 'follow' && slot.memberId)
          .map(slot => state.knownNpcs.find(npc => npc.id === slot.memberId!))
          .filter((npc): npc is PartyNpc => !!npc)
      },

      getExplorerMarkers: () => {
        const state = get()
        return state.slots
          .flatMap(slot => {
            if (slot.mode !== 'explore' || !slot.memberId) return []
            const npc = state.knownNpcs.find(n => n.id === slot.memberId)
            if (!npc) return []
            return [{
              id: npc.id,
              name: npc.name,
              nameEn: npc.nameEn,
              class: npc.class,
              color: partySlotColor(slot.id),
              slotId: slot.id,
              x: npc.explorerPos.x,
              y: npc.explorerPos.y,
            }]
          })
      },

      simulateExplorersAfterPlayerVictory: () => {
        const map = useMapStore.getState()
        const hero = useHeroStore.getState()
        const inventory = useInventoryStore.getState()
        const tilesPlaced = map.tilesPlaced
        set((st) => {
          for (const npc of st.knownNpcs) {
            const slot = activeSlotFor(st.slots, npc.id)
            if (!slot || slot.mode !== 'explore') continue
            const level = npcLevel(hero.level, npc)
            if (!map.grid[gridKey(npc.explorerPos.x, npc.explorerPos.y)]) {
              npc.explorerPos = map.grid[gridKey(map.playerPos.x, map.playerPos.y)]
                ? { ...map.playerPos }
                : { x: 0, y: 0 }
            }
            const step = findNpcStep(map.grid, npc.explorerPos, level)
            if (!step) {
              npc.lastRewardText = 'sem alvo seguro'
              continue
            }
            npc.explorerPos = step
            const tile = map.grid[gridKey(step.x, step.y)]
            if (!tile || !isNpcExploreTarget(tile, level)) {
              npc.lastRewardText = 'sem encontro'
              continue
            }
            const result = simulateNpcBattle(npc, hero.level, tile, tilesPlaced)
            if (!result.won) {
              npc.explorerLosses += 1
              npc.lastRewardText = 'recuperando'
              st.fightLog.unshift({
                id: `party-log-${Date.now()}-${npc.id}-${Math.random().toString(36).slice(2)}`,
                createdAt: Date.now(),
                npcId: npc.id,
                npcName: npc.name,
                npcNameEn: npc.nameEn,
                slotId: slot.id,
                won: false,
                enemyName: result.enemy.namePt ?? result.enemy.name,
                enemyNameEn: result.enemy.nameEn ?? result.enemy.name,
                enemyLevel: result.enemy.level,
                x: step.x,
                y: step.y,
                xp: 0,
                gold: 0,
                itemFound: false,
              })
              st.fightLog = st.fightLog.slice(0, 40)
              continue
            }
            npc.explorerWins += 1
            const xp = Math.max(1, Math.round(10 + result.enemy.level * 4))
            const gold = Math.max(1, Math.round(15 + result.enemy.level * 8))
            const itemFound = Math.random() < 0.12
            hero.gainXp(xp)
            hero.earnGold(gold)
            inventory.grantWeaponXp(Math.max(3, Math.round(result.enemy.maxHp * 0.12 + result.enemy.level * 4)))
            if (itemFound) inventory.addItem(generateItem(Math.max(1, result.enemy.level)))
            npc.lastRewardText = `+${xp} XP / +${gold}g`
            st.fightLog.unshift({
              id: `party-log-${Date.now()}-${npc.id}-${Math.random().toString(36).slice(2)}`,
              createdAt: Date.now(),
              npcId: npc.id,
              npcName: npc.name,
              npcNameEn: npc.nameEn,
              slotId: slot.id,
              won: true,
              enemyName: result.enemy.namePt ?? result.enemy.name,
              enemyNameEn: result.enemy.nameEn ?? result.enemy.name,
              enemyLevel: result.enemy.level,
              x: step.x,
              y: step.y,
              xp,
              gold,
              itemFound,
            })
            st.fightLog = st.fightLog.slice(0, 40)
          }
        })
      },
    })),
    {
      name: SAVE_KEYS.party,
      version: SAVE_SCHEMA_VERSION,
      migrate: migrateSave,
      merge: mergeSave,
      partialize: (s) => ({
        knownNpcs: s.knownNpcs,
        slots: s.slots,
        fightLog: s.fightLog,
        recruitOffers: s.recruitOffers,
      }),
    },
  ),
)
