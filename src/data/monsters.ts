import type { MonsterTemplate } from '../types/monster'

export const FOREST_MONSTERS: MonsterTemplate[] = [
  {
    id: 'goblin',
    name: 'Goblin',
    emoji: '👺',
    basePoints: 5,
    pointsPerLevel: 5,
    // Fast and aggressive but fragile
    preferences: { forca: 4, vitalidade: 3, agilidade: 5, destreza: 3, inteligencia: 1, sabedoria: 1 },
  },
  {
    id: 'wolf',
    name: 'Lobo',
    emoji: '🐺',
    basePoints: 5,
    pointsPerLevel: 5,
    // Very fast, decent attack, low HP
    preferences: { forca: 4, vitalidade: 2, agilidade: 8, destreza: 5, inteligencia: 1, sabedoria: 1 },
  },
  {
    id: 'slime',
    name: 'Slime',
    emoji: '🫧',
    basePoints: 7,
    pointsPerLevel: 5,
    // Extremely tanky, very slow, weak attack
    preferences: { forca: 2, vitalidade: 10, agilidade: 1, destreza: 1, inteligencia: 1, sabedoria: 1 },
  },
  {
    id: 'bandit',
    name: 'Bandido',
    emoji: '🗡️',
    basePoints: 5,
    pointsPerLevel: 5,
    // Hard-hitting, evasive, balanced
    preferences: { forca: 5, vitalidade: 3, agilidade: 3, destreza: 5, inteligencia: 1, sabedoria: 1 },
  },
  {
    id: 'giant_spider',
    name: 'Aranha Gigante',
    emoji: '🕷️',
    basePoints: 5,
    pointsPerLevel: 5,
    // Fast and evasive, fragile — high dodge makes it annoying
    preferences: { forca: 2, vitalidade: 2, agilidade: 7, destreza: 7, inteligencia: 1, sabedoria: 1 },
  },
]

export const FOREST_MONSTER_MAP = new Map(FOREST_MONSTERS.map(m => [m.id, m]))

export function pickForestMonster(): MonsterTemplate {
  return FOREST_MONSTERS[Math.floor(Math.random() * FOREST_MONSTERS.length)]
}
