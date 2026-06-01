/**
 * HeroBody — torso + braços
 * viewBox compartilhado: "0 0 20 30"
 *
 * Variantes:
 *   Body1 — couro (marrom/tan) — aventureiro
 *   Body2 — cota de malha (cinza metálico) — guerreiro
 *   Body3 — robes (roxo escuro) — mago
 */

export function Body1() {
  const leather  = '#7a5a20'
  const dark     = '#5a3a10'
  const light    = '#9a7a30'
  const skin     = '#e8c49a'
  return (
    <g>
      {/* braço esquerdo */}
      <rect x="2"  y="15" width="4"  height="8" rx="1" fill={leather} />
      <rect x="2"  y="22" width="4"  height="2" rx="1" fill={skin} />
      {/* braço direito */}
      <rect x="14" y="15" width="4"  height="8" rx="1" fill={leather} />
      <rect x="14" y="22" width="4"  height="2" rx="1" fill={skin} />
      {/* torso */}
      <rect x="4"  y="15" width="12" height="9" rx="1" fill={leather} />
      {/* peitoral — placa de couro */}
      <rect x="6"  y="16" width="8"  height="5" rx="1" fill={light} />
      <rect x="9"  y="16" width="2"  height="5"        fill={leather} opacity="0.5" />
      {/* cinto */}
      <rect x="4"  y="23" width="12" height="2"        fill={dark} />
      <rect x="9"  y="23" width="2"  height="2"        fill="#c9a227" />
    </g>
  )
}

export function Body2() {
  const chain  = '#7a8a9a'
  const dark   = '#5a6a7a'
  const hilit  = '#9aaaba'
  const skin   = '#e8c49a'
  return (
    <g>
      {/* braço esquerdo */}
      <rect x="2"  y="15" width="4"  height="8" rx="1" fill={chain} />
      <rect x="2"  y="22" width="4"  height="2" rx="1" fill={skin} />
      {/* braço direito */}
      <rect x="14" y="15" width="4"  height="8" rx="1" fill={chain} />
      <rect x="14" y="22" width="4"  height="2" rx="1" fill={skin} />
      {/* ombreiras */}
      <rect x="3"  y="15" width="5"  height="3" rx="1" fill={hilit} />
      <rect x="12" y="15" width="5"  height="3" rx="1" fill={hilit} />
      {/* torso */}
      <rect x="4"  y="15" width="12" height="9" rx="1" fill={chain} />
      {/* textura de malha — linhas de sombra */}
      <rect x="4"  y="17" width="12" height="1"        fill={dark} opacity="0.3" />
      <rect x="4"  y="19" width="12" height="1"        fill={dark} opacity="0.3" />
      <rect x="4"  y="21" width="12" height="1"        fill={dark} opacity="0.3" />
      {/* cinto de couro */}
      <rect x="4"  y="23" width="12" height="2"        fill="#5a4a2a" />
      <rect x="9"  y="23" width="2"  height="2"        fill={hilit} />
    </g>
  )
}

export function Body3() {
  const robe   = '#2a1a4a'
  const trim   = '#4a3a7a'
  const accent = '#7a5aaa'
  const skin   = '#e8c49a'
  return (
    <g>
      {/* mangas longas */}
      <rect x="1"  y="15" width="5"  height="11" rx="2" fill={robe} />
      <rect x="1"  y="25" width="4"  height="2"  rx="1" fill={skin} />
      <rect x="14" y="15" width="5"  height="11" rx="2" fill={robe} />
      <rect x="15" y="25" width="4"  height="2"  rx="1" fill={skin} />
      {/* torso — robe longo */}
      <rect x="4"  y="15" width="12" height="13" rx="2" fill={robe} />
      {/* faixa central */}
      <rect x="9"  y="15" width="2"  height="13"        fill={trim} />
      {/* barra inferior do robe */}
      <rect x="3"  y="26" width="14" height="2"  rx="1" fill={trim} />
      {/* símbolo no peito */}
      <rect x="9"  y="17" width="2"  height="4"         fill={accent} opacity="0.8" />
      <rect x="8"  y="18" width="4"  height="2"         fill={accent} opacity="0.8" />
    </g>
  )
}
