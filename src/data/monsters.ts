import type { MonsterTemplate } from '../types/monster'
import type { Biome } from '../types/map'

export const FOREST_MONSTERS: MonsterTemplate[] = [
  {
    id: 'goblin',
    namePt: 'Goblin',
    nameEn: 'Goblin',
    name: 'Goblin',
    emoji: '👺',
    basePoints: 5,
    pointsPerLevel: 4,
    // Fast and aggressive but fragile
    biomes: ['forest'],
    preferences: { forca: 4, vitalidade: 3, agilidade: 5, destreza: 3, inteligencia: 1, sabedoria: 1 },
    // Goblins are creatures of shadow — weak to divine light
    weakTo: ['lux'],
  },
  {
    id: 'wolf',
    namePt: 'Lobo',
    nameEn: 'Wolf',
    name: 'Lobo',
    emoji: '🐺',
    basePoints: 5,
    pointsPerLevel: 4,
    // Very fast, decent attack, low HP
    biomes: ['forest'],
    preferences: { forca: 4, vitalidade: 2, agilidade: 8, destreza: 5, inteligencia: 1, sabedoria: 1 },
    // Natural creature — weak to fire, resistant to cold (fur)
    weakTo: ['ignis'],
  },
  {
    id: 'slime',
    namePt: 'Slime',
    nameEn: 'Slime',
    name: 'Slime',
    emoji: '🫧',
    basePoints: 7,
    pointsPerLevel: 4,
    // Tanky but slippery — less raw HP, gains some speed, dodge and DR
    biomes: ['forest'],
    preferences: { forca: 2, vitalidade: 7, agilidade: 3, destreza: 2, inteligencia: 1, sabedoria: 1 },
    // Acidic gel — attacks poison; weak to lightning (electrolyte), immune to own venom
    element: 'toxicum',
    statusChance: 0.25,
    weakTo: ['fulgur'],
  },
  {
    id: 'bandit',
    namePt: 'Bandido',
    nameEn: 'Bandit',
    name: 'Bandido',
    emoji: '🗡️',
    basePoints: 5,
    pointsPerLevel: 4,
    // Hard-hitting, evasive, balanced
    biomes: ['forest'],
    preferences: { forca: 5, vitalidade: 3, agilidade: 3, destreza: 5, inteligencia: 1, sabedoria: 1 },
    // Creature of the underworld — weak to celestial/divine energy
    weakTo: ['caelum', 'lux'],
  },
  {
    id: 'giant_spider',
    namePt: 'Aranha Gigante',
    nameEn: 'Giant Spider',
    name: 'Aranha Gigante',
    emoji: '🕷️',
    basePoints: 5,
    pointsPerLevel: 4,
    // Fast and evasive, fragile — high dodge makes it annoying
    biomes: ['forest'],
    preferences: { forca: 2, vitalidade: 2, agilidade: 7, destreza: 7, inteligencia: 1, sabedoria: 1 },
    // Venomous bite — attacks poison; spiders hate fire
    element: 'toxicum',
    statusChance: 0.35,
    weakTo: ['ignis'],
  },
  {
    id: 'demon',
    namePt: 'Demon',
    nameEn: 'Demon',
    name: 'Demon',
    emoji: 'D',
    basePoints: 8,
    pointsPerLevel: 5,
    // Boss-type monster: brutal, sturdy and slightly magical, but not very evasive.
    biomes: [],
    preferences: { forca: 7, vitalidade: 6, agilidade: 2, destreza: 3, inteligencia: 4, sabedoria: 2 },
    element: 'ignis',
    statusChance: 0.22,
    weakTo: ['lux', 'caelum'],
  },
]

export function monstersForBiome(biome: Biome): MonsterTemplate[] {
  return FOREST_MONSTERS.filter(m => m.biomes.includes(biome))
}

export const FOREST_RANDOM_MONSTERS = monstersForBiome('forest')
export const FOREST_MONSTER_MAP = new Map(FOREST_MONSTERS.map(m => [m.id, m]))

export function monsterName(template: MonsterTemplate, isEn: boolean): string {
  return isEn ? template.nameEn : template.namePt
}

export function pickForestMonster(): MonsterTemplate {
  return FOREST_RANDOM_MONSTERS[Math.floor(Math.random() * FOREST_RANDOM_MONSTERS.length)]
}

export function pickMonsterForBiome(biome: Biome): MonsterTemplate {
  const candidates = monstersForBiome(biome)
  const pool = candidates.length > 0 ? candidates : FOREST_RANDOM_MONSTERS
  return pool[Math.floor(Math.random() * pool.length)]
}
