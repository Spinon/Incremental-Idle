/**
 * HeroWeapon — arma na mão
 * viewBox compartilhado: "0 0 20 30"
 *
 * Variantes:
 *   Weapon0 — sem arma
 *   Weapon1 — espada (mão direita, em frente)
 *   Weapon2 — cajado (mão esquerda, alto — renderizar ANTES do corpo)
 *   Weapon3 — arco (mão esquerda — renderizar ANTES do corpo)
 *
 * Nota de ordem de renderização:
 *   Weapon2 e Weapon3 devem ser renderizados antes do body/head.
 *   Weapon1 deve ser renderizado depois (por cima).
 *   O HeroComposer cuida disso com a prop `weaponBehind`.
 */

export const WEAPON_BEHIND: Record<number, boolean> = {
  0: false,
  1: false,   // espada — na frente
  2: true,    // cajado — atrás
  3: true,    // arco — atrás
}

export function Weapon0() {
  return null
}

export function Weapon1() {
  // Espada — mão direita (lado x=14-18)
  // Lâmina diagonal apontando para cima-direita
  const blade  = '#9090dd'
  const guard  = '#5555aa'
  const grip   = '#3a2a10'
  const pommel = '#5555aa'
  return (
    <g>
      {/* lâmina */}
      <rect x="16" y="8"  width="2"  height="14" rx="1" fill={blade} />
      {/* destaque da borda */}
      <rect x="17" y="8"  width="1"  height="13"        fill="#ccccff" opacity="0.4" />
      {/* ponta */}
      <rect x="16" y="7"  width="2"  height="2"  rx="1" fill="#ccccff" />
      {/* guarda cruzada */}
      <rect x="14" y="21" width="6"  height="2"  rx="1" fill={guard} />
      {/* punho */}
      <rect x="16" y="22" width="2"  height="4"  rx="1" fill={grip} />
      {/* pommel */}
      <rect x="15" y="26" width="4"  height="2"  rx="2" fill={pommel} />
    </g>
  )
}

export function Weapon2() {
  // Cajado — mão esquerda / trás (x=0-4), alto
  const wood   = '#5a3a1a'
  const orb    = '#aa5aee'
  const shine  = '#cc88ff'
  return (
    <g>
      {/* cabo */}
      <rect x="2"  y="4"  width="2"  height="24" rx="1" fill={wood} />
      {/* detalhe do cabo */}
      <rect x="2"  y="12" width="2"  height="1"         fill="#8a6a2a" opacity="0.6" />
      <rect x="2"  y="18" width="2"  height="1"         fill="#8a6a2a" opacity="0.6" />
      {/* orbe no topo */}
      <rect x="1"  y="2"  width="4"  height="4"  rx="2" fill={orb} />
      <rect x="2"  y="1"  width="2"  height="2"  rx="1" fill={shine} />
      <rect x="2"  y="2"  width="1"  height="1"         fill="#ffffff" opacity="0.6" />
      {/* ligação orbe-cabo */}
      <rect x="2"  y="5"  width="2"  height="1"         fill="#7a3aaa" />
    </g>
  )
}

export function Weapon3() {
  // Arco — mão esquerda / trás (x=0-4)
  const wood  = '#5a3a1a'
  const bow   = '#7a5a20'
  const arrow = '#8aaa8a'
  return (
    <g>
      {/* arco — curva simulada com rects */}
      <rect x="1"  y="5"  width="2"  height="20" rx="1" fill={bow} />
      <rect x="3"  y="6"  width="2"  height="4"  rx="1" fill={bow} />
      <rect x="3"  y="17" width="2"  height="4"  rx="1" fill={bow} />
      {/* corda */}
      <rect x="3"  y="5"  width="1"  height="20" rx="0" fill={wood} opacity="0.5" />
      {/* flecha horizontal */}
      <rect x="2"  y="14" width="10" height="1"         fill={arrow} />
      {/* ponta da flecha */}
      <rect x="11" y="13" width="2"  height="3"  rx="1" fill="#7acc7a" />
      {/* penas (fletching) */}
      <rect x="2"  y="13" width="2"  height="1"         fill="#cc5555" />
      <rect x="2"  y="15" width="2"  height="1"         fill="#cc5555" />
    </g>
  )
}
