/**
 * HeroWeapon — arma na mão
 * viewBox compartilhado: "0 0 20 30"
 *
 * Variantes:
 *   Weapon0 — sem arma
 *   Weapon1 — espada de aço (mão direita, vertical, em frente)
 *   Weapon2 — cajado arcano (mão esquerda, atrás)
 *   Weapon3 — arco (mão esquerda, atrás)
 *
 * Técnica: contorno escuro + fio claro + sombra do lado direito (luz no topo-esquerda).
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
  // Espada de aço — vertical na mão direita (x14-19), ponta para cima
  const steel   = '#b6c2d4'
  const edge    = '#e8eef6'
  const shade   = '#7d8a9e'
  const outline = '#2a3242'
  const gold    = '#d8b13a'
  const goldDk  = '#9c7a1c'
  const grip    = '#3a2614'
  const gripHi  = '#5a4024'
  return (
    <g>
      {/* contorno da lâmina */}
      <rect x="14" y="2"  width="5" height="18" rx="1" fill={outline} />
      {/* ponta */}
      <rect x="15" y="1"  width="3" height="2"  fill={outline} />
      <rect x="16" y="1"  width="1" height="1"  fill={edge} />
      {/* lâmina */}
      <rect x="15" y="3"  width="3" height="16" fill={steel} />
      {/* fio brilhante (esquerda) */}
      <rect x="15" y="3"  width="1" height="16" fill={edge} />
      {/* sombra (direita) */}
      <rect x="17" y="3"  width="1" height="16" fill={shade} />
      {/* sulco central */}
      <rect x="16" y="5"  width="1" height="12" fill={shade} opacity="0.5" />
      {/* guarda cruzada */}
      <rect x="12" y="19" width="9" height="2"  rx="1" fill={gold} />
      <rect x="12" y="20" width="9" height="1"        fill={goldDk} />
      <rect x="13" y="19" width="3" height="1"        fill="#f2d878" opacity="0.7" />
      {/* punho */}
      <rect x="15" y="21" width="3" height="5"  fill={grip} />
      <rect x="15" y="22" width="3" height="1"  fill={gripHi} opacity="0.6" />
      <rect x="15" y="24" width="3" height="1"  fill={gripHi} opacity="0.6" />
      {/* pomo */}
      <rect x="14" y="26" width="5" height="2"  rx="1" fill={gold} />
      <rect x="15" y="26" width="2" height="1"        fill="#f2d878" opacity="0.7" />
      <rect x="14" y="27" width="5" height="1"        fill={goldDk} />
    </g>
  )
}

export function Weapon2() {
  // Cajado arcano — mão esquerda / atrás (x0-5), orbe brilhante no topo
  const wood    = '#5a3a1a'
  const woodHi  = '#7a5226'
  const woodDk  = '#3a2410'
  const orb      = '#9a52e2'
  const orbHi    = '#c690ff'
  const orbCore  = '#e8c4ff'
  return (
    <g>
      {/* cabo — contorno */}
      <rect x="1"  y="5"  width="4" height="24" rx="1" fill={woodDk} />
      {/* cabo */}
      <rect x="2"  y="5"  width="2" height="24" fill={wood} />
      <rect x="2"  y="5"  width="1" height="24" fill={woodHi} opacity="0.6" />
      {/* anéis de madeira */}
      <rect x="2"  y="12" width="2" height="1"  fill={woodDk} />
      <rect x="2"  y="19" width="2" height="1"  fill={woodDk} />
      {/* engaste do orbe */}
      <rect x="1"  y="4"  width="4" height="2"  fill={woodDk} />
      {/* orbe — halo */}
      <rect x="0"  y="0"  width="6" height="5"  rx="2" fill={orb} opacity="0.35" />
      {/* orbe — núcleo */}
      <rect x="1"  y="0"  width="4" height="4"  rx="2" fill={orb} />
      <rect x="1"  y="0"  width="3" height="2"  rx="1" fill={orbHi} />
      <rect x="2"  y="0"  width="1" height="1"        fill={orbCore} />
    </g>
  )
}

export function Weapon3() {
  // Arco — mão esquerda / atrás (x0-5)
  const wood   = '#7a5226'
  const woodHi = '#9a6e32'
  const woodDk = '#4a2e12'
  const string = '#d8d0b8'
  const shaft  = '#9a8a6a'
  const head   = '#c0c8d4'
  const fletch = '#cc4444'
  return (
    <g>
      {/* arco — contorno (arco curvo simulado) */}
      <rect x="1"  y="3"  width="3" height="24" rx="2" fill={woodDk} />
      {/* corpo do arco */}
      <rect x="2"  y="4"  width="2" height="22" rx="2" fill={wood} />
      <rect x="2"  y="4"  width="1" height="22"       fill={woodHi} opacity="0.6" />
      {/* pontas curvadas */}
      <rect x="3"  y="3"  width="2" height="3" rx="1" fill={wood} />
      <rect x="3"  y="24" width="2" height="3" rx="1" fill={wood} />
      {/* corda */}
      <rect x="4"  y="4"  width="1" height="22"       fill={string} opacity="0.7" />
      {/* flecha encaixada */}
      <rect x="3"  y="14" width="11" height="1"       fill={shaft} />
      <rect x="3"  y="15" width="11" height="1"       fill={woodDk} opacity="0.5" />
      {/* ponta */}
      <rect x="13" y="13" width="3"  height="3" fill={head} />
      <rect x="15" y="14" width="1"  height="1" fill="#e6ecf4" />
      {/* penas */}
      <rect x="2"  y="13" width="2"  height="1" fill={fletch} />
      <rect x="2"  y="15" width="2"  height="1" fill={fletch} />
    </g>
  )
}
