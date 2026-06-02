/**
 * HeroBody — torso + braços
 * viewBox compartilhado: "0 0 20 30"
 *
 * Ancoragem: torso x4-16 y15-24, braços x2-6 / x14-18, mãos (pele) na base.
 * Técnica: contorno escuro na silhueta, sombra à direita, brilho no peito.
 *
 * Variantes:
 *   Body1 — couro (aventureiro)
 *   Body2 — cota de malha (guerreiro)
 *   Body3 — robe (mago)
 */

export function Body1() {
  const base    = '#8a6526'
  const dark    = '#5a3e14'
  const light   = '#a8843a'
  const outline = '#3a2810'
  const skin    = '#e8c49a'
  const skinDk  = '#c49a6e'
  const gold    = '#d8b13a'
  return (
    <g>
      {/* braço esquerdo */}
      <rect x="2"  y="15" width="4" height="9" rx="1" fill={outline} />
      <rect x="2"  y="15" width="3" height="8"        fill={base} />
      <rect x="2"  y="15" width="1" height="8"        fill={light} opacity="0.5" />
      <rect x="2"  y="22" width="4" height="2" rx="1" fill={skin} />
      <rect x="2"  y="23" width="4" height="1"        fill={skinDk} opacity="0.6" />
      {/* braço direito */}
      <rect x="14" y="15" width="4" height="9" rx="1" fill={outline} />
      <rect x="15" y="15" width="3" height="8"        fill={base} />
      <rect x="17" y="15" width="1" height="8"        fill={dark} />
      <rect x="14" y="22" width="4" height="2" rx="1" fill={skin} />
      <rect x="14" y="23" width="4" height="1"        fill={skinDk} opacity="0.6" />
      {/* torso — contorno + base */}
      <rect x="4"  y="15" width="12" height="10" rx="1" fill={outline} />
      <rect x="4"  y="15" width="11" height="9"        fill={base} />
      {/* peitoral de couro */}
      <rect x="6"  y="16" width="8"  height="6" rx="1" fill={light} />
      <rect x="6"  y="16" width="8"  height="2"        fill="#c09a48" opacity="0.6" />
      {/* costura central */}
      <rect x="9"  y="16" width="1"  height="6"        fill={dark} opacity="0.6" />
      {/* sombra lateral direita do torso */}
      <rect x="14" y="16" width="1"  height="8"        fill={dark} opacity="0.5" />
      {/* cinto */}
      <rect x="4"  y="23" width="11" height="2"        fill={dark} />
      <rect x="8"  y="23" width="3"  height="2" rx="1" fill={gold} />
      <rect x="9"  y="23" width="1"  height="1"        fill="#f2d878" />
    </g>
  )
}

export function Body2() {
  const base    = '#8590a2'
  const dark    = '#586374'
  const light   = '#aab4c4'
  const outline = '#2e3644'
  const skin    = '#e8c49a'
  const gold    = '#c9a227'
  return (
    <g>
      {/* braço esquerdo */}
      <rect x="2"  y="15" width="4" height="9" rx="1" fill={outline} />
      <rect x="2"  y="15" width="3" height="8"        fill={base} />
      <rect x="2"  y="15" width="1" height="8"        fill={light} opacity="0.5" />
      <rect x="2"  y="22" width="4" height="2" rx="1" fill={skin} />
      {/* braço direito */}
      <rect x="14" y="15" width="4" height="9" rx="1" fill={outline} />
      <rect x="15" y="15" width="3" height="8"        fill={base} />
      <rect x="17" y="15" width="1" height="8"        fill={dark} />
      <rect x="14" y="22" width="4" height="2" rx="1" fill={skin} />
      {/* torso */}
      <rect x="4"  y="15" width="12" height="10" rx="1" fill={outline} />
      <rect x="4"  y="15" width="11" height="9"        fill={base} />
      {/* ombreiras */}
      <rect x="3"  y="14" width="5"  height="3" rx="1" fill={light} />
      <rect x="12" y="14" width="5"  height="3" rx="1" fill={light} />
      <rect x="3"  y="16" width="5"  height="1"        fill={dark} opacity="0.4" />
      <rect x="12" y="16" width="5"  height="1"        fill={dark} opacity="0.4" />
      {/* textura de malha */}
      <rect x="5"  y="18" width="10" height="1"        fill={dark} opacity="0.4" />
      <rect x="5"  y="20" width="10" height="1"        fill={dark} opacity="0.4" />
      <rect x="5"  y="22" width="10" height="1"        fill={dark} opacity="0.4" />
      {/* sombra direita */}
      <rect x="14" y="16" width="1"  height="8"        fill={dark} opacity="0.5" />
      {/* cinto */}
      <rect x="4"  y="23" width="11" height="2"        fill="#5a4a2a" />
      <rect x="8"  y="23" width="3"  height="2" rx="1" fill={gold} />
    </g>
  )
}

export function Body3() {
  const base    = '#3a2a5e'
  const dark    = '#241640'
  const trim    = '#6a4fa0'
  const accent  = '#a888e0'
  const outline = '#180e2e'
  const skin    = '#e8c49a'
  return (
    <g>
      {/* mangas longas */}
      <rect x="1"  y="15" width="5" height="12" rx="2" fill={outline} />
      <rect x="1"  y="15" width="4" height="11"        fill={base} />
      <rect x="1"  y="15" width="1" height="11"        fill={trim} opacity="0.5" />
      <rect x="2"  y="25" width="3" height="2" rx="1" fill={skin} />
      <rect x="14" y="15" width="5" height="12" rx="2" fill={outline} />
      <rect x="15" y="15" width="4" height="11"        fill={base} />
      <rect x="18" y="15" width="1" height="11"        fill={dark} />
      <rect x="15" y="25" width="3" height="2" rx="1" fill={skin} />
      {/* torso — robe longo */}
      <rect x="4"  y="15" width="12" height="14" rx="2" fill={outline} />
      <rect x="4"  y="15" width="11" height="13"        fill={base} />
      {/* faixa central */}
      <rect x="9"  y="15" width="2"  height="13"        fill={trim} />
      {/* sombra direita */}
      <rect x="14" y="16" width="1"  height="12"        fill={dark} opacity="0.6" />
      {/* barra inferior */}
      <rect x="3"  y="26" width="13" height="2" rx="1"  fill={trim} />
      <rect x="3"  y="27" width="13" height="1"         fill={dark} opacity="0.5" />
      {/* símbolo arcano no peito */}
      <rect x="9"  y="17" width="2"  height="4"         fill={accent} />
      <rect x="8"  y="18" width="4"  height="2"         fill={accent} />
      <rect x="9"  y="18" width="2"  height="1"         fill="#d8c4ff" opacity="0.8" />
    </g>
  )
}
