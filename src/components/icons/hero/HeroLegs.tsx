/**
 * HeroLegs — pernas + pés
 * viewBox compartilhado: "0 0 20 30"
 *
 * Variantes:
 *   Legs1 — pernas normais com botas de couro
 *   Legs2 — perna esquerda normal + perna direita protética (metal)
 *   Legs3 — grevas pesadas (metal, guerreiro)
 */

export function Legs1() {
  const pant = '#4a4a6a'   // calça azul-escuro
  const boot = '#3a2a10'   // bota marrom escuro
  const sole = '#2a1a08'
  return (
    <g>
      {/* calça esquerda */}
      <rect x="5"  y="24" width="4"  height="4" fill={pant} />
      {/* calça direita */}
      <rect x="11" y="24" width="4"  height="4" fill={pant} />
      {/* bota esquerda */}
      <rect x="4"  y="27" width="5"  height="2" rx="1" fill={boot} />
      <rect x="3"  y="28" width="6"  height="1" rx="1" fill={sole} />
      {/* bota direita */}
      <rect x="11" y="27" width="5"  height="2" rx="1" fill={boot} />
      <rect x="11" y="28" width="6"  height="1" rx="1" fill={sole} />
    </g>
  )
}

export function Legs2() {
  const pant   = '#4a4a6a'
  const boot   = '#3a2a10'
  const sole   = '#2a1a08'
  const metal  = '#7a8a9a'
  const hilit  = '#aab0ba'
  const joint  = '#5a6a7a'
  return (
    <g>
      {/* perna esquerda — normal */}
      <rect x="5"  y="24" width="4"  height="4" fill={pant} />
      <rect x="4"  y="27" width="5"  height="2" rx="1" fill={boot} />
      <rect x="3"  y="28" width="6"  height="1" rx="1" fill={sole} />

      {/* perna direita — protética metálica */}
      {/* coxa superior */}
      <rect x="11" y="24" width="4"  height="3" rx="1" fill={metal} />
      {/* articulação do joelho */}
      <rect x="10" y="26" width="6"  height="2" rx="1" fill={joint} />
      <rect x="12" y="26" width="2"  height="2"        fill={hilit} opacity="0.7" />
      {/* canela */}
      <rect x="11" y="27" width="4"  height="3" rx="1" fill={metal} />
      {/* detalhe de parafuso */}
      <rect x="12" y="28" width="1"  height="1"        fill={hilit} />
      <rect x="14" y="28" width="1"  height="1"        fill={hilit} />
      {/* pé metálico */}
      <rect x="10" y="29" width="6"  height="1" rx="1" fill={joint} />
    </g>
  )
}

export function Legs3() {
  const metal  = '#7a8a9a'
  const dark   = '#5a6a7a'
  const hilit  = '#9aaaba'
  const sole   = '#3a4a5a'
  return (
    <g>
      {/* greva esquerda */}
      <rect x="4"  y="24" width="5"  height="5" rx="1" fill={metal} />
      {/* detalhe lateral */}
      <rect x="4"  y="26" width="5"  height="1"        fill={dark} opacity="0.5" />
      <rect x="5"  y="24" width="3"  height="2"        fill={hilit} opacity="0.4" />
      {/* greva direita */}
      <rect x="11" y="24" width="5"  height="5" rx="1" fill={metal} />
      <rect x="11" y="26" width="5"  height="1"        fill={dark} opacity="0.5" />
      <rect x="12" y="24" width="3"  height="2"        fill={hilit} opacity="0.4" />
      {/* sola esquerda */}
      <rect x="3"  y="28" width="7"  height="1" rx="1" fill={sole} />
      {/* sola direita */}
      <rect x="10" y="28" width="7"  height="1" rx="1" fill={sole} />
    </g>
  )
}
