# Revisão Robusta de Código — Progresso

> Arquivo de estado da revisão multi-sessão. Para retomar: "continua a revisão".

## Status das Etapas

- [x] **Etapa 0** — Varredura de encoding/mojibake — CONCLUÍDA (nenhum caractere corrompido em src/)
- [x] **Etapa 1** — Stores + Game Loop — CONCLUÍDA (núcleo; arquivos cloud/save adiados p/ Etapa 5)
- [x] **Etapa 2** — Fórmulas + Dados de balanceamento — CONCLUÍDA (auditoria spell-a-spell de data/spells.ts e data/words.ts adiada p/ Etapa 5)
- [x] **Etapa 3** — Componentes de batalha — CONCLUÍDA (InventoryPanel.tsx, 1727 linhas, movido p/ Etapa 4)
- [x] **Etapa 4** — Mapa + Mercado + Inventário — CONCLUÍDA (ícones: skim apenas; baixo risco)
- [x] **Etapa 5** — Integração + verificação final — CONCLUÍDA · **REVISÃO ENCERRADA**
  - Incluir: save.ts, cloudSaveStore, notifStore, settingsStore, uiStore, lib/cloudAutosave, useCloudSaveSync (adiados da Etapa 1)

## Correções aplicadas (Etapa 1)

1. 🔴 **spellStore.ts — debuff encadeado corrompia stats do inimigo.** `savedAtk/savedAtkSpeed` eram capturados de snapshot antigo ANTES de restaurar o debuff anterior; encadear debuffs salvava o valor já debuffado como "original". Agora restaura primeiro e captura estado fresco.
2. 🔴 **battleStore.ts — gravity (stun) durava metade do anunciado.** `switchAttacker` consome 1 turno de gravity E `tickStatuses` decrementava de novo. `tickStatuses` agora pula gravity no decremento genérico.
3. 🔴 **battleStore.ts — heroShield perdido no reload.** Adicionado ao `partialize`.
4. 🟡 **consumables.ts — auto-uso parava no primeiro quickslot.** `tryAutoUseConsumable` retornava no primeiro slot elegível mesmo com resultado 'blocked'; agora continua nos slots seguintes.
5. 🔵 **mapStore.ts — docstring de `heroRelativeLevel` desatualizada** (dizia ±5 centrado; código usa pico em heroLevel−1, faixa −5..+3).

Verificação: `tsc -b` OK, preview sem erros de console.

## Decisões do usuário aplicadas (sessão 2)

1. ✅ **Baú só ao derrotar o Demon Dourado** — `processTileEntry` não entrega mais o baú na entrada; tile mantém conteúdo `treasure` (perder = pode tentar de novo ao reentrar); novo `mapStore.claimTreasureAt(x,y)` é chamado pelo pipeline de vitória quando `monsterVariant === 'golden'`, converte o tile para empty (sem farm).
2. ✅ **Skip charges cap fixo em 3** — `MAX_SKIP_CHARGES = 3` em heroStore; `gainSkipCharge` e `tickResources` normalizam saves antigos inflados pela catraca.
3. ✅ **Curse com power escalável** — power agora é fração (0–1) da redução de dano removida. Feitiço umbra: 50% + 1%/nível, cap 85% (via `fraction` no `ELEMENT_DEFAULT_STATUS`). Consumível Frasco Debilitante: magnitude 0.08–0.44 já era fração e agora funciona. Saves antigos (power inteiro ≥1) clampam para remoção total (comportamento anterior).

## Helpers de expansibilidade implementados (sessão 2)

1. ✅ **`src/lib/heroDerived.ts` — `getHeroDerived()`** — única fonte dos stats derivados efetivos (attrs + equip + armas + buffs). Substituiu 6 montagens manuais: useGameLoop (3×), spellStore.castSpell, battleStore.syncBattlePlayerFromStores, consumables (2× — estas usavam versão SEM armas/buffs; agora consistente).
2. ✅ **`src/formulas/statusEffects.ts` — registro declarativo `STATUS_RULES`** — blind/shock/curse/marked/blessed/distortion/freeze/gravity/burn/poison/regen viraram entradas declarativas (attackerMissChance, damageTakenMult, dot, hot, skipsTurn...). battleStore (applyHit/switchAttacker/tickStatuses) consome o registro. Novo status = nova entrada na tabela.
3. ✅ **`src/lib/victoryRewards.ts` — `grantVictoryRewards(derived)`** — extraído o bloco de ~150 linhas do useGameLoop (chest claim, quest hooks, XP de tile/boss, weapon XP, item drop, word drop + notificações). Movimentação (auto-place, blue tower) ficou no loop.
4. ✅ **`startBattle(opts: StartBattleOptions)`** — objeto de opções no lugar de 11 parâmetros posicionais; único caller (mapStore.startTileBattle) atualizado.
5. ❌ **Generalização dos drains do mapStore — descartada deliberadamente**: os 5 drains têm 3 formatos de retorno diferentes; um helper genérico custaria mais em clareza de tipos do que economiza em linhas.

Verificação sessão 2: `tsc -b` OK, preview recarregado sem erros de console, app montado.

## Etapa 2 — Correções aplicadas (sessão 3)

1. ⚖️ **Gate de XP de boss assimétrico** ([victoryRewards.ts](src/lib/victoryRewards.ts)) — o gate ±5 dava 0 XP por vencer monstro 6+ níveis ACIMA (punia vitórias difíceis). Agora só bloqueia monstros 6+ níveis ABAIXO (anti-farm preservado).
2. 🔴⚖️ **`pendingXp` era caminho morto** — o pipeline drainXp→xpBonus existia mas nada o alimentava; exploração não dava XP nenhum. Agora cada tile explorado pela 1ª vez dá `(4 + level×2) ±20%` XP ([mapStore.ts](src/store/mapStore.ts) processTileEntry). Modesto vs. XP de monstro; ajustável.
3. ⚖️ **Tônico de Combate (statBuff) durava 1 rodada** — expirava antes de fazer efeito (auto-uso dispara no início da luta). Agora 3/4/5/6 rodadas por raridade (common/uncommon/rare/epic) em [items.ts](src/formulas/items.ts).
4. 🔵 **Shuffles enviesados** (`sort(() => Math.random()-0.5)`) em pickStats e attrBonus de items.ts → Fisher-Yates.

Verificação sessão 3: `tsc -b` OK, preview sem erros.

### Análise numérica (referência)
- **Curva de XP do herói**: L5≈1.4k, L10≈6.3k, L20≈31k, L30≈79k (comentário no código diz 110k em L30 — desatualizado, inofensivo).
- **XP de monstro (1º encontro)**: (10+4×lv)×tileMult — L10 ≈ 50 XP/kill → ~126 kills p/ L10→11 sem quests. Quests bounty hard: ≈1.4k XP em L10. XP de exploração novo: ≈24 XP/tile em L10. Curva geral apertada mas viável p/ idle; reavaliar com dados de jogo.
- **monsterStats.atk = forca×2.5** vs herói forca×1.5 — comentário "same coefficients as hero" é impreciso, mas o herói compensa com passivo de nível + equipamento + armas. OK na prática.
- **pickItemRarity L1**: unique 0.16%, set 0.42%, epic 1.4% — raro mas possível dropar unique no nível 1 (×12 mult). Aceitável p/ idle (stats escalam por nível do item).
- **Weapon XP**: ~7 kills/nível no início; cap por tier força forja. Coerente.

## Achados ainda em aberto

### ⚖️ Balanceamento (observar em jogo)
- **skipCharges regen = level/3600 por segundo** (1 carga/min no nível 60) — conferir curva.
- **Curse re-balanceada** (50%→85% por nível) — observar em jogo se a curva está boa.
- **Tiles de market/quest não dão XP de exploração** (saem antes do grant) — dão outras recompensas; decidir se ok.

### 🟡 Lógica suspeita (investigar nas próximas etapas)
- **useGameLoop comenta "DoTs tick every turn"** mas `tickStatuses` só roda quando attacker vira 'enemy' (1×/rodada completa, não por turno). Comportamento e comentário divergem; afeta percepção de duração de status.
- **heroStore.restoreStamina/restoreMana** recalculam max SEM bônus de equipamento (callers atuais passam override, mas o default interno é inconsistente). _(consumables foi corrigido na sessão 2 via getHeroDerived; o default interno do heroStore permanece — avaliar na Etapa 5.)_
- **mapStore.pendingMonsterXp** é sobrescrito (não acumulado) se dois primeiros-encontros ocorrerem antes do drain.
- **battleStore.restoreMidFight** zera `enemyBleedPower` mas o partialize persiste esse campo — inconsistência entre persistência e restauração.

### 🏗️ Expansibilidade (helpers propostos — aplicar na Etapa 5 ou sob demanda)
1. **`getHeroDerived()` helper** — o quarteto `attributes + getEquipmentBonuses + weaponProgress + activeBuffs → getEffectiveDerivedStatsFromBonuses` é repetido 6+ vezes (useGameLoop 3×, spellStore, battleStore, consumables usa variante incompleta). Um helper único eliminaria as inconsistências de stats da família restoreStamina/consumables.
2. **Registro de status effects** — blind/shock/curse/marked/blessed/distortion/freeze/gravity estão hardcoded espalhados por applyHit/switchAttacker/tickStatuses. Um registro declarativo (`STATUS_EFFECTS: Record<type, { onAttack?, onDefend?, onTurnStart?, onTick? }>`) tornaria novos status plug-and-play.
3. **Pipeline de recompensas** — a sequência pós-vitória no useGameLoop (XP, ouro, weapon XP, item drop, word drop, quest hooks) é um bloco de 150 linhas; extrair para `lib/victoryRewards.ts` com lista de handlers.
4. **`battleStore.startBattle` com 11 parâmetros posicionais** — trocar por objeto de opções (`startBattle(opts: StartBattleOptions)`); TileEnemyQueue já é quase esse objeto.
5. **Drains do mapStore** (drainXp/drainGold/drainChests/drainWeaponMaterials/drainMonsterXp) — padrão repetido 5×; generalizar `drainPending(key)`.

## Etapa 3 — Correções aplicadas (sessão 4)

1. 🔴 **XP de kill movido da UI para o pipeline de vitória** — `BattleArena` concedia `enemy.maxHp` XP (com doom ×2) dentro de um `useEffect`, ou seja: XP dependia do componente montado. Batalhas resolvidas offline (skipBattle síncrono, React em batch) NÃO geravam esse XP. Agora vive em [victoryRewards.ts](src/lib/victoryRewards.ts): UI-independente, offline incluso, com o gate assimétrico (só bloqueia monstros 6+ níveis abaixo — o gate antigo da arena ainda era ±5 simétrico) e aplicando `derived.xpBonus` completo (com equipamento). NOTA: kill XP = maxHp do inimigo é a MAIOR fonte de XP do jogo (~100-200/kill em L10) — a análise da Etapa 2 subestimou a curva; com isso a progressão está mais saudável do que parecia.
2. 🔵 **StickyBar re-renderizava a cada hit** — assinava o battleStore inteiro (`useBattleStore()`); trocado por 6 seletores específicos.

Revisados sem problemas graves: `MiniBattlePlayer.tsx` (drag/resize com pointer capture corretos, floats ok), `HpBar.tsx`, `UnitSprite.tsx`, timers do `BattleArena` (cleanup correto com flag cancelled + clearTimers).

Verificação sessão 4: `tsc -b` OK, preview sem erros de console.

### 🟡 Observações menores da Etapa 3 (não aplicadas)
- `BattleArena` e `MiniBattlePlayer` calculam `getEffectiveDerivedStatsFromBonuses` inline por render — correto (insumos assinados) mas recalcula a cada render; aceitável, memoizar se virar gargalo.
- `StickyBar` usa `getDerivedStats + applySpellBuffs` SEM bônus de arma — inócuo hoje (armas não afetam stamina, única coisa que ele deriva), mas é a mesma família de montagem parcial; migrar p/ `getHeroDerived` se armas algum dia derem stamina.
- `MiniBattlePlayer` registra listeners de pointermove mesmo escondido (early-return depois dos hooks) — custo desprezível.

## Etapa 4 — Correções aplicadas (sessão 5)

1. 🔴 **Mojibake encontrado e corrigido** — `âš™` (⚙ corrompido) em InventoryPanel.tsx:1673. A varredura da Etapa 0 usava padrão incompleto; re-varredura ampla (`â/Ã/Â + não-ASCII`) confirmou que era o único (demais matches são português legítimo: relâmpago, lâmina).
2. 🔴 **Baú só abria com a aba Equipamentos aberta** — o tick (`advanceOpeningChest`) e a resolução do loot viviam em `useEffect` do InventoryPanel, que DESMONTA fora da aba equips. Movido para o game loop via novo [lib/chestOpening.ts](src/lib/chestOpening.ts) (também roda offline) + notificação "🎁 Baú aberto!" com o resumo do loot.
3. 🔴 **Mercado: botão Comprar desabilitava com preço CHEIO mas cobrava preço com desconto de Carisma** — jogador com ouro entre os dois valores não conseguia comprar podendo pagar. Corrigido nos 3 casos (consumíveis, equipamentos, palavras).
4. 🟡 **Erro React "Cannot update while rendering" no MarketInterior** — `markBought` chamava `saveOffer` (write no mapStore) DENTRO do updater do setState; updaters rodam na fase de render. Write movido para fora. Verificado: montagem do mercado pós-fix sem erros no console.
5. 🟡 **Stats de preview de monstros "pulavam"** — NearbyPanel e TileInfoPanel usavam `buildMonster` (com jitter aleatório de atributos) para exibição; trocado por `estimateMonster` (determinístico, já usado no painel de tile ativo). O comentário do código até dizia "no Math.random jitter" — chamava a função errada.
6. 🔵 Shuffle enviesado nas palavras do mercado → Fisher-Yates.

Revisado sem problemas: `MapViewport.tsx` (pinch zoom sólido — pointer capture correto, anchor em grid units, supressão de clique pós-gesto), `MapSection.tsx` (câmera follow/free com timers limpos), `uiStore.ts`.

Verificação sessão 5: `tsc -b` OK, preview recarregado, montagem do mercado sem erros.

### 🟡 Observações da Etapa 4 (não aplicadas — decisão de design)
- **Loot de baú some silenciosamente se inventário/bolsa cheios** (`addItem`/`addConsumable` retornam false e o item é perdido). Decidir: segurar o baú até ter espaço, ou notificar perda.
- **Mercado "newCombos"** mostra `knownIds.length` como nº de feitiços desbloqueados por palavra nova — superestima (nem toda combinação existe em ALL_SPELLS).
- `localSellPrice` em InventoryPanel duplica `sellPrice` do store — exportar do store em vez de duplicar (Etapa 5).

## Etapa 5 — Correções aplicadas (sessão 6)

1. ✅ **Notificação de loot perdido** (decisão do usuário) — [lib/chestOpening.ts](src/lib/chestOpening.ts) agora conta itens/consumíveis que não couberam e dispara "⚠ Loot perdido!" com o motivo (inventário/bolsa cheios).
2. ⚖️ **Feitiços utilitários tinham a duração cortada pelo cooldown** — "Olho do Mago: visão por 40 turnos" durava 15 na prática; eternum_lux 100→60, lux_aura 50→15 etc. O clamp anti-uptime agora vale só para buffs de COMBATE; `type: 'utility'` usa a duração dos dados (que foi claramente projetada para exceder o CD).
3. 🔵 **`sellPrice` deduplicado** — exportado do inventoryStore; InventoryPanel não duplica mais a fórmula.

Auditados sem problemas: `save.ts` (merge/migrate/snapshot corretos), `lib/cloudAutosave.ts` (debounce+retry corretos), `useCloudSaveSync` (subscribe/cleanup ok), `notifStore`, `settingsStore`, `App.tsx` (orquestração de pausas cloud/offline coerente; aba de batalha sempre montada — confirma que o fix dos baús era necessário), dados de `data/spells.ts` (curvas dano/mana/CD coerentes por raridade; nota: nomes PT dos dados são sobrescritos pelo gerador de nomes arcanos — intencional).

Verificação final: `tsc -b` OK, **`npm run build` OK** (produção), preview recarregado sem erros de console.

### Não cobertos em profundidade (skim ou fora do escopo das etapas)
- `SpellbookPanel.tsx` (857 ln), `QuestPanel`, `AuthGate`, `HeroPanel`, `HouseInterior`, `TowerInterior`, `NotifToast`, `cloudSaveStore.ts`, `MapTileCell`, `TileDeck`, ícones SVG, `data/words.ts` — componentes de exibição/baixo risco; nenhum bug conhecido apontando para eles.
- 🔵 Aviso do build: chunk principal 831kB (>500kB) — candidato a code-splitting (`dynamic import()` por aba) numa rodada futura de otimização.

## Etapa 6 — Pente fino dos não cobertos (sessão 7)

Cobriu a lista "Não cobertos em profundidade" + as 4 pendências 🟡 de lógica suspeita.

### Correções aplicadas

1. 🔴 **Auto-teleporte da Torre Azul nunca funcionou** — `mapStore.autoExitBlueTower()` (que pula para a torre mais próxima do destino pendente) era código morto: o timer do [TowerInterior.tsx](src/components/TowerInterior.tsx) exibia "Auto-teleport in Xs" mas chamava `exitBlueTower()` (saída simples). Agora o auto-timer usa `autoExitBlueTower()`; o botão manual "Sair" continua na saída simples. Bônus: o intervalo do timer era recriado a cada 50ms (`elapsed` nas deps) — corrigido como no HouseInterior.
2. 🟡 **SpellbookPanel exibia duração de utilitários capada pelo cooldown** — o fix da Etapa 5 isentou `utility` do clamp no store, mas o SpellCard ainda mostrava a duração capada (ex.: "15t" para um buff de 40 turnos). Exibição agora espelha o store.
3. 🟡 **Tooltip do MapTileCell usava `buildMonster` (jitter aleatório)** — mesmo bug família da Etapa 4 (item 5); stats do tooltip "pulavam" a cada render. Trocado por `estimateMonster`.
4. 🟡 **HeroPanel assinava o heroStore inteiro** (`useHeroStore()` destruturado) — re-renderizava a cada tick de hp/mana/stamina com a aba aberta. Trocado por 6 seletores (mesma família do fix do StickyBar na Etapa 3). Conferido: o texto do bônus passivo (+1.5 ATK/+0.5 DEF/+8 HP por nível) bate com formulas/derived.ts.
5. 🟡 **`pendingMonsterXp` sobrescrito → agora acumula** — virou array (`push` nos dois writers, drain devolve a lista, victoryRewards aplica o gate de nível por entrada). Saves antigos (objeto|null) são normalizados no `merge` do persist (migrate só roda em bump de versão, então a normalização vive no merge).
6. 🟡 **`restoreStamina/restoreMana`: cap agora é parâmetro obrigatório** — o default interno recalculava max SEM equipamento/armas/buffs (inconsistente com getHeroDerived). Único caller (consumables) já passava o cap efetivo.
7. 🔵 **`battleStore.restoreMidFight` removido** — código morto (zero callers) e inconsistente com a persistência (zerava `enemyBleedPower` que o partialize preserva).
8. 🔵 **Comentário dos DoTs no useGameLoop corrigido** — dizia "tick every turn"; na prática (e por design, igual ao skipBattle) tica 1× por rodada completa, quando o turno passa ao inimigo.

### Auditados sem problemas
`QuestPanel`, `NotifToast` (timer RAF com pausa por hover correto), `HouseInterior` (timers limpos, recap de derrota ok), `TileDeck`, `AuthGate` (validações e fluxo de recovery corretos), `data/words.ts` (curva de slots confere com a UI), `MapTileCell` (demais aspectos).

### 🔵 Observações menores do cloudSaveStore (não aplicadas — risco/benefício baixo em código de save)
- Timestamps iguais + diferença significativa de conteúdo cai no caso final "Cloud save is up to date" sem oferecer escolha (janela improvável: exige capturedAt local idêntico ao remoto).
- `initPromise` nunca é resetado se `getSession` falhar — status 'error' fica preso até recarregar a página.
- `verifyRecoveryOtp` autentica o usuário sem disparar `pullRemoteSave` (sync só ocorre após reload, se o usuário abandonar o reset de senha).

Verificação sessão 7: `tsc -b` OK. **Preview bloqueado por WIP externo à revisão**: BattleArena.tsx (modificado fora desta sessão) importa `src/assets/backgrounds/forest/frame_000..N.png` que não existem no disco (a pasta só tem `background.png`) — o dev server falha o transform e o app não monta. Verificar no preview quando os frames forem adicionados.

## Etapa 7 — Revisão do sistema de Party (sessão 7)

Cobriu: partyStore, formulas/npcs, lib/partyBonuses, lib/partySlots, types/party, PartyPanel, PartyNpcSprite, integrações (useGameLoop, mapStore npcRescue, App, MapSection/MapViewport).

### Decisões do usuário aplicadas

1. ✅ **Explorador = acelerador de farm** — NPC em modo Explorar agora anda APENAS por tiles já explorados pelo player (nível ≤ nível do NPC) e re-luta monstros neles, sem consumir nada. Antes ele mirava tiles INEXPLORADOS de monstro/tesouro mas nunca os consumia → farmava o mesmo tile para sempre sem nunca "explorar" de fato. `isNpcExploreTarget` + `findNpcStep` reescritos ([partyStore.ts](src/store/partyStore.ts)).
2. ✅ **Identidade procedural mantida** — `npc_mira_guardian` gera um clérigo elfo "Kael" (classe/raça/nome vêm do hash do id, não das palavras do id). Decisão: é intencional; ids são apenas seeds. Documentado em comentário no `STARTER_NPCS`.
3. ✅ **Derrota para o predador = perda permanente do NPC** — coerente com a morte em qualquer tile (reseta o mapa inteiro). Sem mudança.

### Correções aplicadas

4. 🟡 **Bônus de party "congelado" nos painéis** — `getPartyEffectiveAttributes` lê o partyStore via `getState()` sem assinar; HeroPanel/SpellbookPanel/StickyBar/SpeedControls/MiniBattlePlayer/InventoryPanel não re-renderizavam ao trocar slots/modos da party (stats derivados ficavam defasados até outro evento re-renderizar). Novos hooks reativos `usePartyAttributeBonus`/`usePartyEffectiveAttributes` em [partyBonuses.ts](src/lib/partyBonuses.ts); call sites migrados. App.tsx manteve o `useMemo` (identidade usada em deps de efeitos) com as assinaturas adicionadas às deps. **Pendente: BattleArena.tsx** ainda usa a variante não-reativa — não tocado por estar em WIP do usuário (assets dos fundos animados).
5. 🟡 **Efeitos colaterais dentro do `set` Immer** — `simulateExplorersAfterPlayerVictory` chamava `hero.gainXp/earnGold` e `inventory.grantWeaponXp/addItem` DENTRO do updater (contra a convenção do projeto, cf. fix do spellStore). Recompensas agora são coletadas no set e aplicadas depois.
6. 🟡 **XP dos exploradores sem xpBonus efetivo** — `hero.gainXp(xp)` usava o default interno (sem equipamento); agora passa `getHeroDerived().xpBonus`, igual ao pipeline de vitória.
7. 🔵 **Código morto removido** — `getExplorerMarkers` (MapSection monta os marcadores por conta própria, assinando o store corretamente) e campo `explorerDestination` (nunca lido).

### Auditados sem problemas
`PartyPanel` (assina o store corretamente, dedupe de slots ok), `PartyNpcSprite`, `partySlots`, tile `npcRescue` no mapStore (geração 1% em tiles vazios, sightedCells preserva o NPC, pendingNpcRecruit drenado na vitória), feitiços dos NPCs (todos os 12 ids existem em data/spells), fluxo resgate→oferta→aceite.

### ⚖️ Balanceamento (observar em jogo)
- **Atributos de NPC congelados na descoberta** — `generateNpc` distribui `8 + nível×4` pontos UMA vez; o NPC nunca redistribui ao subir de nível (só `npcLevel` escala via levelOffset). Starters descobertos no nível 1 ficam fracos em `simulateNpcBattle` no late game (chance mínima 20% segura o piso). Se a party "morrer" no late game, regenerar atributos por nível atual é o ajuste.
- **Follow bonus = 5% dos atributos do NPC × (nívelNPC/nívelPlayer)** — modesto; ok como começo.
- Vitória de explorador: XP `10+4×lv`, ouro `15+8×lv`, item 12% — comparável ao 1º encontro de tile; com a regra "só tiles explorados" vira renda passiva paralela ao farm manual. Observar.

Verificação: `tsc -b` OK, preview montado sem erros de console, painel de atributos exibindo bônus de party (ATK/DEF base→modificado).

---

# RESUMO FINAL DA REVISÃO (6 sessões)

**18 correções aplicadas**, das quais as mais impactantes:
- 🔴 Debuff encadeado corrompia stats do inimigo permanentemente (spellStore)
- 🔴 XP de kill (a maior fonte de XP do jogo) dependia da UI montada; batalhas offline não davam XP
- 🔴 Pipeline de XP de exploração existia mas nunca era alimentado
- 🔴 Baús só abriam com a aba Equipamentos aberta
- 🔴 Mercado recusava compras pagáveis (preço cheio vs. descontado)
- 🔴 Mojibake `âš™` corrigido (único no projeto)
- ⚖️ Curse com power escalável, Tônico de Combate viável, gates de XP assimétricos, duração real dos utilitários
- 🏗️ 4 helpers de expansibilidade: `getHeroDerived()`, registro declarativo `STATUS_RULES`, `grantVictoryRewards()`, `StartBattleOptions`

**Pendências conhecidas** (baixa prioridade, documentadas acima): default interno de restoreStamina/Mana sem equip, pendingMonsterXp sobrescrito em raro edge case, "newCombos" superestimado no mercado, code-splitting do bundle.
