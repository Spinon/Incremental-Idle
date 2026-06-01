/**
 * HeroHead — rosto + pescoço
 * viewBox compartilhado: "0 0 20 30"
 * Renderiza como <g> para ser composto pelo HeroComposer.
 *
 * Variantes:
 *   Head1 — pele média, expressão neutra / amigável
 *   Head2 — pele escura, mandíbula mais larga, expressão determinada
 *   Head3 — pele pálida, rosto estreito / élfico
 */

export function Head1() {
  const skin = '#e8c49a'
  const shadow = '#c9a07a'
  return (
    <g>
      {/* orelhas */}
      <rect x="3" y="5" width="2" height="4" rx="1" fill={skin} />
      <rect x="15" y="5" width="2" height="4" rx="1" fill={skin} />
      {/* rosto */}
      <rect x="5" y="2" width="10" height="12" rx="2" fill={skin} />
      {/* sombra queixo */}
      <rect x="6" y="11" width="8" height="2" rx="1" fill={shadow} opacity="0.35" />
      {/* olhos */}
      <rect x="7" y="5" width="2" height="2" fill="#3a2a1a" />
      <rect x="11" y="5" width="2" height="2" fill="#3a2a1a" />
      {/* brilho olhos */}
      <rect x="8" y="5" width="1" height="1" fill="#ffffff" opacity="0.7" />
      <rect x="12" y="5" width="1" height="1" fill="#ffffff" opacity="0.7" />
      {/* nariz */}
      <rect x="9" y="8" width="2" height="1" fill={shadow} opacity="0.5" />
      {/* sorriso */}
      <rect x="7" y="10" width="2" height="1" fill="#cc7755" />
      <rect x="11" y="10" width="2" height="1" fill="#cc7755" />
      <rect x="8" y="11" width="4" height="1" fill="#cc7755" />
      {/* pescoço */}
      <rect x="8" y="14" width="4" height="2" fill={skin} />
    </g>
  )
}

export function Head2() {
  const skin = '#8a5a2a'
  const shadow = '#6a3a10'
  return (
    <g>
      {/* orelhas — mais largas */}
      <rect x="3" y="5" width="2" height="5" rx="1" fill={skin} />
      <rect x="15" y="5" width="2" height="5" rx="1" fill={skin} />
      {/* rosto — mandíbula quadrada */}
      <rect x="5" y="2" width="10" height="12" rx="1" fill={skin} />
      <rect x="4" y="8" width="12" height="6" rx="1" fill={skin} />
      {/* sombra queixo */}
      <rect x="5" y="12" width="10" height="2" fill={shadow} opacity="0.4" />
      {/* olhos — ligeiramente mais estreitos */}
      <rect x="7" y="5" width="2" height="2" fill="#2a1a0a" />
      <rect x="11" y="5" width="2" height="2" fill="#2a1a0a" />
      <rect x="8" y="5" width="1" height="1" fill="#ffffff" opacity="0.6" />
      <rect x="12" y="5" width="1" height="1" fill="#ffffff" opacity="0.6" />
      {/* sobrancelhas determinadas */}
      <rect x="7" y="4" width="3" height="1" fill={shadow} />
      <rect x="10" y="4" width="3" height="1" fill={shadow} />
      {/* nariz */}
      <rect x="9" y="8" width="2" height="2" fill={shadow} opacity="0.5" />
      {/* boca firme */}
      <rect x="7" y="10" width="6" height="1" fill="#6a3520" />
      <rect x="7" y="11" width="6" height="1" fill={shadow} opacity="0.4" />
      {/* pescoço */}
      <rect x="8" y="14" width="4" height="2" fill={skin} />
    </g>
  )
}

export function Head3() {
  const skin = '#f0dab0'
  const shadow = '#d4b880'
  return (
    <g>
      {/* orelhas pontudas — élfico */}
      <rect x="3" y="4" width="2" height="3" rx="1" fill={skin} />
      <rect x="4" y="3" width="1" height="2" fill={skin} />
      <rect x="15" y="4" width="2" height="3" rx="1" fill={skin} />
      <rect x="15" y="3" width="1" height="2" fill={skin} />
      {/* rosto estreito */}
      <rect x="6" y="2" width="8" height="12" rx="2" fill={skin} />
      {/* sombra */}
      <rect x="7" y="11" width="6" height="2" rx="1" fill={shadow} opacity="0.3" />
      {/* olhos — amendoados / azulados */}
      <rect x="7" y="5" width="2" height="2" fill="#2a3a6a" />
      <rect x="11" y="5" width="2" height="2" fill="#2a3a6a" />
      <rect x="8" y="5" width="1" height="1" fill="#8ab0ee" opacity="0.8" />
      <rect x="12" y="5" width="1" height="1" fill="#8ab0ee" opacity="0.8" />
      {/* cílios sutis */}
      <rect x="7" y="4" width="3" height="1" fill={shadow} opacity="0.5" />
      <rect x="10" y="4" width="3" height="1" fill={shadow} opacity="0.5" />
      {/* nariz fino */}
      <rect x="9" y="8" width="2" height="1" fill={shadow} opacity="0.4" />
      {/* boca pequena e refinada */}
      <rect x="8" y="10" width="4" height="1" fill="#d4927a" />
      <rect x="9" y="11" width="2" height="1" fill="#d4927a" opacity="0.6" />
      {/* pescoço fino */}
      <rect x="9" y="14" width="2" height="2" fill={skin} />
    </g>
  )
}
