export type Lang = 'pt' | 'en'

const pt = {
  build: 'Build Inicial',
  settings: { title: 'Configurações', theme: 'Tema', dark: 'Escuro', light: 'Claro', lang: 'Idioma' },
  skip: 'Pular',
  speed: 'Veloc.',
  victory: 'Vitória!',
  defeat: 'Derrota!',
  nextBattle: 'Próxima batalha...',
  log: 'Diário de Batalha',
  awaiting: 'Aguardando combate...',
  strike: (a: string, d: string, n: number) => `${a} acerta ${d} por ${n} de dano!`,
  stamina: 'STAMINA',
  mana: 'MANA',
  level: 'Nível',
  xp: 'XP',
  available: (n: number) => `${n} ponto${n !== 1 ? 's' : ''} disponível${n !== 1 ? 'is' : ''}`,
  attributes: 'Atributos',
  subAttrs: 'Sub-atributos',
  noPoints: 'Sem pontos disponíveis',
  addPoint: (attr: string) => `Adicionar ponto em ${attr}`,
  idle: 'Área de recursos e melhorias — em breve',
  attrNames: {
    forca: 'Força', agilidade: 'Agilidade', destreza: 'Destreza',
    vitalidade: 'Vitalidade', inteligencia: 'Inteligência',
    sabedoria: 'Sabedoria', carisma: 'Carisma',
  },
  attrSmalls: {
    forca: ['ATK'], agilidade: ['Vel. Ataque'], destreza: ['Esquiva'],
    vitalidade: ['DEF', 'HP Máx'], inteligencia: ['Dano Mágico'],
    sabedoria: ['Mana'], carisma: [] as string[],
  },
  attrBigs: {
    forca: ['Stamina Máx', 'Regen Stamina'], agilidade: ['Vel. Movimento'],
    destreza: ['Vel. Movimento'], vitalidade: ['Stamina Máx', 'Regen Stamina'],
    inteligencia: ['Visão'], sabedoria: ['Regen Mana', 'Visão'],
    carisma: ['Chance Drop', 'Ouro'],
  },
  statNames: {
    atk: 'ATK', def: 'DEF', hpMax: 'HP Máx', atkSpeed: 'Vel. Ataque',
    dodge: 'Esquiva', magicDmg: 'Dano Mágico', moveSpeed: 'Vel. Mov.',
    vision: 'Visão', dropChance: 'Chance Drop', goldMult: 'Mult. Ouro',
  },
} as const

const en = {
  build: 'Early Build',
  settings: { title: 'Settings', theme: 'Theme', dark: 'Dark', light: 'Light', lang: 'Language' },
  skip: 'Skip',
  speed: 'Speed',
  victory: 'Victory!',
  defeat: 'Defeat!',
  nextBattle: 'Next battle starting...',
  log: 'Battle Log',
  awaiting: 'Awaiting combat...',
  strike: (a: string, d: string, n: number) => `${a} strikes ${d} for ${n} damage!`,
  stamina: 'STAMINA',
  mana: 'MANA',
  level: 'Level',
  xp: 'XP',
  available: (n: number) => `${n} point${n !== 1 ? 's' : ''} available`,
  attributes: 'Attributes',
  subAttrs: 'Sub-attributes',
  noPoints: 'No points available',
  addPoint: (attr: string) => `Add point to ${attr}`,
  idle: 'Resource & upgrade area — coming soon',
  attrNames: {
    forca: 'Strength', agilidade: 'Agility', destreza: 'Dexterity',
    vitalidade: 'Vitality', inteligencia: 'Intelligence',
    sabedoria: 'Wisdom', carisma: 'Charisma',
  },
  attrSmalls: {
    forca: ['ATK'], agilidade: ['Atk Speed'], destreza: ['Dodge'],
    vitalidade: ['DEF', 'Max HP'], inteligencia: ['Magic Dmg'],
    sabedoria: ['Mana'], carisma: [] as string[],
  },
  attrBigs: {
    forca: ['Max Stamina', 'Stamina Regen'], agilidade: ['Move Speed'],
    destreza: ['Move Speed'], vitalidade: ['Max Stamina', 'Stamina Regen'],
    inteligencia: ['Vision'], sabedoria: ['Mana Regen', 'Vision'],
    carisma: ['Drop Rate', 'Gold'],
  },
  statNames: {
    atk: 'ATK', def: 'DEF', hpMax: 'Max HP', atkSpeed: 'Atk Speed',
    dodge: 'Dodge', magicDmg: 'Magic Dmg', moveSpeed: 'Move Spd',
    vision: 'Vision', dropChance: 'Drop Rate', goldMult: 'Gold Mult',
  },
} as const

export const translations = { pt, en } as const
export type Translations = typeof pt
