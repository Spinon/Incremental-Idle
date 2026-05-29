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

export const MONSTER_RARITY_LABEL: Record<MonsterRarity, string> = {
  normal:   '',
  uncommon: 'Incomum',
  rare:     'Raro',
  epic:     'Épico',
  unique:   'Único',
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

/** Derive combat stats directly from raw attribute values (monster-specific formula). */
function monsterStats(a: Attributes) {
  return {
    atk:         Math.max(1, Math.round(a.forca * 2.5 + a.destreza * 0.6)),
    def:         Math.max(0, Math.round(a.vitalidade * 0.5)),
    maxHp:       Math.max(5, Math.round(a.vitalidade * 8 + a.forca * 3 + 5)),
    attackSpeed: Math.max(0.1, Math.round((0.5 + a.agilidade * 0.12 + a.destreza * 0.04) * 100) / 100),
    dodgeChance: Math.min(0.5, Math.round((a.destreza * 0.01 + a.agilidade * 0.003) * 1000) / 1000),
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

export function buildMonster(
  template: MonsterTemplate,
  level:    number,
  rarity:   MonsterRarity = 'normal',
): Unit {
  const totalPoints = template.basePoints
    + level * template.pointsPerLevel
    + MONSTER_RARITY_BONUS[rarity]

  const attrs = distributePoints(template.preferences, totalPoints)
  const s     = monsterStats(attrs)

  const label  = MONSTER_RARITY_LABEL[rarity]
  const prefix = label ? `[${label}] ` : ''

  return {
    name:        prefix + template.name,
    level,
    hp:          s.maxHp,
    maxHp:       s.maxHp,
    atk:         s.atk,
    def:         s.def,
    atkSpeed:    s.attackSpeed,
    dodgeChance: s.dodgeChance,
    rarity,
    monsterType: template.id,
  }
}
