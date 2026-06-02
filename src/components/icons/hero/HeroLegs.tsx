/**
 * HeroLegs — pernas + pés
 * viewBox compartilhado: "0 0 20 30"
 *
 * Ancoragem: x4-16 y24-29.
 * Técnica: contorno escuro, brilho na coxa esquerda, sombra na direita.
 *
 * Variantes:
 *   Legs1 — calças + botas de couro
 *   Legs2 — perna esquerda normal + direita protética (metal)
 *   Legs3 — grevas pesadas (metal)
 */

export function Legs1() {
  const pant   = '#46506e'
  const pantHi = '#5c668a'
  const pantDk = '#2e3650'
  const boot   = '#3a2814'
  const bootHi = '#52371c'
  const sole   = '#241608'
  return (
    <g>
      {/* calça esquerda */}
      <rect x="5"  y="24" width="4" height="4" fill={pantDk} />
      <rect x="5"  y="24" width="3" height="4" fill={pant} />
      <rect x="5"  y="24" width="1" height="4" fill={pantHi} opacity="0.6" />
      {/* calça direita */}
      <rect x="11" y="24" width="4" height="4" fill={pantDk} />
      <rect x="11" y="24" width="3" height="4" fill={pant} />
      <rect x="13" y="24" width="1" height="4" fill={pantDk} />
      {/* bota esquerda */}
      <rect x="4"  y="27" width="5" height="2" rx="1" fill={boot} />
      <rect x="4"  y="27" width="5" height="1"        fill={bootHi} opacity="0.6" />
      <rect x="3"  y="28" width="6" height="1" rx="1" fill={sole} />
      {/* bota direita */}
      <rect x="11" y="27" width="5" height="2" rx="1" fill={boot} />
      <rect x="11" y="27" width="5" height="1"        fill={bootHi} opacity="0.6" />
      <rect x="11" y="28" width="6" height="1" rx="1" fill={sole} />
    </g>
  )
}

export function Legs2() {
  const pant   = '#46506e'
  const pantHi = '#5c668a'
  const boot   = '#3a2814'
  const sole   = '#241608'
  const metal  = '#8590a2'
  const hi     = '#aab4c4'
  const joint  = '#586374'
  const out    = '#2e3644'
  return (
    <g>
      {/* perna esquerda — normal */}
      <rect x="5"  y="24" width="4" height="4" fill={pant} />
      <rect x="5"  y="24" width="1" height="4" fill={pantHi} opacity="0.6" />
      <rect x="4"  y="27" width="5" height="2" rx="1" fill={boot} />
      <rect x="3"  y="28" width="6" height="1" rx="1" fill={sole} />
      {/* perna direita — protética metálica */}
      <rect x="11" y="24" width="5" height="6" rx="1" fill={out} />
      <rect x="11" y="24" width="4" height="3" rx="1" fill={metal} />
      <rect x="11" y="24" width="1" height="3"        fill={hi} opacity="0.6" />
      {/* joelho */}
      <rect x="10" y="26" width="6" height="2" rx="1" fill={joint} />
      <rect x="12" y="26" width="2" height="2"        fill={hi} opacity="0.7" />
      {/* canela */}
      <rect x="11" y="27" width="4" height="3" rx="1" fill={metal} />
      <rect x="12" y="28" width="1" height="1"        fill={hi} />
      <rect x="14" y="28" width="1" height="1"        fill={hi} />
      {/* pé */}
      <rect x="10" y="29" width="6" height="1" rx="1" fill={joint} />
    </g>
  )
}

export function Legs3() {
  const metal = '#8590a2'
  const dark  = '#586374'
  const hi    = '#aab4c4'
  const sole  = '#3a4658'
  const out   = '#2e3644'
  return (
    <g>
      {/* greva esquerda */}
      <rect x="4"  y="24" width="5" height="5" rx="1" fill={out} />
      <rect x="4"  y="24" width="4" height="4" rx="1" fill={metal} />
      <rect x="4"  y="24" width="3" height="2"        fill={hi} opacity="0.5" />
      <rect x="4"  y="26" width="4" height="1"        fill={dark} opacity="0.5" />
      {/* greva direita */}
      <rect x="11" y="24" width="5" height="5" rx="1" fill={out} />
      <rect x="11" y="24" width="4" height="4" rx="1" fill={metal} />
      <rect x="11" y="24" width="3" height="2"        fill={hi} opacity="0.4" />
      <rect x="11" y="26" width="4" height="1"        fill={dark} opacity="0.5" />
      {/* solas */}
      <rect x="3"  y="28" width="7" height="1" rx="1" fill={sole} />
      <rect x="10" y="28" width="7" height="1" rx="1" fill={sole} />
    </g>
  )
}
