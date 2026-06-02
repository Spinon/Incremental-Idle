/**
 * HeroHead — rosto + pescoço
 * viewBox compartilhado: "0 0 20 30"
 *
 * Ancoragem: rosto x5-15 y2-14, orelhas x3-5 / x15-17, pescoço x8-12 y14-16.
 * Técnica: base de pele + sombra na bochecha direita + brilho na esquerda,
 *          olhos com íris e brilho, contorno suave.
 *
 * Variantes:
 *   Head1 — pele média, amigável
 *   Head2 — pele escura, mandíbula larga, determinado
 *   Head3 — pele pálida, élfico
 */

export function Head1() {
  const skin   = '#e8c096'
  const shade  = '#c69a6e'
  const light  = '#f4d4ac'
  const line   = '#9a7048'
  return (
    <g>
      {/* orelhas */}
      <rect x="3"  y="6" width="2" height="4" rx="1" fill={skin} />
      <rect x="15" y="6" width="2" height="4" rx="1" fill={skin} />
      <rect x="15" y="6" width="2" height="4"        fill={shade} opacity="0.4" />
      {/* rosto */}
      <rect x="5"  y="2" width="10" height="12" rx="2" fill={skin} />
      {/* brilho bochecha esquerda */}
      <rect x="5"  y="3" width="3"  height="7"        fill={light} opacity="0.5" />
      {/* sombra bochecha direita */}
      <rect x="13" y="3" width="2"  height="10"       fill={shade} opacity="0.45" />
      {/* sombra do queixo */}
      <rect x="6"  y="12" width="8" height="2" rx="1" fill={shade} opacity="0.4" />
      {/* sobrancelhas */}
      <rect x="6"  y="4" width="3"  height="1"        fill={line} opacity="0.5" />
      <rect x="11" y="4" width="3"  height="1"        fill={line} opacity="0.5" />
      {/* olhos — branco + íris + pupila */}
      <rect x="6"  y="5" width="3" height="3" fill="#f8f4ee" />
      <rect x="11" y="5" width="3" height="3" fill="#f8f4ee" />
      <rect x="7"  y="5" width="2" height="3" fill="#5a8a4a" />
      <rect x="12" y="5" width="2" height="3" fill="#5a8a4a" />
      <rect x="7"  y="6" width="1" height="2" fill="#1a2a14" />
      <rect x="12" y="6" width="1" height="2" fill="#1a2a14" />
      <rect x="8"  y="5" width="1" height="1" fill="#ffffff" opacity="0.9" />
      <rect x="13" y="5" width="1" height="1" fill="#ffffff" opacity="0.9" />
      {/* nariz */}
      <rect x="9"  y="8" width="2" height="2" fill={shade} opacity="0.5" />
      {/* sorriso */}
      <rect x="7"  y="11" width="6" height="1" fill="#b86a4e" />
      <rect x="8"  y="10" width="4" height="1" fill="#cc8866" opacity="0.6" />
      {/* pescoço */}
      <rect x="8"  y="14" width="4" height="2" fill={skin} />
      <rect x="8"  y="14" width="4" height="1" fill={shade} opacity="0.4" />
    </g>
  )
}

export function Head2() {
  const skin   = '#8a5a2e'
  const shade  = '#62380f'
  const light  = '#a87440'
  const line   = '#4a2808'
  return (
    <g>
      {/* orelhas largas */}
      <rect x="3"  y="6" width="2" height="5" rx="1" fill={skin} />
      <rect x="15" y="6" width="2" height="5" rx="1" fill={skin} />
      <rect x="15" y="6" width="2" height="5"        fill={shade} opacity="0.4" />
      {/* rosto — mandíbula quadrada */}
      <rect x="5"  y="2" width="10" height="12" rx="1" fill={skin} />
      <rect x="4"  y="8" width="12" height="6"  rx="1" fill={skin} />
      {/* brilho esquerda */}
      <rect x="5"  y="3" width="3"  height="8"        fill={light} opacity="0.4" />
      {/* sombra direita + queixo */}
      <rect x="13" y="3" width="3"  height="11"       fill={shade} opacity="0.4" />
      <rect x="5"  y="12" width="10" height="2"       fill={shade} opacity="0.4" />
      {/* sobrancelhas determinadas */}
      <rect x="6"  y="4" width="3"  height="1" fill={line} />
      <rect x="11" y="4" width="3"  height="1" fill={line} />
      {/* olhos */}
      <rect x="6"  y="5" width="3" height="2" fill="#f4ece0" />
      <rect x="11" y="5" width="3" height="2" fill="#f4ece0" />
      <rect x="7"  y="5" width="2" height="2" fill="#3a4a7a" />
      <rect x="12" y="5" width="2" height="2" fill="#3a4a7a" />
      <rect x="8"  y="5" width="1" height="1" fill="#ffffff" opacity="0.8" />
      <rect x="13" y="5" width="1" height="1" fill="#ffffff" opacity="0.8" />
      {/* nariz */}
      <rect x="9"  y="8" width="2" height="2" fill={shade} opacity="0.55" />
      {/* boca firme */}
      <rect x="7"  y="11" width="6" height="1" fill="#4a2808" />
      <rect x="7"  y="12" width="6" height="1" fill={shade} opacity="0.4" />
      {/* pescoço */}
      <rect x="8"  y="14" width="4" height="2" fill={skin} />
      <rect x="8"  y="14" width="4" height="1" fill={shade} opacity="0.4" />
    </g>
  )
}

export function Head3() {
  const skin   = '#f0dab2'
  const shade  = '#cdb285'
  const light  = '#faecce'
  const line   = '#bfa274'
  return (
    <g>
      {/* orelhas pontudas — élfico */}
      <rect x="3"  y="5" width="2" height="3" rx="1" fill={skin} />
      <rect x="4"  y="3" width="1" height="3"        fill={skin} />
      <rect x="15" y="5" width="2" height="3" rx="1" fill={skin} />
      <rect x="15" y="3" width="1" height="3"        fill={skin} />
      <rect x="15" y="5" width="2" height="3"        fill={shade} opacity="0.35" />
      {/* rosto estreito */}
      <rect x="6"  y="2" width="8" height="12" rx="2" fill={skin} />
      {/* brilho esquerda */}
      <rect x="6"  y="3" width="2" height="8"         fill={light} opacity="0.5" />
      {/* sombra direita + queixo */}
      <rect x="12" y="3" width="2" height="9"         fill={shade} opacity="0.4" />
      <rect x="7"  y="11" width="6" height="2" rx="1" fill={shade} opacity="0.35" />
      {/* sobrancelhas finas */}
      <rect x="7"  y="4" width="2" height="1" fill={line} opacity="0.6" />
      <rect x="11" y="4" width="2" height="1" fill={line} opacity="0.6" />
      {/* olhos amendoados azulados */}
      <rect x="7"  y="5" width="2" height="2" fill="#eef2f8" />
      <rect x="11" y="5" width="2" height="2" fill="#eef2f8" />
      <rect x="7"  y="5" width="2" height="2" fill="#3a6abe" opacity="0.85" />
      <rect x="8"  y="6" width="1" height="1" fill="#16264a" />
      <rect x="12" y="6" width="1" height="1" fill="#16264a" />
      <rect x="7"  y="5" width="1" height="1" fill="#b0d0ff" opacity="0.9" />
      <rect x="11" y="5" width="1" height="1" fill="#b0d0ff" opacity="0.9" />
      {/* nariz fino */}
      <rect x="9"  y="8" width="1" height="2" fill={shade} opacity="0.45" />
      {/* boca refinada */}
      <rect x="8"  y="11" width="4" height="1" fill="#d08c72" />
      {/* pescoço */}
      <rect x="9"  y="14" width="3" height="2" fill={skin} />
      <rect x="9"  y="14" width="3" height="1" fill={shade} opacity="0.4" />
    </g>
  )
}
