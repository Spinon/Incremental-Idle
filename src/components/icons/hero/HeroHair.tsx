/**
 * HeroHair — cabelo / chapéu / capacete
 * viewBox compartilhado: "0 0 20 30"
 *
 * Variantes:
 *   Hair1 — curto e espetado (marrom)
 *   Hair2 — longo e fluido (preto)
 *   Hair3 — capacete de cavaleiro (metálico)
 *   Hair4 — capuz de mago (roxo escuro)
 */

export function Hair1() {
  return (
    <g>
      {/* base */}
      <rect x="5"  y="2" width="10" height="3" fill="#5a3a1a" />
      {/* espetos */}
      <rect x="5"  y="0" width="2"  height="4" fill="#5a3a1a" />
      <rect x="9"  y="0" width="2"  height="3" fill="#6a4a22" />
      <rect x="13" y="0" width="2"  height="4" fill="#5a3a1a" />
      <rect x="7"  y="1" width="2"  height="3" fill="#4a2a12" />
      <rect x="11" y="1" width="2"  height="3" fill="#4a2a12" />
      {/* lateral — cobre parcialmente as têmporas */}
      <rect x="4"  y="3" width="2"  height="4" fill="#5a3a1a" />
      <rect x="14" y="3" width="2"  height="4" fill="#5a3a1a" />
    </g>
  )
}

export function Hair2() {
  return (
    <g>
      {/* topo */}
      <rect x="5"  y="1"  width="10" height="4" rx="2" fill="#1a1008" />
      {/* queda esquerda — cobre lateral do rosto e desce */}
      <rect x="2"  y="4"  width="4"  height="14" rx="1" fill="#1a1008" />
      <rect x="3"  y="18" width="2"  height="4"  rx="1" fill="#1a1008" opacity="0.7" />
      {/* queda direita */}
      <rect x="14" y="4"  width="4"  height="14" rx="1" fill="#1a1008" />
      <rect x="15" y="18" width="2"  height="4"  rx="1" fill="#1a1008" opacity="0.7" />
      {/* franja */}
      <rect x="6"  y="2"  width="8"  height="3" fill="#2a1a0a" />
      <rect x="7"  y="4"  width="3"  height="2" fill="#2a1a0a" />
      <rect x="10" y="4"  width="3"  height="2" fill="#2a1a0a" />
    </g>
  )
}

export function Hair3() {
  const metal  = '#7a8a9a'
  const hilight = '#9aaaba'
  const shadow  = '#5a6a7a'
  return (
    <g>
      {/* corpo do capacete — cobre toda a cabeça */}
      <rect x="4"  y="0"  width="12" height="14" rx="2" fill={metal} />
      {/* highlight topo */}
      <rect x="6"  y="0"  width="8"  height="3"  rx="1" fill={hilight} />
      {/* abertura do visor — escura */}
      <rect x="6"  y="4"  width="8"  height="6"  rx="1" fill="#1a1a2a" />
      {/* guarda-nariz (T-bar) */}
      <rect x="9"  y="4"  width="2"  height="6"        fill={metal} />
      {/* protetor de bochecha */}
      <rect x="4"  y="8"  width="3"  height="5"  rx="1" fill={shadow} />
      <rect x="13" y="8"  width="3"  height="5"  rx="1" fill={shadow} />
      {/* borda inferior */}
      <rect x="4"  y="12" width="12" height="2"        fill={shadow} />
      {/* crista decorativa */}
      <rect x="9"  y="0"  width="2"  height="1"        fill="#c9a227" />
    </g>
  )
}

export function Hair4() {
  const hood   = '#2a1a3a'
  const accent = '#3a2a5a'
  return (
    <g>
      {/* ponta do capuz */}
      <rect x="8"  y="0"  width="4"  height="3" rx="1" fill={hood} />
      <rect x="7"  y="2"  width="6"  height="2"        fill={hood} />
      {/* corpo do capuz — envolve o rosto */}
      <rect x="5"  y="3"  width="10" height="10" rx="1" fill={hood} />
      {/* drapeado lateral */}
      <rect x="2"  y="5"  width="4"  height="16" rx="1" fill={hood} />
      <rect x="14" y="5"  width="4"  height="16" rx="1" fill={hood} />
      {/* abertura do rosto — oval escura levemente visível */}
      <rect x="7"  y="4"  width="6"  height="8"  rx="2" fill="#1a0a2a" opacity="0.5" />
      {/* bordas do capuz com acento */}
      <rect x="5"  y="3"  width="2"  height="10"        fill={accent} />
      <rect x="13" y="3"  width="2"  height="10"        fill={accent} />
      {/* estrela na ponta */}
      <rect x="9"  y="0"  width="2"  height="1"         fill="#c9a227" />
      <rect x="9"  y="1"  width="2"  height="1"         fill="#c9a227" opacity="0.5" />
    </g>
  )
}
