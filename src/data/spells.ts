import type { Spell } from '../types/spell'
import { WORD_MAP } from './words'

// ─── Element / form icons (keyed by spell ID) ─────────────────────────────────
export const SPELL_ICONS: Record<string, string> = {
  // damage
  ignis_sagitta:  '🔥',
  fulgur_sagitta: '⚡',
  fulgur_unda:    '🌩',
  glacies_sagitta:'❄',
  umbra_manus:    '🌑',
  toxicum_sagitta:'🧪',
  mortis_sagitta: '☠',
  arcanum_sagitta:'🔮',
  arcanum_vortex: '🔮',
  abyssus_pluvia: '🌀',
  caelum_fulgur:  '✨',
  chaos_sagitta:  '🎲',
  eternum_mortis: '💀',
  // damage — batch 2
  ignis_glacies:  '💨',
  fulgur_glacies: '⚡',
  vitae_mortis:   '🩸',
  fulgur_mortis:  '⚡',
  caelum_umbra:   '🌑',
  ignis_manus:    '🔥',
  glacies_unda:   '🌊',
  glacies_vortex: '🧊',
  fulgur_vortex:  '⚡',
  lux_sagitta:    '✨',
  sagitta_pluvia: '🏹',
  vitae_sagitta:  '💚',
  vitae_pluvia:   '🌱',
  ignis_scutum:   '🔥',
  vortex_fortis:  '🌪',
  mortis_manus:   '💀',
  tempus_vortex:  '⌛',
  // damage — batch 1
  ignis_unda:     '🌊',
  ignis_fulgur:   '⛈',
  ignis_lux:      '💥',
  fulgur_pluvia:  '⛈',
  toxicum_unda:   '☣',
  ignis_vortex:   '🌪',
  umbra_mortis:   '⚫',
  mortis_vortex:  '💀',
  abyssus_unda:   '🌊',
  caelum_abyssus: '🌌',
  caelum_mortis:  '⚖',
  // heal
  vitae_manus:    '💚',
  lux_unda:       '☀',
  vitae_aura:     '🌿',
  caelum_vitae:   '🌟',
  eternum_vitae:  '💎',
  // heal — new
  vitae_lux:      '✨',
  vitae_vortex:   '💖',
  // buff
  glacies_scutum: '🧊',
  vitae_scutum:   '🌱',
  fulgur_aura:    '⚡',
  lux_scutum:     '🔆',
  arcanum_aura:   '🔮',
  tempus_aura:    '⏳',
  fortis_scutum:  '🔰',
  caelum_scutum:  '⭐',
  eternum_scutum: '♾',
  // buff — new
  ignis_aura:     '🔥',
  umbra_scutum:   '🛡',
  tempus_scutum:  '⏰',
  lux_fortis:     '🌟',
  fulgur_fortis:  '⚡',
  // debuff
  glacies_manus:  '❄',
  umbra_unda:     '🌑',
  toxicum_aura:   '☠',
  mortis_aura:    '💀',
  tempus_manus:   '⌛',
  abyssus_manus:  '🌀',
  // debuff — new
  glacies_pluvia: '❄',
  toxicum_manus:  '☠',
  umbra_aura:     '🌑',
  // utility — new (tile/exploration)
  ignis_pluvia:   '🌧',
  arcanum_pluvia: '📜',
  glacies_arcanum:'🧊',
  tempus_arcanum: '⏳',
  lux_manus:      '👁',
  caelum_unda:    '🌊',
  // utility
  lux_aura:       '💡',
  tempus_unda:    '⏩',
  caelum_pluvia:  '🌧',
  abyssus_aura:   '🎁',
  eternum_lux:    '☀',
}

// 36 spells — all valid word combinations, grouped by effect type.
// Rarity = highest rarity of the two words combined.
// cooldown / duration / debuffDuration are in BATTLE TURNS.
export const ALL_SPELLS: Spell[] = [

  // ═══════════════════════════════════════════════════════════════
  // DAMAGE — offensive spells that deal magical damage to the enemy
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'ignis_sagitta', name: 'Flecha de Fogo',
    word1Id: 'ignis', word2Id: 'sagitta', rarity: 'common',
    manaCost: 13, cooldown: 3,
    effect: { type: 'damage', base: 8, scaling: 1.5, scalingStat: 'magicDamage' },
    description: 'Lança uma flecha ardente que causa dano de fogo.',
  },
  {
    id: 'fulgur_sagitta', name: 'Raio Focado',
    word1Id: 'fulgur', word2Id: 'sagitta', rarity: 'common',
    manaCost: 18, cooldown: 4,
    effect: { type: 'damage', base: 14, scaling: 2.2, scalingStat: 'magicDamage' },
    description: 'Concentra um raio em um ponto único, causando dano elevado.',
  },
  {
    id: 'fulgur_unda', name: 'Onda Elétrica',
    word1Id: 'fulgur', word2Id: 'unda', rarity: 'common',
    manaCost: 15, cooldown: 3,
    effect: { type: 'damage', base: 6, scaling: 1.2, scalingStat: 'magicDamage' },
    description: 'Emite uma onda de energia elétrica que varre o inimigo.',
  },
  {
    id: 'glacies_sagitta', name: 'Flecha de Gelo',
    word1Id: 'glacies', word2Id: 'sagitta', rarity: 'common',
    manaCost: 15, cooldown: 4,
    effect: {
      type: 'damage', base: 5, scaling: 1.0, scalingStat: 'magicDamage',
      enemyAtkSpeedMult: 0.78, debuffDuration: 3,
    },
    description: 'Dispara uma flecha de gelo que causa dano e retarda o inimigo por 3 turnos.',
  },
  {
    id: 'umbra_manus', name: 'Toque Sombrio',
    word1Id: 'umbra', word2Id: 'manus', rarity: 'uncommon',
    manaCost: 20, cooldown: 5,
    effect: { type: 'damage', base: 10, scaling: 1.5, scalingStat: 'magicDamage', lifesteal: 0.3 },
    description: 'Toca o inimigo com sombra, causando dano e restaurando 30% como HP.',
  },
  {
    id: 'toxicum_sagitta', name: 'Flecha Venenosa',
    word1Id: 'toxicum', word2Id: 'sagitta', rarity: 'uncommon',
    manaCost: 19, cooldown: 5,
    effect: {
      type: 'damage', base: 12, scaling: 1.5, scalingStat: 'magicDamage',
      enemyAtkMult: 0.85, debuffDuration: 4,
    },
    description: 'Envenena o inimigo ao acertar, reduzindo seu ATK por 4 turnos.',
  },
  {
    id: 'mortis_sagitta', name: 'Flecha da Morte',
    word1Id: 'mortis', word2Id: 'sagitta', rarity: 'rare',
    manaCost: 30, cooldown: 6,
    effect: { type: 'damage', base: 28, scaling: 3.2, scalingStat: 'magicDamage' },
    description: 'Uma flecha imbuída da essência da morte causa dano massivo.',
  },
  {
    id: 'arcanum_sagitta', name: 'Flecha Arcana',
    word1Id: 'arcanum', word2Id: 'sagitta', rarity: 'rare',
    manaCost: 32, cooldown: 7,
    effect: { type: 'damage', base: 22, scaling: 3.0, scalingStat: 'magicDamage' },
    description: 'Uma flecha de pura energia arcana perfura as defesas do inimigo.',
  },
  {
    id: 'arcanum_vortex', name: 'Vórtice Arcano',
    word1Id: 'arcanum', word2Id: 'vortex', rarity: 'rare',
    manaCost: 25, cooldown: 6,
    effect: { type: 'damage', base: 18, scaling: 2.5, scalingStat: 'magicDamage' },
    description: 'Cria um vórtice de magia pura que tritura o inimigo com energia arcana.',
  },
  {
    id: 'abyssus_pluvia', name: 'Chuva do Abismo',
    word1Id: 'abyssus', word2Id: 'pluvia', rarity: 'epic',
    manaCost: 44, cooldown: 14,
    effect: { type: 'damage', base: 38, scaling: 4.2, scalingStat: 'magicDamage' },
    description: 'Invoca uma chuva de energia do abismo sobre o inimigo.',
  },
  {
    id: 'caelum_fulgur', name: 'Raio Celestial',
    word1Id: 'caelum', word2Id: 'fulgur', rarity: 'epic',
    manaCost: 50, cooldown: 12,
    effect: { type: 'damage', base: 45, scaling: 4.8, scalingStat: 'magicDamage' },
    description: 'Um raio divino cai sobre o inimigo com poder celestial.',
  },
  {
    id: 'chaos_sagitta', name: 'Flecha do Caos',
    word1Id: 'chaos', word2Id: 'sagitta', rarity: 'unique',
    manaCost: 38, cooldown: 15,
    effect: { type: 'damage', base: 55, scaling: 6.0, scalingStat: 'magicDamage', chaos: true },
    description: 'Dispara uma flecha de caos puro com dano imprevisível (±50%).',
  },
  {
    id: 'eternum_mortis', name: 'Aniquilação',
    word1Id: 'eternum', word2Id: 'mortis', rarity: 'unique',
    manaCost: 75, cooldown: 18,
    effect: { type: 'damage', base: 100, scaling: 10.0, scalingStat: 'magicDamage' },
    description: 'Canaliza energia além da morte e do tempo em um golpe devastador.',
  },

  // ═══════════════════════════════════════════════════════════════
  // HEAL — restore the player's HP
  // ═══════════════════════════════════════════════════════════════

  // Heal spells scale with magicDamage (driven by Inteligência) instead of
  // maxHp. This means healing power requires BOTH Vitalidade (for a large HP
  // pool) AND Inteligência (to make heals big enough to matter), creating a
  // meaningful build decision instead of a free auto-win button.
  //
  // Reference values at 0 INT (magicDamage = 3):
  //   vitae_manus  → 15 + 1.8×3  = 20 HP   (base ~ 65 % of starting HP)
  //   lux_unda     → 22 + 2.8×3  = 30 HP
  //   vitae_aura   → 10 + 1.5×3  = 15 HP  + staminaRegen buff
  //   caelum_vitae → 40 + 5.0×3  = 55 HP  (needs 40 mana)
  //   eternum_vitae→ 65 + 8.0×3  = 89 HP  (needs 55 mana, CD 20)
  //
  // At 10 INT (magicDamage = 13):
  //   vitae_manus  → 15 + 1.8×13 = 38 HP
  //   lux_unda     → 22 + 2.8×13 = 58 HP
  {
    id: 'vitae_manus', name: 'Toque Vital',
    word1Id: 'vitae', word2Id: 'manus', rarity: 'common',
    manaCost: 15, cooldown: 4,
    effect: { type: 'heal', base: 15, scaling: 1.8, scalingStat: 'magicDamage' },
    description: 'Um toque gentil que canaliza energia vital para curar ferimentos.',
  },
  {
    id: 'lux_unda', name: 'Onda de Luz',
    word1Id: 'lux', word2Id: 'unda', rarity: 'uncommon',
    manaCost: 23, cooldown: 6,
    effect: { type: 'heal', base: 22, scaling: 2.8, scalingStat: 'magicDamage' },
    description: 'Uma onda de luz pura limpa ferimentos e restaura vitalidade.',
  },
  {
    id: 'vitae_aura', name: 'Aura Vital',
    word1Id: 'vitae', word2Id: 'aura', rarity: 'uncommon',
    manaCost: 20, cooldown: 6,
    effect: {
      type: 'heal', base: 10, scaling: 1.5, scalingStat: 'magicDamage',
      statAdds: { staminaRegen: 3 }, duration: 8,
    },
    description: 'Cura e gera uma aura que aumenta a regeneração de stamina por 8 turnos.',
  },
  {
    id: 'caelum_vitae', name: 'Graça Celestial',
    word1Id: 'caelum', word2Id: 'vitae', rarity: 'epic',
    manaCost: 50, cooldown: 12,
    effect: { type: 'heal', base: 40, scaling: 5.0, scalingStat: 'magicDamage' },
    description: 'Bênção divina restaura grandes quantidades de HP.',
  },
  {
    id: 'eternum_vitae', name: 'Vida Eterna',
    word1Id: 'eternum', word2Id: 'vitae', rarity: 'unique',
    manaCost: 69, cooldown: 20,
    effect: { type: 'heal', base: 65, scaling: 8.0, scalingStat: 'magicDamage' },
    description: 'A magia da eternidade tece vitalidade para além dos limites.',
  },

  // ═══════════════════════════════════════════════════════════════
  // BUFF — temporary stat boosts on the player
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'glacies_scutum', name: 'Escudo de Gelo',
    word1Id: 'glacies', word2Id: 'scutum', rarity: 'common',
    manaCost: 13, cooldown: 5,
    effect: { type: 'buff', statAdds: { def: 8 }, duration: 6 },
    description: 'Cria uma armadura de gelo que aumenta a defesa em 8 por 6 turnos.',
  },
  {
    id: 'vitae_scutum', name: 'Barreira Vital',
    word1Id: 'vitae', word2Id: 'scutum', rarity: 'common',
    manaCost: 13, cooldown: 12,
    effect: { type: 'buff', statAdds: { staminaRegen: 4 }, duration: 15 },
    description: 'Barreira de energia vital aumenta a regeneração de stamina por 15 turnos.',
  },
  {
    id: 'fulgur_aura', name: 'Aura Elétrica',
    word1Id: 'fulgur', word2Id: 'aura', rarity: 'uncommon',
    manaCost: 19, cooldown: 7,
    effect: { type: 'buff', statAdds: { attackSpeed: 0.35 }, duration: 8 },
    description: 'Imbuído de relâmpago, aumenta a velocidade de ataque em 0.35 por 8 turnos.',
  },
  {
    id: 'lux_scutum', name: 'Escudo de Luz',
    word1Id: 'lux', word2Id: 'scutum', rarity: 'uncommon',
    manaCost: 18, cooldown: 6,
    effect: { type: 'buff', statAdds: { def: 6, dodgeChance: 0.04 }, duration: 7 },
    description: 'Escudo de luz pura aumenta defesa e chance de esquiva por 7 turnos.',
  },
  {
    id: 'arcanum_aura', name: 'Aura Arcana',
    word1Id: 'arcanum', word2Id: 'aura', rarity: 'rare',
    manaCost: 25, cooldown: 8,
    effect: { type: 'buff', statAdds: { magicDamage: 12 }, duration: 9 },
    description: 'Aura de magia pura amplifica o dano mágico em 12 por 9 turnos.',
  },
  {
    id: 'tempus_aura', name: 'Aura Temporal',
    word1Id: 'tempus', word2Id: 'aura', rarity: 'rare',
    manaCost: 28, cooldown: 10,
    effect: { type: 'buff', statAdds: { attackSpeed: 0.5, dodgeChance: 0.08 }, duration: 6 },
    description: 'Manipula o tempo ao redor, aumentando velocidade de ataque e esquiva por 6 turnos.',
  },
  {
    id: 'fortis_scutum', name: 'Escudo Robusto',
    word1Id: 'fortis', word2Id: 'scutum', rarity: 'epic',
    manaCost: 35, cooldown: 12,
    effect: { type: 'buff', statAdds: { def: 22 }, duration: 10 },
    description: 'Escudo de força pura aumenta a defesa em 22 por 10 turnos.',
  },
  {
    id: 'caelum_scutum', name: 'Escudo Celestial',
    word1Id: 'caelum', word2Id: 'scutum', rarity: 'epic',
    manaCost: 40, cooldown: 14,
    effect: { type: 'buff', statAdds: { def: 28, magicDamage: 8 }, duration: 8 },
    description: 'Proteção divina confere defesa e poder mágico por 8 turnos.',
  },
  {
    id: 'eternum_scutum', name: 'Égide Eterna',
    word1Id: 'eternum', word2Id: 'scutum', rarity: 'unique',
    manaCost: 63, cooldown: 20,
    effect: { type: 'buff', statAdds: { def: 38, attackSpeed: 0.5, dodgeChance: 0.12 }, duration: 10 },
    description: 'Proteção além do tempo e do espaço — defesa, velocidade e esquiva por 10 turnos.',
  },

  // ═══════════════════════════════════════════════════════════════
  // DEBUFF — weaken the current enemy
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'glacies_manus', name: 'Toque Glacial',
    word1Id: 'glacies', word2Id: 'manus', rarity: 'common',
    manaCost: 13, cooldown: 4,
    effect: { type: 'debuff', enemyAtkSpeedMult: 0.72, debuffDuration: 4 },
    description: 'Congela o inimigo ao toque, reduzindo sua velocidade de ataque por 4 turnos.',
  },
  {
    id: 'umbra_unda', name: 'Onda Sombria',
    word1Id: 'umbra', word2Id: 'unda', rarity: 'uncommon',
    manaCost: 19, cooldown: 6,
    effect: { type: 'debuff', enemyAtkMult: 0.72, debuffDuration: 5 },
    description: 'Uma onda de sombra corrói o poder do inimigo, reduzindo seu ATK por 5 turnos.',
  },
  {
    id: 'toxicum_aura', name: 'Aura Venenosa',
    word1Id: 'toxicum', word2Id: 'aura', rarity: 'uncommon',
    manaCost: 19, cooldown: 6,
    effect: { type: 'debuff', enemyAtkMult: 0.82, enemyAtkSpeedMult: 0.82, debuffDuration: 6 },
    description: 'Aura de veneno debilita o inimigo, reduzindo ATK e velocidade por 6 turnos.',
  },
  {
    id: 'mortis_aura', name: 'Aura da Morte',
    word1Id: 'mortis', word2Id: 'aura', rarity: 'rare',
    manaCost: 28, cooldown: 8,
    effect: { type: 'debuff', enemyAtkMult: 0.62, enemyAtkSpeedMult: 0.68, debuffDuration: 6 },
    description: 'Aura mortal envolve o inimigo, debilitando drasticamente sua ofensiva por 6 turnos.',
  },
  {
    id: 'tempus_manus', name: 'Toque do Tempo',
    word1Id: 'tempus', word2Id: 'manus', rarity: 'rare',
    manaCost: 28, cooldown: 8,
    effect: { type: 'debuff', enemyAtkSpeedMult: 0.45, debuffDuration: 8 },
    description: 'Distorce o tempo ao redor do inimigo, reduzindo severamente sua velocidade por 8 turnos.',
  },
  {
    id: 'abyssus_manus', name: 'Mão do Abismo',
    word1Id: 'abyssus', word2Id: 'manus', rarity: 'epic',
    manaCost: 40, cooldown: 16,
    effect: { type: 'debuff', enemyAtkMult: 0.50, enemyAtkSpeedMult: 0.58, debuffDuration: 8 },
    description: 'A mão do abismo esmaga o inimigo — ATK e velocidade drasticamente reduzidos por 8 turnos.',
  },

  // ═══════════════════════════════════════════════════════════════
  // UTILITY — exploration & out-of-battle boosts (existing)
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'lux_aura', name: 'Iluminar',
    word1Id: 'lux', word2Id: 'aura', rarity: 'uncommon',
    manaCost: 10, cooldown: 15,
    effect: { type: 'utility', statAdds: { vision: 60 }, duration: 50 },
    description: 'Emana luz que aumenta a visão de exploração em 60 por 50 turnos.',
  },
  {
    id: 'tempus_unda', name: 'Onda Temporal',
    word1Id: 'tempus', word2Id: 'unda', rarity: 'rare',
    manaCost: 19, cooldown: 20,
    effect: { type: 'utility', statAdds: { moveSpeed: 0.45 }, duration: 30 },
    description: 'Expande o tempo ao redor, aumentando a velocidade de movimento por 30 turnos.',
  },
  {
    id: 'caelum_pluvia', name: 'Bênção das Alturas',
    word1Id: 'caelum', word2Id: 'pluvia', rarity: 'epic',
    manaCost: 28, cooldown: 40,
    effect: { type: 'utility', statAdds: { xpBonus: 0.5 }, duration: 50 },
    description: 'Bênção celestial aumenta o bônus de XP ganho em 50% por 50 turnos.',
  },
  {
    id: 'abyssus_aura', name: 'Aura do Abismo',
    word1Id: 'abyssus', word2Id: 'aura', rarity: 'epic',
    manaCost: 28, cooldown: 40,
    effect: { type: 'utility', statAdds: { dropChance: 0.06 }, duration: 50 },
    description: 'Aura de abismo atrai itens raros, aumentando a chance de drop por 50 turnos.',
  },
  {
    id: 'eternum_lux', name: 'Claridade Eterna',
    word1Id: 'eternum', word2Id: 'lux', rarity: 'unique',
    manaCost: 44, cooldown: 60,
    effect: { type: 'utility', statAdds: { vision: 120, xpBonus: 0.35 }, duration: 100 },
    description: 'Claridade além da compreensão — visão e XP ampliados por 100 turnos.',
  },

  // ═══════════════════════════════════════════════════════════════
  // UTILITY — exploração e gerenciamento de tiles (novos)
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'lux_manus', name: 'Olho do Mago',
    word1Id: 'lux', word2Id: 'manus', rarity: 'uncommon',
    manaCost: 18, cooldown: 15,
    effect: { type: 'utility', statAdds: { vision: 90 }, duration: 40 },
    description: 'Toque de luz amplia drasticamente a visão do mago por 40 turnos.',
  },
  {
    id: 'caelum_unda', name: 'Maré Celestial',
    word1Id: 'caelum', word2Id: 'unda', rarity: 'epic',
    manaCost: 46, cooldown: 25,
    effect: { type: 'utility', statAdds: { moveSpeed: 0.80, vision: 40 }, duration: 50 },
    description: 'Uma onda celestial impulsiona o herói — velocidade de movimento e visão ampliadas por 50 turnos.',
  },
  {
    id: 'ignis_pluvia', name: 'Chispa Arcana',
    word1Id: 'ignis', word2Id: 'pluvia', rarity: 'uncommon',
    manaCost: 22, cooldown: 20,
    effect: { type: 'utility', tileAction: 'create', tileCount: 2 },
    description: 'Chamas e chuva reagem criando energia — gera 2 tiles novos no deck no nível do herói.',
  },
  {
    id: 'arcanum_pluvia', name: 'Chuva Arcana',
    word1Id: 'arcanum', word2Id: 'pluvia', rarity: 'rare',
    manaCost: 38, cooldown: 28,
    effect: { type: 'utility', tileAction: 'create', tileCount: 4 },
    description: 'Magia arcana precipita energia em forma de tiles — gera 4 tiles no deck no nível do herói.',
  },
  {
    id: 'glacies_arcanum', name: 'Purificação Glacial',
    word1Id: 'glacies', word2Id: 'arcanum', rarity: 'rare',
    manaCost: 35, cooldown: 30,
    effect: { type: 'utility', tileAction: 'refresh', tileCount: 3 },
    description: 'Gelo arcano congela e descarta os 3 tiles mais altos do deck, substituindo por 3 novos no nível do herói.',
  },
  {
    id: 'tempus_arcanum', name: 'Reinício Temporal',
    word1Id: 'tempus', word2Id: 'arcanum', rarity: 'rare',
    manaCost: 44, cooldown: 40,
    effect: { type: 'utility', tileAction: 'refresh', tileCount: 8 },
    description: 'O tempo arcano descarta todo o deck e gera um conjunto completamente novo no nível do herói.',
  },

  // ═══════════════════════════════════════════════════════════════
  // DAMAGE — lote 2 (elemento+elemento + formas clássicas)
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'ignis_glacies', name: 'Explosão de Vapor',
    word1Id: 'ignis', word2Id: 'glacies', rarity: 'common',
    manaCost: 18, cooldown: 4,
    effect: { type: 'damage', base: 10, scaling: 1.6, scalingStat: 'magicDamage',
      enemyAtkSpeedMult: 0.82, debuffDuration: 2 },
    description: 'Fogo e gelo colidem em uma explosão de vapor — dano e lentidão breve.',
  },
  {
    id: 'fulgur_glacies', name: 'Choque Glacial',
    word1Id: 'fulgur', word2Id: 'glacies', rarity: 'common',
    manaCost: 20, cooldown: 5,
    effect: { type: 'damage', base: 12, scaling: 1.8, scalingStat: 'magicDamage',
      enemyAtkSpeedMult: 0.70, debuffDuration: 3 },
    description: 'Relâmpago congela o inimigo em pleno movimento — dano e lentidão severa.',
  },
  {
    id: 'vitae_mortis', name: 'Dreno de Vida',
    word1Id: 'vitae', word2Id: 'mortis', rarity: 'rare',
    manaCost: 35, cooldown: 8,
    effect: { type: 'damage', base: 18, scaling: 2.2, scalingStat: 'magicDamage', lifesteal: 0.60 },
    description: 'A força vital flui do inimigo para o herói — causa dano e drena 60% como HP.',
  },
  {
    id: 'fulgur_mortis', name: 'Raio Letal',
    word1Id: 'fulgur', word2Id: 'mortis', rarity: 'rare',
    manaCost: 38, cooldown: 8,
    effect: { type: 'damage', base: 25, scaling: 3.2, scalingStat: 'magicDamage',
      enemyAtkSpeedMult: 0.72, debuffDuration: 4 },
    description: 'Raio imbuído de energia mortal — dano alto e paralisa parcialmente o inimigo.',
  },
  {
    id: 'caelum_umbra', name: 'Eclipse',
    word1Id: 'caelum', word2Id: 'umbra', rarity: 'epic',
    manaCost: 58, cooldown: 12,
    effect: { type: 'damage', base: 35, scaling: 4.0, scalingStat: 'magicDamage',
      enemyAtkMult: 0.65, enemyAtkSpeedMult: 0.65, debuffDuration: 6 },
    description: 'Céu e sombra se unem num eclipse — dano massivo e enfraquecimento prolongado.',
  },
  {
    id: 'ignis_manus', name: 'Golpe de Fogo',
    word1Id: 'ignis', word2Id: 'manus', rarity: 'common',
    manaCost: 15, cooldown: 4,
    effect: { type: 'damage', base: 8, scaling: 1.3, scalingStat: 'magicDamage', lifesteal: 0.25 },
    description: 'Soco imbuído de fogo — queima o inimigo e restaura 25% do dano como HP.',
  },
  {
    id: 'glacies_unda', name: 'Onda Gélida',
    word1Id: 'glacies', word2Id: 'unda', rarity: 'common',
    manaCost: 16, cooldown: 4,
    effect: { type: 'damage', base: 7, scaling: 1.2, scalingStat: 'magicDamage',
      enemyAtkSpeedMult: 0.75, debuffDuration: 4 },
    description: 'Onda de gelo arrasta e congela o inimigo, reduzindo sua velocidade por 4 turnos.',
  },
  {
    id: 'glacies_vortex', name: 'Vórtice de Gelo',
    word1Id: 'glacies', word2Id: 'vortex', rarity: 'rare',
    manaCost: 36, cooldown: 9,
    effect: { type: 'damage', base: 22, scaling: 2.8, scalingStat: 'magicDamage',
      enemyAtkSpeedMult: 0.55, enemyAtkMult: 0.88, debuffDuration: 5 },
    description: 'Redemoinho de gelo esmaga e paralisa o inimigo com força esmagadora.',
  },
  {
    id: 'fulgur_vortex', name: 'Vórtice Elétrico',
    word1Id: 'fulgur', word2Id: 'vortex', rarity: 'rare',
    manaCost: 38, cooldown: 8,
    effect: { type: 'damage', base: 24, scaling: 3.2, scalingStat: 'magicDamage',
      enemyAtkSpeedMult: 0.68, enemyAtkMult: 0.88, debuffDuration: 4 },
    description: 'Tornado elétrico — dano massivo e reduz o poder ofensivo do inimigo.',
  },
  {
    id: 'lux_sagitta', name: 'Flecha Sagrada',
    word1Id: 'lux', word2Id: 'sagitta', rarity: 'uncommon',
    manaCost: 25, cooldown: 5,
    effect: { type: 'damage', base: 16, scaling: 2.2, scalingStat: 'magicDamage' },
    description: 'Flecha de luz sagrada que perfura com precisão e brilho divinos.',
  },
  {
    id: 'sagitta_pluvia', name: 'Chuva de Flechas',
    word1Id: 'sagitta', word2Id: 'pluvia', rarity: 'uncommon',
    manaCost: 22, cooldown: 5,
    effect: { type: 'damage', base: 9, scaling: 1.5, scalingStat: 'magicDamage',
      enemyAtkMult: 0.90, debuffDuration: 3 },
    description: 'Rajada de projéteis cobre o inimigo, causando dano e reduzindo levemente sua força.',
  },

  // HEAL — lote 2

  {
    id: 'vitae_sagitta', name: 'Flecha Vital',
    word1Id: 'vitae', word2Id: 'sagitta', rarity: 'common',
    manaCost: 14, cooldown: 4,
    effect: { type: 'heal', base: 12, scaling: 1.4, scalingStat: 'magicDamage' },
    description: 'Flecha de energia vital se incorpora ao herói, restaurando ferimentos.',
  },
  {
    id: 'vitae_pluvia', name: 'Chuva Vital',
    word1Id: 'vitae', word2Id: 'pluvia', rarity: 'uncommon',
    manaCost: 25, cooldown: 7,
    effect: { type: 'heal', base: 18, scaling: 2.2, scalingStat: 'magicDamage',
      statAdds: { healBonus: 0.20 }, duration: 8 },
    description: 'Chuva de energia vital cura e amplifica a efetividade das curas por 8 turnos.',
  },

  // BUFF — lote 2

  {
    id: 'ignis_scutum', name: 'Escudo de Chamas',
    word1Id: 'ignis', word2Id: 'scutum', rarity: 'common',
    manaCost: 16, cooldown: 8,
    effect: { type: 'buff', statAdds: { atk: 5, damageReduction: 0.06 }, duration: 9 },
    description: 'Chamas envolvem o herói como escudo — aumenta ataque e reduz dano recebido por 9 turnos.',
  },
  {
    id: 'vortex_fortis', name: 'Turbilhão Supremo',
    word1Id: 'vortex', word2Id: 'fortis', rarity: 'epic',
    manaCost: 46, cooldown: 12,
    effect: { type: 'buff', statAdds: { atk: 10, attackSpeed: 0.40, critChance: 0.05 }, duration: 7 },
    description: 'Turbilhão de força pura — amplifica ataque, velocidade e chance de crítico por 7 turnos.',
  },

  // DEBUFF — lote 2

  {
    id: 'mortis_manus', name: 'Mão da Morte',
    word1Id: 'mortis', word2Id: 'manus', rarity: 'rare',
    manaCost: 38, cooldown: 10,
    effect: { type: 'debuff', enemyAtkMult: 0.50, enemyAtkSpeedMult: 0.58, debuffDuration: 7 },
    description: 'O toque da morte drena as forças do inimigo — ATK e velocidade severamente reduzidos.',
  },
  {
    id: 'tempus_vortex', name: 'Vórtice Temporal',
    word1Id: 'tempus', word2Id: 'vortex', rarity: 'rare',
    manaCost: 42, cooldown: 12,
    effect: { type: 'debuff', enemyAtkSpeedMult: 0.38, debuffDuration: 8 },
    description: 'Tempo manipulado ao redor do inimigo congela quase por completo sua velocidade por 8 turnos.',
  },

  // ═══════════════════════════════════════════════════════════════
  // DAMAGE — lote 1 (combinações elemento+elemento e elemento+forma)
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'ignis_unda', name: 'Onda de Fogo',
    word1Id: 'ignis', word2Id: 'unda', rarity: 'common',
    manaCost: 16, cooldown: 4,
    effect: { type: 'damage', base: 9, scaling: 1.4, scalingStat: 'magicDamage' },
    description: 'Uma onda rasteira de chamas que varre o inimigo.',
  },
  {
    id: 'ignis_fulgur', name: 'Tempestade Ígnea',
    word1Id: 'ignis', word2Id: 'fulgur', rarity: 'common',
    manaCost: 22, cooldown: 5,
    effect: { type: 'damage', base: 13, scaling: 2.0, scalingStat: 'magicDamage' },
    description: 'Fogo e relâmpago colidem em uma descarga explosiva.',
  },
  {
    id: 'ignis_lux', name: 'Explosão Solar',
    word1Id: 'ignis', word2Id: 'lux', rarity: 'uncommon',
    manaCost: 28, cooldown: 6,
    effect: { type: 'damage', base: 18, scaling: 2.5, scalingStat: 'magicDamage' },
    description: 'Uma explosão de luz e fogo que queima e encandeia.',
  },
  {
    id: 'fulgur_pluvia', name: 'Chuva Elétrica',
    word1Id: 'fulgur', word2Id: 'pluvia', rarity: 'uncommon',
    manaCost: 24, cooldown: 5,
    effect: {
      type: 'damage', base: 10, scaling: 1.6, scalingStat: 'magicDamage',
      enemyAtkSpeedMult: 0.80, debuffDuration: 3,
    },
    description: 'Chuva de relâmpagos causa dano e retarda o inimigo por 3 turnos.',
  },
  {
    id: 'toxicum_unda', name: 'Onda Venenosa',
    word1Id: 'toxicum', word2Id: 'unda', rarity: 'uncommon',
    manaCost: 25, cooldown: 6,
    effect: {
      type: 'damage', base: 12, scaling: 1.8, scalingStat: 'magicDamage',
      enemyAtkMult: 0.82, debuffDuration: 4,
    },
    description: 'Uma onda de veneno que envenena e enfraquece o inimigo por 4 turnos.',
  },
  {
    id: 'ignis_vortex', name: 'Vórtice de Fogo',
    word1Id: 'ignis', word2Id: 'vortex', rarity: 'rare',
    manaCost: 35, cooldown: 8,
    effect: {
      type: 'damage', base: 22, scaling: 3.0, scalingStat: 'magicDamage',
      enemyAtkMult: 0.85, debuffDuration: 4,
    },
    description: 'Um furacão de chamas que esmaga e intimida o inimigo.',
  },
  {
    id: 'umbra_mortis', name: 'Toque do Vazio',
    word1Id: 'umbra', word2Id: 'mortis', rarity: 'rare',
    manaCost: 40, cooldown: 8,
    effect: { type: 'damage', base: 28, scaling: 3.5, scalingStat: 'magicDamage', lifesteal: 0.5 },
    description: 'Sombra e morte se unem: causa dano massivo e drena 50% como HP.',
  },
  {
    id: 'mortis_vortex', name: 'Vórtice Mortal',
    word1Id: 'mortis', word2Id: 'vortex', rarity: 'rare',
    manaCost: 48, cooldown: 9,
    effect: { type: 'damage', base: 38, scaling: 4.2, scalingStat: 'magicDamage' },
    description: 'Um redemoinho de energia mortal devasta tudo em seu caminho.',
  },
  {
    id: 'abyssus_unda', name: 'Onda Abissal',
    word1Id: 'abyssus', word2Id: 'unda', rarity: 'epic',
    manaCost: 56, cooldown: 15,
    effect: { type: 'damage', base: 45, scaling: 5.0, scalingStat: 'magicDamage' },
    description: 'Uma onda do abismo carregada com energia inimaginável.',
  },
  {
    id: 'caelum_abyssus', name: 'Colapso Cósmico',
    word1Id: 'caelum', word2Id: 'abyssus', rarity: 'epic',
    manaCost: 70, cooldown: 15,
    effect: { type: 'damage', base: 60, scaling: 7.0, scalingStat: 'magicDamage' },
    description: 'Céu e abismo colidem em uma explosão de proporções cósmicas.',
  },
  {
    id: 'caelum_mortis', name: 'Julgamento Divino',
    word1Id: 'caelum', word2Id: 'mortis', rarity: 'epic',
    manaCost: 63, cooldown: 13,
    effect: {
      type: 'damage', base: 48, scaling: 5.5, scalingStat: 'magicDamage',
      enemyAtkMult: 0.55, enemyAtkSpeedMult: 0.65, debuffDuration: 7,
    },
    description: 'Poder celestial condena o inimigo: dano massivo e enfraquecimento severo por 7 turnos.',
  },

  // ═══════════════════════════════════════════════════════════════
  // HEAL — novos
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'vitae_lux', name: 'Cura Divina',
    word1Id: 'vitae', word2Id: 'lux', rarity: 'uncommon',
    manaCost: 29, cooldown: 7,
    effect: { type: 'heal', base: 25, scaling: 3.2, scalingStat: 'magicDamage' },
    description: 'Luz e vida combinadas em uma cura pura e poderosa.',
  },
  {
    id: 'vitae_vortex', name: 'Vórtice da Vida',
    word1Id: 'vitae', word2Id: 'vortex', rarity: 'rare',
    manaCost: 44, cooldown: 10,
    effect: { type: 'heal', base: 35, scaling: 4.5, scalingStat: 'magicDamage' },
    description: 'Um vórtice de energia vital restaura ferimentos profundos.',
  },

  // ═══════════════════════════════════════════════════════════════
  // BUFF — novos
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'ignis_aura', name: 'Aura Ardente',
    word1Id: 'ignis', word2Id: 'aura', rarity: 'uncommon',
    manaCost: 24, cooldown: 9,
    effect: { type: 'buff', statAdds: { magicDamage: 8, atk: 4 }, duration: 10 },
    description: 'Aura de fogo amplifica dano físico e mágico por 10 turnos.',
  },
  {
    id: 'umbra_scutum', name: 'Escudo Sombrio',
    word1Id: 'umbra', word2Id: 'scutum', rarity: 'uncommon',
    manaCost: 20, cooldown: 8,
    effect: { type: 'buff', statAdds: { damageReduction: 0.10, dodgeChance: 0.04 }, duration: 8 },
    description: 'Sombras envolvem o herói, reduzindo danos recebidos e aumentando esquiva por 8 turnos.',
  },
  {
    id: 'tempus_scutum', name: 'Escudo Temporal',
    word1Id: 'tempus', word2Id: 'scutum', rarity: 'rare',
    manaCost: 38, cooldown: 12,
    effect: { type: 'buff', statAdds: { def: 15, damageReduction: 0.08 }, duration: 9 },
    description: 'O tempo congela ao redor do herói, criando uma barreira impenetrável por 9 turnos.',
  },
  {
    id: 'lux_fortis', name: 'Bênção do Guerreiro',
    word1Id: 'lux', word2Id: 'fortis', rarity: 'epic',
    manaCost: 48, cooldown: 12,
    effect: { type: 'buff', statAdds: { atk: 15, critDamage: 0.30 }, duration: 8 },
    description: 'Bênção divina empodera o herói com força e dano crítico devastadores por 8 turnos.',
  },
  {
    id: 'fulgur_fortis', name: 'Surto Elétrico',
    word1Id: 'fulgur', word2Id: 'fortis', rarity: 'epic',
    manaCost: 44, cooldown: 11,
    effect: { type: 'buff', statAdds: { attackSpeed: 0.65, critChance: 0.08 }, duration: 7 },
    description: 'Energia elétrica acelera os reflexos e aumenta chance de crítico por 7 turnos.',
  },

  // ═══════════════════════════════════════════════════════════════
  // DEBUFF — novos
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'glacies_pluvia', name: 'Chuva Gélida',
    word1Id: 'glacies', word2Id: 'pluvia', rarity: 'uncommon',
    manaCost: 25, cooldown: 7,
    effect: { type: 'debuff', enemyAtkSpeedMult: 0.60, enemyAtkMult: 0.90, debuffDuration: 6 },
    description: 'Chuva de gelo paralisa o inimigo, reduzindo drasticamente sua velocidade por 6 turnos.',
  },
  {
    id: 'toxicum_manus', name: 'Toque Venenoso',
    word1Id: 'toxicum', word2Id: 'manus', rarity: 'uncommon',
    manaCost: 23, cooldown: 7,
    effect: { type: 'debuff', enemyAtkMult: 0.70, enemyAtkSpeedMult: 0.85, debuffDuration: 6 },
    description: 'Veneno injetado pelo toque corrói a força e os reflexos do inimigo por 6 turnos.',
  },
  {
    id: 'umbra_aura', name: 'Aura Sombria',
    word1Id: 'umbra', word2Id: 'aura', rarity: 'uncommon',
    manaCost: 26, cooldown: 10,
    effect: { type: 'debuff', enemyAtkMult: 0.75, enemyAtkSpeedMult: 0.75, debuffDuration: 8 },
    description: 'Aura de sombras drena as forças do inimigo de forma persistente por 8 turnos.',
  },
]

export const SPELL_MAP = new Map(ALL_SPELLS.map(s => [s.id, s]))

// ─── Per-word icons (used as icon fallback for generated spells) ──────────────
export const WORD_ICONS: Record<string, string> = {
  ignis:   '🔥', glacies: '❄️', vitae:   '💚', fulgur:  '⚡',
  umbra:   '🌑', lux:     '☀️', toxicum: '🧪', tempus:  '⏳',
  mortis:  '☠️', caelum:  '✨', abyssus: '🌀', eternum: '♾️',
  sagitta: '🏹', manus:   '🤚', scutum:  '🛡️', unda:    '🌊',
  aura:    '🌟', pluvia:  '🌧️', vortex:  '🌪️', arcanum: '📜',
  fortis:  '💪', chaos:   '🎲',
}

// ─── Fallback spell generator ─────────────────────────────────────────────────

/** Deterministic hash for a word pair (order-independent) */
function hashPair(a: string, b: string): number {
  const s = [a, b].sort().join('|')
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

// Hand-crafted descriptions for notable / funny combos.
// Key = canonical sorted pair joined with '|'.
const SPECIFIC_DESC: Record<string, [string, string]> = {
  // Element vs element — classic opposites and absurd interactions
  'glacies|ignis':   ['Fogo e Gelo',         'Fogo e gelo se cancelam mutuamente. O resultado é uma brisa morna e levemente insatisfatória.'],
  'lux|umbra':       ['Luz e Sombra',         'Luz e sombra se anulam. Uma mancha cinza paira no ar por um momento e ninguém nota.'],
  'mortis|vitae':    ['Vida e Morte',         'Um zumbi temporário materializa, percebe que não tem nada a fazer e desaparece sem drama.'],
  'abyssus|caelum':  ['Céu e Abismo',         'Você cria um portal grandioso. Ele vai do chão ao teto da mesma sala. Inútil, mas impressionante.'],
  'chaos|eternum':   ['Eterno Caos',          'Nada e tudo acontecem simultaneamente. Tecnicamente é magia. Praticamente é nada.'],
  'eternum|tempus':  ['Tempo Eterno',         'Você envelhece e rejuvenesce em 0.3 segundos. Líquido: zero. O universo não percebe.'],
  'fulgur|ignis':    ['Fogo e Raio',          'Fogo e relâmpago explodem na sua mão. Você perde as sobrancelhas até o próximo turno.'],
  'ignis|lux':       ['Chama Luminosa',       'Fogo já é luminoso. Acrescentar mais luz resulta em cegueira momentânea. Lado errado.'],
  'ignis|umbra':     ['Chama das Sombras',    'O fogo ilumina a sombra. A sombra apaga o fogo. Empate técnico eterno.'],
  'ignis|mortis':    ['Chama Mortal',         'As chamas morrem antes de causar dano. Ironicamente, a morte as mata primeiro.'],
  'glacies|vitae':   ['Gelo Vivo',            'Um cubo de gelo com musgo aparece. Tecnicamente vida. Tecnicamente inútil.'],
  'fulgur|glacies':  ['Raio Congelante',      'A eletricidade congela antes de atingir o alvo. A física ficou confusa.'],
  'fulgur|lux':      ['Raio de Luz',          'Duplamente brilhante. Cega você por um instante. Escolheu o alvo errado.'],
  'fulgur|mortis':   ['Raio Mortal',          'Mata todas as bactérias no raio de 1 metro. Tecnicamente letal para algo.'],
  'fulgur|eternum':  ['Raio Eterno',          'Existe em algum lugar do cosmos, nunca para, nunca acerta nada.'],
  'lux|toxicum':     ['Luz Venenosa',         'Ilumina o veneno para que você o veja com clareza antes de pisar.'],
  'lux|tempus':      ['Luz do Passado',       'Você vê estrelas que já morreram há milênios. Filosófico e completamente inútil.'],
  'lux|mortis':      ['Luz da Morte',         'Um túnel brilhante aparece à sua frente. Você, sensatamente, escolhe não entrar.'],
  'lux|abyssus':     ['Luz do Abismo',        'Ilumina o interior do abismo. Está vazio. Isso é de alguma forma decepcionante.'],
  'umbra|toxicum':   ['Sombra Venenosa',      'Envenena a escuridão ao redor. Não há como notar ou provar.'],
  'mortis|umbra':    ['Sombra Mortal',        'Sua sombra fica cerca de 3% mais escura. Ominoso. Ineficaz.'],
  'mortis|tempus':   ['Tempo e Morte',        'O tempo já é mortal por definição. Isso é redundância mágica certificada.'],
  'caelum|eternum':  ['Céu Eterno',           'O céu já é eterno por definição. O feitiço é ignorado pelo próprio universo.'],
  'caelum|tempus':   ['Tempo Celestial',      'Para o céu, 1 turno equivale a 1000 anos. Completamente inútil em combate.'],
  'caelum|umbra':    ['Sombra Celestial',     'O céu fica levemente nublado por um momento. Climático, mas só isso.'],
  'caelum|mortis':   ['Morte Celestial',      'Um anjo da morte aparece, verifica a agenda, não encontra nada agendado e vai embora.'],
  'caelum|toxicum':  ['Veneno Divino',        'Pelos padrões do paraíso, este veneno é considerado completamente inofensivo.'],
  'abyssus|toxicum': ['Veneno do Abismo',     'O abismo cospe o veneno de volta. Empate técnico.'],
  'abyssus|eternum': ['Abismo Eterno',        'Profundezas sem fim no espaço e no tempo. Você prefere não explorar isso.'],
  'abyssus|tempus':  ['Tempo do Abismo',      'O tempo no abismo é circular. A magia não avança. Literalmente.'],
  'abyssus|mortis':  ['Morte do Abismo',      'Coisas mortas já caem no abismo naturalmente. Você apenas confirmou isso.'],
  'abyssus|umbra':   ['Sombra do Abismo',     'Escuridão elevada ao quadrado. Continua não fazendo nada perceptível.'],
  'eternum|umbra':   ['Sombra Eterna',        'Uma sombra que te segue para sempre sem qualquer efeito real. Perturbador.'],
  'eternum|toxicum': ['Veneno Eterno',        'Você estará envenenado para sempre. Nota do sistema: você não está envenenado.'],
  'caelum|lux':      ['Luz Celestial',        'Brilho divino que cega a todos incluindo você. Imparcial. Inútil.'],
  'glacies|tempus':  ['Gelo Temporal',        'Você congela o tempo por 0.001 segundos. Absolutamente nada percebe.'],
  'glacies|mortis':  ['Gelo Mortal',          'Temperatura tão baixa que já era mortal. Redundância estatística confirmada.'],
  'glacies|abyssus': ['Gelo do Abismo',       'O abismo fica com frio. A magia funcionou, mas não importa.'],
  'glacies|eternum': ['Gelo Eterno',          'Um cubo de gelo perfeito que dura para sempre. Para quê? Mistério.'],
  'glacies|umbra':   ['Gelo Sombrio',         'Sombras geladas. Assustador para absolutamente ninguém.'],
  'glacies|caelum':  ['Neve Celestial',       'Neve divina cai com graça e beleza. Não faz absolutamente nada.'],
  'ignis|vitae':     ['Chama Vital',          'Fogo e vida criam fumaça. Mas fumaça aromática, com cheiro de flores.'],
  'ignis|tempus':    ['Chama Temporal',       'As chamas existem no passado e no futuro, nunca no presente. Inatingíveis.'],
  'ignis|abyssus':   ['Chama do Abismo',      'Queima para baixo em vez de para cima. Fisicamente problemático.'],
  'ignis|caelum':    ['Chama Celestial',      'Parece incrivelmente poderoso. Não é. Mas parece.'],
  'ignis|eternum':   ['Chama Eterna',         'Arde para sempre a 0,001°C. Tecnicamente é fogo, mas só em espírito.'],
  'vitae|fulgur':    ['Vida Elétrica',        'Uma folha eletrocutada cresce vigorosa por um segundo e então explode.'],
  'umbra|vitae':     ['Vida nas Sombras',     'Cogumelos aparecem nas sombras. Provavelmente venenosos.'],
  'lux|vitae':       ['Luz da Vida',          'Uma plantinha nasce, sorri educadamente para você e desaparece.'],
  'toxicum|vitae':   ['Vida Venenosa',        'Um ser vivo e tóxico foi criado. É você. Isso não muda nada.'],
  'tempus|vitae':    ['Vida Acelerada',       'Você envelhece e rejuvenesce ao mesmo tempo. Resultado líquido: zero.'],
  'abyssus|vitae':   ['Vida no Abismo',       'Muito otimista. O abismo discorda. A vida não surge.'],
  'fulgur|umbra':    ['Raio das Sombras',     'Ilumina a sombra por exatos 0.02 segundos. A sombra retorna imediatamente.'],
  'fulgur|toxicum':  ['Raio Venenoso',        'O veneno fica eletrostático e adere à sua roupa. Inconveniente.'],
  'fulgur|tempus':   ['Raio Temporal',        'Chega antes de ser lançado. Todos ficam confusos, incluindo a magia.'],
  'fulgur|abyssus':  ['Raio do Abismo',       'O raio cai para cima e atinge o teto. A física protestou.'],
  'umbra|tempus':    ['Sombra Temporal',      'Sombra do futuro. Assustadora. Inútil.'],
  'umbra|caelum':    ['Sombra Celestial',     'Um eclipse momentâneo de nível local. Dramático. Só isso.'],
  'toxicum|tempus':  ['Veneno Temporal',      'Envenena o passado. Seus ancestrais ficam levemente enjoados por um instante.'],
  'toxicum|mortis':  ['Veneno Mortal',        'Extremamente redundante. O veneno já era mortal antes deste feitiço.'],
  // Form vs form — structural nonsense
  'manus|sagitta':   ['Flecha de Mão',        'A flecha é disparada enquanto ainda está presa na mão. Não vai a lugar nenhum.'],
  'sagitta|scutum':  ['Flecha de Escudo',     'A flecha acerta o escudo que você mesmo criou. Ficou presa. Parabéns.'],
  'sagitta|vortex':  ['Flecha Espiral',       'Gira tanto que reverte a direção e volta para você. Perigoso para o conjurador.'],
  'sagitta|aura':    ['Flecha Giratória',     'Orbita ao seu redor sem atingir nada. Decorativa.'],
  'sagitta|pluvia':  ['Chuva de Flechas',     'Várias flechas-chuva caem. Cada uma desvia das outras por solidariedade.'],
  'sagitta|arcanum': ['Flecha Arcana',        'A flecha tem runas entalhadas. Infelizmente, ela não sabe lê-las.'],
  'sagitta|fortis':  ['Flecha Poderosa',      'Forte demais. Sai disparada da mão antes que você a solte.'],
  'manus|scutum':    ['Mão-Escudo',           'Você usa a mão como escudo e a bate em si mesmo. A mão dói.'],
  'manus|unda':      ['Onda Manual',          'Você acena. O inimigo fica confuso. Um de vocês cumprimenta o outro.'],
  'manus|pluvia':    ['Mão de Chuva',         'Dedos-gotículas caem sobre o inimigo. Molha levemente.'],
  'manus|vortex':    ['Mão Giratória',        'A mão gira sem parar. Incomoda, mas não machuca.'],
  'manus|arcanum':   ['Mão Arcana',           'Gesticula com runas. A magia acha que você está acenando tchau.'],
  'manus|fortis':    ['Mão Poderosa',         'Você levanta a mão com tremenda força. Isso é apenas... levantar a mão.'],
  'manus|chaos':     ['Mão do Caos',          'Toca em alvos aleatórios. Às vezes a si mesmo. Às vezes no ar.'],
  'scutum|unda':     ['Onda de Escudo',       'O escudo se transforma em onda e se desfaz imediatamente. Breve.'],
  'scutum|aura':     ['Aura-Escudo',          'Flutua ao seu redor sem definição funcional. Bonito, inútil.'],
  'scutum|pluvia':   ['Chuva de Escudos',     'Escudos caem do céu sobre todos. Inclusive sobre você. Equitativo.'],
  'scutum|vortex':   ['Vórtice de Escudos',   'Giram rápido demais. Cortam tudo ao redor, inclusive nada de útil.'],
  'scutum|arcanum':  ['Escudo Arcano',        'Escudo coberto de runas que não servem para nenhum propósito defensivo.'],
  'scutum|chaos':    ['Escudo do Caos',       'Às vezes protege. Às vezes não. Frequência: imprevisível.'],
  'unda|aura':       ['Onda-Aura',            'A onda para no primeiro passo e vira uma poça de energia. Zona molhada.'],
  'pluvia|unda':     ['Onda de Chuva',        'Uma onda de chuva. É apenas... chuva forte. Climático, nada além.'],
  'unda|vortex':     ['Onda Espiral',         'A onda gira sem avançar. Um redemoinho estacionário decorativo.'],
  'unda|arcanum':    ['Onda Arcana',          'Expansão de magia que se dilui tanto que ninguém, nunca, nota.'],
  'fortis|unda':     ['Onda de Força',        'Tão potente que colapsa ao colidir consigo mesma. Autodestruição.'],
  'chaos|unda':      ['Onda Caótica',         'Vai em todas as direções. Principalmente para trás.'],
  'aura|pluvia':     ['Aura de Chuva',        'Você sempre está levemente molhado. Socialmente inconveniente.'],
  'aura|vortex':     ['Aura Giratória',       'O campo ao seu redor gira. Você fica tonto por solidariedade.'],
  'aura|fortis':     ['Aura de Força',        'Intensifica sua presença. Socialmente constrangedora. Magicamente ineficaz.'],
  'aura|chaos':      ['Aura Caótica',         'Efeitos aleatórios que se cancelam rigorosamente antes de qualquer coisa.'],
  'pluvia|vortex':   ['Chuva Espiral',        'Chuva em espiral. Você e o inimigo ficam igualmente confusos.'],
  'pluvia|arcanum':  ['Chuva Arcana',         'Gotas com runas entalhadas. Ninguém sabe o que as runas dizem.'],
  'fortis|pluvia':   ['Chuva de Força',       'Gotas com impacto de meteorito. Caem em qualquer lugar menos no alvo.'],
  'chaos|pluvia':    ['Chuva Caótica',        'Cai para cima, para o lado, em espiral. Mas é só água no fim das contas.'],
  'vortex|fortis':   ['Vórtice de Força',     'Tão poderoso que colapsa em si mesmo por excesso de ambição.'],
  'chaos|vortex':    ['Vórtice do Caos',      'Absorve a própria aleatoriedade. O resultado é indistinguível do nada.'],
  'arcanum|fortis':  ['Arcano Poderoso',      'Muita magia e muita força no mesmo lugar. Explodem juntos de entusiasmo.'],
  'arcanum|chaos':   ['Arcano Caótico',       'A magia sai de formas inesperadas. Geralmente atinge o conjurador.'],
  'chaos|fortis':    ['Força do Caos',        'Energia ilimitada, direção nenhuma. Vai toda para o chão.'],
}

// Template pools for uncrafted combos not in SPECIFIC_DESC
const ELEM_ELEM_TEMPLATES: string[] = [
  'Os dois elementos se combatem. Ninguém vence.',
  'A combinação colapsa antes de produzir qualquer efeito perceptível.',
  'Uma luz estranha pulsa por um segundo e desaparece.',
  'Magicamente instável. Não explodiu desta vez. Por sorte.',
  'Os elementos se recusam a cooperar. Resultado: nada.',
  'Dois poderes se anulam em silêncio e educação mútua.',
  'Energia pura sem direção definida. Efeito líquido: zero.',
  'A magia pergunta o que você quer e ignora a resposta.',
  'Algo aconteceu aqui. Ninguém sabe dizer o quê.',
  'Instabilidade arcana controlada. Ênfase em controlada.',
  'Reação elementar inócua. Sem feridos. Sem efeito.',
  'Um zunido, uma faísca, nenhuma consequência.',
]

const FORM_FORM_TEMPLATES: string[] = [
  'Duas formas competem pela manifestação. Nenhuma vence.',
  'A magia não sabe qual forma adotar e desiste silenciosamente.',
  'Um híbrido incoerente aparece por 0.2 segundos e dissolve.',
  'Forma geométrica impossível pisca brevemente no espaço.',
  'As formas se fundem e implodem discretamente. Todos fingem não ver.',
  'Manifestação indefinida que questiona sua própria existência.',
  'A magia pergunta: qual forma você quer mesmo? — e some sem esperar.',
  'Confusão de forma e substância. Pura, mas inútil.',
  'Duas intenções mágicas colidem e produzem decepção.',
  'O feitiço existe. A utilidade, não. Ambos são reais.',
]

const ELEM_FORM_TEMPLATES: string[] = [
  'O elemento não se adapta à forma escolhida. Resultado inerte.',
  'Parece promissor à primeira vista. Não é.',
  'Instabilidade arcana resulta em nada de útil.',
  'A combinação existe, mas recusa-se categoricamente a ser útil.',
  'Um brilho, um estalo, zero consequências documentadas.',
  'Produz cheiro de ozônio e uma leve sensação de decepção.',
  'A fórmula está correta. A utilidade é que falhou.',
  'Cria algo brevemente. Esse algo se decepciona e vai embora.',
  'Energia vai para lugar nenhum com notável estilo.',
  'A magia é genuína. O efeito, discutível.',
  'Funcional no papel. Impotente na prática.',
  'O universo registra o feitiço e não faz nada a respeito.',
  'Combinação válida! Efeito: questionável. Nível: zero.',
  'Um lampejo de possibilidade que opta por não se concretizar.',
]

/**
 * Generates a placeholder spell for any word pair that has no crafted entry.
 * Always returns a valid Spell — effect is utility with no stat adds (useless but castable).
 */
function generateFallbackSpell(wordId1: string, wordId2: string): Spell {
  const [a, b]   = [wordId1, wordId2].sort()
  const key      = `${a}|${b}`
  const w1       = WORD_MAP.get(a)!
  const w2       = WORD_MAP.get(b)!
  const cat1     = w1.category
  const cat2     = w2.category
  const hash     = hashPair(a, b)

  // Name & description — specific override or generated
  let spellName: string
  let description: string

  if (SPECIFIC_DESC[key]) {
    ;[spellName, description] = SPECIFIC_DESC[key]
  } else {
    spellName = `${w1.namePt} ${w2.namePt}`
    if (cat1 === 'element' && cat2 === 'element') {
      description = ELEM_ELEM_TEMPLATES[hash % ELEM_ELEM_TEMPLATES.length]
    } else if (cat1 === 'form' && cat2 === 'form') {
      description = FORM_FORM_TEMPLATES[hash % FORM_FORM_TEMPLATES.length]
    } else {
      description = ELEM_FORM_TEMPLATES[hash % ELEM_FORM_TEMPLATES.length]
    }
  }

  // Rarity = higher of the two words
  const RARITY_RANK: Record<string, number> = {
    common: 0, uncommon: 1, rare: 2, epic: 3, unique: 4,
  }
  const rarity = RARITY_RANK[w1.rarity] >= RARITY_RANK[w2.rarity] ? w1.rarity : w2.rarity

  return {
    id:          key.replace('|', '_'),
    name:        spellName,
    word1Id:     a,
    word2Id:     b,
    rarity:      rarity as Spell['rarity'],
    manaCost: 4,
    cooldown:    1,
    effect:      { type: 'utility' },
    description,
  }
}

/** Returns the spell formed by two word IDs. Always returns a Spell (never undefined). */
export function findSpell(wordId1: string, wordId2: string): Spell {
  const crafted = ALL_SPELLS.find(
    s => (s.word1Id === wordId1 && s.word2Id === wordId2) ||
         (s.word1Id === wordId2 && s.word2Id === wordId1)
  )
  return crafted ?? generateFallbackSpell(wordId1, wordId2)
}

/** All spells the player can form given the words they know (crafted + fallback for every pair) */
export function getAvailableSpells(knownWordIds: string[]): Spell[] {
  const known = [...knownWordIds]
  const spells: Spell[] = []
  for (let i = 0; i < known.length; i++) {
    for (let j = i + 1; j < known.length; j++) {
      spells.push(findSpell(known[i], known[j]))
    }
  }
  return spells
}
