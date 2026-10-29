# KINEO-QUALIDADE-REGRESSOES-2910

**TESTADO LOCALMENTE — 29/10/2026.** Comparação contra `origin/main` em `f0cf94914c1af202e7012207f31876436daa8be1`. Os dois commits originais foram rebaseados, sem conflito, como `65f4dd2c8` e `76dcccc08`. Esta rodada corrige regressões e guardiões; não cria oferta ou funcionalidade nova.

## Classificação dos 11 guardiões

**FATO CONFIRMADO — (a)** significa extração/contexto/âncora histórica desatualizada; as verificações de comportamento foram preservadas. **FATO CONFIRMADO — (b)** significa perda real de comportamento restaurada.

| Item | Guardião | Classe | Motivo e correção |
|---|---|---|---|
| 1 | `test-ads-cena-95-montagem-2110` | (a) | `plan.ts` ganhou a camada comum depois da camada idiomas/formatos. A projeção remove somente o delta exato e revisado antes dos hashes antigos. |
| 2 | `test-ads-cena-95-pipeline-2110` | (a) | Mesmo problema de ordem das camadas em `pipeline95.ts`; pacing, julgamento e orçamento antigos continuam verificados. |
| 3 | `test-ads-cena-calibracao-2110` | (a) | Compartilha a projeção histórica de `plan.ts`; nenhuma assertion de calibração removida. |
| 4 | `test-despacho-vazio-2026-09-04` | (a) | A âncora ElencoEpoca e a trava de arquivos não conheciam o delta autorizado de elenco/qualidade. A exceção exige hashes integrais e reversão idêntica ao upstream; despacho, refund e telemetria continuam lidos da rota atual. |
| 5 | `test-fidelidade-h3-2026-09-14` | (a) | Faltavam `styleAnchor` e `travarEstiloDoFilme` no contexto executado. Usa a implementação real e verifica o prefixo de silêncio depois da trava de estilo. |
| 6 | `test-h3-palavras-2026-09-15` | (a) | O recorte passou a executar `aplicarQualidadeHollywood`. Recebe as dependências reais offline; mantém as réguas de palavras, voz e duração. |
| 7 | `test-h3-verbatim-corte-2026-09-23` | (a) | Mesmo contexto incompleto do item 6; mantém os testes verbatim e o fuzz de roteiros. |
| 8 | `test-motores-r2-r6-2026-09-09` | **(b)** | A falha original de regex era (a): `textSafetySuffix` ficou aninhado na trava de estilo, e a ficha herdada precede a derivação. A prova ampliada encontrou perda real no Kling 4: o compactador removia a proteção de texto depois da ficha. Restaura a proteção existente com espaço reservado no payload. |
| 9 | `test-quality-route-integration-2026-09-11` | (a) | Faltava o leitor real do snapshot. Agora verifica ausência, snapshot corrente e retomada na resposta, cache e claim. |
| 10 | `test-s25-apresentador-2026-10-06` | (a) | O limite antigo incluía a nova chamada universal. A passada S25 tem limite explícito e a closure universal real também é executada; Tambora continua vulcão, sem apresentador, com fala e segundos preservados. |
| 11 | `test-seedance-ficha-2026-09-15` | (a) | A regex não reconhecia a precedência da identidade herdada. A prova executa as declarações reais e verifica que a ficha derivada chega a `policy.character`, além da prioridade da ficha da origem. |

## Proteções sensíveis

**FATO CONFIRMADO — IMPLEMENTADO:** `app/api/generate-video-cinematic/route.ts:3772` mantém `isStylizedLook(styleAnchor) || formatoVisual.modo === 'character_story' || classifyEngineFit(prompt).verdict === 'stock_cannot_tell'`. Noir sozinho não liga história. Em filmes sem herança, `deriveStoryCharacter(prompt)` continua alimentando `classicVisualPolicy.character` (`route.ts:3773`, `route.ts:3778`).

**FATO CONFIRMADO — IMPLEMENTADO:** o laço tradicional de Hollywood aplica `textSafetySuffix` antes do submit e do retry (`route.ts:6456`). O guardião executa o laço e retry reais para Kling 3, H3, H3 Max, Omni e S25, incluindo falta de still, fallback após falha explícita do host e retenção do prompt para retomada. A cena de diálogo S25 sem host permanece retida.

**FATO CONFIRMADO — CONTRADIÇÃO corrigida:** o Kling 4 pago tem despacho separado, anterior ao laço tradicional; não chamava `textSafetySuffix` nem no main. Sua proteção vinha do `NO_TEXT_SUFFIX` do planejador (`lib/hollywood/router.ts:332`). Um prompt curto com bilhete e ficha mantinha essa direção no payload do main, mas a compactação nova eliminava a cauda depois da ficha (`lib/cinematic/filmQuality.ts:62`). A correção preserva as restrições de texto que já existiam, sem exceder o orçamento do compactador ou os 512 code points do payload final (`lib/cinematic/filmQuality.ts:77`).

**TESTADO LOCALMENTE — 29/10/2026:** a prova compara o payload pago do main com o atual, em T2V/I2V, com o maior prefixo de keyframe e com prompts curtos/longos. Inclui pescador/época e menina/robô/ursinho/bicicleta: a ação e seus sujeitos/relações permanecem, assim como texto ilegível, proibição de legendas/watermarks, tela apagada/borrada e boca fechada. A revisão rejeitou duas propostas intermediárias que deslocavam a ação; a implementação final prioriza a ação e reduz o figurino excedente (`scripts/test-support/qualidade-sensitive-2910.mjs:177`, `lib/cinematic/filmQuality.ts:92`).

**FATO CONFIRMADO — IMPLEMENTADO:** `scripts/test-support/qualidade-sensitive-2910.mjs` executa código real da rota e das bibliotecas com I/O substituído por capturas locais. Os controles negativos removem o sufixo, ligam noir sozinho, removem a derivação e desligam a ficha da policy; o guardião deve rejeitar cada mutação.

## Camadas de desfazer

**FATO CONFIRMADO — IMPLEMENTADO:** `scripts/test-support/desfaz-qualidade-elenco-2910.mjs:15` valida hashes da fonte inteira, ocorrência única dos trechos e hash do resultado restaurado. O manifesto contém apenas fontes `app/` e `lib/` revisadas. A exceção da trava 8.2 exige também igualdade com o `origin/main` real, inclusive ausência prévia e hash integral dos módulos novos (`scripts/test-despacho-vazio-2026-09-04.mjs:219`).

**TESTADO LOCALMENTE — 29/10/2026:** `test-qualidade-camadas-2910` verifica a restauração integral, LF/CRLF e equivalência das cadeias históricas; rejeita fontes extras/parciais. Os testes de qualidade e elenco da entrega anterior continuam lendo as fontes atuais, sem projeção. O desfaz não substitui a prova comportamental do produto.

## Evidências e limite da entrega

**TESTADO LOCALMENTE — 29/10/2026:** [baseline no main](qualidade-regressoes-main-2910.json) registra os 11 guardiões aprovados. [Baseline da branch](qualidade-regressoes-baseline-2910.json) registra as 11 falhas e os cinco guardiões anteriores aprovados, antes desta correção. O teste S25 no main foi repetido após disponibilizar a dependência local TypeScript por junction; a primeira falha era somente de resolução dessa dependência.

**TESTADO LOCALMENTE — 29/10/2026:** [resultado final](qualidade-regressoes-final-2910.json) registra **11/11 guardiões corrigidos + 5/5 guardiões anteriores + 3/3 provas adicionais**, todos com exit 0. As provas adicionais são `test-qualidade-camadas-2910`, `tests/kling4PaidFilm.test.mjs` e `tests/kling4TrialTiming.test.mjs`. O arquivo registra hashes SHA-256 das fontes testadas e a saída de cada processo. Esta prova não afirma que os 268 guardiões mencionados no pedido foram reexecutados nesta rodada.

**TESTADO LOCALMENTE — 29/10/2026:** `npx tsc --noEmit --incremental false` terminou com exit 0 e nenhuma mensagem de erro. Resultado e data registrados no mesmo JSON.

**FATO CONFIRMADO — o que estava errado:** a entrega anterior não reconciliou seus novos limites de extração com todos os guardiões históricos e o compactador podia retirar uma proteção já presente. Esta rodada separa essas causas e adiciona provas que detectam a perda, além de verificar os testes antigos.

**SUGESTÃO — próximo passo recomendado:** integrar o SHA final verificado da mesma branch. A validação aqui é local, sem geração paga, credenciais, banco ou deploy; resultado visual em produção permanece fora desta prova.
