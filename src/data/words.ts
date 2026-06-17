import type { Word } from '../types/spell'

// ─── All 22 words ─────────────────────────────────────────────────────────────
// Elements (12): what the spell is made of
// Forms (10): how the spell manifests
// Rarity distribution: common(8), uncommon(5), rare(4), epic(3), unique(2)

export const ALL_WORDS: Word[] = [
  // ── Common elements ──────────────────────────────────────────────────────
  { id: 'ignis',   nameEn: 'Ignis',   namePt: 'Fogo',      rarity: 'common',   category: 'element', description: 'O elemento primordial da destruição' },
  { id: 'glacies', nameEn: 'Glacies', namePt: 'Gelo',      rarity: 'common',   category: 'element', description: 'O frio que paralisa e retarda' },
  { id: 'vitae',   nameEn: 'Vitae',   namePt: 'Vida',      rarity: 'common',   category: 'element', description: 'A essência que restaura e sustenta' },
  { id: 'fulgur',  nameEn: 'Fulgur',  namePt: 'Relâmpago', rarity: 'common',   category: 'element', description: 'Energia que rasga o ar e acelera' },
  // ── Common forms ─────────────────────────────────────────────────────────
  { id: 'sagitta', nameEn: 'Sagitta', namePt: 'Flecha',    rarity: 'common',   category: 'form',    description: 'Projétil certeiro e veloz' },
  { id: 'manus',   nameEn: 'Manus',   namePt: 'Mão',       rarity: 'common',   category: 'form',    description: 'Toque direto com o poder concentrado' },
  { id: 'scutum',  nameEn: 'Scutum',  namePt: 'Escudo',    rarity: 'common',   category: 'form',    description: 'Proteção que envolve e defende' },
  { id: 'unda',    nameEn: 'Unda',    namePt: 'Onda',      rarity: 'common',   category: 'form',    description: 'Expansão radial que varre tudo' },
  // ── Uncommon elements ────────────────────────────────────────────────────
  { id: 'umbra',   nameEn: 'Umbra',   namePt: 'Sombra',    rarity: 'uncommon', category: 'element', description: 'A escuridão que drena e consome' },
  { id: 'lux',     nameEn: 'Lux',     namePt: 'Luz',       rarity: 'uncommon', category: 'element', description: 'Brilho que purifica e revela' },
  { id: 'toxicum', nameEn: 'Toxicum', namePt: 'Veneno',    rarity: 'uncommon', category: 'element', description: 'Corrupção lenta que debilita' },
  // ── Uncommon forms ───────────────────────────────────────────────────────
  { id: 'aura',    nameEn: 'Aura',    namePt: 'Aura',      rarity: 'uncommon', category: 'form',    description: 'Campo persistente que irradia poder' },
  { id: 'pluvia',  nameEn: 'Pluvia',  namePt: 'Chuva',     rarity: 'uncommon', category: 'form',    description: 'Múltiplos impactos concentrados' },
  // ── Rare elements ────────────────────────────────────────────────────────
  { id: 'tempus',  nameEn: 'Tempus',  namePt: 'Tempo',     rarity: 'rare',     category: 'element', description: 'O fluxo do inexorável manipulado' },
  { id: 'mortis',  nameEn: 'Mortis',  namePt: 'Morte',     rarity: 'rare',     category: 'element', description: 'Energia da extinção pura' },
  // ── Rare forms ───────────────────────────────────────────────────────────
  { id: 'vortex',  nameEn: 'Vortex',  namePt: 'Vórtice',   rarity: 'rare',     category: 'form',    description: 'Rotação que puxa, destrói e concentra' },
  { id: 'arcanum', nameEn: 'Arcanum', namePt: 'Arcano',    rarity: 'rare',     category: 'form',    description: 'Magia pura e instável amplificada' },
  // ── Epic elements ────────────────────────────────────────────────────────
  { id: 'caelum',  nameEn: 'Caelum',  namePt: 'Céu',       rarity: 'epic',     category: 'element', description: 'Poder divino emanado das alturas' },
  { id: 'abyssus', nameEn: 'Abyssus', namePt: 'Abismo',    rarity: 'epic',     category: 'element', description: 'Profundezas além da compreensão' },
  // ── Epic forms ───────────────────────────────────────────────────────────
  { id: 'fortis',  nameEn: 'Fortis',  namePt: 'Força',     rarity: 'epic',     category: 'form',    description: 'Potência máxima sem contenção' },
  { id: 'reformare', nameEn: 'Reformare', namePt: 'Reformar', rarity: 'epic',   category: 'form',    description: 'Reescreve a natureza elemental do corpo' },
  // ── Unique elements ──────────────────────────────────────────────────────
  { id: 'eternum', nameEn: 'Eternum', namePt: 'Eterno',    rarity: 'unique',   category: 'element', description: 'Além do tempo, da morte e da matéria' },
  // ── Unique forms ─────────────────────────────────────────────────────────
  { id: 'chaos',   nameEn: 'Chaos',   namePt: 'Caos',      rarity: 'unique',   category: 'form',    description: 'Efeito imprevisível e devastador' },
  { id: 'mutare',  nameEn: 'Mutare',  namePt: 'Mutar',     rarity: 'unique',   category: 'form',    description: 'Transforma a natureza do golpe' },
]

export const WORD_MAP = new Map(ALL_WORDS.map(w => [w.id, w]))

// Words that can be auto-unlocked by leveling / attributes (common + uncommon only)
// Ordered as they unlock: interleaved elements and forms so combos unlock early
export const LEARNABLE_WORDS: Word[] = [
  // level 1 slot → ignis
  WORD_MAP.get('ignis')!,
  // level 5 → sagitta  (first combo: ignis+sagitta = Flecha de Fogo)
  WORD_MAP.get('sagitta')!,
  // level 10 → glacies
  WORD_MAP.get('glacies')!,
  // level 15 → manus
  WORD_MAP.get('manus')!,
  // level 20 → vitae
  WORD_MAP.get('vitae')!,
  // level 25 → scutum
  WORD_MAP.get('scutum')!,
  // level 30 → fulgur
  WORD_MAP.get('fulgur')!,
  // level 35 → unda
  WORD_MAP.get('unda')!,
  // level 40+ or INT/WIS bonuses → uncommon words
  WORD_MAP.get('umbra')!,
  WORD_MAP.get('lux')!,
  WORD_MAP.get('toxicum')!,
  WORD_MAP.get('aura')!,
  WORD_MAP.get('pluvia')!,
]

// Rare+ words only come from drops or shop, not from leveling
export const DROP_WORDS: Word[] = ALL_WORDS.filter(
  w => w.rarity === 'rare' || w.rarity === 'epic' || w.rarity === 'unique'
)

/** How many auto-unlock slots the player has based on level + attributes */
export function getAutoWordSlots(level: number, inteligencia: number, sabedoria: number): number {
  const base    = Math.floor(level / 5) + 1
  const fromInt = Math.floor(inteligencia / 10)
  const fromWis = Math.floor(sabedoria / 10)
  return Math.min(base + fromInt + fromWis, LEARNABLE_WORDS.length)
}
