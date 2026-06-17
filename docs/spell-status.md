# Tabela de Magias

Gerada a partir de `src/data/spells.ts`. Status considera o suporte atual em `spellStore`, `battleStore` e `formulas/spells`.

Resumo: 126 magias craftadas; 126 funcionando; 0 pendentes.

Por categoria: Dano: 40; Cura: 12; Buff: 20; Debuff: 15; Utilidade: 15; Mutare: 12; Reformare: 12.

| # | ID | Nome | Raridade | Categoria | Efeito | Status |
|---:|---|---|---|---|---|---|
| 1 | `ignis_sagitta` | Flecha de Fogo | common | Dano | Dano; base 8; scale 1.5 | Funcionando |
| 2 | `fulgur_sagitta` | Raio Focado | common | Dano | Dano; base 14; scale 2.2 | Funcionando |
| 3 | `fulgur_unda` | Onda Elétrica | common | Dano | Dano; base 6; scale 1.2 | Funcionando |
| 4 | `glacies_sagitta` | Flecha de Gelo | common | Dano | Dano; base 5; scale 1.0; AS inimigo x0.78; 3t | Funcionando |
| 5 | `umbra_manus` | Toque Sombrio | uncommon | Dano | Dano; base 10; scale 1.5; roubo 30% | Funcionando |
| 6 | `toxicum_sagitta` | Flecha Venenosa | uncommon | Dano | Dano; base 12; scale 1.5; ATK inimigo x0.85; 4t | Funcionando |
| 7 | `mortis_sagitta` | Flecha da Morte | rare | Dano | Dano; base 28; scale 3.2 | Funcionando |
| 8 | `arcanum_sagitta` | Flecha Arcana | rare | Dano | Dano; base 22; scale 3.0 | Funcionando |
| 9 | `arcanum_vortex` | Vórtice Arcano | rare | Dano | Dano; base 18; scale 2.5 | Funcionando |
| 10 | `abyssus_pluvia` | Chuva do Abismo | epic | Dano | Dano; base 38; scale 4.2 | Funcionando |
| 11 | `caelum_fulgur` | Raio Celestial | epic | Dano | Dano; base 45; scale 4.8 | Funcionando |
| 12 | `chaos_sagitta` | Flecha do Caos | unique | Dano | Dano; base 55; scale 6.0; variacao caos | Funcionando |
| 13 | `eternum_mortis` | Aniquilação | unique | Dano | Dano; base 100; scale 10.0 | Funcionando |
| 14 | `vitae_manus` | Toque Vital | common | Cura | Cura; base 15; scale 1.8 | Funcionando |
| 15 | `lux_unda` | Onda de Luz | uncommon | Cura | Cura; base 22; scale 2.8 | Funcionando |
| 16 | `vitae_aura` | Aura Vital | uncommon | Cura | Cura; base 10; scale 1.5; stats 8t | Funcionando |
| 17 | `caelum_vitae` | Graça Celestial | epic | Cura | Cura; base 40; scale 5.0 | Funcionando |
| 18 | `eternum_vitae` | Vida Eterna | unique | Cura | Cura; base 65; scale 8.0 | Funcionando |
| 19 | `glacies_scutum` | Escudo de Gelo | common | Buff | Buff; stats 6t | Funcionando |
| 20 | `vitae_scutum` | Barreira Vital | common | Buff | Buff; stats 15t | Funcionando |
| 21 | `fulgur_aura` | Aura Elétrica | uncommon | Buff | Buff; stats 8t | Funcionando |
| 22 | `lux_scutum` | Escudo de Luz | uncommon | Buff | Buff; stats 7t | Funcionando |
| 23 | `arcanum_aura` | Aura Arcana | rare | Buff | Buff; stats 9t | Funcionando |
| 24 | `tempus_aura` | Aura Temporal | rare | Buff | Buff; stats 6t | Funcionando |
| 25 | `fortis_scutum` | Escudo Robusto | epic | Buff | Buff; stats 10t | Funcionando |
| 26 | `caelum_scutum` | Escudo Celestial | epic | Buff | Buff; stats 8t | Funcionando |
| 27 | `eternum_scutum` | Égide Eterna | unique | Buff | Buff; stats 10t | Funcionando |
| 28 | `glacies_manus` | Toque Glacial | common | Debuff | Debuff; AS inimigo x0.72; 4t | Funcionando |
| 29 | `umbra_unda` | Onda Sombria | uncommon | Debuff | Debuff; ATK inimigo x0.72; 5t | Funcionando |
| 30 | `toxicum_aura` | Aura Venenosa | uncommon | Debuff | Debuff; ATK inimigo x0.82; AS inimigo x0.82; 6t | Funcionando |
| 31 | `mortis_aura` | Aura da Morte | rare | Debuff | Debuff; ATK inimigo x0.62; AS inimigo x0.68; 6t | Funcionando |
| 32 | `tempus_manus` | Toque do Tempo | rare | Debuff | Debuff; AS inimigo x0.45; 8t | Funcionando |
| 33 | `abyssus_manus` | Mão do Abismo | epic | Debuff | Debuff; ATK inimigo x0.50; AS inimigo x0.58; 8t | Funcionando |
| 34 | `lux_aura` | Iluminar | uncommon | Utilidade | Utilidade; stats 50t | Funcionando |
| 35 | `tempus_unda` | Onda Temporal | rare | Utilidade | Utilidade; stats 30t | Funcionando |
| 36 | `caelum_pluvia` | Bênção das Alturas | epic | Utilidade | Utilidade; stats 50t | Funcionando |
| 37 | `abyssus_aura` | Aura do Abismo | epic | Utilidade | Utilidade; stats 50t | Funcionando |
| 38 | `eternum_lux` | Claridade Eterna | unique | Utilidade | Utilidade; stats 100t | Funcionando |
| 39 | `lux_manus` | Olho do Mago | uncommon | Utilidade | Utilidade; stats 40t | Funcionando |
| 40 | `caelum_unda` | Maré Celestial | epic | Utilidade | Utilidade; stats 50t | Funcionando |
| 41 | `ignis_pluvia` | Chispa Arcana | uncommon | Utilidade | Utilidade; tile create x2 | Funcionando |
| 42 | `arcanum_pluvia` | Chuva Arcana | rare | Utilidade | Utilidade; tile create x4 | Funcionando |
| 43 | `glacies_arcanum` | Purificação Glacial | rare | Utilidade | Utilidade; tile refresh x3 | Funcionando |
| 44 | `tempus_arcanum` | Reinício Temporal | rare | Utilidade | Utilidade; tile refresh x8 | Funcionando |
| 45 | `ignis_glacies` | Explosão de Vapor | common | Dano | Dano; base 10; scale 1.6; AS inimigo x0.82; 2t | Funcionando |
| 46 | `fulgur_glacies` | Choque Glacial | common | Dano | Dano; base 12; scale 1.8; AS inimigo x0.70; 3t | Funcionando |
| 47 | `vitae_mortis` | Dreno de Vida | rare | Dano | Dano; base 18; scale 2.2; roubo 60% | Funcionando |
| 48 | `fulgur_mortis` | Raio Letal | rare | Dano | Dano; base 25; scale 3.2; AS inimigo x0.72; 4t | Funcionando |
| 49 | `caelum_umbra` | Eclipse | epic | Dano | Dano; base 35; scale 4.0; ATK inimigo x0.65; AS inimigo x0.65; 6t | Funcionando |
| 50 | `ignis_manus` | Golpe de Fogo | common | Dano | Dano; base 8; scale 1.3; roubo 25% | Funcionando |
| 51 | `glacies_unda` | Onda Gélida | common | Dano | Dano; base 7; scale 1.2; AS inimigo x0.75; 4t | Funcionando |
| 52 | `glacies_vortex` | Vórtice de Gelo | rare | Dano | Dano; base 22; scale 2.8; ATK inimigo x0.88; AS inimigo x0.55; 5t | Funcionando |
| 53 | `fulgur_vortex` | Vórtice Elétrico | rare | Dano | Dano; base 24; scale 3.2; ATK inimigo x0.88; AS inimigo x0.68; 4t | Funcionando |
| 54 | `lux_sagitta` | Flecha Sagrada | uncommon | Dano | Dano; base 16; scale 2.2 | Funcionando |
| 55 | `sagitta_pluvia` | Chuva de Flechas | uncommon | Dano | Dano; base 9; scale 1.5; ATK inimigo x0.90; 3t | Funcionando |
| 56 | `vitae_sagitta` | Flecha Vital | common | Cura | Cura; base 12; scale 1.4 | Funcionando |
| 57 | `vitae_pluvia` | Chuva Vital | uncommon | Cura | Cura; base 18; scale 2.2; stats 8t | Funcionando |
| 58 | `ignis_scutum` | Escudo de Chamas | common | Buff | Buff; stats 9t | Funcionando |
| 59 | `vortex_fortis` | Turbilhão Supremo | epic | Buff | Buff; stats 7t | Funcionando |
| 60 | `mortis_manus` | Mão da Morte | rare | Debuff | Debuff; ATK inimigo x0.50; AS inimigo x0.58; 7t | Funcionando |
| 61 | `tempus_vortex` | Vórtice Temporal | rare | Debuff | Debuff; AS inimigo x0.38; 8t | Funcionando |
| 62 | `ignis_unda` | Onda de Fogo | common | Dano | Dano; base 9; scale 1.4 | Funcionando |
| 63 | `ignis_fulgur` | Tempestade Ígnea | common | Dano | Dano; base 13; scale 2.0 | Funcionando |
| 64 | `ignis_lux` | Explosão Solar | uncommon | Dano | Dano; base 18; scale 2.5 | Funcionando |
| 65 | `fulgur_pluvia` | Chuva Elétrica | uncommon | Dano | Dano; base 10; scale 1.6; AS inimigo x0.80; 3t | Funcionando |
| 66 | `toxicum_unda` | Onda Venenosa | uncommon | Dano | Dano; base 12; scale 1.8; ATK inimigo x0.82; 4t | Funcionando |
| 67 | `ignis_vortex` | Vórtice de Fogo | rare | Dano | Dano; base 22; scale 3.0; ATK inimigo x0.85; 4t | Funcionando |
| 68 | `umbra_mortis` | Toque do Vazio | rare | Dano | Dano; base 28; scale 3.5; roubo 50% | Funcionando |
| 69 | `mortis_vortex` | Vórtice Mortal | rare | Dano | Dano; base 38; scale 4.2 | Funcionando |
| 70 | `abyssus_unda` | Onda Abissal | epic | Dano | Dano; base 45; scale 5.0 | Funcionando |
| 71 | `caelum_abyssus` | Colapso Cósmico | epic | Dano | Dano; base 60; scale 7.0 | Funcionando |
| 72 | `caelum_mortis` | Julgamento Divino | epic | Dano | Dano; base 48; scale 5.5; ATK inimigo x0.55; AS inimigo x0.65; 7t | Funcionando |
| 73 | `vitae_lux` | Cura Divina | uncommon | Cura | Cura; base 25; scale 3.2 | Funcionando |
| 74 | `vitae_vortex` | Vórtice da Vida | rare | Cura | Cura; base 35; scale 4.5 | Funcionando |
| 75 | `ignis_aura` | Aura Ardente | uncommon | Buff | Buff; stats 10t | Funcionando |
| 76 | `umbra_scutum` | Escudo Sombrio | uncommon | Buff | Buff; stats 8t | Funcionando |
| 77 | `tempus_scutum` | Escudo Temporal | rare | Buff | Buff; stats 9t | Funcionando |
| 78 | `lux_fortis` | Bênção do Guerreiro | epic | Buff | Buff; stats 8t | Funcionando |
| 79 | `fulgur_fortis` | Surto Elétrico | epic | Buff | Buff; stats 7t | Funcionando |
| 80 | `glacies_pluvia` | Chuva Gélida | uncommon | Debuff | Debuff; ATK inimigo x0.90; AS inimigo x0.60; 6t | Funcionando |
| 81 | `toxicum_manus` | Toque Venenoso | uncommon | Debuff | Debuff; ATK inimigo x0.70; AS inimigo x0.85; 6t | Funcionando |
| 82 | `umbra_aura` | Aura Sombria | uncommon | Debuff | Debuff; ATK inimigo x0.75; AS inimigo x0.75; 8t | Funcionando |
| 83 | `toxicum_mortis` | Peste Mortal | rare | Dano | Dano; base 30; scale 3.7; ATK inimigo x0.78; 5t | Funcionando |
| 84 | `arcanum_fulgur` | Raio Arcano | rare | Dano | Dano; base 27; scale 3.4 | Funcionando |
| 85 | `abyssus_vortex` | Espiral Abissal | epic | Dano | Dano; base 52; scale 5.8; AS inimigo x0.62; 6t | Funcionando |
| 86 | `chaos_fulgur` | Relampago Caotico | unique | Dano | Dano; base 48; scale 5.2; variacao caos | Funcionando |
| 87 | `mortis_pluvia` | Chuva Funebre | rare | Dano | Dano; base 34; scale 3.9; roubo 35% | Funcionando |
| 88 | `vitae_arcanum` | Selo Restaurador | rare | Cura | Cura; base 30; scale 3.8; stats 7t | Funcionando |
| 89 | `caelum_manus` | Mao Celestial | epic | Cura | Cura; base 48; scale 5.6; stats 6t | Funcionando |
| 90 | `eternum_manus` | Toque Eterno | unique | Cura | Cura; base 72; scale 8.5; stats 8t | Funcionando |
| 91 | `fulgur_scutum` | Escudo Eletrico | common | Buff | Buff; stats 7t | Funcionando |
| 92 | `arcanum_scutum` | Barreira Arcana | rare | Buff | Buff; stats 8t | Funcionando |
| 93 | `chaos_aura` | Aura do Caos | unique | Buff | Buff; stats 8t | Funcionando |
| 94 | `fortis_manus` | Punho Fortificado | epic | Buff | Buff; stats 8t | Funcionando |
| 95 | `umbra_pluvia` | Chuva Sombria | uncommon | Debuff | Debuff; ATK inimigo x0.68; 6t | Funcionando |
| 96 | `tempus_pluvia` | Chuva Lenta | rare | Debuff | Debuff; AS inimigo x0.42; 7t | Funcionando |
| 97 | `abyssus_scutum` | Pressao Abissal | epic | Debuff | Debuff; ATK inimigo x0.55; AS inimigo x0.70; 7t | Funcionando |
| 98 | `mortis_unda` | Onda Sepulcral | rare | Debuff | Debuff; ATK inimigo x0.62; AS inimigo x0.78; 6t | Funcionando |
| 99 | `tempus_lux` | Teleporte Luminoso | rare | Utilidade | Utilidade; teleportExplored r4 | Funcionando |
| 100 | `arcanum_unda` | Passagem Arcana | rare | Utilidade | Utilidade; teleportExplored r8 | Funcionando |
| 101 | `tempus_fortis` | Salto Temporal | epic | Utilidade | Utilidade; teleportBlueTower r12 | Funcionando |
| 102 | `chaos_vortex` | Dobra Instavel | unique | Utilidade | Utilidade; stats 30t; tile refresh x6 | Funcionando |
| 103 | `ignis_mutare` | Mutacao Ignea | unique | Mutare | Buff; Mutare: ataque ignis | Funcionando |
| 104 | `glacies_mutare` | Mutacao Glacial | unique | Mutare | Buff; Mutare: ataque glacies | Funcionando |
| 105 | `fulgur_mutare` | Mutacao Eletrica | unique | Mutare | Buff; Mutare: ataque fulgur | Funcionando |
| 106 | `umbra_mutare` | Mutacao Sombria | unique | Mutare | Buff; Mutare: ataque umbra | Funcionando |
| 107 | `lux_mutare` | Mutacao Luminosa | unique | Mutare | Buff; Mutare: ataque lux | Funcionando |
| 108 | `toxicum_mutare` | Mutacao Venenosa | unique | Mutare | Buff; Mutare: ataque toxicum | Funcionando |
| 109 | `mortis_mutare` | Mutacao Mortal | unique | Mutare | Buff; Mutare: ataque mortis | Funcionando |
| 110 | `vitae_mutare` | Mutacao Vital | unique | Mutare | Buff; Mutare: ataque vitae | Funcionando |
| 111 | `caelum_mutare` | Mutacao Celestial | unique | Mutare | Buff; Mutare: ataque caelum | Funcionando |
| 112 | `abyssus_mutare` | Mutacao Abissal | unique | Mutare | Buff; Mutare: ataque abyssus | Funcionando |
| 113 | `eternum_mutare` | Mutacao Eterna | unique | Mutare | Buff; Mutare: ataque eternum | Funcionando |
| 114 | `tempus_mutare` | Mutacao Temporal | unique | Mutare | Buff; Mutare: ataque tempus | Funcionando |
| 115 | `ignis_reformare` | Forma Ignea | epic | Reformare | Buff; Reformare: forma ignis | Funcionando |
| 116 | `glacies_reformare` | Forma Glacial | epic | Reformare | Buff; Reformare: forma glacies | Funcionando |
| 117 | `fulgur_reformare` | Forma Eletrica | epic | Reformare | Buff; Reformare: forma fulgur | Funcionando |
| 118 | `umbra_reformare` | Forma Sombria | epic | Reformare | Buff; Reformare: forma umbra | Funcionando |
| 119 | `lux_reformare` | Forma Luminosa | epic | Reformare | Buff; Reformare: forma lux | Funcionando |
| 120 | `toxicum_reformare` | Forma Venenosa | epic | Reformare | Buff; Reformare: forma toxicum | Funcionando |
| 121 | `mortis_reformare` | Forma Mortal | epic | Reformare | Buff; Reformare: forma mortis | Funcionando |
| 122 | `vitae_reformare` | Forma Vital | epic | Reformare | Buff; Reformare: forma vitae | Funcionando |
| 123 | `caelum_reformare` | Forma Celestial | epic | Reformare | Buff; Reformare: forma caelum | Funcionando |
| 124 | `abyssus_reformare` | Forma Abissal | epic | Reformare | Buff; Reformare: forma abyssus | Funcionando |
| 125 | `eternum_reformare` | Forma Eterna | unique | Reformare | Buff; Reformare: forma eternum | Funcionando |
| 126 | `tempus_reformare` | Forma Temporal | epic | Reformare | Buff; Reformare: forma tempus | Funcionando |

## Observacao

Combina??es sem entrada craftada em `ALL_SPELLS` ainda caem no fallback gerado por `generateFallbackSpell`, com efeito `fizzle`; isso ? placeholder/intencional e n?o foi expandido nesta tabela.
