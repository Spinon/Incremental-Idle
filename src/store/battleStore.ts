import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { buildMonster, pickMonsterRarity } from '../formulas/monsters'
import { FOREST_MONSTER_MAP, FOREST_MONSTERS, FOREST_RANDOM_MONSTERS } from '../data/monsters'
import { useInventoryStore } from './inventoryStore'
import { useHeroStore } from './heroStore'
import { useSpellStore } from './spellStore'
import { getWeaponCombatProfile, WEAPON_EFFECT_LABELS } from '../formulas/weapons'
import { getEquipmentBonuses } from '../formulas/items'
import { getEffectiveDerivedStatsFromBonuses } from '../formulas/effectiveStats'
import { getPartyEffectiveAttributes } from '../lib/partyBonuses'
import type { MonsterRarity } from '../types/monster'
import type { ElementType } from '../types/element'
import { elementalModifier, makeStatus, STATUS_ICONS, STATUS_LABEL_PT, STATUS_LABEL_EN } from '../types/element'
import type { ActiveStatus } from '../types/element'
import type { WeaponType } from '../types/weapon'
import { SAVE_KEYS, SAVE_SCHEMA_VERSION, mergeSave, migrateSave } from './save'
export type { ActiveStatus }

export type Speed = number
export type Phase = 'empty' | 'idle' | 'attacking' | 'over'
export type Side = 'player' | 'enemy'

export interface Unit {
  name: string
  namePt?: string
  nameEn?: string
  level: number
  hp: number
  maxHp: number
  atk: number
  def: number
  atkSpeed: number
  dodgeChance: number
  critChance: number
  critDamage: number
  accuracy: number
  damageReduction: number
  magicDamage: number            // powers the Fury elemental strike (monsters)
  fury: number                   // builds per hit dealt/taken; triggers strike at furyMax
  furyMax: number
  // Elemental properties
  element?:   ElementType        // physical attack element (monsters only)
  statusChance?: number          // probability to apply element status on hit
  weakTo:     ElementType[]      // takes 1.5× from these
  resIgnea:   number             // resistance 0–0.5
  resGlacial: number
  resSombria: number
  resVital:   number
  rarity?: MonsterRarity
  monsterType?: string
  monsterVariant?: 'golden' | 'predator'
  /** True for the first-encounter boss version of a monster tile
   *  (spawned at tile.level + random 1–5 above normal). */
  enraged: boolean
}

export interface DefeatSnapshot {
  killerName: string
  killerLevel: number
  killerMonsterType: string
  log: LogEntry[]
}

export interface DeathRecord {
  id: string
  playerLevel: number
  monsterName: string
  monsterLevel: number
  monsterType: string
  monsterRarity: MonsterRarity
  monsterEnraged: boolean
  monsterHpRemaining: number
  monsterMaxHp: number
  tilesPlaced: number
}

export interface SpellLogData {
  name: string
  nameEn?: string
  icon: string
  effectType: 'damage' | 'heal' | 'buff' | 'debuff' | 'utility' | 'fizzle'
  /** Damage dealt (damage spells) or HP restored (heal spells); 0 for buff/debuff/utility. */
  value: number
}

export interface LogEntry {
  attacker: string
  defender: string
  dmg: number
  /** true when the defender dodged the hit (dmg will be 0) */
  missed?: boolean
  /** true when this hit was a critical strike */
  isCrit?: boolean
  /** Present when this entry was produced by a spell cast, not a physical attack. */
  spell?: SpellLogData
  blocked?: boolean
  weaponEffect?: {
    type: WeaponType
    name: string
    nameEn: string
    icon: string
  }
}

interface HeroSync {
  atk: number; def: number; maxHp: number; atkSpeed: number; dodgeChance: number
  critChance: number; critDamage: number; accuracy: number; damageReduction: number
  resIgnea: number; resGlacial: number; resSombria: number; resVital: number
}

interface BattleStore {
  player: Unit
  enemy: Unit
  phase: Phase
  attacker: Side
  speed: Speed
  skipAnim: boolean
  winner: Side | null
  log: LogEntry[]
  turn: number
  nextEnemyLevel: number
  nextEnemyBaseLevel: number
  nextEnemyType: string
  nextEnemyRarity:  MonsterRarity
  nextEnemyVariant: 'golden' | 'predator' | null
  nextTilesPlaced:  number
  /**
   * True when the current enemy is the "enraged" first-encounter boss
   * (spawns at tile.level + random 1–5 above the tile's base level).
   * Cleared back to false after the fight ends or the player moves to
   * a non-enraged tile.
   */
  nextEnemyEnraged: boolean
  nextEnemyQuestId: string | null
  activeEnemyQuestId: string | null
  nextEnemyQuestName: string | null
  nextEnemyQuestNameEn: string | null
  nextEnemyQuestNpc: boolean
  hitsLeft: number
  comboSize: number
  defeatSnapshot: DefeatSnapshot | null
  deathHistory: DeathRecord[]
  enemyStatuses: ActiveStatus[]
  heroStatuses:  ActiveStatus[]
  enemyBleedPower: number
  heroShield: number

  setSpeed(s: Speed): void
  setSkipAnim(v: boolean): void
  setPhase(p: Phase): void
  syncFromHero(stats: HeroSync): void
  startBattle(level: number, monsterType?: string, monsterRarity?: MonsterRarity, tilesPlaced?: number, enraged?: boolean, baseLevel?: number, questId?: string, questName?: string, questNameEn?: string, questNpc?: boolean, monsterVariant?: 'golden' | 'predator' | null): void
  captureDefeat(playerLevel: number, tilesPlaced: number): void
  applyHit(): void
  switchAttacker(): void
  skipBattle(): void
  reset(): void
  logSpell(data: SpellLogData & { casterName: string }): void
  applyMagicDamage(dmg: number, element?: ElementType): void
  healPlayer(hp: number): void
  addHeroShield(amount: number): void
  applyConsumablePhysicalDamage(dmg: number): void
  applyConsumableEnemyDebuff(power: number, turns: number): void
  applyElementalStatus(status: ActiveStatus, target: 'enemy' | 'hero'): void
  tickStatuses(): void
  clearStatuses(): void
  restoreMidFight(playerHpRatio: number, enemyHpRatio: number, enemyStatuses: ActiveStatus[], heroStatuses: ActiveStatus[], attacker: Side, hitsLeft: number, comboSize: number, enemySnapshot?: Unit): void
  applyEnemyDebuff(atkMult: number, atkSpeedMult: number): void
  restoreEnemyStats(savedAtk: number, savedAtkSpeed: number): void
}

const INITIAL_PLAYER: Unit = {
  name: 'Hero', level: 0, hp: 30, maxHp: 30,
  atk: 5, def: 2, atkSpeed: 1.0, dodgeChance: 0,
  critChance: 0, critDamage: 1.5, accuracy: 0, damageReduction: 0,
  magicDamage: 0, fury: 0, furyMax: 6,
  weakTo: [], resIgnea: 0, resGlacial: 0, resSombria: 0, resVital: 0,
  enraged: false,
}

function makeInitialEnemy(): Unit {
  return buildMonster(FOREST_MONSTERS[0], 1, 'normal')
}

/**
 * Armor-ratio damage formula — replaces hybrid linear+percent model.
 *
 * Phase 1 (linear absorption): DEF points subtract directly from ATK, floored
 *   at 15 % of ATK so even 0-damage hits never occur.
 *   → identical to the old formula for low DEF, where it matters most.
 *
 * Armor-ratio k=20 (pure percentage, no absolute subtraction):
 *   damage = atk × 20 / (def + 20)
 *   DEF  0 → 100 %    DEF 10 → 67 %    DEF 20 → 50 %    DEF 40 → 33 %
 *   Natural diminishing returns — no hard cap, no minimum floor.
 *
 * Then defensive efficiency (Destreza, capped 35 %) applied multiplicatively:
 *   damage ×= (1 − d.damageReduction)
 *
 * Then critical hit (Destreza critChance, Força critDamage):
 *   if rand < a.critChance → damage ×= a.critDamage
 *
 * Variance ±15 % last.
 */
function calcDmg(a: Unit, d: Unit): { dmg: number; isCrit: boolean } {
  const K = 20
  const armor  = K / (d.def + K)
  const defEff = 1 - d.damageReduction
  let base = Math.max(1, Math.round(a.atk * armor * defEff))

  // Elemental modifier for physical attacks (e.g. monster with element)
  if (a.element) {
    const mod = elementalModifier(a.element, d.weakTo, d.resIgnea, d.resGlacial, d.resSombria, d.resVital)
    base = Math.max(1, Math.round(base * mod))
  }

  let isCrit = false
  if (a.critChance > 0 && Math.random() < a.critChance) {
    base   = Math.round(base * a.critDamage)
    isCrit = true
  }

  const variance = 0.85 + Math.random() * 0.3
  return { dmg: Math.max(1, Math.round(base * variance)), isCrit }
}

/** Returns true when the defender dodges the hit. Attacker accuracy negates dodge. */
function checkDodge(attacker: Unit, defender: Unit): boolean {
  const effDodge = Math.max(0, defender.dodgeChance - attacker.accuracy)
  return Math.random() < effDodge
}

function calcHits(mySpeed: number, theirSpeed: number): number {
  return Math.max(1, Math.round(mySpeed / theirSpeed))
}

const WEAPON_LOG_ICON: Record<WeaponType, string> = {
  sword: 'x2',
  dagger: 'tox',
  axe: 'bleed',
  staff: 'arc',
  bow: 'mark',
  shield: 'blk',
}

function weaponLog(type: WeaponType): LogEntry['weaponEffect'] {
  const label = WEAPON_EFFECT_LABELS[type]
  return { type, name: label.pt, nameEn: label.en, icon: WEAPON_LOG_ICON[type] }
}

function syncBattlePlayerFromStores() {
  const hero = useHeroStore.getState()
  const inventory = useInventoryStore.getState()
  const spell = useSpellStore.getState()
  const partyAttributes = getPartyEffectiveAttributes(hero.attributes, hero.level)
  const derived = getEffectiveDerivedStatsFromBonuses(
    partyAttributes,
    getEquipmentBonuses(inventory.equipment),
    hero.level,
    inventory.weaponProgress,
    inventory.equippedWeapons,
    spell.activeBuffs,
  )

  useBattleStore.getState().syncFromHero({
    atk: derived.atk,
    def: derived.def,
    maxHp: derived.maxHp,
    atkSpeed: Math.max(0.1, derived.attackSpeed),
    dodgeChance: derived.dodgeChance,
    critChance: Math.min(0.75, derived.critChance),
    critDamage: derived.critDamage,
    accuracy: derived.accuracy,
    damageReduction: derived.damageReduction,
    resIgnea: derived.resIgnea,
    resGlacial: derived.resGlacial,
    resSombria: derived.resSombria,
    resVital: derived.resVital,
  })
}

export const useBattleStore = create<BattleStore>()(
  persist(
  immer((set) => ({
    player: { ...INITIAL_PLAYER },
    enemy:  makeInitialEnemy(),
    phase: 'empty',
    attacker: 'player',
    speed: 1,
    skipAnim: false,
    winner: null,
    log: [],
    turn: 0,
    nextEnemyLevel: 1,
    nextEnemyBaseLevel: 1,
    nextEnemyType: 'goblin',
    nextEnemyRarity: 'normal' as MonsterRarity,
    nextEnemyVariant: null,
    nextTilesPlaced: 0,
    nextEnemyEnraged: false,
    nextEnemyQuestId: null,
    activeEnemyQuestId: null,
    nextEnemyQuestName: null,
    nextEnemyQuestNameEn: null,
    nextEnemyQuestNpc: false,
    hitsLeft: 1,
    comboSize: 1,
    defeatSnapshot: null,
    deathHistory: [],
    enemyStatuses: [],
    heroStatuses:  [],
    enemyBleedPower: 0,
    heroShield: 0,

    setSpeed:    (s) => set((st) => { st.speed    = s }),
    setSkipAnim: (v) => set((st) => { st.skipAnim = v }),
    setPhase:    (p) => set((st) => { st.phase    = p }),

    startBattle: (level, monsterType, monsterRarity, tilesPlaced, enraged, baseLevel, questId, questName, questNameEn, questNpc, monsterVariant) => {
      syncBattlePlayerFromStores()
      set((st) => {
      const resolvedTilesPlaced = tilesPlaced ?? st.nextTilesPlaced
      const resolvedType = monsterType ?? FOREST_RANDOM_MONSTERS[Math.floor(Math.random() * FOREST_RANDOM_MONSTERS.length)].id
      const resolvedRarity = monsterRarity ?? pickMonsterRarity(resolvedTilesPlaced)
      const template = FOREST_MONSTER_MAP.get(resolvedType) ?? FOREST_MONSTERS[0]
      const isEnraged = enraged ?? false
      const resolvedBaseLevel = baseLevel ?? level

      st.nextEnemyLevel     = level
      st.nextEnemyBaseLevel = resolvedBaseLevel
      st.nextEnemyType      = resolvedType
      st.nextTilesPlaced    = resolvedTilesPlaced
      st.nextEnemyRarity    = resolvedRarity
      st.nextEnemyVariant   = monsterVariant ?? null
      st.nextEnemyEnraged   = isEnraged
      st.nextEnemyQuestId   = questId       ?? null
      st.nextEnemyQuestName = questName     ?? null
      st.nextEnemyQuestNameEn = questNameEn ?? null
      st.nextEnemyQuestNpc  = questNpc      ?? false

      st.player.hp    = st.player.maxHp
      st.enemy        = buildMonster(template, level, resolvedRarity, resolvedTilesPlaced)
      st.enemy.enraged = isEnraged
      st.enemy.monsterVariant = monsterVariant ?? undefined
      if (monsterVariant === 'golden') {
        st.enemy.name = 'Demon Dourado'
        st.enemy.namePt = 'Demon Dourado'
        st.enemy.nameEn = 'Golden Demon'
      }
      if (monsterVariant === 'predator') {
        st.enemy.name = `[Predador] ${st.enemy.name}`
        st.enemy.namePt = `[Predador] ${st.enemy.namePt ?? st.enemy.name}`
        st.enemy.nameEn = `[Predator] ${st.enemy.nameEn ?? st.enemy.name}`
        st.enemy.maxHp = Math.round(st.enemy.maxHp * 1.22)
        st.enemy.hp = st.enemy.maxHp
        st.enemy.atk = Math.round(st.enemy.atk * 1.16)
        st.enemy.def = Math.round(st.enemy.def * 1.12)
        st.enemy.atkSpeed = Math.round(st.enemy.atkSpeed * 1.08 * 100) / 100
        st.enemy.accuracy = Math.min(0.55, st.enemy.accuracy + 0.04)
      }
      if (questId) {
        st.enemy.name   = questName   ?? st.enemy.name
        st.enemy.namePt = questName   ?? st.enemy.namePt
        st.enemy.nameEn = questNameEn ?? st.enemy.nameEn
      }
      st.activeEnemyQuestId = questId ?? null
      st.phase        = 'idle'
      st.attacker     = 'player'
      st.winner       = null
      st.log          = []
      st.turn         = 0
      st.skipAnim     = false
      st.defeatSnapshot = null
      st.enemyStatuses  = []
      st.heroStatuses   = []
      st.enemyBleedPower = 0
      st.heroShield = 0
      const hits      = calcHits(st.player.atkSpeed, st.enemy.atkSpeed)
      st.hitsLeft     = hits
        st.comboSize    = hits
      })
    },

    captureDefeat: (playerLevel, tilesPlaced) => set((st) => {
      st.defeatSnapshot = {
        killerName:        st.enemy.name,
        killerLevel:       st.enemy.level,
        killerMonsterType: st.enemy.monsterType ?? st.nextEnemyType,
        log:               st.log.slice(0, 20),
      }
      st.deathHistory.unshift({
        id: `${Date.now()}_${st.deathHistory.length}`,
        playerLevel,
        monsterName:        st.enemy.name,
        monsterLevel:       st.enemy.level,
        monsterType:        st.enemy.monsterType ?? st.nextEnemyType,
        monsterRarity:      st.enemy.rarity ?? 'normal',
        monsterEnraged:     st.enemy.enraged,
        monsterHpRemaining: st.enemy.hp,
        monsterMaxHp:       st.enemy.maxHp,
        tilesPlaced,
      })
      st.deathHistory = st.deathHistory.slice(0, 8)
    }),

    syncFromHero: ({ atk, def, maxHp, atkSpeed, dodgeChance, critChance, critDamage, accuracy, damageReduction,
                     resIgnea, resGlacial, resSombria, resVital }) => set((st) => {
      const prevMaxHp = Math.max(1, st.player.maxHp)
      const hpRatio = st.player.hp > 0 ? st.player.hp / prevMaxHp : 0
      const nextMaxHp = Math.round(maxHp)

      st.player.atk             = Math.round(atk)
      st.player.def             = def
      st.player.maxHp           = nextMaxHp
      st.player.atkSpeed        = atkSpeed
      st.player.dodgeChance     = dodgeChance
      st.player.critChance      = critChance
      st.player.critDamage      = critDamage
      st.player.accuracy        = accuracy
      st.player.damageReduction = damageReduction
      st.player.resIgnea        = resIgnea
      st.player.resGlacial      = resGlacial
      st.player.resSombria      = resSombria
      st.player.resVital        = resVital
      if (st.player.hp <= 0) {
        st.player.hp = 0
      } else if (prevMaxHp !== nextMaxHp) {
        st.player.hp = Math.max(1, Math.min(nextMaxHp, Math.round(nextMaxHp * hpRatio)))
      } else if (st.player.hp > st.player.maxHp) {
        st.player.hp = st.player.maxHp
      }
    }),

    applyHit: () => set((st) => {
      const atkUnit = st.attacker === 'player' ? st.player : st.enemy
      const defUnit = st.attacker === 'player' ? st.enemy  : st.player
      // Statuses active on the attacker and defender
      const atkSt = st.attacker === 'player' ? st.heroStatuses  : st.enemyStatuses
      const defSt = st.attacker === 'player' ? st.enemyStatuses : st.heroStatuses

      // ── Blind: 10 % miss chance for the attacker ──────────────────────────
      if (atkSt.some(s => s.type === 'blind') && Math.random() < 0.10) {
        st.log.unshift({ attacker: atkUnit.name, defender: defUnit.name, dmg: 0, missed: true })
        st.hitsLeft -= 1
        return
      }

      // ── Shock: defender cannot dodge ─────────────────────────────────────
      const shocked = defSt.some(s => s.type === 'shock')
      if (!shocked && checkDodge(atkUnit, defUnit)) {
        st.log.unshift({ attacker: atkUnit.name, defender: defUnit.name, dmg: 0, missed: true })
        st.hitsLeft -= 1
        return
      }

      // ── Build effective copies with status modifiers ──────────────────────
      const effAtk = { ...atkUnit }
      const effDef = { ...defUnit }

      // Blind → attacker cannot crit
      if (atkSt.some(s => s.type === 'blind')) effAtk.critChance = 0

      // Distortion → attacker's ATK swapped with its precision (destreza-equivalent):
      // (critChance + accuracy) × 100 replaces raw ATK:
      //   forca-dominant monsters (high ATK, low dex) become very weak
      //   destreza-dominant monsters (spider) are barely affected
      if (atkSt.some(s => s.type === 'distortion')) {
        effAtk.atk = Math.max(1, Math.round((atkUnit.critChance + atkUnit.accuracy) * 100))
      }

      // Curse → defender's damage reduction zeroed
      if (defSt.some(s => s.type === 'curse')) effDef.damageReduction = 0

      // ── Compute base damage ───────────────────────────────────────────────
      const weaponState = useInventoryStore.getState()
      const weaponProfile = getWeaponCombatProfile(weaponState.weaponProgress, weaponState.equippedWeapons)
      const { dmg: rawDmg, isCrit } = calcDmg(effAtk, effDef)

      // Marked  → defender takes 1.5× damage (eternum brands the target)
      // Blessed → defender takes 0.5× damage (caelum protects the hero)
      const marked  = defSt.some(s => s.type === 'marked')  ? 1.5 : 1.0
      const blessed = defSt.some(s => s.type === 'blessed') ? 0.5 : 1.0
      let dmg = Math.max(1, Math.round(rawDmg * marked * blessed))

      let blocked = false
      let weaponEffect: LogEntry['weaponEffect'] | undefined
      if (st.attacker === 'enemy' && weaponProfile.shieldBlockChance > 0 && Math.random() < weaponProfile.shieldBlockChance) {
        blocked = true
        weaponEffect = weaponLog('shield')
        const perfect = Math.random() < weaponProfile.shieldPerfectBlockChance
        dmg = perfect ? 0 : Math.max(1, Math.round(dmg * (1 - weaponProfile.shieldBlockReduction)))
      }
      if (st.attacker === 'enemy' && st.heroShield > 0 && dmg > 0) {
        const absorbed = Math.min(st.heroShield, dmg)
        st.heroShield -= absorbed
        dmg -= absorbed
        blocked = true
      }

      const newHp = Math.max(0, defUnit.hp - dmg)
      if (st.attacker === 'player') st.enemy.hp  = newHp
      else                          st.player.hp = newHp

      st.log.unshift({ attacker: atkUnit.name, defender: defUnit.name, dmg, isCrit, blocked, weaponEffect })
      if (st.attacker === 'player' && newHp > 0) {
        if (weaponProfile.swordExtraHitChance > 0 && Math.random() < weaponProfile.swordExtraHitChance) {
          const { dmg: extraRaw, isCrit: extraCrit } = calcDmg(effAtk, st.enemy)
          const extraDmg = Math.max(1, Math.round(extraRaw * marked * blessed))
          const hpAfterExtra = Math.max(0, st.enemy.hp - extraDmg)
          st.enemy.hp = hpAfterExtra
          st.log.unshift({ attacker: atkUnit.name, defender: defUnit.name, dmg: extraDmg, isCrit: extraCrit, weaponEffect: weaponLog('sword') })
          if (hpAfterExtra === 0) { st.winner = 'player'; st.phase = 'over' }
        }

        if (st.phase !== 'over' && weaponProfile.daggerPoisonChance > 0 && Math.random() < weaponProfile.daggerPoisonChance) {
          const idx = st.enemyStatuses.findIndex(s => s.type === 'poison')
          const status: ActiveStatus = { element: 'toxicum', type: 'poison', power: weaponProfile.daggerPoisonPower, turnsLeft: 4 }
          if (idx >= 0) {
            st.enemyStatuses[idx].power += status.power
            st.enemyStatuses[idx].turnsLeft = Math.max(st.enemyStatuses[idx].turnsLeft, status.turnsLeft)
          } else {
            st.enemyStatuses.push(status)
          }
          st.log.unshift({ attacker: atkUnit.name, defender: defUnit.name, dmg: 0, weaponEffect: weaponLog('dagger') })
        }

        if (st.phase !== 'over' && weaponProfile.axeBleedChance > 0 && Math.random() < weaponProfile.axeBleedChance) {
          st.enemyBleedPower += weaponProfile.axeBleedPower
          st.log.unshift({ attacker: atkUnit.name, defender: defUnit.name, dmg: 0, weaponEffect: weaponLog('axe') })
        }

        if (st.phase !== 'over' && weaponProfile.bowMarkChance > 0 && Math.random() < weaponProfile.bowMarkChance) {
          const idx = st.enemyStatuses.findIndex(s => s.type === 'marked')
          const status: ActiveStatus = { element: 'eternum', type: 'marked', power: 1, turnsLeft: weaponProfile.bowMarkTurns }
          if (idx >= 0) st.enemyStatuses[idx].turnsLeft = Math.max(st.enemyStatuses[idx].turnsLeft, status.turnsLeft)
          else st.enemyStatuses.push(status)
          st.log.unshift({ attacker: atkUnit.name, defender: defUnit.name, dmg: 0, weaponEffect: weaponLog('bow') })
        }
      }
      st.hitsLeft -= 1
      if (newHp === 0) { st.winner = st.attacker; st.phase = 'over' }

      // ── Elemental status from physical attack (e.g. venomous monster) ─────
      if (atkUnit.element && atkUnit.statusChance && Math.random() < atkUnit.statusChance) {
        const status = makeStatus(atkUnit.element, 0, atkUnit.level)
        const arr = st.attacker === 'player' ? st.enemyStatuses : st.heroStatuses
        const idx = arr.findIndex(s => s.element === status.element)
        if (idx >= 0) { if (status.power >= arr[idx].power) arr[idx] = { ...status } }
        else arr.push({ ...status })
      }

      // ── FÚRIA do monstro ───────────────────────────────────────────────────
      // Sobe +1 por hit resolvido (dado OU tomado). Só monstros com magicDamage
      // (ou seja, com Inteligência) acumulam — early game intocado.
      // Ao encher: golpe extra ELEMENTAL no herói, mitigado pelas resistências.
      if (st.phase !== 'over' && st.enemy.hp > 0 && st.enemy.magicDamage > 0) {
        st.enemy.fury += 1
        if (st.enemy.fury >= st.enemy.furyMax) {
          st.enemy.fury = 0
          const el  = st.enemy.element ?? 'umbra'
          const mod = elementalModifier(
            el, st.player.weakTo,
            st.player.resIgnea, st.player.resGlacial, st.player.resSombria, st.player.resVital,
          )
          const furyDmg = Math.max(1, Math.round(st.enemy.magicDamage * 2.2 * mod))
          const pHp = Math.max(0, st.player.hp - furyDmg)
          st.player.hp = pHp
          st.log.unshift({
            attacker: st.enemy.name, defender: st.player.name, dmg: furyDmg,
            spell: { name: 'Fúria', nameEn: 'Fury', icon: '🔥', effectType: 'damage', value: furyDmg },
          })
          if (pHp === 0) { st.winner = 'enemy'; st.phase = 'over' }
        }
      }
    }),

    switchAttacker: () => set((st) => {
      if (st.phase === 'over' || st.phase === 'empty') return

      const candidate = st.attacker === 'player' ? 'enemy' : 'player'
      st.phase = 'idle'
      st.turn += 1

      // Gravity: enemy loses their entire turn (stun)
      if (candidate === 'enemy') {
        const gIdx = st.enemyStatuses.findIndex(s => s.type === 'gravity')
        if (gIdx >= 0) {
          // Consume the gravity turn and skip back to player
          st.enemyStatuses[gIdx].turnsLeft -= 1
          if (st.enemyStatuses[gIdx].turnsLeft <= 0) {
            st.enemyStatuses.splice(gIdx, 1)
          }
          // Enemy turn skipped — player attacks again
          st.attacker = 'player'
        } else {
          st.attacker = 'enemy'
        }
      } else {
        st.attacker = 'player'
      }

      const next = st.attacker === 'player' ? st.player : st.enemy
      const opp  = st.attacker === 'player' ? st.enemy  : st.player
      // Freeze: attacker's atkSpeed reduced to 35 % while frozen
      // Makes fast enemies lose their combo advantage (e.g. goblin 2→1 hits/turn)
      const nextSt = st.attacker === 'player' ? st.heroStatuses : st.enemyStatuses
      const frozen = nextSt.some(s => s.type === 'freeze')
      const effSpeed = frozen ? Math.max(0.1, next.atkSpeed * 0.35) : next.atkSpeed
      st.hitsLeft  = calcHits(effSpeed, opp.atkSpeed)
      st.comboSize = st.hitsLeft
    }),

    skipBattle: () => {
      let guard = 2000
      syncBattlePlayerFromStores()
      while ((useBattleStore.getState().phase === 'idle' || useBattleStore.getState().phase === 'attacking') && guard-- > 0) {
        useBattleStore.getState().applyHit()
        const afterHit = useBattleStore.getState()
        if (afterHit.phase === 'over') break
        if (afterHit.hitsLeft <= 0) {
          useBattleStore.getState().switchAttacker()
          if (useBattleStore.getState().attacker === 'enemy') {
            useSpellStore.getState().onBattleTurn()
            syncBattlePlayerFromStores()
            if (useBattleStore.getState().phase === 'over') break
            useBattleStore.getState().tickStatuses()
          }
        }
      }
    },

    logSpell: ({ casterName, name, icon, effectType, value }) => set((st) => {
      // For damage/debuff the target is the enemy; for heal/buff the caster benefits
      const defender = (effectType === 'damage' || effectType === 'debuff')
        ? st.enemy.name
        : casterName
      st.log.unshift({
        attacker: casterName,
        defender,
        dmg: effectType === 'damage' ? value : 0,
        spell: { name, icon, effectType, value },
      })
    }),

    applyMagicDamage: (dmg, element) => set((st) => {
      if (st.phase === 'over' || st.phase === 'empty') return
      let effective = dmg
      if (element) {
        const mod = elementalModifier(
          element, st.enemy.weakTo,
          st.enemy.resIgnea, st.enemy.resGlacial, st.enemy.resSombria, st.enemy.resVital,
        )
        effective = Math.max(1, Math.round(dmg * mod))
      }
      const newHp = Math.max(0, st.enemy.hp - effective)
      st.enemy.hp = newHp
      if (newHp === 0) { st.winner = 'player'; st.phase = 'over' }
    }),

    applyElementalStatus: (status, target) => set((st) => {
      const arr = target === 'enemy' ? st.enemyStatuses : st.heroStatuses
      const idx = arr.findIndex(s => s.element === status.element)
      if (idx >= 0) {
        // Replace only if same or stronger power ("fire replaces with the strongest")
        if (status.power >= arr[idx].power) arr[idx] = { ...status }
      } else {
        arr.push({ ...status })
      }
    }),

    tickStatuses: () => set((st) => {
      if (st.phase === 'over' || st.phase === 'empty') return

      if (st.enemyBleedPower > 0) {
        const dmg = Math.max(1, Math.round(st.enemyBleedPower))
        const newHp = Math.max(0, st.enemy.hp - dmg)
        st.enemy.hp = newHp
        st.log.unshift({
          attacker: 'Sangramento',
          defender: st.enemy.name,
          dmg,
          spell: {
            name: 'Sangramento',
            nameEn: 'Bleeding',
            icon: '*',
            effectType: 'damage',
            value: dmg,
          },
        })
        if (newHp === 0) { st.winner = 'player'; st.phase = 'over'; return }
      }

      // ── DoTs on enemy ─────────────────────────────────────────────────────
      for (const s of st.enemyStatuses) {
        if (s.type === 'burn' || s.type === 'poison') {
          const dmg   = Math.max(1, Math.round(s.power))
          const newHp = Math.max(0, st.enemy.hp - dmg)
          st.enemy.hp = newHp
          st.log.unshift({
            attacker: STATUS_ICONS[s.type] + ' ' + STATUS_LABEL_PT[s.type],
            defender: st.enemy.name,
            dmg,
            spell: {
              name: STATUS_LABEL_PT[s.type],
              nameEn: STATUS_LABEL_EN[s.type],
              icon: STATUS_ICONS[s.type],
              effectType: 'damage',
              value: dmg,
            },
          })
          if (newHp === 0) { st.winner = 'player'; st.phase = 'over' }
          // Poison grows each tick
          if (s.type === 'poison') s.power = Math.round(s.power * 1.3)
        }
      }

      // ── DoTs + Regen on hero ───────────────────────────────────────────────
      for (const s of st.heroStatuses) {
        if (s.type === 'burn' || s.type === 'poison') {
          const dmg   = Math.max(1, Math.round(s.power))
          const newHp = Math.max(0, st.player.hp - dmg)
          st.player.hp = newHp
          st.log.unshift({
            attacker: STATUS_ICONS[s.type] + ' ' + STATUS_LABEL_PT[s.type],
            defender: st.player.name,
            dmg,
            spell: {
              name: STATUS_LABEL_PT[s.type],
              nameEn: STATUS_LABEL_EN[s.type],
              icon: STATUS_ICONS[s.type],
              effectType: 'damage',
              value: dmg,
            },
          })
          if (newHp === 0) { st.winner = 'enemy'; st.phase = 'over' }
          if (s.type === 'poison') s.power = Math.round(s.power * 1.3)
        }
        if (s.type === 'regen') {
          const healed = Math.max(1, s.power)
          st.player.hp = Math.min(st.player.maxHp, st.player.hp + healed)
          st.log.unshift({
            attacker: STATUS_ICONS.regen + ' ' + STATUS_LABEL_PT.regen,
            defender: st.player.name,
            dmg: 0,
            spell: {
              name: STATUS_LABEL_PT.regen,
              nameEn: STATUS_LABEL_EN.regen,
              icon: STATUS_ICONS.regen,
              effectType: 'heal',
              value: healed,
            },
          })
        }
      }

      // ── Decrement all statuses, remove expired ─────────────────────────────
      st.enemyStatuses = st.enemyStatuses
        .map(s => ({ ...s, turnsLeft: s.turnsLeft - 1 }))
        .filter(s => s.turnsLeft > 0)
      st.heroStatuses = st.heroStatuses
        .map(s => ({ ...s, turnsLeft: s.turnsLeft - 1 }))
        .filter(s => s.turnsLeft > 0)

    }),

    clearStatuses: () => set((st) => {
      st.enemyStatuses = []
      st.heroStatuses  = []
      st.enemyBleedPower = 0
    }),

    restoreMidFight: (playerHpRatio, enemyHpRatio, enemyStatuses, heroStatuses, attacker, hitsLeft, comboSize, enemySnapshot) => set((st) => {
      if (
        enemySnapshot
        && typeof enemySnapshot.name === 'string'
        && typeof enemySnapshot.level === 'number'
        && typeof enemySnapshot.maxHp === 'number'
        && enemySnapshot.maxHp > 0
      ) {
        st.enemy = { ...enemySnapshot }
      }
      st.player.hp     = Math.max(1, Math.min(st.player.maxHp, Math.round(st.player.maxHp * playerHpRatio)))
      st.enemy.hp      = Math.max(1, Math.min(st.enemy.maxHp,  Math.round(st.enemy.maxHp  * enemyHpRatio)))
      st.enemyStatuses = enemyStatuses
      st.heroStatuses  = heroStatuses
      st.enemyBleedPower = 0
      st.attacker      = attacker
      st.hitsLeft      = hitsLeft
      st.comboSize     = comboSize
      st.phase         = 'idle'
    }),


    healPlayer: (hp) => set((st) => {
      st.player.hp = Math.min(st.player.maxHp, st.player.hp + hp)
    }),

    addHeroShield: (amount) => set((st) => {
      if (st.phase === 'empty' || st.phase === 'over') return
      st.heroShield += Math.max(1, Math.round(amount))
      st.log.unshift({
        attacker: st.player.name,
        defender: st.player.name,
        dmg: 0,
        spell: { name: 'Escudo', nameEn: 'Shield', icon: 'S', effectType: 'buff', value: 0 },
      })
    }),

    applyConsumablePhysicalDamage: (dmg) => set((st) => {
      if (st.phase === 'empty' || st.phase === 'over') return
      const effective = Math.max(1, Math.round(dmg))
      st.enemy.hp = Math.max(0, st.enemy.hp - effective)
      st.log.unshift({
        attacker: st.player.name,
        defender: st.enemy.name,
        dmg: effective,
        spell: { name: 'Item', nameEn: 'Item', icon: 'D', effectType: 'damage', value: effective },
      })
      if (st.enemy.hp === 0) { st.winner = 'player'; st.phase = 'over' }
    }),

    applyConsumableEnemyDebuff: (power, turns) => set((st) => {
      if (st.phase === 'empty' || st.phase === 'over') return
      const status: ActiveStatus = {
        element: 'umbra',
        type: 'curse',
        power: Math.max(0.01, power),
        turnsLeft: Math.max(1, Math.round(turns)),
      }
      const idx = st.enemyStatuses.findIndex(s => s.type === status.type)
      if (idx >= 0) {
        st.enemyStatuses[idx].power = Math.max(st.enemyStatuses[idx].power, status.power)
        st.enemyStatuses[idx].turnsLeft = Math.max(st.enemyStatuses[idx].turnsLeft, status.turnsLeft)
      } else {
        st.enemyStatuses.push(status)
      }
      st.log.unshift({
        attacker: st.player.name,
        defender: st.enemy.name,
        dmg: 0,
        spell: { name: 'Debilitar', nameEn: 'Weaken', icon: '!', effectType: 'debuff', value: 0 },
      })
    }),

    applyEnemyDebuff: (atkMult, atkSpeedMult) => set((st) => {
      st.enemy.atk      = Math.max(1, Math.round(st.enemy.atk      * atkMult))
      st.enemy.atkSpeed = Math.max(0.1, st.enemy.atkSpeed * atkSpeedMult)
    }),

    restoreEnemyStats: (savedAtk, savedAtkSpeed) => set((st) => {
      st.enemy.atk      = savedAtk
      st.enemy.atkSpeed = savedAtkSpeed
    }),

    reset: () => set((st) => {
      st.player.hp    = st.player.maxHp
      st.phase        = 'empty'
      st.attacker     = 'player'
      st.winner       = null
      st.log          = []
      st.turn         = 0
      st.skipAnim     = false
      st.defeatSnapshot = null
      st.enemyStatuses  = []
      st.heroStatuses   = []
      st.enemyBleedPower = 0
      st.heroShield = 0
      st.activeEnemyQuestId = null
      st.nextEnemyEnraged  = false
      st.nextEnemyQuestId  = null
      st.nextEnemyQuestName = null
      st.nextEnemyQuestNameEn = null
      st.nextEnemyQuestNpc = false
      st.hitsLeft     = 0
      st.comboSize    = 0
    }),
  })),
  {
    name: SAVE_KEYS.battle,
    version: SAVE_SCHEMA_VERSION,
    migrate: migrateSave,
    merge: mergeSave,
    partialize: (state) => ({
      player:               state.player,
      enemy:                state.enemy,
      phase:                state.phase === 'attacking' ? 'idle' : state.phase,
      attacker:             state.attacker,
      speed:                state.speed,
      skipAnim:             false,
      winner:               state.winner,
      log:                  state.log.slice(-20),
      turn:                 state.turn,
      nextEnemyLevel:       state.nextEnemyLevel,
      nextEnemyBaseLevel:   state.nextEnemyBaseLevel,
      nextEnemyType:        state.nextEnemyType,
      nextEnemyRarity:      state.nextEnemyRarity,
      nextTilesPlaced:      state.nextTilesPlaced,
      nextEnemyEnraged:     state.nextEnemyEnraged,
      nextEnemyQuestId:     state.nextEnemyQuestId,
      activeEnemyQuestId:   state.activeEnemyQuestId,
      nextEnemyQuestName:   state.nextEnemyQuestName,
      nextEnemyQuestNameEn: state.nextEnemyQuestNameEn,
      nextEnemyQuestNpc:    state.nextEnemyQuestNpc,
      hitsLeft:             state.hitsLeft,
      comboSize:            state.comboSize,
      defeatSnapshot:       state.defeatSnapshot,
      deathHistory:         state.deathHistory,
      enemyStatuses:        state.enemyStatuses,
      heroStatuses:         state.heroStatuses,
      enemyBleedPower:      state.enemyBleedPower,
    }),
  }
  )
)
