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

// ─── Pixel-map engine ──────────────────────────────────────────────────────────
// Cada sprite é uma grade de células (chars). O builder desenha formas com
// rect/triângulo numa grade NxN; um passe de contorno adiciona borda preta
// automática ao redor da silhueta. O renderizador agrupa runs horizontais
// da mesma cor num único <rect> (mantém o DOM enxuto e pixels duros).

type Grid = string[][]

function mkGrid(n: number): Grid {
  return Array.from({ length: n }, () => Array<string>(n).fill('.'))
}

/** Preenche um retângulo (x,y,w,h) com o char. '.' apaga. */
function rect(g: Grid, x: number, y: number, w: number, h: number, ch: string) {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      if (g[yy] && xx >= 0 && xx < g.length) g[yy][xx] = ch
    }
  }
}

/** Triângulo apontando para CIMA (estreito no topo). apex em (cx, yTop). */
function triUp(g: Grid, cx: number, yTop: number, height: number, halfBaseMax: number, ch: string) {
  for (let i = 0; i < height; i++) {
    const half = Math.round((i / (height - 1)) * halfBaseMax)
    rect(g, cx - half, yTop + i, half * 2 + 1, 1, ch)
  }
}

/** Triângulo apontando para a DIREITA (ponta à direita). base em xLeft. */
function triRight(g: Grid, xLeft: number, cy: number, length: number, halfBaseMax: number, ch: string) {
  for (let i = 0; i < length; i++) {
    const half = Math.round(((length - 1 - i) / (length - 1)) * halfBaseMax)
    rect(g, xLeft + i, cy - half, 1, half * 2 + 1, ch)
  }
}

/** Adiciona contorno (ch) em toda célula vazia adjacente a uma célula preenchida. */
function outline(g: Grid, ch: string) {
  const n = g.length
  const filled = (x: number, y: number) =>
    y >= 0 && y < n && x >= 0 && x < n && g[y][x] !== '.' && g[y][x] !== ch
  const todo: [number, number][] = []
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (g[y][x] !== '.') continue
      if (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1)) {
        todo.push([x, y])
      }
    }
  }
  for (const [x, y] of todo) g[y][x] = ch
}

function PixelMap({ grid, palette }: { grid: Grid; palette: Record<string, string> }) {
  const cells: React.JSX.Element[] = []
  for (let y = 0; y < grid.length; y++) {
    const row = grid[y]
    let x = 0
    while (x < row.length) {
      const ch = row[x]
      if (ch === '.' || !palette[ch]) { x++; continue }
      let w = 1
      while (x + w < row.length && row[x + w] === ch) w++
      cells.push(<rect key={`${x}-${y}`} x={x} y={y} width={w} height={1} fill={palette[ch]} />)
      x += w
    }
  }
  return <g shapeRendering="crispEdges">{cells}</g>
}

// ─── Shared: rage effect ──────────────────────────────────────────────────────

function EnragedEffect({ g = 30 }: { g?: number } = {}) {
  return (
    <g>
      <rect x="0"        y={g * 0.10} width={g * 0.10} height={g * 0.07} fill="#ff4422" opacity="0.80" />
      <rect x={g * 0.90} y={g * 0.10} width={g * 0.10} height={g * 0.07} fill="#ff4422" opacity="0.80" />
      <rect x="0"        y={g * 0.30} width={g * 0.07} height={g * 0.10} fill="#ff6622" opacity="0.55" />
      <rect x={g * 0.93} y={g * 0.30} width={g * 0.07} height={g * 0.10} fill="#ff6622" opacity="0.55" />
      <rect x={g * 0.13} y="0"        width={g * 0.13} height={g * 0.07} fill="#ff4422" opacity="0.45" />
      <rect x={g * 0.73} y="0"        width={g * 0.13} height={g * 0.07} fill="#ff4422" opacity="0.45" />
    </g>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// GOBLIN
// ═══════════════════════════════════════════════════════════════════════════════

const GOBLIN_PALETTE: Record<string, string> = {
  B: '#52a83c',  // verde base
  S: '#2e6e1e',  // verde sombra
  L: '#74c258',  // verde brilho
  H: '#8fd072',  // verde brilho forte
  K: '#0e2b0b',  // contorno
  E: '#e23030',  // olho
  e: '#ff8a7a',  // brilho do olho
  P: '#6a0a0a',  // pupila
  M: '#170505',  // boca
  F: '#f4ead0',  // presa
  v: '#6a4818',  // couro
  w: '#43290c',  // couro escuro
  x: '#8a6224',  // couro brilho
  Y: '#d8b13a',  // fivela
  y: '#f2d878',  // fivela brilho
  c: '#7a5420',  // madeira (clava)
  k: '#4a3010',  // madeira escura
}

function buildGoblinGrid(): Grid {
  const g = mkGrid(64)

  // ════ Goblin de CORPO INTEIRO, de frente, postura agachada ════

  // ── pernas (curtas, arqueadas) ──
  rect(g, 19, 47, 10, 14, 'B')   // perna esquerda
  rect(g, 35, 47, 10, 14, 'B')   // perna direita
  rect(g, 19, 47, 3, 12, 'L')    // brilho
  rect(g, 42, 49, 3, 10, 'S')    // sombra
  rect(g, 19, 47, 10, 2, 'S'); rect(g, 35, 47, 10, 2, 'S')  // vinco da coxa
  // pés com garras
  rect(g, 15, 59, 15, 4, 'S'); rect(g, 34, 59, 15, 4, 'S')
  rect(g, 15, 62, 2, 2, 'K'); rect(g, 20, 62, 2, 2, 'K'); rect(g, 25, 62, 2, 2, 'K')
  rect(g, 35, 62, 2, 2, 'K'); rect(g, 40, 62, 2, 2, 'K'); rect(g, 45, 62, 2, 2, 'K')

  // ── braço esquerdo (pendente) ──
  rect(g, 9, 28, 9, 19, 'B')
  rect(g, 9, 28, 2, 16, 'L')
  rect(g, 8, 44, 10, 6, 'B')     // punho
  rect(g, 8, 44, 10, 2, 'S')

  // ── braço direito (segura a clava pra baixo) ──
  rect(g, 46, 28, 9, 17, 'B')
  rect(g, 52, 29, 2, 14, 'S')
  rect(g, 46, 42, 11, 6, 'B')    // punho
  rect(g, 46, 42, 11, 2, 'S')

  // ── clava abaixada na mão direita (longe da cabeça) ──
  rect(g, 49, 38, 5, 12, 'c')    // cabo
  rect(g, 49, 38, 2, 12, 'k')
  rect(g, 45, 48, 13, 11, 'c')   // cabeça da clava
  rect(g, 46, 49, 11, 9, 'k')
  rect(g, 48, 51, 2, 2, 'x'); rect(g, 53, 52, 2, 2, 'x'); rect(g, 50, 55, 2, 2, 'x')  // cravos

  // ── tronco (barrigudo) + colete de couro ──
  rect(g, 16, 27, 32, 21, 'B')
  rect(g, 16, 27, 3, 3, '.'); rect(g, 45, 27, 3, 3, '.')   // ombros arredondados
  rect(g, 16, 45, 3, 3, '.'); rect(g, 45, 45, 3, 3, '.')   // quadril arredondado
  // colete sobre o peito
  rect(g, 17, 27, 30, 10, 'v')
  rect(g, 20, 29, 11, 5, 'x')    // brilho do peito
  rect(g, 31, 28, 3, 9, 'w')     // costura central
  rect(g, 41, 29, 5, 7, 'w')     // sombra direita
  // barriga verde exposta
  rect(g, 23, 38, 16, 6, 'L')
  rect(g, 25, 40, 12, 3, 'H')
  // cinto + tanga
  rect(g, 16, 43, 32, 4, 'w')
  rect(g, 28, 42, 9, 5, 'Y'); rect(g, 30, 43, 4, 3, 'y')   // fivela
  rect(g, 27, 46, 11, 8, 'v'); rect(g, 29, 47, 7, 6, 'w')  // tanga

  // ── pescoço ──
  rect(g, 27, 24, 10, 5, 'B')
  rect(g, 27, 24, 10, 2, 'S')

  // ── cabeça (grande) ──
  rect(g, 17, 3, 30, 23, 'B')
  rect(g, 17, 3, 4, 4, '.'); rect(g, 43, 3, 4, 4, '.')   // topo arredondado
  rect(g, 17, 22, 3, 4, '.'); rect(g, 44, 22, 3, 4, '.') // queixo arredondado
  rect(g, 23, 6, 16, 3, 'L')     // testa brilho
  rect(g, 27, 7, 8, 2, 'H')
  rect(g, 20, 20, 24, 4, 'S')    // sombra do maxilar
  rect(g, 40, 8, 5, 14, 'S')     // sombra lateral

  // ── orelhas grandes pontudas (laterais, escalonadas) ──
  rect(g, 11, 9, 8, 9, 'B'); rect(g, 6, 10, 7, 5, 'B'); rect(g, 3, 11, 5, 3, 'B')   // esq
  rect(g, 9, 11, 6, 5, 'S')
  rect(g, 45, 9, 8, 9, 'B'); rect(g, 51, 10, 7, 5, 'B'); rect(g, 56, 11, 5, 3, 'B') // dir
  rect(g, 49, 11, 6, 5, 'S')

  // ── sobrancelhas bravas + olhos vermelhos ──
  rect(g, 20, 10, 11, 2, 'K'); rect(g, 33, 10, 11, 2, 'K')
  rect(g, 28, 12, 8, 2, 'K')     // vinco entre as sobrancelhas
  rect(g, 21, 12, 9, 6, 'E'); rect(g, 34, 12, 9, 6, 'E')
  rect(g, 24, 14, 4, 4, 'P');  rect(g, 37, 14, 4, 4, 'P')
  rect(g, 22, 13, 3, 2, 'e');  rect(g, 35, 13, 3, 2, 'e')

  // ── nariz ──
  rect(g, 29, 17, 6, 6, 'B')
  rect(g, 29, 17, 6, 2, 'S')
  rect(g, 30, 18, 2, 2, 'L')
  rect(g, 30, 21, 1, 2, 'K'); rect(g, 33, 21, 1, 2, 'K')   // narinas

  // ── boca larga + presas ──
  rect(g, 22, 23, 20, 3, 'M')
  rect(g, 24, 23, 2, 4, 'F'); rect(g, 38, 23, 2, 4, 'F')   // presas superiores
  rect(g, 30, 25, 2, 2, 'F'); rect(g, 33, 25, 2, 2, 'F')   // inferiores

  outline(g, 'K')
  return g
}

const GOBLIN_GRID = buildGoblinGrid()

function GoblinBase() {
  return <PixelMap grid={GOBLIN_GRID} palette={GOBLIN_PALETTE} />
}

function GoblinAccessory({ rarity, enraged }: AccessoryProps) {
  const a = rarity ? (RARITY_ACCENT[rarity] ?? '#fff') : '#fff'
  if (enraged) return (
    <g>
      <EnragedEffect g={64} />
      <rect x="20" y="6" width="11" height="2" fill="#ff2200" opacity="0.7" />
      <rect x="33" y="6" width="11" height="2" fill="#ff2200" opacity="0.7" />
    </g>
  )
  if (!rarity || rarity === 'normal') return null
  if (rarity === 'uncommon') return (
    <g>
      {/* escudo de madeira no braço esquerdo */}
      <rect x="1"  y="30" width="14" height="20" rx="3" fill="#8a5a2a" />
      <rect x="3"  y="32" width="10" height="16" rx="2" fill="#6a3a10" />
      <rect x="7"  y="34" width="2"  height="12"     fill={a} opacity="0.7" />
      <rect x="4"  y="38" width="8"  height="2"      fill={a} opacity="0.5" />
    </g>
  )
  if (rarity === 'rare') return (
    <g>
      {/* capacete de ferro */}
      <rect x="16" y="0" width="32" height="10" rx="4" fill="#7a8a9a" />
      <rect x="19" y="1" width="26" height="4"  rx="3" fill="#9aaaba" opacity="0.6" />
      <rect x="17" y="8" width="30" height="2"       fill="#4a5a6a" />
      <rect x="30" y="8" width="4"  height="6"       fill="#5a6a7a" />
    </g>
  )
  if (rarity === 'epic') return (
    <g>
      {/* capacete com chifres + olhos brilhantes */}
      <rect x="16" y="1" width="32" height="9" rx="4" fill="#5a4a7a" />
      <rect x="19" y="1" width="26" height="3" rx="2" fill="#7a6a9a" opacity="0.5" />
      <rect x="9"  y="0" width="8"  height="9" rx="2" fill={a} opacity="0.9" />
      <rect x="47" y="0" width="8"  height="9" rx="2" fill={a} opacity="0.9" />
      <rect x="21" y="12" width="9" height="6" rx="2" fill={a} opacity="0.35" />
      <rect x="34" y="12" width="9" height="6" rx="2" fill={a} opacity="0.35" />
    </g>
  )
  /* unique */
  return (
    <g>
      <rect x="0"  y="0" width="64" height="64" fill={a} opacity="0.04" />
      {/* coroa */}
      <rect x="21" y="0" width="22" height="6" rx="1" fill={a} />
      <rect x="23" y="0" width="3"  height="5"      fill={a} />
      <rect x="30" y="0" width="4"  height="7" rx="1" fill={a} />
      <rect x="39" y="0" width="3"  height="5"      fill={a} />
      <rect x="22" y="0" width="20" height="2"      fill="#fff8c0" opacity="0.5" />
      {/* runas na barriga */}
      <rect x="25" y="39" width="5" height="3" rx="1" fill={a} opacity="0.7" />
      <rect x="34" y="39" width="5" height="3" rx="1" fill={a} opacity="0.7" />
    </g>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOBO — quadrúpede de perfil (projetado virado à direita; scaleX(-1) → vira à esquerda)
// ═══════════════════════════════════════════════════════════════════════════════

const WOLF_PALETTE: Record<string, string> = {
  B: '#2c313b',  // pelo base
  S: '#1b2028',  // sombra
  D: '#12151c',  // sombra profunda
  L: '#3e4654',  // brilho
  H: '#515b6b',  // brilho forte
  G: '#14171e',  // pata escura / casco
  R: '#d83030',  // olho vermelho
  r: '#ff7058',  // brilho do olho
  N: '#050507',  // nariz
  F: '#e8e2cc',  // presa
  i: '#5a2a2a',  // interior da orelha
  K: '#090b10',  // contorno
}

function buildWolfGrid(): Grid {
  const g = mkGrid(64)

  // ── cauda peluda (rear esquerda, caída) ──
  rect(g, 2, 26, 12, 9, 'B')
  rect(g, 0, 33, 11, 9, 'B')
  rect(g, 1, 41, 9, 9, 'B')
  rect(g, 3, 27, 6, 5, 'L')
  rect(g, 1, 45, 8, 5, 'S')
  rect(g, 1, 48, 7, 2, 'D')

  // ── corpo: anca + tronco + cernelha (longo, lombo arqueado) ──
  rect(g, 6,  24, 22, 18, 'B')   // anca traseira
  rect(g, 18, 25, 28, 14, 'B')   // tronco
  rect(g, 38, 22, 13, 18, 'B')   // cernelha/peito (sobe pra cabeça)
  // arredonda quinas do lombo/garupa
  rect(g, 6,  24, 2, 2, '.')
  rect(g, 6,  40, 2, 2, '.')
  // brilho do lombo + sombra do ventre
  rect(g, 8,  24, 38, 2, 'L')
  rect(g, 12, 25, 28, 1, 'H')
  rect(g, 10, 37, 34, 2, 'S')

  // ── patas (longas, passada aberta; distantes mais escuras) ──
  rect(g, 13, 39, 5, 20, 'S')   // traseira distante (recuada)
  rect(g, 47, 41, 5, 18, 'S')   // dianteira distante (adiantada)
  rect(g, 22, 39, 5, 20, 'B')   // traseira próxima (adiantada)
  rect(g, 39, 41, 5, 18, 'B')   // dianteira próxima (recuada)
  rect(g, 22, 39, 2, 16, 'L')
  rect(g, 39, 41, 2, 14, 'L')
  // cascos
  rect(g, 13, 57, 5, 2, 'G')
  rect(g, 22, 57, 5, 2, 'G')
  rect(g, 39, 57, 5, 2, 'G')
  rect(g, 47, 57, 5, 2, 'G')

  // ── cabeça (direita, baixa) ──
  rect(g, 45, 20, 16, 18, 'B')
  rect(g, 60, 19, 1, 2, '.')    // suaviza topo-direita
  rect(g, 46, 21, 9, 2, 'L')    // brilho da testa
  rect(g, 46, 33, 14, 4, 'S')   // sombra da bochecha/mandíbula

  // ── focinho — cunha afiada à direita ──
  triRight(g, 56, 33, 8, 4, 'B')
  rect(g, 60, 33, 3, 4, 'S')
  rect(g, 62, 33, 2, 3, 'N')    // nariz
  rect(g, 52, 35, 10, 2, 'D')   // linha da boca

  // ── orelhas pontudas ──
  triUp(g, 48, 9, 12, 4, 'B')   // próxima
  rect(g, 47, 16, 3, 4, 'i')    // interior
  triUp(g, 55, 10, 11, 3, 'S')  // distante (atrás)

  // ── olho vermelho ──
  rect(g, 49, 27, 4, 3, 'R')
  rect(g, 49, 27, 2, 2, 'r')

  // ── presas ──
  rect(g, 57, 36, 2, 3, 'F')
  rect(g, 61, 35, 1, 2, 'F')

  // ── contorno automático ──
  outline(g, 'K')
  return g
}

const WOLF_GRID = buildWolfGrid()

function WolfBase() {
  return <PixelMap grid={WOLF_GRID} palette={WOLF_PALETTE} />
}

function WolfAccessory({ rarity, enraged }: AccessoryProps) {
  const a = rarity ? (RARITY_ACCENT[rarity] ?? '#fff') : '#fff'
  if (enraged) return (
    <g>
      <EnragedEffect g={64} />
      {/* babas escorrendo do focinho */}
      <rect x="62" y="37" width="2" height="8"  rx="1" fill="white" opacity="0.6" />
      <rect x="58" y="38" width="1" height="6"  rx="1" fill="white" opacity="0.4" />
    </g>
  )
  if (!rarity || rarity === 'normal') return null
  if (rarity === 'uncommon') return (
    <g>
      {/* coleira com espinhos no pescoço */}
      <rect x="44" y="27" width="6" height="13" rx="1" fill="#4a3a2a" />
      <rect x="42" y="28" width="2" height="3"       fill="#7a5a2a" />
      <rect x="42" y="33" width="2" height="3"       fill="#7a5a2a" />
      <rect x="50" y="29" width="2" height="3"       fill="#7a5a2a" />
    </g>
  )
  if (rarity === 'rare') return (
    <g>
      {/* colar de ossos no peito */}
      <rect x="42" y="28" width="7" height="3" rx="1" fill="#3a2a10" />
      <rect x="42" y="31" width="4" height="6" rx="2" fill="#c8aa80" />
      <rect x="46" y="33" width="4" height="6" rx="2" fill="#c8aa80" />
      <rect x="39" y="34" width="4" height="6" rx="2" fill="#c8aa80" />
    </g>
  )
  if (rarity === 'epic') return (
    <g>
      {/* olho incandescente */}
      <rect x="49" y="26" width="6" height="6" rx="1" fill={a} opacity="0.55" />
      {/* patas brilhantes */}
      <rect x="25" y="56" width="8" height="4" fill={a} opacity="0.8" />
      <rect x="37" y="56" width="8" height="4" fill={a} opacity="0.8" />
      {/* manchas no pelo do lombo */}
      <rect x="12" y="24" width="8" height="3" rx="1" fill={a} opacity="0.3" />
      <rect x="26" y="24" width="6" height="3" rx="1" fill={a} opacity="0.25" />
    </g>
  )
  /* unique */
  return (
    <g>
      {/* runas no lombo */}
      <rect x="12" y="24" width="6" height="3" rx="1" fill={a} opacity="0.6" />
      <rect x="26" y="24" width="6" height="3" rx="1" fill={a} opacity="0.6" />
      <rect x="19" y="30" width="6" height="3" rx="1" fill={a} opacity="0.4" />
      {/* rastro sombrio atrás da cauda */}
      <rect x="0"  y="15" width="8" height="14" rx="3" fill={a} opacity="0.2" />
      <rect x="0"  y="30" width="6" height="12" rx="3" fill={a} opacity="0.15" />
      <rect x="0"  y="0"  width="64" height="64" fill={a} opacity="0.04" />
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
  // contorno = versão bem escura da cor principal
  const out = d
  return (
    <g>
      {/* contorno geral (sombra atrás do corpo) */}
      <rect x="1"  y="6"  width="28" height="23" rx="7" fill={out} />
      {/* forma do topo */}
      <rect x="8"  y="4"  width="14" height="6" rx="5" fill={out} />
      <rect x="9"  y="4"  width="12" height="5" rx="4" fill={m} />
      {/* corpo principal */}
      <rect x="2"  y="8"  width="26" height="19" rx="7" fill={m} />
      {/* sombra inferior interna */}
      <rect x="4"  y="22" width="22" height="5" rx="4" fill={d} opacity="0.45" />
      {/* sombra lateral direita */}
      <rect x="23" y="9"  width="4"  height="15"      fill={d} opacity="0.3" />
      {/* gloss principal (brilho gelatinoso) */}
      <rect x="6"  y="6"  width="9"  height="4" rx="2" fill={l} opacity="0.6" />
      <rect x="6"  y="10" width="4"  height="6" rx="2" fill={l} opacity="0.35" />
      <rect x="5"  y="6"  width="3"  height="3" rx="1" fill="#ffffff" opacity="0.5" />
      {/* bolhas internas */}
      <rect x="20" y="11" width="3"  height="3" rx="1" fill={l} opacity="0.3" />
      <rect x="16" y="7"  width="2"  height="2" rx="1" fill={l} opacity="0.4" />
      {/* olhos */}
      <rect x="7"  y="13" width="7"  height="8" rx="3" fill="#f4f8f4" />
      <rect x="16" y="13" width="7"  height="8" rx="3" fill="#f4f8f4" />
      <rect x="8"  y="14" width="5"  height="6" rx="2" fill="#16241a" />
      <rect x="17" y="14" width="5"  height="6" rx="2" fill="#16241a" />
      <rect x="10" y="15" width="2"  height="3" fill="#ffffff" opacity="0.85" />
      <rect x="19" y="15" width="2"  height="3" fill="#ffffff" opacity="0.85" />
      {/* boca sorridente */}
      <rect x="10" y="22" width="10" height="2" rx="1" fill="#0e1c0e" />
      <rect x="9"  y="21" width="2"  height="1" fill="#0e1c0e" />
      <rect x="19" y="21" width="2"  height="1" fill="#0e1c0e" />
      {/* pingos laterais */}
      <rect x="0"  y="16" width="4"  height="9" rx="2" fill={out} />
      <rect x="0"  y="16" width="3"  height="8" rx="2" fill={m} />
      <rect x="26" y="16" width="4"  height="9" rx="2" fill={out} />
      <rect x="27" y="16" width="3"  height="8" rx="2" fill={m} />
      {/* pingo escorrendo embaixo */}
      <rect x="12" y="26" width="6"  height="4" rx="3" fill={out} />
      <rect x="13" y="26" width="4"  height="3" rx="2" fill={m} />
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
  const hd  = '#262636'  // capa base
  const dk  = '#15151f'  // capa sombra
  const hh  = '#34344a'  // capa brilho
  const out = '#0a0a12'  // contorno
  const sk  = '#caa066'  // pele
  const ey  = '#ffb648'  // olhos brilhando
  const bl  = '#c8ccdc'  // lâmina
  const bh  = '#e6eaf6'  // lâmina brilho
  const bld = '#8890a4'  // lâmina sombra
  const grip = '#46362a'
  return (
    <g>
      {/* ponta do capuz */}
      <rect x="11" y="0"  width="8"  height="5"  rx="2" fill={out} />
      <rect x="12" y="0"  width="6"  height="4"  rx="2" fill={hd} />
      {/* capuz — contorno + base */}
      <rect x="5"  y="3"  width="20" height="15" rx="4" fill={out} />
      <rect x="6"  y="4"  width="18" height="13" rx="3" fill={hd} />
      <rect x="7"  y="4"  width="6"  height="4"        fill={hh} opacity="0.5" />
      {/* interior sombrio do capuz */}
      <rect x="8"  y="5"  width="14" height="10" rx="2" fill={dk} />
      {/* olhos brilhando na sombra */}
      <rect x="9"  y="7"  width="5"  height="3"  rx="1" fill={ey} />
      <rect x="16" y="7"  width="5"  height="3"  rx="1" fill={ey} />
      <rect x="9"  y="7"  width="2"  height="2"  fill="#fff0c0" opacity="0.7" />
      <rect x="16" y="7"  width="2"  height="2"  fill="#fff0c0" opacity="0.7" />
      {/* faixa do rosto (lenço) */}
      <rect x="8"  y="11" width="14" height="4"  rx="1" fill="#1e1414" />
      <rect x="8"  y="11" width="14" height="1"        fill={sk} opacity="0.3" />
      {/* capa / corpo */}
      <rect x="3"  y="18" width="24" height="12" rx="3" fill={out} />
      <rect x="4"  y="18" width="22" height="11" rx="3" fill={hd} />
      <rect x="5"  y="19" width="3"  height="10"       fill={hh} opacity="0.4" />
      <rect x="14" y="18" width="2"  height="11"       fill={dk} opacity="0.5" />
      <rect x="23" y="19" width="3"  height="10"       fill={dk} opacity="0.5" />
      {/* braços */}
      <rect x="1"  y="18" width="4"  height="11" rx="2" fill={out} />
      <rect x="1"  y="18" width="3"  height="10" rx="2" fill={hd} />
      <rect x="25" y="18" width="4"  height="11" rx="2" fill={out} />
      <rect x="26" y="18" width="3"  height="10" rx="2" fill={hd} />
      {/* adaga esquerda */}
      <rect x="0"  y="7"  width="4"  height="14" rx="1" fill={out} />
      <rect x="1"  y="7"  width="3"  height="13" rx="1" fill={bl} />
      <rect x="1"  y="7"  width="1"  height="13"       fill={bh} opacity="0.6" />
      <rect x="3"  y="8"  width="1"  height="12"       fill={bld} />
      <rect x="0"  y="18" width="5"  height="2"  rx="1" fill="#9498ac" />
      <rect x="1"  y="20" width="3"  height="4"  rx="1" fill={grip} />
      {/* adaga direita */}
      <rect x="26" y="7"  width="4"  height="14" rx="1" fill={out} />
      <rect x="26" y="7"  width="3"  height="13" rx="1" fill={bl} />
      <rect x="26" y="7"  width="1"  height="13"       fill={bh} opacity="0.6" />
      <rect x="28" y="8"  width="1"  height="12"       fill={bld} />
      <rect x="25" y="18" width="5"  height="2"  rx="1" fill="#9498ac" />
      <rect x="26" y="20" width="3"  height="4"  rx="1" fill={grip} />
      {/* pernas */}
      <rect x="7"  y="26" width="6"  height="4"  rx="1" fill={out} />
      <rect x="7"  y="26" width="6"  height="3"  rx="1" fill={dk} />
      <rect x="17" y="26" width="6"  height="4"  rx="1" fill={out} />
      <rect x="17" y="26" width="6"  height="3"  rx="1" fill={dk} />
      {/* botas */}
      <rect x="5"  y="28" width="9"  height="2"  rx="1" fill="#0a0a10" />
      <rect x="16" y="28" width="9"  height="2"  rx="1" fill="#0a0a10" />
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
  const b   = '#322038'  // cefalotórax
  const ab  = '#412e44'  // abdômen
  const lg  = '#241628'  // pernas
  const lgh = '#4e3c52'  // perna brilho
  const lh  = '#5a465e'  // articulação
  const out = '#140a16'  // contorno
  const rd  = '#e23030'  // olhos
  const fang = '#d8ccd8'
  // helper: perna com contorno (segmento horizontal + descida)
  const leg = (hx: number, hy: number, hw: number, vx: number, vy: number, vh: number) => (
    <>
      <rect x={hx} y={hy} width={hw} height="2" rx="1" fill={out} />
      <rect x={hx} y={hy} width={hw} height="1" rx="1" fill={lgh} opacity="0.5" />
      <rect x={vx} y={vy} width="3" height={vh} rx="1" fill={out} />
      <rect x={vx} y={vy} width="2" height={vh} rx="1" fill={lg} />
    </>
  )
  return (
    <g>
      {/* fio de teia */}
      <rect x="14" y="0"  width="2"  height="5"  fill={lh} opacity="0.4" />
      {/* ── 4 pernas lado esquerdo ── */}
      {leg(0, 5,  9, 0, 3,  4)}
      {leg(0, 11, 8, 0, 12, 4)}
      {leg(0, 15, 8, 0, 16, 5)}
      {leg(1, 18, 8, 1, 19, 6)}
      {/* ── 4 pernas lado direito ── */}
      {leg(21, 5,  9, 27, 3,  4)}
      {leg(22, 11, 8, 27, 12, 4)}
      {leg(22, 15, 8, 27, 16, 5)}
      {leg(21, 18, 8, 26, 19, 6)}
      {/* articulações */}
      <rect x="6"  y="8"  width="3"  height="3"  rx="1" fill={lh} />
      <rect x="21" y="8"  width="3"  height="3"  rx="1" fill={lh} />
      {/* abdômen — contorno + base */}
      <rect x="5"  y="15" width="20" height="15" rx="6" fill={out} />
      <rect x="6"  y="15" width="18" height="14" rx="5" fill={ab} />
      {/* padrão dorsal claro */}
      <rect x="10" y="18" width="10" height="2"  rx="1" fill={lh} opacity="0.55" />
      <rect x="11" y="21" width="8"  height="2"  rx="1" fill={lh} opacity="0.4" />
      <rect x="13" y="24" width="4"  height="2"  rx="1" fill={lh} opacity="0.3" />
      {/* marca de ampulheta vermelha */}
      <rect x="13" y="19" width="4"  height="2"        fill={rd} opacity="0.5" />
      <rect x="14" y="21" width="2"  height="3"        fill={rd} opacity="0.4" />
      {/* sombra lateral */}
      <rect x="22" y="16" width="2"  height="12"       fill={out} opacity="0.4" />
      {/* cefalotórax — contorno + base */}
      <rect x="7"  y="5"  width="16" height="13" rx="4" fill={out} />
      <rect x="8"  y="6"  width="14" height="11" rx="3" fill={b} />
      <rect x="9"  y="6"  width="12" height="2"  rx="1" fill={lgh} opacity="0.4" />
      {/* 6 olhos vermelhos */}
      <rect x="9"  y="8"  width="3"  height="3"  rx="1" fill={rd} />
      <rect x="13" y="7"  width="4"  height="3"  rx="1" fill={rd} />
      <rect x="18" y="8"  width="3"  height="3"  rx="1" fill={rd} />
      <rect x="10" y="11" width="3"  height="2"  rx="1" fill={rd} opacity="0.7" />
      <rect x="17" y="11" width="3"  height="2"  rx="1" fill={rd} opacity="0.7" />
      <rect x="9"  y="8"  width="1"  height="1"  fill="#ff9090" opacity="0.8" />
      <rect x="14" y="7"  width="1"  height="1"  fill="#ff9090" opacity="0.8" />
      <rect x="18" y="8"  width="1"  height="1"  fill="#ff9090" opacity="0.8" />
      {/* quelíceros / presas */}
      <rect x="9"  y="16" width="3"  height="5"  rx="1" fill={lh} />
      <rect x="18" y="16" width="3"  height="5"  rx="1" fill={lh} />
      <rect x="10" y="19" width="1"  height="3"  fill={fang} opacity="0.6" />
      <rect x="19" y="19" width="1"  height="3"  fill={fang} opacity="0.6" />
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
  /** Resolução nativa do grid (viewBox quadrado). Default 30. */
  grid?: number
}

const MONSTERS: Record<string, MonsterDef> = {
  goblin:       { Base: GoblinBase as BaseComp,  Accessory: GoblinAccessory, grid: 64 },
  wolf:         { Base: WolfBase as BaseComp,    Accessory: WolfAccessory,   grid: 64 },
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
  const grid = def.grid ?? 30

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${grid} ${grid}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ transform: 'scaleX(-1)' }}
      aria-label={monsterId}
    >
      <def.Base c={slimeColors} />
      <def.Accessory rarity={rarity} enraged={enraged} />
    </svg>
  )
}
