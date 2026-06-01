/**
 * MonsterSprites — pixel art de monstros.
 *
 * viewBox "0 0 30 30" (quadrado) para todos os monstros.
 * Cada monstro é dividido em Base + Accessory.
 *   Base      — sprite nuclear, recolorável no caso do Slime.
 *   Accessory — overlay que muda por raridade e estado enraged.
 *
 * Todos os sprites são renderizados com scaleX(-1) para encarar o herói.
 */

import type { MonsterRarity } from '../../types/monster'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MonsterSpriteProps {
  monsterId: string
  rarity?:  MonsterRarity
  enraged?: boolean
  /** Largura em px — altura igual (30×30 = quadrado). */
  size?:    number
}

interface AccessoryProps {
  rarity?:  MonsterRarity
  enraged?: boolean
}

// ─── Rarity accent colours ────────────────────────────────────────────────────

const RARITY_ACCENT: Partial<Record<MonsterRarity, string>> = {
  uncommon: '#4acc44',
  rare:     '#4488ee',
  epic:     '#bb44ee',
  unique:   '#ffcc22',
}

// ─── Shared: rage effect ──────────────────────────────────────────────────────

function EnragedEffect() {
  return (
    <g>
      <rect x="0"  y="3"  width="3" height="2" fill="#ff4422" opacity="0.80" />
      <rect x="27" y="3"  width="3" height="2" fill="#ff4422" opacity="0.80" />
      <rect x="0"  y="9"  width="2" height="3" fill="#ff6622" opacity="0.55" />
      <rect x="28" y="9"  width="2" height="3" fill="#ff6622" opacity="0.55" />
      <rect x="4"  y="0"  width="4" height="2" fill="#ff4422" opacity="0.45" />
      <rect x="22" y="0"  width="4" height="2" fill="#ff4422" opacity="0.45" />
      <rect x="1"  y="1"  width="2" height="1" fill="#ff8822" opacity="0.35" />
      <rect x="27" y="1"  width="2" height="1" fill="#ff8822" opacity="0.35" />
    </g>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// GOBLIN
// ═══════════════════════════════════════════════════════════════════════════════

function GoblinBase() {
  const s  = '#4a9a36'; const d  = '#2a6a18'; const hi = '#6aba50'
  const e  = '#cc2222'; const ep = '#881111'
  const b  = '#5a3a10'; const bd = '#3a2008'
  const cl = '#6a4a1a'; const ch = '#3a2008'
  return (
    <g>
      {/* orelhas */}
      <rect x="2"  y="3"  width="4" height="8" rx="2" fill={s} />
      <rect x="24" y="3"  width="4" height="8" rx="2" fill={s} />
      <rect x="2"  y="3"  width="2" height="5" fill={d} opacity="0.35" />
      <rect x="26" y="3"  width="2" height="5" fill={d} opacity="0.35" />
      {/* cabeça */}
      <rect x="5"  y="1"  width="20" height="14" rx="3" fill={s} />
      <rect x="6"  y="2"  width="18" height="4"  rx="2" fill={d} />
      <rect x="9"  y="1"  width="8"  height="3"  rx="1" fill={hi} opacity="0.25" />
      <rect x="7"  y="13" width="16" height="2"  rx="1" fill={d} opacity="0.4" />
      {/* olhos */}
      <rect x="6"  y="5"  width="7"  height="5" rx="2" fill={e} />
      <rect x="17" y="5"  width="7"  height="5" rx="2" fill={e} />
      <rect x="7"  y="5"  width="4"  height="5" fill={ep} />
      <rect x="18" y="5"  width="4"  height="5" fill={ep} />
      <rect x="8"  y="5"  width="2"  height="2" fill="white" opacity="0.7" />
      <rect x="19" y="5"  width="2"  height="2" fill="white" opacity="0.7" />
      {/* nariz */}
      <rect x="12" y="9"  width="6"  height="3" rx="2" fill={d} />
      <rect x="13" y="10" width="2"  height="2" rx="1" fill="#0a1a08" />
      <rect x="16" y="10" width="2"  height="2" rx="1" fill="#0a1a08" />
      {/* boca + presas */}
      <rect x="7"  y="12" width="16" height="3" fill="#1a0808" />
      <rect x="9"  y="12" width="3"  height="2" fill="#f8f0d0" />
      <rect x="14" y="12" width="3"  height="2" fill="#f8f0d0" />
      <rect x="19" y="12" width="2"  height="1" fill="#f8f0d0" />
      {/* pescoço */}
      <rect x="11" y="15" width="8"  height="3" fill={s} />
      {/* corpo */}
      <rect x="5"  y="18" width="20" height="10" rx="2" fill={b} />
      <rect x="8"  y="19" width="14" height="6"  rx="1" fill={bd} opacity="0.45" />
      <rect x="14" y="18" width="2"  height="10" fill={bd} opacity="0.4" />
      <rect x="5"  y="27" width="20" height="2"  fill={bd} />
      <rect x="13" y="27" width="4"  height="2"  fill="#c9a227" />
      {/* braço esquerdo */}
      <rect x="1"  y="18" width="5"  height="10" rx="2" fill={s} />
      <rect x="1"  y="27" width="5"  height="2"  rx="1" fill={d} opacity="0.6" />
      {/* braço direito */}
      <rect x="24" y="18" width="5"  height="10" rx="2" fill={s} />
      {/* clava */}
      <rect x="25" y="2"  width="4"  height="18" rx="2" fill={cl} />
      <rect x="26" y="9"  width="2"  height="1"  fill={ch} opacity="0.5" />
      <rect x="26" y="15" width="2"  height="1"  fill={ch} opacity="0.5" />
      <rect x="23" y="0"  width="7"  height="5"  rx="2" fill={ch} />
      <rect x="24" y="0"  width="4"  height="2"  fill={cl} opacity="0.5" />
      {/* pernas */}
      <rect x="7"  y="27" width="6"  height="3"  rx="1" fill={s} />
      <rect x="17" y="27" width="6"  height="3"  rx="1" fill={s} />
      {/* pés */}
      <rect x="6"  y="29" width="8"  height="1"  rx="1" fill={d} />
      <rect x="16" y="29" width="8"  height="1"  rx="1" fill={d} />
    </g>
  )
}

function GoblinAccessory({ rarity, enraged }: AccessoryProps) {
  const a = rarity ? (RARITY_ACCENT[rarity] ?? '#fff') : '#fff'
  if (enraged) return (
    <g>
      <EnragedEffect />
      <rect x="8"  y="3" width="4" height="1" fill="#ff2200" opacity="0.7" />
      <rect x="18" y="3" width="4" height="1" fill="#ff2200" opacity="0.7" />
    </g>
  )
  if (!rarity || rarity === 'normal') return null
  if (rarity === 'uncommon') return (
    <g>
      {/* escudo de madeira no braço esquerdo */}
      <rect x="0" y="17" width="5" height="9" rx="2" fill="#8a5a2a" />
      <rect x="1" y="18" width="3" height="7" rx="1" fill="#6a3a10" />
      <rect x="2" y="20" width="1" height="3" fill={a} opacity="0.7" />
    </g>
  )
  if (rarity === 'rare') return (
    <g>
      {/* capacete de ferro */}
      <rect x="5"  y="0" width="20" height="8" rx="3" fill="#7a8a9a" />
      <rect x="7"  y="0" width="16" height="4" rx="2" fill="#9aaaba" opacity="0.6" />
      <rect x="6"  y="5" width="18" height="3" rx="1" fill="#4a5a6a" />
      <rect x="14" y="5" width="2"  height="3" fill="#5a6a7a" />
    </g>
  )
  if (rarity === 'epic') return (
    <g>
      {/* capacete com chifres + olhos brilhantes */}
      <rect x="5"  y="0" width="20" height="8" rx="3" fill="#5a4a7a" />
      <rect x="7"  y="0" width="16" height="3" rx="2" fill="#7a6a9a" opacity="0.5" />
      <rect x="6"  y="4" width="18" height="3" rx="1" fill="#3a2a5a" />
      <rect x="7"  y="0" width="3"  height="6" rx="1" fill={a} opacity="0.9" />
      <rect x="20" y="0" width="3"  height="6" rx="1" fill={a} opacity="0.9" />
      <rect x="6"  y="5" width="7"  height="5" rx="2" fill={a} opacity="0.3" />
      <rect x="17" y="5" width="7"  height="5" rx="2" fill={a} opacity="0.3" />
    </g>
  )
  /* unique */
  return (
    <g>
      {/* coroa */}
      <rect x="8"  y="0" width="14" height="4" rx="1" fill={a} />
      <rect x="9"  y="0" width="2"  height="3" fill={a} />
      <rect x="14" y="0" width="2"  height="5" rx="1" fill={a} />
      <rect x="19" y="0" width="2"  height="3" fill={a} />
      <rect x="9"  y="0" width="12" height="2" fill="#fff8c0" opacity="0.5" />
      {/* runas no corpo */}
      <rect x="10" y="19" width="3" height="2" rx="1" fill={a} opacity="0.7" />
      <rect x="17" y="19" width="3" height="2" rx="1" fill={a} opacity="0.7" />
      <rect x="0"  y="0" width="30" height="30" fill={a} opacity="0.04" />
    </g>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOBO — quadrúpede de perfil (projetado virado à direita; scaleX(-1) → vira à esquerda)
// ═══════════════════════════════════════════════════════════════════════════════

function WolfBase() {
  const f = '#6a7a8a'; const d = '#4a5a6a'; const li = '#8a9aaa'
  const ey = '#c8a020'; const ep = '#3a2800'; const mz = '#2a2030'
  return (
    <g>
      {/* rabo (lado esquerdo no SVG = direito após mirror) */}
      <rect x="0" y="10" width="8"  height="5"  rx="3" fill={f} />
      <rect x="1" y="8"  width="5"  height="5"  rx="3" fill={f} />
      <rect x="2" y="6"  width="4"  height="5"  rx="2" fill={li} opacity="0.3" />
      {/* corpo */}
      <rect x="6" y="14" width="20" height="10" rx="3" fill={f} />
      <rect x="8" y="13" width="16" height="4"  rx="2" fill={d} opacity="0.4" />
      <rect x="14" y="16" width="10" height="6"  rx="2" fill={li} opacity="0.25" />
      {/* pescoço */}
      <rect x="18" y="10" width="8"  height="7"  rx="2" fill={f} />
      <rect x="19" y="10" width="5"  height="3"  rx="1" fill={d} opacity="0.3" />
      {/* cabeça */}
      <rect x="20" y="3"  width="10" height="10" rx="3" fill={f} />
      <rect x="22" y="3"  width="6"  height="3"  rx="1" fill={li} opacity="0.3" />
      {/* orelhas pontudas */}
      <rect x="21" y="0"  width="4"  height="6"  rx="1" fill={f} />
      <rect x="27" y="0"  width="3"  height="5"  rx="1" fill={f} />
      <rect x="22" y="0"  width="2"  height="4"  rx="1" fill="#cc5555" opacity="0.45" />
      <rect x="28" y="0"  width="1"  height="3"  fill="#cc5555" opacity="0.45" />
      {/* focinho — integrado naturalmente à cabeça */}
      <rect x="27" y="6"  width="3"  height="7"  rx="1" fill={mz} />
      <rect x="28" y="7"  width="2"  height="5"  fill={d} opacity="0.4" />
      <rect x="28" y="7"  width="2"  height="2"  rx="1" fill="#0a0a0a" />
      {/* olho (perfil — único visível) */}
      <rect x="22" y="5"  width="4"  height="3"  rx="1" fill={ey} />
      <rect x="23" y="6"  width="2"  height="2"  fill={ep} />
      <rect x="24" y="5"  width="1"  height="1"  fill="white" opacity="0.6" />
      {/* presas */}
      <rect x="27" y="11" width="2"  height="3"  rx="1" fill="#f8f8e0" />
      <rect x="25" y="11" width="2"  height="2"  rx="1" fill="#f8f8e0" opacity="0.7" />
      {/* patas dianteiras */}
      <rect x="20" y="23" width="5"  height="7"  rx="1" fill={d} />
      <rect x="20" y="28" width="6"  height="2"  rx="1" fill={d} />
      <rect x="20" y="29" width="1"  height="1"  fill={d} />
      <rect x="22" y="29" width="1"  height="1"  fill={d} />
      <rect x="24" y="29" width="1"  height="1"  fill={d} />
      <rect x="24" y="23" width="4"  height="5"  rx="1" fill={f} opacity="0.55" />
      {/* patas traseiras */}
      <rect x="7"  y="23" width="5"  height="7"  rx="1" fill={d} />
      <rect x="7"  y="28" width="6"  height="2"  rx="1" fill={d} />
      <rect x="7"  y="29" width="1"  height="1"  fill={d} />
      <rect x="9"  y="29" width="1"  height="1"  fill={d} />
      <rect x="11" y="29" width="1"  height="1"  fill={d} />
      <rect x="12" y="23" width="4"  height="5"  rx="1" fill={f} opacity="0.55" />
    </g>
  )
}

function WolfAccessory({ rarity, enraged }: AccessoryProps) {
  const a = rarity ? (RARITY_ACCENT[rarity] ?? '#fff') : '#fff'
  if (enraged) return (
    <g>
      <EnragedEffect />
      {/* babas escorrendo */}
      <rect x="27" y="12" width="1" height="4" rx="1" fill="white" opacity="0.6" />
      <rect x="25" y="13" width="1" height="3" rx="1" fill="white" opacity="0.4" />
    </g>
  )
  if (!rarity || rarity === 'normal') return null
  if (rarity === 'uncommon') return (
    <g>
      {/* coleira com espinhos */}
      <rect x="18" y="13" width="8" height="3" rx="1" fill="#4a3a2a" />
      <rect x="19" y="12" width="1" height="2" rx="0" fill="#7a5a2a" />
      <rect x="21" y="12" width="1" height="2" rx="0" fill="#7a5a2a" />
      <rect x="23" y="12" width="1" height="2" rx="0" fill="#7a5a2a" />
    </g>
  )
  if (rarity === 'rare') return (
    <g>
      {/* colar de ossos / troféus */}
      <rect x="18" y="13" width="8" height="2" rx="1" fill="#3a2a10" />
      <rect x="19" y="11" width="2" height="3" rx="1" fill="#c8aa80" />
      <rect x="22" y="10" width="2" height="4" rx="1" fill="#c8aa80" />
      <rect x="25" y="11" width="2" height="3" rx="1" fill="#c8aa80" />
    </g>
  )
  if (rarity === 'epic') return (
    <g>
      {/* pontas das garras brilhantes */}
      <rect x="20" y="28" width="1" height="2" fill={a} opacity="0.9" />
      <rect x="22" y="28" width="1" height="2" fill={a} opacity="0.9" />
      <rect x="24" y="28" width="1" height="2" fill={a} opacity="0.9" />
      {/* olho incandescente */}
      <rect x="22" y="5"  width="4" height="3" rx="1" fill={a} opacity="0.5" />
      {/* manchas no pelo */}
      <rect x="10" y="15" width="4" height="2" rx="1" fill={a} opacity="0.35" />
      <rect x="16" y="14" width="3" height="2" rx="1" fill={a} opacity="0.25" />
    </g>
  )
  /* unique */
  return (
    <g>
      {/* runas no pelo */}
      <rect x="9"  y="15" width="3" height="2" rx="1" fill={a} opacity="0.6" />
      <rect x="15" y="15" width="3" height="2" rx="1" fill={a} opacity="0.6" />
      <rect x="12" y="17" width="3" height="2" rx="1" fill={a} opacity="0.4" />
      {/* rastro sombrio atrás */}
      <rect x="0" y="8"  width="4" height="6" rx="2" fill={a} opacity="0.2" />
      <rect x="0" y="14" width="3" height="4" rx="2" fill={a} opacity="0.15" />
      <rect x="0" y="0"  width="30" height="30" fill={a} opacity="0.04" />
    </g>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIME — recolor por raridade (sem accessory no base; mudança é no próprio corpo)
// ═══════════════════════════════════════════════════════════════════════════════

interface SlimeColors { main: string; dark: string; lite: string }

const SLIME_COLORS: Record<string, SlimeColors> = {
  normal:   { main: '#2aba44', dark: '#1a8a2a', lite: '#5ade64' },
  uncommon: { main: '#20aaaa', dark: '#108a8a', lite: '#44cccc' },
  rare:     { main: '#2055cc', dark: '#1035aa', lite: '#4488ee' },
  epic:     { main: '#9922cc', dark: '#6a1188', lite: '#cc55ee' },
  unique:   { main: '#cc8822', dark: '#aa5500', lite: '#ffcc44' },
  enraged:  { main: '#cc3322', dark: '#aa1100', lite: '#ff5544' },
}

function SlimeBase({ c }: { c: SlimeColors }) {
  const { main: m, dark: d, lite: l } = c
  return (
    <g>
      {/* bolhas decorativas */}
      <rect x="4"  y="5"  width="2" height="2" rx="1" fill={l} opacity="0.3" />
      <rect x="24" y="4"  width="2" height="2" rx="1" fill={l} opacity="0.3" />
      {/* forma do topo */}
      <rect x="9"  y="4"  width="12" height="5" rx="4" fill={m} />
      <rect x="5"  y="7"  width="20" height="6" rx="5" fill={m} />
      {/* corpo */}
      <rect x="2"  y="10" width="26" height="15" rx="6" fill={m} />
      {/* highlight */}
      <rect x="11" y="5"  width="7"  height="4" rx="2" fill={l} opacity="0.4" />
      <rect x="14" y="10" width="3"  height="5" rx="1" fill={l} opacity="0.15" />
      {/* olhos */}
      <rect x="7"  y="13" width="7"  height="8" rx="3" fill="white" />
      <rect x="16" y="13" width="7"  height="8" rx="3" fill="white" />
      <rect x="8"  y="14" width="5"  height="6" rx="2" fill="#1a2a1a" />
      <rect x="17" y="14" width="5"  height="6" rx="2" fill="#1a2a1a" />
      <rect x="11" y="14" width="2"  height="3" fill="white" opacity="0.7" />
      <rect x="20" y="14" width="2"  height="3" fill="white" opacity="0.7" />
      {/* boca */}
      <rect x="10" y="21" width="10" height="3" rx="2" fill={d} />
      <rect x="12" y="21" width="2"  height="1" fill="#0a1a0a" opacity="0.5" />
      <rect x="16" y="21" width="2"  height="1" fill="#0a1a0a" opacity="0.5" />
      {/* base */}
      <rect x="1"  y="22" width="28" height="7" rx="5" fill={d} />
      <rect x="2"  y="23" width="26" height="5" rx="4" fill={m} opacity="0.55" />
      {/* pingos laterais */}
      <rect x="0"  y="17" width="4"  height="8" rx="2" fill={m} />
      <rect x="26" y="17" width="4"  height="8" rx="2" fill={m} />
      <rect x="4"  y="22" width="3"  height="5" rx="2" fill={m} opacity="0.7" />
      <rect x="23" y="22" width="3"  height="5" rx="2" fill={m} opacity="0.7" />
      <rect x="12" y="26" width="6"  height="4" rx="3" fill={d} />
    </g>
  )
}

function SlimeAccessory({ rarity, enraged }: AccessoryProps) {
  if (enraged) return <EnragedEffect />
  const a = rarity ? (RARITY_ACCENT[rarity] ?? '') : ''
  if (!a || rarity === 'normal') return null
  if (rarity === 'uncommon') return (
    <g>
      {/* bolha brilhante extra */}
      <rect x="22" y="8" width="4" height="4" rx="2" fill={a} opacity="0.4" />
      <rect x="23" y="8" width="2" height="2" rx="1" fill="white" opacity="0.4" />
    </g>
  )
  if (rarity === 'rare') return (
    <g>
      {/* cristal no topo */}
      <rect x="13" y="2" width="4" height="5" rx="1" fill={a} opacity="0.7" />
      <rect x="14" y="2" width="2" height="3" fill="white" opacity="0.4" />
    </g>
  )
  if (rarity === 'epic') return (
    <g>
      {/* aura brilhante nos olhos */}
      <rect x="7"  y="13" width="7" height="8" rx="3" fill={a} opacity="0.3" />
      <rect x="16" y="13" width="7" height="8" rx="3" fill={a} opacity="0.3" />
      {/* cristais nas laterais */}
      <rect x="0"  y="10" width="3" height="7" rx="1" fill={a} opacity="0.5" />
      <rect x="27" y="10" width="3" height="7" rx="1" fill={a} opacity="0.5" />
    </g>
  )
  /* unique */
  return (
    <g>
      <rect x="0"  y="0" width="30" height="30" fill={a} opacity="0.06" />
      {/* coroa de cristal */}
      <rect x="8"  y="0" width="14" height="4" rx="1" fill={a} opacity="0.8" />
      <rect x="10" y="0" width="2"  height="3" fill={a} />
      <rect x="14" y="0" width="2"  height="5" rx="1" fill={a} />
      <rect x="18" y="0" width="2"  height="3" fill={a} />
      <rect x="9"  y="0" width="12" height="2" fill="white" opacity="0.4" />
    </g>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// BANDIDO
// ═══════════════════════════════════════════════════════════════════════════════

function BanditBase() {
  const hd = '#1a1a2a'; const dk = '#0e0e18'; const sk = '#d4a86a'
  const ey = '#f0a030'; const bl = '#c0c0d8'; const bh = '#dde0f0'
  const ac = '#3a2a5a'
  return (
    <g>
      {/* ponta do capuz */}
      <rect x="12" y="0"  width="6"  height="4"  rx="2" fill={hd} />
      <rect x="10" y="2"  width="10" height="4"  fill={hd} />
      {/* capuz */}
      <rect x="6"  y="4"  width="18" height="13" rx="3" fill={hd} />
      <rect x="8"  y="5"  width="14" height="11" rx="2" fill={dk} />
      <rect x="8"  y="6"  width="14" height="8"  rx="2" fill={sk} opacity="0.55" />
      {/* máscara */}
      <rect x="7"  y="10" width="16" height="6"  rx="1" fill="#2a1a1a" />
      {/* olhos brilhando */}
      <rect x="9"  y="6"  width="5"  height="3"  rx="1" fill={ey} />
      <rect x="16" y="6"  width="5"  height="3"  rx="1" fill={ey} />
      <rect x="9"  y="6"  width="2"  height="2"  fill="white" opacity="0.4" />
      <rect x="16" y="6"  width="2"  height="2"  fill="white" opacity="0.4" />
      {/* pescoço */}
      <rect x="12" y="17" width="6"  height="3"  fill={sk} opacity="0.55" />
      {/* capa / corpo */}
      <rect x="4"  y="19" width="22" height="11" rx="3" fill={hd} />
      <rect x="4"  y="19" width="3"  height="11" rx="1" fill={ac} opacity="0.35" />
      <rect x="23" y="19" width="3"  height="11" rx="1" fill={ac} opacity="0.35" />
      <rect x="14" y="19" width="2"  height="11" fill={dk} opacity="0.4" />
      {/* braços */}
      <rect x="1"  y="19" width="4"  height="11" rx="2" fill={hd} />
      <rect x="25" y="19" width="4"  height="11" rx="2" fill={hd} />
      {/* adaga esquerda */}
      <rect x="1"  y="8"  width="3"  height="13" rx="1" fill={bl} />
      <rect x="2"  y="8"  width="1"  height="11" fill={bh} opacity="0.5" />
      <rect x="0"  y="19" width="5"  height="2"  rx="1" fill="#8888aa" />
      <rect x="1"  y="21" width="3"  height="4"  rx="1" fill="#4a3a2a" />
      {/* adaga direita */}
      <rect x="26" y="8"  width="3"  height="13" rx="1" fill={bl} />
      <rect x="26" y="8"  width="1"  height="11" fill={bh} opacity="0.5" />
      <rect x="25" y="19" width="5"  height="2"  rx="1" fill="#8888aa" />
      <rect x="26" y="21" width="3"  height="4"  rx="1" fill="#4a3a2a" />
      {/* pernas */}
      <rect x="7"  y="26" width="6"  height="4"  rx="1" fill={dk} />
      <rect x="17" y="26" width="6"  height="4"  rx="1" fill={dk} />
      <rect x="5"  y="28" width="9"  height="2"  rx="1" fill="#0e0e14" />
      <rect x="16" y="28" width="9"  height="2"  rx="1" fill="#0e0e14" />
    </g>
  )
}

function BanditAccessory({ rarity, enraged }: AccessoryProps) {
  const a = rarity ? (RARITY_ACCENT[rarity] ?? '') : ''
  if (enraged) return (
    <g>
      <EnragedEffect />
      {/* adagas levantadas / postura agressiva */}
      <rect x="1"  y="5"  width="3" height="5" rx="1" fill="#dde0f0" opacity="0.7" />
      <rect x="26" y="5"  width="3" height="5" rx="1" fill="#dde0f0" opacity="0.7" />
    </g>
  )
  if (!a || rarity === 'normal') return null
  if (rarity === 'uncommon') return (
    <g>
      {/* faca extra no cinto */}
      <rect x="13" y="18" width="2" height="5" rx="1" fill="#c0c0d8" />
      <rect x="12" y="22" width="4" height="1" rx="0" fill="#8888aa" />
    </g>
  )
  if (rarity === 'rare') return (
    <g>
      {/* espada mais longa substituindo adaga direita */}
      <rect x="26" y="3"  width="3" height="18" rx="1" fill="#c0c0d8" />
      <rect x="26" y="3"  width="1" height="16" fill="#dde0ff" opacity="0.5" />
      <rect x="24" y="19" width="6" height="2"  rx="1" fill="#7a8aaa" />
      {/* gema na guarda */}
      <rect x="26" y="19" width="2" height="2" rx="0" fill={a} opacity="0.8" />
    </g>
  )
  if (rarity === 'epic') return (
    <g>
      {/* lâminas com bordas brilhantes */}
      <rect x="1"  y="8" width="3" height="13" rx="1" fill={a} opacity="0.35" />
      <rect x="26" y="8" width="3" height="13" rx="1" fill={a} opacity="0.35" />
      {/* brilho nos olhos */}
      <rect x="9"  y="6" width="5" height="3" rx="1" fill={a} opacity="0.4" />
      <rect x="16" y="6" width="5" height="3" rx="1" fill={a} opacity="0.4" />
    </g>
  )
  /* unique */
  return (
    <g>
      <rect x="0"  y="0" width="30" height="30" fill={a} opacity="0.05" />
      {/* crânio mágico flutuante */}
      <rect x="12" y="0" width="6"  height="5" rx="2" fill={a} opacity="0.7" />
      <rect x="13" y="1" width="2"  height="2" fill="white" opacity="0.5" />
      <rect x="16" y="1" width="2"  height="2" fill="white" opacity="0.5" />
      <rect x="13" y="3" width="4"  height="1" fill="white" opacity="0.35" />
      {/* aura da capa */}
      <rect x="4"  y="19" width="3" height="11" rx="1" fill={a} opacity="0.3" />
      <rect x="23" y="19" width="3" height="11" rx="1" fill={a} opacity="0.3" />
    </g>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARANHA GIGANTE
// ═══════════════════════════════════════════════════════════════════════════════

function SpiderBase() {
  const b  = '#2a1a2a'; const lg = '#1a1020'; const lh = '#4a3a4a'
  const ab = '#3a2a3a'; const rd = '#cc2222'
  return (
    <g>
      {/* fio de teia */}
      <rect x="14" y="0"  width="2"  height="5"  fill={lh} opacity="0.4" />
      {/* ── 4 pernas lado esquerdo ── */}
      <rect x="0"  y="8"  width="9"  height="2"  rx="1" fill={lg} />
      <rect x="0"  y="5"  width="4"  height="4"  rx="1" fill={lg} />
      <rect x="0"  y="11" width="8"  height="2"  rx="1" fill={lg} />
      <rect x="0"  y="13" width="4"  height="3"  rx="1" fill={lg} />
      <rect x="0"  y="14" width="8"  height="2"  rx="1" fill={lg} />
      <rect x="0"  y="16" width="4"  height="4"  rx="1" fill={lg} />
      <rect x="1"  y="17" width="8"  height="2"  rx="1" fill={lg} />
      <rect x="1"  y="19" width="4"  height="5"  rx="1" fill={lg} />
      {/* ── 4 pernas lado direito ── */}
      <rect x="21" y="8"  width="9"  height="2"  rx="1" fill={lg} />
      <rect x="26" y="5"  width="4"  height="4"  rx="1" fill={lg} />
      <rect x="22" y="11" width="8"  height="2"  rx="1" fill={lg} />
      <rect x="26" y="13" width="4"  height="3"  rx="1" fill={lg} />
      <rect x="22" y="14" width="8"  height="2"  rx="1" fill={lg} />
      <rect x="26" y="16" width="4"  height="4"  rx="1" fill={lg} />
      <rect x="21" y="17" width="8"  height="2"  rx="1" fill={lg} />
      <rect x="25" y="19" width="4"  height="5"  rx="1" fill={lg} />
      {/* articulações */}
      <rect x="6"  y="8"  width="3"  height="3"  rx="1" fill={lh} />
      <rect x="21" y="8"  width="3"  height="3"  rx="1" fill={lh} />
      {/* cefalotórax */}
      <rect x="8"  y="6"  width="14" height="11" rx="3" fill={b} />
      {/* abdômen */}
      <rect x="6"  y="16" width="18" height="13" rx="5" fill={ab} />
      <rect x="10" y="18" width="10" height="2"  rx="1" fill={lh} opacity="0.45" />
      <rect x="11" y="21" width="8"  height="2"  rx="1" fill={lh} opacity="0.3" />
      <rect x="13" y="24" width="4"  height="2"  rx="1" fill={lh} opacity="0.2" />
      <rect x="14" y="16" width="2"  height="13" fill={b} opacity="0.3" />
      {/* 6 olhos vermelhos */}
      <rect x="9"  y="7"  width="3"  height="3"  fill={rd} />
      <rect x="13" y="6"  width="4"  height="3"  fill={rd} />
      <rect x="18" y="7"  width="3"  height="3"  fill={rd} />
      <rect x="10" y="10" width="3"  height="3"  fill={rd} opacity="0.7" />
      <rect x="17" y="10" width="3"  height="3"  fill={rd} opacity="0.7" />
      <rect x="10" y="7"  width="1"  height="1"  fill="white" opacity="0.5" />
      <rect x="14" y="6"  width="2"  height="1"  fill="white" opacity="0.5" />
      <rect x="19" y="7"  width="1"  height="1"  fill="white" opacity="0.5" />
      {/* quelíceros */}
      <rect x="9"  y="16" width="3"  height="5"  rx="1" fill={lh} />
      <rect x="18" y="16" width="3"  height="5"  rx="1" fill={lh} />
      <rect x="10" y="19" width="1"  height="3"  fill="white" opacity="0.4" />
      <rect x="19" y="19" width="1"  height="3"  fill="white" opacity="0.4" />
    </g>
  )
}

function SpiderAccessory({ rarity, enraged }: AccessoryProps) {
  const a = rarity ? (RARITY_ACCENT[rarity] ?? '') : ''
  if (enraged) return (
    <g>
      <EnragedEffect />
      {/* pernas dianteiras levantadas */}
      <rect x="6"  y="3"  width="3" height="5" rx="1" fill="#1a1020" opacity="0.9" />
      <rect x="21" y="3"  width="3" height="5" rx="1" fill="#1a1020" opacity="0.9" />
      {/* veneno pingando */}
      <rect x="10" y="20" width="1" height="4" rx="1" fill="#44cc22" opacity="0.7" />
      <rect x="19" y="20" width="1" height="4" rx="1" fill="#44cc22" opacity="0.7" />
    </g>
  )
  if (!a || rarity === 'normal') return null
  if (rarity === 'uncommon') return (
    <g>
      {/* gotas de veneno nas presas */}
      <rect x="10" y="21" width="1" height="3" rx="1" fill="#44cc22" opacity="0.8" />
      <rect x="19" y="21" width="1" height="3" rx="1" fill="#44cc22" opacity="0.8" />
    </g>
  )
  if (rarity === 'rare') return (
    <g>
      {/* saco de teia no abdômen */}
      <rect x="10" y="26" width="10" height="3" rx="2" fill="#ccc8a0" opacity="0.5" />
      <rect x="11" y="27" width="8"  height="1" fill="white" opacity="0.3" />
    </g>
  )
  if (rarity === 'epic') return (
    <g>
      {/* padrão brilhante no abdômen */}
      <rect x="10" y="18" width="10" height="2" rx="1" fill={a} opacity="0.5" />
      <rect x="11" y="21" width="8"  height="2" rx="1" fill={a} opacity="0.4" />
      <rect x="13" y="24" width="4"  height="2" rx="1" fill={a} opacity="0.3" />
      {/* brilho nos olhos */}
      <rect x="9"  y="7"  width="3" height="3" fill={a} opacity="0.45" />
      <rect x="13" y="6"  width="4" height="3" fill={a} opacity="0.45" />
      <rect x="18" y="7"  width="3" height="3" fill={a} opacity="0.45" />
    </g>
  )
  /* unique */
  return (
    <g>
      <rect x="0"  y="0" width="30" height="30" fill={a} opacity="0.05" />
      {/* rastros etéreos de teia */}
      <rect x="0"  y="5"  width="5" height="1" fill={a} opacity="0.4" />
      <rect x="0"  y="12" width="4" height="1" fill={a} opacity="0.35" />
      <rect x="0"  y="19" width="5" height="1" fill={a} opacity="0.3" />
      <rect x="25" y="5"  width="5" height="1" fill={a} opacity="0.4" />
      <rect x="26" y="12" width="4" height="1" fill={a} opacity="0.35" />
      <rect x="25" y="19" width="5" height="1" fill={a} opacity="0.3" />
      {/* corpo todo brilhante */}
      <rect x="8"  y="6"  width="14" height="11" rx="3" fill={a} opacity="0.2" />
      <rect x="6"  y="16" width="18" height="13" rx="5" fill={a} opacity="0.2" />
    </g>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Componente principal
// ═══════════════════════════════════════════════════════════════════════════════

type BaseComp  = (props: { c?: SlimeColors }) => React.JSX.Element | null
type AccComp   = (props: AccessoryProps) => React.JSX.Element | null

interface MonsterDef {
  Base: BaseComp
  Accessory: AccComp
  /** Se true, usa recolor por raridade no Base (apenas Slime). */
  recolor?: boolean
}

const MONSTERS: Record<string, MonsterDef> = {
  goblin:       { Base: GoblinBase as BaseComp,  Accessory: GoblinAccessory },
  wolf:         { Base: WolfBase as BaseComp,    Accessory: WolfAccessory   },
  slime:        { Base: SlimeBase as BaseComp,   Accessory: SlimeAccessory, recolor: true },
  bandit:       { Base: BanditBase as BaseComp,  Accessory: BanditAccessory },
  giant_spider: { Base: SpiderBase as BaseComp,  Accessory: SpiderAccessory },
}

export const MONSTER_PIXEL_SPRITES = MONSTERS

export function MonsterSprite({
  monsterId,
  rarity  = 'normal',
  enraged = false,
  size    = 80,
}: MonsterSpriteProps) {
  const def = MONSTERS[monsterId]
  if (!def) return null

  // Slime usa recolor; enraged sobrepõe a cor da raridade
  const slimeKey = enraged ? 'enraged' : (rarity ?? 'normal')
  const slimeColors = def.recolor ? (SLIME_COLORS[slimeKey] ?? SLIME_COLORS.normal) : undefined

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 30 30"
      xmlns="http://www.w3.org/2000/svg"
      style={{ transform: 'scaleX(-1)' }}
      aria-label={monsterId}
    >
      <def.Base c={slimeColors} />
      <def.Accessory rarity={rarity} enraged={enraged} />
    </svg>
  )
}
