import type { DerivedStats } from './hero'
import type { ElementType } from './element'

export type SpellRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'unique'
export type WordCategory = 'element' | 'form'
export type SpellEffectType = 'damage' | 'heal' | 'buff' | 'debuff' | 'utility' | 'fizzle'

export interface Word {
  id: string
  nameEn: string    // arcane name shown prominently (e.g. "Ignis")
  namePt: string    // translation shown as subtitle (e.g. "Fogo")
  rarity: SpellRarity
  category: WordCategory
  description: string
}

export type BuffableStat = Pick<DerivedStats,
  | 'atk' | 'def' | 'attackSpeed' | 'dodgeChance' | 'magicDamage'
  | 'critChance' | 'critDamage' | 'damageReduction' | 'healBonus'
  | 'staminaRegen' | 'manaRegen'
  | 'vision' | 'moveSpeed' | 'dropChance' | 'xpBonus'
>

export interface SpellEffect {
  type: SpellEffectType
  // damage / heal
  base?: number
  scaling?: number          // multiplied by derivedStat below
  scalingStat?: 'magicDamage' | 'maxHp'
  lifesteal?: number        // fraction of damage healed
  chaos?: boolean           // ±50% random variance
  // buff (additive to player derived stats for `duration` seconds)
  statAdds?: Partial<Record<keyof BuffableStat, number>>
  /** Converts the caster's physical attacks into this elemental damage while active. */
  attackElement?: ElementType
  /** Turns the target into this elemental form while active. */
  elementalForm?: ElementType
  duration?: number
  // debuff (direct multipliers on enemy unit)
  enemyAtkMult?: number
  enemyAtkSpeedMult?: number
  debuffDuration?: number
  // out-of-combat tile actions
  tileAction?: 'create' | 'refresh'   // create = add tiles to deck; refresh = replace deck
  tileCount?:  number                  // how many tiles to create (default 2)
  // out-of-combat movement actions
  mapAction?: 'teleportExplored' | 'teleportBlueTower'
  teleportRadius?: number
}

export interface Spell {
  id: string
  name: string
  word1Id: string
  word2Id: string
  rarity: SpellRarity
  effect: SpellEffect
  manaCost: number
  cooldown: number    // seconds
  description: string
}

// Runtime active buff on the player
export interface ActiveBuff {
  spellId: string
  statAdds?: Partial<Record<keyof BuffableStat, number>>
  attackElement?: ElementType
  elementalForm?: ElementType
  remaining: number
  durationUnit?: 'turn' | 'battle'
}

export interface AutoCastConfig {
  enabled: boolean
  hpThreshold: number   // 0–1; for heal spells: only cast when HP% < this value
}

// Runtime active debuff on the current enemy
export interface ActiveDebuff {
  spellId: string
  atkMult: number
  atkSpeedMult: number
  remaining: number
  savedAtk: number        // original enemy.atk before debuff
  savedAtkSpeed: number   // original enemy.atkSpeed before debuff
}
