import type { Attributes } from '../types/hero'
import type { Unit } from '../store/battleStore'
import type { MonsterTemplate, MonsterRarity, MonsterPreferences } from '../types/monster'

// Extra attribute points granted by rarity — as if wearing a full equipment set of that tier
export const MONSTER_RARITY_BONUS: Record<MonsterRarity, number> = {
  normal:   0,
  uncommon: 5,
  rare:     12,
  epic:     25,
  unique:   45,
}

const BASE_CRIT_CHANCE = 0.05
const CRIT_CHANCE_PER_DEX = 0.006

export const MONSTER_RARITY_LABEL: Record<MonsterRarity, string> = {
  normal:   '',
  uncommon: 'Incomum',
  rare:     'Raro',
  epic:     'Épico',
  unique:   'Único',
}

export const MONSTER_RARITY_LABEL_EN: Record<MonsterRarity, string> = {
  normal:   '',
  uncommon: 'Uncommon',
  rare:     'Rare',
  epic:     'Epic',
  unique:   'Unique',
}

export const MONSTER_RARITY_COLOR: Record<MonsterRarity, string> = {
  normal:   '',
  uncommon: 'text-green-400',
  rare:     'text-blue-400',
  epic:     'text-purple-400',
  unique:   'text-orange-400',
}

/**
 * Pick a monster rarity, gated by how many tiles have been placed.
 * Higher rarities unlock every 20 tiles:
 *   0+ → normal only
 *  20+ → uncommon unlocked
 *  40+ → rare unlocked
 *  60+ → epic unlocked
 *  80+ → unique unlocked
 */
export function pickMonsterRarity(tilesPlaced = 0): MonsterRarity {
  const r = Math.random() * 100
  if (r < 0.1  && tilesPlaced >= 80) return 'unique'
  if (r < 1.0  && tilesPlaced >= 60) return 'epic'
  if (r < 4.0  && tilesPlaced >= 40) return 'rare'
  if (r < 14.0 && tilesPlaced >= 20) return 'uncommon'
  return 'normal'
}

/**
 * Derive combat stats from raw attribute values using the same formulas as the
 * hero wherever applicable.  Stat distribution (via MonsterPreferences) is the
 * only mechanical difference between monster types.
 */
function monsterStats(a: Attributes) {
  return {
    // ── Same coefficients as hero ─────────────────────────────────────────
    atk:             Math.max(1, Math.round(a.forca * 2.5 + a.destreza * 0.6)),
    // DEF: armadura física = só vitalidade (same as hero)
    def:             Math.max(0, Math.round(a.vitalidade * 0.5)),
    maxHp:           Math.max(5, Math.round(a.vitalidade * 8 + a.forca * 3 + 5)),
    attackSpeed:     Math.max(0.1, Math.round((0.5 + a.agilidade * 0.12 + a.destreza * 0.04) * 100) / 100),
    dodgeChance:     Math.min(0.50, Math.round(a.agilidade * 0.005 * 1000) / 1000),
    // Critical hits — destreza gives chance, forca amplifies damage (identical to hero)
    critChance:      Math.min(0.50, Math.round((BASE_CRIT_CHANCE + a.destreza * CRIT_CHANCE_PER_DEX) * 1000) / 1000),
    critDamage:      1.5 + a.forca * 0.01,
    // Precision — destreza negates target dodge (identical to hero)
    accuracy:        Math.min(0.50, Math.round(a.destreza * 0.006 * 1000) / 1000),
    // Defensive — forca gives brawn-based damage reduction (identical to hero)
    damageReduction: Math.min(0.35, Math.round(a.forca * 0.01 * 1000) / 1000),
  }
}

/**
 * Distribute `total` points across attribute keys according to preference weights.
 * Each attribute gets ±1 point of jitter so same-type monsters vary slightly.
 * Jitter is only applied when total is large enough to absorb it without
 * zeroing the dominant attribute.
 */
function distributePoints(prefs: MonsterPreferences, total: number): Attributes {
  const keys = Object.keys(prefs) as (keyof MonsterPreferences)[]
  const totalWeight = keys.reduce((s, k) => s + prefs[k], 0)
  // Only jitter when there's enough budget — prevents dominant attr being zeroed
  const applyJitter = total >= keys.length * 3

  const attrs: Attributes = {
    forca: 0, vitalidade: 0, agilidade: 0, destreza: 0,
    inteligencia: 0, sabedoria: 0, carisma: 0,
  }

  let allocated = 0
  for (const key of keys) {
    const ideal  = (prefs[key] / totalWeight) * total
    const jitter = applyJitter ? Math.round(Math.random() * 2 - 1) : 0  // -1, 0 or +1
    const val    = Math.max(0, Math.round(ideal) + jitter)
    attrs[key]   = val
    allocated   += val
  }

  // Correct any rounding drift on the highest-preference attribute.
  // Clamp to at least 1 so the dominant stat is never wiped by accumulated jitter.
  const topKey = keys.reduce((a, b) => prefs[a] > prefs[b] ? a : b)
  attrs[topKey] = Math.max(
    prefs[topKey] > 0 ? 1 : 0,
    attrs[topKey] + (total - allocated),
  )

  return attrs
}

function distributeAveragePoints(prefs: MonsterPreferences, total: number): Attributes {
  const keys = Object.keys(prefs) as (keyof MonsterPreferences)[]
  const totalWeight = keys.reduce((s, k) => s + prefs[k], 0)
  const attrs: Attributes = {
    forca: 0, vitalidade: 0, agilidade: 0, destreza: 0,
    inteligencia: 0, sabedoria: 0, carisma: 0,
  }

  let allocated = 0
  for (const key of keys) {
    const val = Math.max(0, Math.round((prefs[key] / totalWeight) * total))
    attrs[key] = val
    allocated += val
  }

  const topKey = keys.reduce((a, b) => prefs[a] > prefs[b] ? a : b)
  attrs[topKey] = Math.max(prefs[topKey] > 0 ? 1 : 0, attrs[topKey] + (total - allocated))
  return attrs
}

export function estimateMonster(
  template:    MonsterTemplate,
  level:       number,
  rarity:      MonsterRarity = 'normal',
  tilesPlaced  = 0,
): Unit {
  const tileMult = 1 + Math.floor(tilesPlaced / 10) * 0.05
  const totalPoints = Math.round(
    (template.basePoints + level * template.pointsPerLevel + MONSTER_RARITY_BONUS[rarity])
    * tileMult,
  )
  const attrs = distributeAveragePoints(template.preferences, totalPoints)
  const s = monsterStats(attrs)
  const labelPt  = MONSTER_RARITY_LABEL[rarity]
  const labelEn  = MONSTER_RARITY_LABEL_EN[rarity]
  const namePt = labelPt ? `[${labelPt}] ${template.namePt}` : template.namePt
  const nameEn = labelEn ? `[${labelEn}] ${template.nameEn}` : template.nameEn
  const resIgnea   = Math.min(0.5, attrs.vitalidade   * 0.008 + attrs.inteligencia * 0.004)
  const resGlacial = Math.min(0.5, attrs.destreza     * 0.008 + attrs.inteligencia * 0.004)
  const resSombria = Math.min(0.5, attrs.inteligencia * 0.008)
  const resVital   = Math.min(0.5, attrs.sabedoria    * 0.008 + attrs.inteligencia * 0.004)

  return {
    name: namePt,
    namePt,
    nameEn,
    level,
    hp: s.maxHp,
    maxHp: s.maxHp,
    atk: s.atk,
    def: s.def,
    atkSpeed: s.attackSpeed,
    dodgeChance: s.dodgeChance,
    critChance: s.critChance,
    critDamage: s.critDamage,
    accuracy: s.accuracy,
    damageReduction: s.damageReduction,
    element: template.element,
    statusChance: template.statusChance,
    weakTo: template.weakTo ?? [],
    resIgnea, resGlacial, resSombria, resVital,
    rarity,
    monsterType: template.id,
    enraged: false,
  }
}

export function buildMonster(
  template:    MonsterTemplate,
  level:       number,
  rarity:      MonsterRarity = 'normal',
  tilesPlaced  = 0,
): Unit {
  // Stealth scaling: +5% total attribute points per 10 tiles placed.
  // Invisible to the player in the UI but makes enemies progressively
  // stronger as the map grows — keeps the game challenging mid-run.
  const tileMult   = 1 + Math.floor(tilesPlaced / 10) * 0.05
  const totalPoints = Math.round(
    (template.basePoints + level * template.pointsPerLevel + MONSTER_RARITY_BONUS[rarity])
    * tileMult,
  )

  const attrs = distributePoints(template.preferences, totalPoints)
  const s     = monsterStats(attrs)

  const labelPt  = MONSTER_RARITY_LABEL[rarity]
  const labelEn  = MONSTER_RARITY_LABEL_EN[rarity]
  const namePt = labelPt ? `[${labelPt}] ${template.namePt}` : template.namePt
  const nameEn = labelEn ? `[${labelEn}] ${template.nameEn}` : template.nameEn

  // Elemental resistances derived from attributes (same formula as hero)
  const resIgnea   = Math.min(0.5, attrs.vitalidade   * 0.008 + attrs.inteligencia * 0.004)
  const resGlacial = Math.min(0.5, attrs.destreza     * 0.008 + attrs.inteligencia * 0.004)
  const resSombria = Math.min(0.5, attrs.inteligencia * 0.008)
  const resVital   = Math.min(0.5, attrs.sabedoria    * 0.008 + attrs.inteligencia * 0.004)

  return {
    name:            namePt,
    namePt,
    nameEn,
    level,
    hp:              s.maxHp,
    maxHp:           s.maxHp,
    atk:             s.atk,
    def:             s.def,
    atkSpeed:        s.attackSpeed,
    dodgeChance:     s.dodgeChance,
    critChance:      s.critChance,
    critDamage:      s.critDamage,
    accuracy:        s.accuracy,
    damageReduction: s.damageReduction,
    element:         template.element,
    statusChance:    template.statusChance,
    weakTo:          template.weakTo ?? [],
    resIgnea, resGlacial, resSombria, resVital,
    rarity,
    monsterType:     template.id,
    enraged:         false,   // set to true by battleStore.reset() when nextEnemyEnraged is true
  }
}
