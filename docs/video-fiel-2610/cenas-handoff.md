# Cenas fiéis ao pedido — 26/10/2026

**IMPLEMENTADO / TESTADO LOCALMENTE.** Base `9d8d3fad413d94798081528dbd61f3ba7848a76a`; branch `codex/contrato-cenas-2610`. Verificação em 26/10/2026, 02:41 BRT. Nenhum vídeo, banco, envio, gasto ou publicação executado.

## Mudança

- **FATO CONFIRMADO:** `lib/cinematic/visualPromptPolicy.ts:49` fornece a direção compartilhada às chamadas existentes: elenco distinto, acessórios pedidos, ação em vez de pose, estado vigente e sequência. `visualDescriptionDirection` já é usada pelo descritor da rota e pelo escritor de cenas; não há nova chamada.
- **FATO CONFIRMADO:** `lib/runway.ts:301` exige fatos/números apenas quando o pedido os fornece nos caminhos atuais com política visual ou orçamento de palavras. Sem ambos, a saída do prompt legado permanece igual. Em `:484`, três cenas precisam carregar ação inicial, desenvolvimento e o desfecho fornecido, sem CTA genérico nem aumento de cenas; filmes longos conservam a sequência e o desfecho.
- **FATO CONFIRMADO:** `lib/hollywood/router.ts:590` deixa de ordenar a invenção de uma pessoa única; `:592` permite a ação pedida sem trocá-la por pose; `:613` varia o enquadramento sem inventar outro assunto para preencher cenas. Modelos, segundos, número de requisições, retries, cobrança e anti-deepfake permanecem nos caminhos existentes.
- **FATO CONFIRMADO:** `lib/cinematic/sceneDescriptions.ts:216` mantém descrições existentes e usa a pista visual da própria cena quando falta uma descrição. Não importa sujeito, estado, ação nem cauda com adereços da vizinha. Fala crua, instrução, vazio ou criatura inexplicada exigem revisão. CTA puro pode conservar um assunto visual conhecido sem inventar acontecimento.

## Integração obrigatória da rota

**BLOQUEADO PARA ENTREGA ISOLADA:** `completeSceneDescriptions` agora pode retornar `reviewRequired?: number[]`, índices **0-based**, e `descriptions[i] = ''` nesses índices. O dono da rota deve impedir o envio ao fornecedor; não deixar `aiPrompt` vazio cair em `stockSearchQuery` ou `description` cru. Se o débito já ocorreu, usar o caminho existente de falha/estorno. Esta branch não altera as rotas, por ownership.

**FATO CONFIRMADO:** a narração não é reescrita pelo fallback. Pedidos literais não passam pelo escritor `generateScenes`. Nenhuma alteração em preço, crédito, motor, débito, acesso gratuito, seleção de voz, assinatura de claim ou montagem foi feita nesta branch.

## Filme de entrada de 15 s versus 60 s

| FATO CONFIRMADO no código de base | Seedance 1.5 / 15 s | Seedance 1.5 / 60 s |
|---|---|---|
| Cenas iniciais | 3 (`route.ts:3552`) | 7 por `ceil(d/9)`, teto 9 (`route.ts:998`) |
| Orçamento falado | 5 s por cena (`route.ts:3575`); faixa calculada na régua da voz | Faixa por duração, cenas e voz (`sceneWords.ts:15`) |
| Segundos enviados ao fornecedor | 3 × 6, 7 ou 8 s, escolhidos pela fala (`route.ts:6563`, `durationByEngine.ts:444`) | Caminho existente de clipes de 10 s e cobertura da fala (`seedanceCobreAFala.ts:69`) |
| Blocos marcados além do número de cenas | Junta vizinhos e conserva todas as palavras/ordem/desfecho (`durationByEngine.ts:482`) | Mesmo agrupador com alinhamento às fatias |

**QUESTÃO PENDENTE / DESCONHECIDO:** duração de 15 s não prova que a conta usou gratuidade. A admissão gratuita é separada por elegibilidade/país/histórico/trial/plano. Nenhuma classificação por pessoa ou plano foi inferida aqui.

## Testes offline executados

| Comando / contrato | Resultado |
|---|---|
| `node docs/video-fiel-2610/cenas-test.mjs` | PASS: 115 verificações, 6 mutações rejeitadas em memória |
| `node node_modules/typescript/bin/tsc --noEmit --incremental false` | PASS, exit 0 |
| `test-duracoes-curtas-todos-motores-2026-09-29.mjs` | PASS: 193 |
| `test-fala-x-imagem-2026-09-16.mjs` | PASS: 12 |
| `test-cinematic-timeline-2026-09-11.mjs` | PASS: 44 |
| `test-cinematic-speech-2026-09-11.mjs` | PASS: 300 |
| `git diff --check` | PASS |

**TESTADO LOCALMENTE:** os testes novos executam módulos reais com somente o I/O do modelo simulado; rede/SDK/banco indisponíveis. Cobrem duas raposas, luta versus espera, meias mudando de cor, adereço da vizinha, fala crua, instrução, CTA, criatura literal/metáfora, ausência total de descritor, desfecho de 15/60 s e ausência de chamada adicional. A mutação remove a regra ou troca sujeito em memória; nenhum produto/teste é reescrito no disco.

**CONTRADIÇÃO DE CONTRATO LEGADO, NÃO OMITIDA:** na base 9d8, `test-kling25-descricoes` passa 79; aqui são 66 válidas e 13 falhas que exigem copiar o assunto da vizinha ou sempre produzir imagem mesmo sem evidência. A correção aprovada abandona justamente esse comportamento. `test-visual-contract` passa 437 na base e aqui para no hash exato de `lib/runway.ts`; `test-sem-enchimento` para no mesmo hash. Estes guardiões históricos precisam de projeção exata da nova camada com prova das mutações, ou atualização do contrato atual acompanhada de testes adversariais. Não foram alterados nesta ownership.

**QUESTÃO PENDENTE / DESCONHECIDO:** os novos prompts foram comprovados na requisição simulada, não em resultado real de modelo. Aderência visual, fluidez, custo faturado e entrega real só podem ser validados com canários explicitamente autorizados após integração e publicação. O prompt maior mantém chamadas e tetos existentes; não se afirma custo monetário de texto idêntico.
