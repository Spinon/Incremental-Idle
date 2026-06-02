/**
 * HeroHair — cabelo / capacete / capuz
 * viewBox compartilhado: "0 0 20 30"
 *
 * Ancoragem: topo da cabeça y0-7, x4-16. Não cobrir os olhos (y5+).
 *
 * Variantes:
 *   Hair1 — curto espetado (castanho)
 *   Hair2 — longo (preto)
 *   Hair3 — capacete de cavaleiro (metal)
 *   Hair4 — capuz de mago (roxo)
 */

export function Hair1() {
  const base = '#6a4421'
  const dark = '#4a2e14'
  const hi   = '#8a5e30'
  return (
    <g>
      {/* base */}
      <rect x="5"  y="2" width="10" height="3" rx="1" fill={base} />
      {/* espetos */}
      <rect x="5"  y="0" width="2" height="4" fill={dark} />
      <rect x="8"  y="0" width="2" height="3" fill={base} />
      <rect x="11" y="0" width="2" height="4" fill={dark} />
      <rect x="13" y="0" width="2" height="3" fill={base} />
      {/* brilho */}
      <rect x="6"  y="1" width="2" height="1" fill={hi} opacity="0.7" />
      <rect x="9"  y="0" width="2" height="1" fill={hi} opacity="0.7" />
      {/* laterais cobrindo têmporas */}
      <rect x="4"  y="3" width="2" height="4" rx="1" fill={base} />
      <rect x="14" y="3" width="2" height="4" rx="1" fill={dark} />
    </g>
  )
}

export function Hair2() {
  const base = '#241a12'
  const dark = '#140d08'
  const hi   = '#3e2c1c'
  return (
    <g>
      {/* topo */}
      <rect x="5"  y="0"  width="10" height="4" rx="2" fill={base} />
      <rect x="6"  y="0"  width="6"  height="1"       fill={hi} opacity="0.6" />
      {/* queda esquerda */}
      <rect x="3"  y="3"  width="3"  height="15" rx="1" fill={base} />
      <rect x="3"  y="3"  width="1"  height="13"       fill={hi} opacity="0.4" />
      <rect x="3"  y="17" width="2"  height="4"  rx="1" fill={dark} />
      {/* queda direita */}
      <rect x="14" y="3"  width="3"  height="15" rx="1" fill={base} />
      <rect x="16" y="3"  width="1"  height="13"       fill={dark} />
      <rect x="15" y="17" width="2"  height="4"  rx="1" fill={dark} />
      {/* franja (acima dos olhos) */}
      <rect x="5"  y="2"  width="10" height="2"       fill={base} />
      <rect x="6"  y="4"  width="2"  height="1"       fill={dark} />
      <rect x="12" y="4"  width="2"  height="1"       fill={dark} />
    </g>
  )
}

export function Hair3() {
  const metal = '#8590a2'
  const hi    = '#aab4c4'
  const dark  = '#586374'
  const out   = '#2e3644'
  return (
    <g>
      {/* contorno do capacete */}
      <rect x="4"  y="0"  width="12" height="14" rx="2" fill={out} />
      {/* corpo do capacete */}
      <rect x="4"  y="0"  width="11" height="13" rx="2" fill={metal} />
      {/* highlight topo */}
      <rect x="6"  y="1"  width="7"  height="2"  rx="1" fill={hi} />
      {/* sombra direita */}
      <rect x="14" y="2"  width="1"  height="11"       fill={dark} />
      {/* abertura do visor */}
      <rect x="5"  y="5"  width="10" height="5"  rx="1" fill="#10141e" />
      {/* brilho dentro do visor (olhos) */}
      <rect x="6"  y="6"  width="2"  height="2"        fill="#7aa0d8" opacity="0.5" />
      <rect x="12" y="6"  width="2"  height="2"        fill="#7aa0d8" opacity="0.5" />
      {/* guarda-nariz */}
      <rect x="9"  y="5"  width="2"  height="5"        fill={metal} />
      <rect x="9"  y="5"  width="1"  height="5"        fill={hi} opacity="0.5" />
      {/* protetores de bochecha */}
      <rect x="4"  y="9"  width="3"  height="4"  rx="1" fill={dark} />
      <rect x="13" y="9"  width="3"  height="4"  rx="1" fill={dark} />
      {/* borda inferior */}
      <rect x="4"  y="12" width="11" height="2"        fill={dark} />
      {/* crista dourada */}
      <rect x="9"  y="0"  width="2"  height="1"        fill="#d8b13a" />
    </g>
  )
}

export function Hair4() {
  const hood   = '#34244e'
  const dark   = '#1e1232'
  const accent = '#5a4490'
  const out    = '#140a26'
  return (
    <g>
      {/* contorno do capuz */}
      <rect x="4"  y="0"  width="12" height="14" rx="2" fill={out} />
      {/* ponta do capuz */}
      <rect x="8"  y="0"  width="4"  height="3" rx="1" fill={hood} />
      {/* corpo do capuz */}
      <rect x="5"  y="2"  width="10" height="11" rx="2" fill={hood} />
      {/* drapeado lateral */}
      <rect x="3"  y="4"  width="3"  height="16" rx="1" fill={hood} />
      <rect x="14" y="4"  width="3"  height="16" rx="1" fill={dark} />
      {/* brilho frontal esquerdo */}
      <rect x="5"  y="2"  width="2"  height="9"        fill={accent} opacity="0.5" />
      {/* abertura escura do rosto */}
      <rect x="6"  y="4"  width="8"  height="8"  rx="2" fill="#0e0620" opacity="0.6" />
      {/* olhos brilhando na sombra */}
      <rect x="7"  y="6"  width="2"  height="2"        fill="#9a7ad8" opacity="0.7" />
      <rect x="11" y="6"  width="2"  height="2"        fill="#9a7ad8" opacity="0.7" />
      {/* estrela na ponta */}
      <rect x="9"  y="0"  width="2"  height="1"        fill="#d8b13a" />
    </g>
  )
}
