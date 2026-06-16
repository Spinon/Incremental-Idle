import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { FOREST_MONSTER_MAP, FOREST_RANDOM_MONSTERS } from '../data/monsters'
import { generateNpc, npcLevel } from '../formulas/npcs'
import { generateItem } from '../formulas/items'
import { buildMonster, estimateMonster } from '../formulas/monsters'
import { getHeroDerived } from '../lib/heroDerived'
import { useHeroStore } from './heroStore'
import { useInventoryStore } from './inventoryStore'
import { useMapStore, DIRS, DIR_DELTA, DIR_OPPOSITE, gridKey } from './mapStore'
import { SAVE_KEYS, SAVE_SCHEMA_VERSION, gameStorage, mergeSave, migrateSave } from './save'
import type { Attributes } from '../types/hero'
import type { PlacedTile } from '../types/map'
import type { MonsterRarity } from '../types/monster'
import type { PartyFightLog, PartyMemberMode, PartyNpc, PartyRecruitOffer, PartySlot } from '../types/party'

const PARTY_SLOT_COUNT = 3
const NPC_MIN_TARGET_WIN_CHANCE = 0.55
// Ids are hash SEEDS only — identity (name/class/race) is intentionally
// procedural and does NOT follow the words in the id (design decision).
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

// Explorer NPCs are a farm accelerator: they only walk through tiles the
// PLAYER already explored (level <= NPC level), re-fighting monsters there.
// They never consume tiles, never claim treasure and never reveal anything.
function isNpcExploreTarget(tile: PlacedTile, npcLevelValue: number) {
  if (!tile.explored || tile.level > npcLevelValue) return false
  return tile.content.type === 'monster'
}

function npcBattleChance(npc: PartyNpc, npcLevelValue: number, enemy: ReturnType<typeof estimateMonster>) {
  const npcPower = npcLevelValue * 12
    + npc.attributes.forca * 3
    + npc.attributes.vitalidade * 2.2
    + npc.attributes.agilidade * 2
    + npc.attributes.destreza * 2
    + npc.attributes.inteligencia * 2.4
    + npc.attributes.sabedoria * 1.8
    + npc.spellIds.length * 8
  const enemyPower = enemy.level * 14 + enemy.atk * 2 + enemy.def * 2 + enemy.maxHp * 0.35 + enemy.magicDamage * 2
  return Math.max(0.2, Math.min(0.92, 0.5 + (npcPower - enemyPower) / Math.max(80, enemyPower * 2)))
}

function evaluateNpcTarget(npc: PartyNpc, npcLevelValue: number, tile: PlacedTile, tilesPlaced: number) {
  const template = FOREST_MONSTER_MAP.get(monsterTypeForTile(tile)) ?? FOREST_RANDOM_MONSTERS[0]
  const rarity = (tile.content.monsterRarity ?? 'normal') as MonsterRarity
  const enemyLevel = Math.max(1, tile.content.monsterLevel ?? tile.level)
  const enemy = estimateMonster(template, enemyLevel, rarity, tilesPlaced)
  const chance = npcBattleChance(npc, npcLevelValue, enemy)
  const xp = Math.max(1, Math.round(10 + enemy.level * 4))
  const gold = Math.max(1, Math.round(15 + enemy.level * 8))
  const rewardScore = xp + gold
  return { chance, rewardScore }
}

function findNpcStep(
  grid: Record<string, PlacedTile>,
  start: { x: number; y: number },
  npc: PartyNpc,
  npcLevelValue: number,
  tilesPlaced: number,
  avoidKey?: string,
) {
  const queue: { pos: { x: number; y: number }; first: { x: number; y: number } | null; dist: number }[] = [
    { pos: start, first: null, dist: 0 },
  ]
  const seen = new Set([gridKey(start.x, start.y)])
  let best: { step: { x: number; y: number }; rewardScore: number; chance: number; dist: number } | null = null
  let safest: { step: { x: number; y: number }; rewardScore: number; chance: number; dist: number } | null = null

  const startKey = gridKey(start.x, start.y)
  const startTile = grid[startKey]
  if (startTile && startKey !== avoidKey && isNpcExploreTarget(startTile, npcLevelValue)) {
    const target = evaluateNpcTarget(npc, npcLevelValue, startTile, tilesPlaced)
    safest = { step: start, rewardScore: target.rewardScore, chance: target.chance, dist: 0 }
    if (target.chance >= NPC_MIN_TARGET_WIN_CHANCE) best = { ...safest }
  }

  while (queue.length > 0) {
    const current = queue.shift()!
    for (const next of connectedNeighbors(grid, current.pos)) {
      const key = gridKey(next.x, next.y)
      if (seen.has(key)) continue
      const nextTile = grid[key]
      // Walk through ANY explored tile: gating traversal by tile level used to
      // wall explorers in (tiles around the player sit at player level, above
      // the NPC's level) — they froze with "no safe target" forever. The level
      // gate still applies to FIGHT targets below.
      if (!nextTile || !nextTile.explored) continue
      seen.add(key)
      if (key !== avoidKey && isNpcExploreTarget(nextTile, npcLevelValue)) {
        const target = evaluateNpcTarget(npc, npcLevelValue, nextTile, tilesPlaced)
        const candidate = {
          step: current.first ?? next,
          rewardScore: target.rewardScore,
          chance: target.chance,
          dist: current.dist + 1,
        }
        if (
          !safest ||
          candidate.chance > safest.chance ||
          (candidate.chance === safest.chance && candidate.rewardScore > safest.rewardScore) ||
          (candidate.chance === safest.chance && candidate.rewardScore === safest.rewardScore && candidate.dist < safest.dist)
        ) {
          safest = candidate
        }
        if (
          candidate.chance >= NPC_MIN_TARGET_WIN_CHANCE &&
          (!best ||
            candidate.rewardScore > best.rewardScore ||
            (candidate.rewardScore === best.rewardScore && candidate.chance > best.chance) ||
            (candidate.rewardScore === best.rewardScore && candidate.chance === best.chance && candidate.dist < best.dist))
        ) {
          best = candidate
        }
      }
      queue.push({ pos: next, first: current.first ?? next, dist: current.dist + 1 })
    }
  }

  return (best ?? safest)?.step ?? null
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
  const chance = npcBattleChance(npc, level, enemy)
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
        if (!slot) return
        slot.mode = mode
        // Entering explore mode: anchor the NPC at the player's position so it
        // visibly departs from there on the next victory tick.
        if (mode === 'explore' && slot.memberId) {
          const npc = st.knownNpcs.find(n => n.id === slot.memberId)
          if (npc) {
            const playerPos = useMapStore.getState().playerPos
            npc.explorerPos = { ...playerPos }
            npc.lastRewardText = null
          }
        }
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

      simulateExplorersAfterPlayerVictory: () => {
        const map = useMapStore.getState()
        const hero = useHeroStore.getState()
        const tilesPlaced = map.tilesPlaced
        // Rewards are collected during the Immer update and applied to the
        // other stores AFTER set() — no cross-store side effects inside set.
        const rewards: { xp: number; gold: number; weaponXp: number; itemLevel: number | null }[] = []
        const playerKey = gridKey(map.playerPos.x, map.playerPos.y)
        set((st) => {
          for (const npc of st.knownNpcs) {
            const slot = activeSlotFor(st.slots, npc.id)
            if (!slot || slot.mode !== 'explore') continue
            const level = npcLevel(hero.level, npc)
            if (!npc.explorerPos || !map.grid[gridKey(npc.explorerPos.x, npc.explorerPos.y)]) {
              npc.explorerPos = map.grid[playerKey]
                ? { ...map.playerPos }
                : { x: 0, y: 0 }
            }

            // Walk up to 3 tiles per player victory toward the chosen farm
            // target, stopping when standing on it. The player's own tile is
            // never a target — explorers always leave it.
            for (let moves = 0; moves < 3; moves++) {
              const hereKey = gridKey(npc.explorerPos.x, npc.explorerPos.y)
              const hereTile = map.grid[hereKey]
              if (hereTile && hereKey !== playerKey && isNpcExploreTarget(hereTile, level)) break
              const step = findNpcStep(map.grid, npc.explorerPos, npc, level, tilesPlaced, playerKey)
              if (!step || (step.x === npc.explorerPos.x && step.y === npc.explorerPos.y)) break
              npc.explorerPos = step
            }

            const posKey = gridKey(npc.explorerPos.x, npc.explorerPos.y)
            const tile = map.grid[posKey]
            if (!tile || posKey === playerKey || !isNpcExploreTarget(tile, level)) {
              // Patrol fallback: drift to a random connected explored neighbor
              // instead of freezing in place.
              const neighbors = connectedNeighbors(map.grid, npc.explorerPos)
                .filter(n => map.grid[gridKey(n.x, n.y)]?.explored && gridKey(n.x, n.y) !== playerKey)
              if (neighbors.length > 0) {
                npc.explorerPos = neighbors[Math.floor(Math.random() * neighbors.length)]
              }
              npc.lastRewardText = 'patrulhando'
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
                x: npc.explorerPos.x,
                y: npc.explorerPos.y,
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
            rewards.push({
              xp,
              gold,
              weaponXp: Math.max(3, Math.round(result.enemy.maxHp * 0.12 + result.enemy.level * 4)),
              itemLevel: itemFound ? Math.max(1, result.enemy.level) : null,
            })
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
              x: npc.explorerPos.x,
              y: npc.explorerPos.y,
              xp,
              gold,
              itemFound,
            })
            st.fightLog = st.fightLog.slice(0, 40)
          }
        })
        if (rewards.length > 0) {
          const inventory = useInventoryStore.getState()
          // Same effective xpBonus (equip/weapons/buffs) as the victory pipeline
          const xpBonus = getHeroDerived().xpBonus
          for (const reward of rewards) {
            hero.gainXp(reward.xp, xpBonus)
            hero.earnGold(reward.gold)
            inventory.grantWeaponXp(reward.weaponXp)
            if (reward.itemLevel !== null) inventory.addItem(generateItem(reward.itemLevel))
          }
        }
      },
    })),
    {
      name: SAVE_KEYS.party,
      version: SAVE_SCHEMA_VERSION,
      storage: gameStorage,
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
