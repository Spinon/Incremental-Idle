/**
 * MonsterSprites — pixel art de monstros no mesmo estilo dos sprites do herói.
 * viewBox compartilhado: "0 0 20 30" (idêntico ao HeroComposer).
 * Cada monstro é renderizado com scaleX(-1) para encarar o herói (virado à esquerda).
 */

// ─── Goblin ───────────────────────────────────────────────────────────────────
// Verde, pequeno, cabeça grande, clava — agressivo e primitivo

function GoblinPixel() {
  const s  = '#4a9a36'  // pele verde
  const d  = '#2a6a18'  // verde escuro / sombra
  const h  = '#6aba50'  // destaque
  const e  = '#cc2222'  // olho vermelho
  const ep = '#881111'  // pupila
  const b  = '#5a3a10'  // couro marrom
  const bd = '#3a2208'  // marrom escuro
  const cl = '#6a4a1a'  // madeira da clava
  const ch = '#3a2008'  // clava escura
  return (
    <g>
      {/* orelhas pontudas */}
      <rect x="2"  y="3"  width="3" height="6" rx="1" fill={s} />
      <rect x="15" y="3"  width="3" height="6" rx="1" fill={s} />
      <rect x="2"  y="3"  width="1" height="4" fill={d} opacity="0.4" />
      <rect x="17" y="3"  width="1" height="4" fill={d} opacity="0.4" />
      {/* cabeça — grande para o corpo */}
      <rect x="4"  y="1"  width="12" height="11" rx="2" fill={s} />
      {/* sobrancelha / crista */}
      <rect x="5"  y="2"  width="10" height="3"  rx="1" fill={d} />
      {/* sombra queixo */}
      <rect x="5"  y="10" width="10" height="2"  rx="1" fill={d} opacity="0.4" />
      {/* destaque testa */}
      <rect x="6"  y="1"  width="4"  height="2"  rx="1" fill={h} opacity="0.3" />
      {/* olhos (grandes, vermelhos) */}
      <rect x="5"  y="4"  width="4"  height="3"  rx="1" fill={e} />
      <rect x="11" y="4"  width="4"  height="3"  rx="1" fill={e} />
      <rect x="6"  y="4"  width="2"  height="3"  fill={ep} />
      <rect x="12" y="4"  width="2"  height="3"  fill={ep} />
      <rect x="7"  y="4"  width="1"  height="1"  fill="white" opacity="0.7" />
      <rect x="13" y="4"  width="1"  height="1"  fill="white" opacity="0.7" />
      {/* nariz */}
      <rect x="8"  y="8"  width="4"  height="2"  rx="1" fill={d} />
      <rect x="9"  y="8"  width="1"  height="1"  fill={d} opacity="0.8" />
      <rect x="11" y="8"  width="1"  height="1"  fill={d} opacity="0.8" />
      {/* boca com presas */}
      <rect x="5"  y="10" width="10" height="2"  fill="#1a0808" />
      <rect x="7"  y="10" width="2"  height="1"  fill="#f8f8e0" />
      <rect x="11" y="10" width="2"  height="1"  fill="#f8f8e0" />
      {/* pescoço */}
      <rect x="7"  y="12" width="6"  height="2"  fill={s} />
      {/* corpo — colete de couro */}
      <rect x="4"  y="14" width="12" height="8"  rx="1" fill={b} />
      <rect x="6"  y="15" width="8"  height="5"  fill={bd} opacity="0.5" />
      <rect x="9"  y="14" width="2"  height="8"  fill={bd} opacity="0.4" />
      {/* braço esquerdo */}
      <rect x="1"  y="14" width="4"  height="8"  rx="1" fill={s} />
      <rect x="1"  y="21" width="4"  height="2"  rx="1" fill={d} opacity="0.5" />
      {/* braço direito (empunhando clava) */}
      <rect x="15" y="14" width="4"  height="8"  rx="1" fill={s} />
      {/* clava */}
      <rect x="16" y="2"  width="2"  height="14" rx="1" fill={cl} />
      <rect x="16" y="8"  width="2"  height="1"  fill={ch} opacity="0.5" />
      <rect x="16" y="12" width="2"  height="1"  fill={ch} opacity="0.5" />
      {/* cabeça da clava */}
      <rect x="14" y="0"  width="5"  height="4"  rx="1" fill={ch} />
      <rect x="15" y="0"  width="2"  height="2"  fill={cl} opacity="0.5" />
      {/* pernas */}
      <rect x="5"  y="22" width="4"  height="7"  rx="1" fill={s} />
      <rect x="11" y="22" width="4"  height="7"  rx="1" fill={s} />
      {/* pés */}
      <rect x="4"  y="28" width="5"  height="2"  rx="1" fill={d} />
      <rect x="11" y="28" width="5"  height="2"  rx="1" fill={d} />
    </g>
  )
}

// ─── Lobo ─────────────────────────────────────────────────────────────────────
// Cinza, postura ereta, focinho saliente, olhos âmbar — bestial e veloz

function WolfPixel() {
  const f  = '#6a7a8a'  // pelo cinza
  const d  = '#4a5a6a'  // cinza escuro
  const li = '#8a9aaa'  // pelo claro (peito)
  const ey = '#c8a020'  // olho âmbar
  const ep = '#3a2800'  // pupila
  const dn = '#2a2030'  // focinho escuro
  return (
    <g>
      {/* orelhas pontudas */}
      <rect x="5"  y="0"  width="3"  height="4"  rx="1" fill={f} />
      <rect x="12" y="0"  width="3"  height="4"  rx="1" fill={f} />
      <rect x="6"  y="0"  width="1"  height="3"  fill="#cc5555" opacity="0.5" />
      <rect x="13" y="0"  width="1"  height="3"  fill="#cc5555" opacity="0.5" />
      {/* cabeça */}
      <rect x="5"  y="3"  width="10" height="8"  rx="2" fill={f} />
      {/* destaque crânio */}
      <rect x="7"  y="3"  width="5"  height="2"  rx="1" fill={li} opacity="0.3" />
      {/* focinho — projeta para a esquerda */}
      <rect x="1"  y="6"  width="7"  height="5"  rx="1" fill={dn} />
      <rect x="2"  y="6"  width="4"  height="3"  fill={d} opacity="0.4" />
      {/* narinas */}
      <rect x="2"  y="7"  width="2"  height="2"  rx="1" fill="#0a0a0a" />
      {/* presas */}
      <rect x="2"  y="10" width="2"  height="3"  rx="1" fill="#f8f8e0" />
      <rect x="6"  y="10" width="2"  height="2"  rx="1" fill="#f8f8e0" />
      {/* olhos (âmbar) */}
      <rect x="7"  y="4"  width="3"  height="3"  rx="1" fill={ey} />
      <rect x="12" y="4"  width="3"  height="3"  rx="1" fill={ey} />
      <rect x="8"  y="5"  width="1"  height="1"  fill={ep} />
      <rect x="13" y="5"  width="1"  height="1"  fill={ep} />
      <rect x="9"  y="4"  width="1"  height="1"  fill="white" opacity="0.5" />
      <rect x="14" y="4"  width="1"  height="1"  fill="white" opacity="0.5" />
      {/* pescoço */}
      <rect x="7"  y="11" width="6"  height="2"  fill={f} />
      {/* corpo */}
      <rect x="4"  y="13" width="12" height="9"  rx="1" fill={f} />
      {/* peito mais claro */}
      <rect x="7"  y="14" width="6"  height="6"  fill={li} opacity="0.35" />
      {/* rabo (lado direito) */}
      <rect x="14" y="13" width="5"  height="2"  rx="2" fill={f} />
      <rect x="15" y="15" width="4"  height="3"  rx="2" fill={f} />
      <rect x="16" y="17" width="3"  height="3"  rx="2" fill={li} opacity="0.4" />
      {/* braço esquerdo */}
      <rect x="1"  y="13" width="4"  height="8"  rx="1" fill={f} />
      <rect x="1"  y="20" width="4"  height="2"  rx="1" fill={d} />
      {/* garras esquerda */}
      <rect x="1"  y="21" width="1"  height="2"  fill={d} />
      <rect x="3"  y="21" width="1"  height="2"  fill={d} />
      {/* braço direito */}
      <rect x="15" y="13" width="4"  height="8"  rx="1" fill={f} />
      <rect x="15" y="20" width="4"  height="2"  rx="1" fill={d} />
      {/* pernas */}
      <rect x="5"  y="22" width="4"  height="7"  rx="1" fill={d} />
      <rect x="11" y="22" width="4"  height="7"  rx="1" fill={d} />
      {/* patas */}
      <rect x="4"  y="28" width="5"  height="2"  rx="1" fill={d} />
      <rect x="11" y="28" width="5"  height="2"  rx="1" fill={d} />
      {/* garras patas */}
      <rect x="4"  y="29" width="1"  height="1"  fill={d} />
      <rect x="7"  y="29" width="1"  height="1"  fill={d} />
    </g>
  )
}

// ─── Slime ───────────────────────────────────────────────────────────────────
// Verde brilhante, blob amorfo, olhos grandes e expressivos

function SlimePixel() {
  const g  = '#2aba44'  // verde vibrante
  const d  = '#1a8a2a'  // verde escuro
  const li = '#5ade64'  // verde claro / destaque
  return (
    <g>
      {/* bolhas decorativas (atrás do corpo) */}
      <rect x="3"  y="4"  width="2"  height="2"  rx="1" fill={li} opacity="0.3" />
      <rect x="15" y="3"  width="2"  height="2"  rx="1" fill={li} opacity="0.3" />
      {/* forma irregular do topo */}
      <rect x="6"  y="3"  width="8"  height="4"  rx="3" fill={g} />
      <rect x="4"  y="5"  width="12" height="5"  rx="3" fill={g} />
      {/* corpo principal */}
      <rect x="2"  y="8"  width="16" height="14" rx="4" fill={g} />
      {/* highlight superior */}
      <rect x="7"  y="4"  width="4"  height="3"  rx="2" fill={li} opacity="0.45" />
      <rect x="9"  y="8"  width="2"  height="4"  rx="1" fill={li} opacity="0.2" />
      {/* olhos (grandes, expressivos) */}
      <rect x="5"  y="10" width="4"  height="5"  rx="2" fill="white" />
      <rect x="11" y="10" width="4"  height="5"  rx="2" fill="white" />
      <rect x="6"  y="11" width="3"  height="4"  rx="1" fill="#1a2a1a" />
      <rect x="12" y="11" width="3"  height="4"  rx="1" fill="#1a2a1a" />
      {/* brilho dos olhos */}
      <rect x="8"  y="11" width="1"  height="2"  fill="white" opacity="0.7" />
      <rect x="14" y="11" width="1"  height="2"  fill="white" opacity="0.7" />
      {/* boca ondulada */}
      <rect x="7"  y="16" width="6"  height="2"  rx="1" fill={d} />
      <rect x="8"  y="16" width="1"  height="1"  fill="#0a1a0a" opacity="0.6" />
      <rect x="11" y="16" width="1"  height="1"  fill="#0a1a0a" opacity="0.6" />
      {/* base / escorregando */}
      <rect x="1"  y="19" width="18" height="7"  rx="4" fill={d} />
      <rect x="2"  y="20" width="16" height="5"  rx="3" fill={g} opacity="0.6" />
      {/* pingos laterais */}
      <rect x="1"  y="17" width="3"  height="7"  rx="2" fill={g} />
      <rect x="16" y="17" width="3"  height="7"  rx="2" fill={g} />
      <rect x="5"  y="21" width="2"  height="5"  rx="1" fill={g} opacity="0.7" />
      <rect x="13" y="21" width="2"  height="5"  rx="1" fill={g} opacity="0.7" />
      {/* pingo fundo */}
      <rect x="8"  y="25" width="4"  height="4"  rx="2" fill={d} />
    </g>
  )
}

// ─── Bandido ─────────────────────────────────────────────────────────────────
// Capuz escuro, capa, olhos brilhando, duas adagas

function BanditPixel() {
  const hd = '#1a1a2a'  // capuz / capa escura
  const dk = '#0e0e18'  // detalhe ainda mais escuro
  const sk = '#d4a86a'  // pele
  const ey = '#f0a030'  // olhos brilhando (âmbar / dourado)
  const bl = '#c0c0d8'  // lâmina
  const bh = '#dde0f0'  // destaque lâmina
  const ac = '#3a2a5a'  // acento roxo na capa
  return (
    <g>
      {/* ponta do capuz */}
      <rect x="8"  y="0"  width="4"  height="3"  rx="1" fill={hd} />
      <rect x="7"  y="2"  width="6"  height="2"  fill={hd} />
      {/* capuz — envolve o rosto */}
      <rect x="4"  y="3"  width="12" height="10" rx="2" fill={hd} />
      {/* interior do capuz (mais escuro) */}
      <rect x="6"  y="4"  width="8"  height="7"  rx="1" fill={dk} />
      {/* rosto parcialmente visível */}
      <rect x="6"  y="5"  width="8"  height="5"  rx="1" fill={sk} opacity="0.6" />
      {/* máscara / lenço cobre a boca */}
      <rect x="5"  y="8"  width="10" height="4"  rx="1" fill="#2a1a1a" />
      {/* olhos brilhando na sombra */}
      <rect x="7"  y="5"  width="2"  height="2"  rx="0" fill={ey} />
      <rect x="11" y="5"  width="2"  height="2"  rx="0" fill={ey} />
      <rect x="7"  y="5"  width="1"  height="1"  fill="white" opacity="0.5" />
      <rect x="11" y="5"  width="1"  height="1"  fill="white" opacity="0.5" />
      {/* pescoço */}
      <rect x="8"  y="13" width="4"  height="2"  fill={sk} opacity="0.7" />
      {/* capa — corpo */}
      <rect x="3"  y="14" width="14" height="11" rx="2" fill={hd} />
      {/* detalhe central da capa */}
      <rect x="9"  y="14" width="2"  height="11" fill={dk} opacity="0.5" />
      {/* acento / borda da capa */}
      <rect x="3"  y="14" width="2"  height="11" fill={ac} opacity="0.4" />
      <rect x="15" y="14" width="2"  height="11" fill={ac} opacity="0.4" />
      {/* braço esquerdo */}
      <rect x="1"  y="14" width="3"  height="10" rx="1" fill={hd} />
      {/* braço direito */}
      <rect x="16" y="14" width="3"  height="10" rx="1" fill={hd} />
      {/* adaga esquerda */}
      <rect x="1"  y="7"  width="2"  height="9"  rx="1" fill={bl} />
      <rect x="2"  y="7"  width="1"  height="7"  fill={bh} opacity="0.5" />
      <rect x="0"  y="14" width="4"  height="1"  rx="0" fill="#8888aa" />  {/* guarda */}
      <rect x="1"  y="15" width="2"  height="3"  rx="1" fill="#4a3a2a" />  {/* punho */}
      {/* adaga direita */}
      <rect x="17" y="7"  width="2"  height="9"  rx="1" fill={bl} />
      <rect x="17" y="7"  width="1"  height="7"  fill={bh} opacity="0.5" />
      <rect x="16" y="14" width="4"  height="1"  rx="0" fill="#8888aa" />
      <rect x="17" y="15" width="2"  height="3"  rx="1" fill="#4a3a2a" />
      {/* pernas (meio escondidas na capa) */}
      <rect x="5"  y="25" width="4"  height="5"  rx="1" fill={dk} />
      <rect x="11" y="25" width="4"  height="5"  rx="1" fill={dk} />
      {/* botas */}
      <rect x="4"  y="28" width="5"  height="2"  rx="1" fill="#0e0e14" />
      <rect x="11" y="28" width="5"  height="2"  rx="1" fill="#0e0e14" />
    </g>
  )
}

// ─── Aranha Gigante ──────────────────────────────────────────────────────────
// Corpo escuro, 8 pernas articuladas, olhos vermelhos múltiplos

function SpiderPixel() {
  const b  = '#2a1a2a'  // corpo principal
  const lg = '#1a1020'  // pernas
  const lh = '#4a3a4a'  // destaque pernas / articulações
  const rd = '#cc2222'  // olhos vermelhos
  const ab = '#3a2a3a'  // abdômen (mais claro que o corpo)
  return (
    <g>
      {/* fio de teia no topo */}
      <rect x="9"  y="0"  width="2"  height="5"  fill={lh} opacity="0.4" />

      {/* ── 4 pernas lado esquerdo ── */}
      {/* perna E1 (alta) */}
      <rect x="0"  y="5"  width="8"  height="2"  rx="1" fill={lg} />
      <rect x="0"  y="3"  width="3"  height="4"  rx="1" fill={lg} />
      {/* perna E2 */}
      <rect x="0"  y="9"  width="7"  height="2"  rx="1" fill={lg} />
      <rect x="0"  y="11" width="3"  height="2"  rx="1" fill={lg} />
      {/* perna E3 */}
      <rect x="0"  y="13" width="7"  height="2"  rx="1" fill={lg} />
      <rect x="0"  y="15" width="3"  height="3"  rx="1" fill={lg} />
      {/* perna E4 (baixa) */}
      <rect x="1"  y="17" width="6"  height="2"  rx="1" fill={lg} />
      <rect x="1"  y="19" width="3"  height="4"  rx="1" fill={lg} />

      {/* ── 4 pernas lado direito ── */}
      {/* perna D1 */}
      <rect x="12" y="5"  width="8"  height="2"  rx="1" fill={lg} />
      <rect x="17" y="3"  width="3"  height="4"  rx="1" fill={lg} />
      {/* perna D2 */}
      <rect x="13" y="9"  width="7"  height="2"  rx="1" fill={lg} />
      <rect x="17" y="11" width="3"  height="2"  rx="1" fill={lg} />
      {/* perna D3 */}
      <rect x="13" y="13" width="7"  height="2"  rx="1" fill={lg} />
      <rect x="17" y="15" width="3"  height="3"  rx="1" fill={lg} />
      {/* perna D4 */}
      <rect x="13" y="17" width="6"  height="2"  rx="1" fill={lg} />
      <rect x="16" y="19" width="3"  height="4"  rx="1" fill={lg} />

      {/* cefalotórax (corpo frontal) */}
      <rect x="5"  y="5"  width="10" height="9"  rx="2" fill={b} />

      {/* abdômen (maior, atrás) */}
      <rect x="4"  y="13" width="12" height="12" rx="4" fill={ab} />
      {/* padrão no abdômen */}
      <rect x="7"  y="15" width="6"  height="2"  rx="1" fill={lh} opacity="0.45" />
      <rect x="8"  y="18" width="4"  height="2"  rx="1" fill={lh} opacity="0.3" />
      <rect x="9"  y="21" width="2"  height="2"  rx="1" fill={lh} opacity="0.2" />
      {/* centro do abdômen */}
      <rect x="9"  y="13" width="2"  height="12" fill={b} opacity="0.3" />

      {/* olhos múltiplos (6 olhos vermelhos) */}
      <rect x="6"  y="6"  width="2"  height="2"  fill={rd} />
      <rect x="9"  y="5"  width="2"  height="2"  fill={rd} />
      <rect x="12" y="6"  width="2"  height="2"  fill={rd} />
      <rect x="7"  y="8"  width="2"  height="2"  fill={rd} opacity="0.75" />
      <rect x="11" y="8"  width="2"  height="2"  fill={rd} opacity="0.75" />
      {/* brilho olhos */}
      <rect x="7"  y="6"  width="1"  height="1"  fill="white" opacity="0.4" />
      <rect x="10" y="5"  width="1"  height="1"  fill="white" opacity="0.4" />
      <rect x="13" y="6"  width="1"  height="1"  fill="white" opacity="0.4" />

      {/* quelíceros / presas */}
      <rect x="6"  y="13" width="2"  height="4"  rx="1" fill={lh} />
      <rect x="12" y="13" width="2"  height="4"  rx="1" fill={lh} />
      <rect x="7"  y="16" width="1"  height="2"  fill="white" opacity="0.4" />
      <rect x="12" y="16" width="1"  height="2"  fill="white" opacity="0.4" />

      {/* articulações pernas */}
      <rect x="4"  y="7"  width="2"  height="2"  fill={lh} />
      <rect x="14" y="7"  width="2"  height="2"  fill={lh} />
    </g>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

type MonsterSpriteComp = () => React.JSX.Element | null

export const MONSTER_PIXEL_SPRITES: Record<string, MonsterSpriteComp> = {
  goblin:       GoblinPixel,
  wolf:         WolfPixel,
  slime:        SlimePixel,
  bandit:       BanditPixel,
  giant_spider: SpiderPixel,
}

interface MonsterSpriteProps {
  monsterId: string
  size?: number
}

export function MonsterSprite({ monsterId, size = 72 }: MonsterSpriteProps) {
  const Comp = MONSTER_PIXEL_SPRITES[monsterId]
  if (!Comp) return null

  return (
    <svg
      width={size}
      height={Math.round(size * 1.5)}
      viewBox="0 0 20 30"
      xmlns="http://www.w3.org/2000/svg"
      // monsters face left (toward the player on the right)
      style={{ transform: 'scaleX(-1)' }}
      aria-label={monsterId}
    >
      <Comp />
    </svg>
  )
}
