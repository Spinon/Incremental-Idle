// ─── Elemental system ─────────────────────────────────────────────────────────

export type ElementType =
  | 'ignis' | 'glacies' | 'fulgur' | 'umbra' | 'lux' | 'toxicum'
  | 'mortis' | 'vitae' | 'caelum' | 'abyssus' | 'eternum' | 'tempus'

export type StatusType =
  | 'burn'      // ignis:   damage/turn, replaces if stronger
  | 'freeze'    // glacies: enemy loses 1 combo hit while active
  | 'shock'     // fulgur:  enemy dodgeChance = 0
  | 'curse'     // umbra:   enemy damageReduction = 0
  | 'blind'     // lux:     enemy critChance = 0
  | 'poison'    // toxicum: growing damage/turn (×1.3 per tick)
  | 'doom'      // mortis:  on kill → double XP reward
  | 'regen'     // vitae:   hero recovers HP/turn
  | 'blessed'   // caelum:  hero crits deal extra (visual + log only for now)
  | 'gravity'   // abyssus: enemy dodgeChance = 0 (stronger than shock, longer)
  | 'marked'    // eternum: all debuffs on enemy last +50% (display only now)
  | 'distortion'// tempus:  visual/display only (tempus debuffs handle speed)

export interface ActiveStatus {
  element: ElementType
  type: StatusType
  /** DoT damage per tick (or magnitude for control effects). */
  power: number
  turnsLeft: number
}

// ─── Element → status mapping ─────────────────────────────────────────────────

export const ELEMENT_STATUS: Record<ElementType, StatusType> = {
  ignis:   'burn',
  glacies: 'freeze',
  fulgur:  'shock',
  umbra:   'curse',
  lux:     'blind',
  toxicum: 'poison',
  mortis:  'doom',
  vitae:   'regen',
  caelum:  'blessed',
  abyssus: 'gravity',
  eternum: 'marked',
  tempus:  'distortion',
}

// ─── Elemental weaknesses (takes 1.5× from these) ─────────────────────────────

export const ELEMENT_WEAKNESS: Partial<Record<ElementType, ElementType>> = {
  ignis:   'glacies',   // fire melts against ice
  glacies: 'ignis',    // ice shatters against fire
  umbra:   'lux',      // shadow dissolves in light
  lux:     'umbra',    // light blinds in darkness
  vitae:   'mortis',   // life wilts against death
  mortis:  'vitae',    // death repelled by life
  fulgur:  'abyssus',  // lightning absorbed by void
  abyssus: 'fulgur',   // void punctured by lightning
  tempus:  'eternum',  // time unmade by eternity
  eternum: 'tempus',   // eternity eroded by time
  toxicum: 'lux',      // poison purified by light
  caelum:  'abyssus',  // sky swallowed by abyss
}

// ─── Elemental categories for resistance stats ────────────────────────────────
// lux + eternum = "pure magic" — unresisted

export type ElementCategory = 'ignea' | 'glacial' | 'sombria' | 'vital' | 'pure'

export const ELEMENT_CATEGORY: Record<ElementType, ElementCategory> = {
  ignis:   'ignea',
  caelum:  'ignea',
  glacies: 'glacial',
  fulgur:  'glacial',
  tempus:  'glacial',
  umbra:   'sombria',
  mortis:  'sombria',
  abyssus: 'sombria',
  vitae:   'vital',
  toxicum: 'vital',
  lux:     'pure',
  eternum: 'pure',
}

// Which Unit resistance stat each category maps to
export const CATEGORY_RES: Record<ElementCategory, 'resIgnea' | 'resGlacial' | 'resSombria' | 'resVital' | null> = {
  ignea:   'resIgnea',
  glacial: 'resGlacial',
  sombria: 'resSombria',
  vital:   'resVital',
  pure:    null,   // unresisted
}

// ─── Default status config per element ───────────────────────────────────────

interface StatusConfig {
  chance:     number  // base probability of applying on hit
  powerScale: number  // multiplied by magicDamage of caster
  basePower:  number  // base power (floor)
  turns:      number  // duration in battle turns
}

export const ELEMENT_DEFAULT_STATUS: Record<ElementType, StatusConfig> = {
  ignis:   { chance: 0.30, powerScale: 0.35, basePower: 2, turns: 3 },
  glacies: { chance: 0.40, powerScale: 0,    basePower: 1, turns: 2 },
  fulgur:  { chance: 0.35, powerScale: 0,    basePower: 1, turns: 2 },
  umbra:   { chance: 0.40, powerScale: 0,    basePower: 1, turns: 3 },
  lux:     { chance: 0.35, powerScale: 0,    basePower: 1, turns: 2 },
  toxicum: { chance: 0.45, powerScale: 0.40, basePower: 2, turns: 4 },
  mortis:  { chance: 0.35, powerScale: 0,    basePower: 1, turns: 3 },
  vitae:   { chance: 0.80, powerScale: 0.30, basePower: 3, turns: 3 },
  caelum:  { chance: 0.50, powerScale: 0,    basePower: 1, turns: 2 },
  // Gravity: single-turn stun (enemy loses turn) — lower chance, 1 turn
  abyssus: { chance: 0.25, powerScale: 0,    basePower: 1, turns: 1 },
  eternum: { chance: 0.35, powerScale: 0,    basePower: 1, turns: 3 },
  tempus:  { chance: 0.45, powerScale: 0,    basePower: 1, turns: 3 },
}

/**
 * Build a status instance with power scaled by the caster's magicDamage.
 * For monster physical attacks pass magicDamage=0; power scales by level.
 */
export function makeStatus(
  element: ElementType,
  magicDamage = 0,
  level = 1,
): ActiveStatus {
  const cfg = ELEMENT_DEFAULT_STATUS[element]
  const power = Math.max(1, Math.round(cfg.basePower + level * 0.25 + magicDamage * cfg.powerScale))
  return { element, type: ELEMENT_STATUS[element], power, turnsLeft: cfg.turns }
}

/**
 * Compute the damage multiplier for an elemental hit.
 * weakness × (1 − resistance)
 */
export function elementalModifier(
  element: ElementType,
  weakTo:  ElementType[],
  resIgnea: number,
  resGlacial: number,
  resSombria: number,
  resVital: number,
): number {
  const weakness = weakTo.includes(element) ? 1.5 : 1.0
  const cat = ELEMENT_CATEGORY[element]
  const catKey = CATEGORY_RES[cat]
  const res = catKey === 'resIgnea'   ? resIgnea
            : catKey === 'resGlacial' ? resGlacial
            : catKey === 'resSombria' ? resSombria
            : catKey === 'resVital'   ? resVital
            : 0
  return weakness * (1 - res)
}

// ─── Display ──────────────────────────────────────────────────────────────────

export const STATUS_ICONS: Record<StatusType, string> = {
  burn:       '🔥',
  freeze:     '❄',
  shock:      '⚡',
  curse:      '🌑',
  blind:      '☀',
  poison:     '🧪',
  doom:       '☠',
  regen:      '💚',
  blessed:    '✨',
  gravity:    '🌀',
  marked:     '♾',
  distortion: '⏳',
}

export const STATUS_COLOR: Record<StatusType, string> = {
  burn:       'text-orange-400',
  freeze:     'text-blue-300',
  shock:      'text-yellow-300',
  curse:      'text-purple-400',
  blind:      'text-yellow-100',
  poison:     'text-green-400',
  doom:       'text-slate-300',
  regen:      'text-emerald-400',
  blessed:    'text-amber-200',
  gravity:    'text-indigo-400',
  marked:     'text-slate-400',
  distortion: 'text-teal-300',
}

export const STATUS_LABEL_PT: Record<StatusType, string> = {
  burn:       'Queimando',
  freeze:     'Congelado',
  shock:      'Eletrocutado',
  curse:      'Amaldiçoado',
  blind:      'Ofuscado',
  poison:     'Envenenado',
  doom:       'Sentenciado',
  regen:      'Regenerando',
  blessed:    'Abençoado',
  gravity:    'Gravitação',
  marked:     'Marcado',
  distortion: 'Distorção',
}
