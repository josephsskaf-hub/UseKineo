# KINEO-ADS-CENA-SEGUE-2110

Base: `e10f8efeec12b7cf8c7ba29cf80d4075fa8f9f97`. Data: 22/10/2026.

**EVIDÊNCIA DE PRODUÇÃO — relato do fundador em 22/10/2026:** o pedido de tênis identificado como `73d834f5` passou em três ensaios e terminou após onze minutos com `cena_keyframes_rejected`. Não houve consulta a banco, logs remotos ou render nesta tarefa.

## Comportamento entregue

**IMPLEMENTADO / FATO CONFIRMADO — texto:** o gerador tenta o GPT até três vezes no total. JSON incompleto, campos ausentes, instrução visual na fala, exagero sem respaldo e fala longa passam por recuperação e correção local; esgotadas as tentativas, o plano usa texto utilizável do próprio input. As frases opcionais são retiradas inteiras para buscar 30 palavras em PT ou 35 em EN, preservando nome, benefícios, oferta e CTA digitados. Se esse núcleo exceder a régua, ele segue completo com `word_budget_exception`. Referências: `lib/ads/cena/ajusteRespaldo.ts:126`, `:151`, `:195`, `:199`; classificação inválida vira cenário neutro em `lib/ads/cena/plan.ts:79`. Input inválido, autenticação e moderação mantêm suas proteções.

**IMPLEMENTADO / FATO CONFIRMADO — imagens:** permanecem dois candidatos por keyframe-base, em duas posições de composição. O juiz grava nota e motivos e escolhe o melhor candidato disponível por posição, mesmo com ressalvas; indisponibilidade do juiz também vira nota. Uma imagem sobrevivente pode cobrir a posição sem imagem, registrando a reutilização. Não há nova rodada paga para tentar satisfazer uma nota de qualidade. Ausência de qualquer imagem e divergência explícita de categoria contra a foto do cliente continuam falhas técnicas/de referência. A categoria sugerida pelo classificador, sozinha, nunca exclui uma imagem. Referência: `lib/ads/cena/pipeline.ts:44`.

**FATO CONFIRMADO — correção encontrada na revisão local:** havia um contraexemplo em que o classificador sugeria a categoria errada, o juiz devolvia outro enum sem `category_match`, e os candidatos eram descartados. A seleção agora exige `category_match:false` contra a foto para excluir; enum discordante sem essa comparação gera `keyframe_category_uncertain`. Isso foi identificado por leitura e dublês; não é apresentado como um novo incidente de produção. Referência: `lib/ads/cena/pipeline.ts:59`.

**IMPLEMENTADO / FATO CONFIRMADO — ensaio e execução:** `preflightCenaAjuste` faz as mesmas correções no dry-run, no start e nas retomadas. O start salva o plano corrigido na trava atômica já existente antes da cobrança. Nenhuma regra de qualidade exclusiva do render foi adicionada. Referências: `lib/ads/cena/ajustePreflight.ts:11`, `lib/ads/cena/internalAjuste.ts:25`, `lib/ads/v2StartCore.ts:84`, `:135`, `lib/ads/cena/runtime.ts:59`.

**IMPLEMENTADO / FATO CONFIRMADO — revisão do fundador:** `quality_notes` registra etapa, código, mensagem, nota, candidato, posição e motivos disponíveis. A narração e as notas são persistidas juntas no JSON do pedido, sob a mesma condição de lease; aparecem em `GET /api/ads/v2/status?order_id=…` e em `GET /api/ads/v2/orders?id=…`, além do dry-run. O campo `narration_used` corresponde ao roteiro enviado; não é uma transcrição independente do áudio nativo. Narração já paga ou com intenção de envio salva conserva o texto original. Jobs nativos ainda sem envio recebem o texto corrigido antes da intenção durável. Referências: `lib/ads/cena/ajusteQuality.ts:6`, `:13`, `lib/ads/cena/runtime.ts:54`, `:60`, `lib/ads/cena/pipeline.ts:82`, `lib/ads/v2Advance.ts:1543`, `app/api/ads/v2/orders/route.ts:48`.

**IMPLEMENTADO / FATO CONFIRMADO — voz e montagem:** áudio narrado válido acima de 15 segundos segue inteiro. Nesse caso excepcional, a montagem dura o tempo da voz, mantendo o close móvel nos últimos cinco segundos e nome/oferta/CTA nos últimos dois; isso fica explícito em `voice_duration_extended`. O pedido comercial e seus créditos continuam com a duração contratada de 15 segundos, sem alteração de preço, cobrança ou estorno. Clipes positivos mais curtos usam repetição visual quando necessário; fala nativa toca uma vez. Texto final muito longo é paginado sem apagar caracteres e com aviso de leitura rápida. Referências: `lib/ads/cena/runtime.ts:120`, `lib/ads/cena/ajusteMontage.ts:10`, `:31`, `lib/ads/cena/ajusteMedia.ts:112`.

**FATO CONFIRMADO — schema consultado em 22/10/2026:** a composição remove `trim_start` e `trim_duration` dos vídeos com `loop:true`, conforme a [documentação oficial do elemento de vídeo do Creatomate](https://creatomate.com/docs/api/render-script/video-element). A consulta foi somente documental, sem render. Música opcional, close da foto real e final sobre a cena continuam no AJUSTE.

**FATO CONFIRMADO — escopo:** `ADS_CENA_LIVE='internal'` e `CENA95_LIVE=false` continuam iguais à base (`lib/ads/cena/catalog.ts:4`, `lib/ads/cena/live.ts:2`). O código 9,5, KidsVenda/KidsCartoon, módulos de preço/créditos/estorno, `lib/engineWall.ts` e `lib/homeVideoCuration.ts` não foram alterados. O JSON existente recebe as notas; não há migration nem tabela nova.

## Provas locais

**TESTADO LOCALMENTE — compilação:** `node node_modules/typescript/bin/tsc --noEmit --incremental false` terminou com código zero na sessão real `6013`, sobre `186670571c803c712e90ebefed36a9974262f876`. A equivalência dos inputs de compilação será selada para a ponta final; não se atribui uma nova execução a uma comparação de hashes.

**TESTADO LOCALMENTE — desfaz:** camada `desfaz-ads-cena-segue-2110` antes de Respaldo e das demais camadas históricas, com snapshots e hashes antes/depois dos treze arquivos modificados e inventário das cinco adições. As provas conferem restauração exata, LF/CRLF, caminhos Windows, idempotência e rejeição de adulteração. Referências: `scripts/test-support/desfaz-ads-cena-segue-2110.mjs:1`, `scripts/test-support/desfaz-ads-cena-respaldo-2110.mjs:1`.

**TESTADO LOCALMENTE — base e candidata:** a base `e10f8efeec12b7cf8c7ba29cf80d4075fa8f9f97` foi executada novamente: 991 scripts, 842 verdes e 149 vermelhos herdados. A rodada parcial da candidata `ef2b8ef6` foi interrompida ao encontrar o bloqueio de categoria descrito acima; seus logs foram preservados e ela não conta como suíte final. O resultado integral da candidata corrigida e os mutantes serão registrados ao término da verificação.

## Limitações e próximo passo

**QUESTÃO PENDENTE / DESCONHECIDO:** dublês comprovam a política de correção e seleção, não fidelidade visual, naturalidade da locução, sincronismo ou qualidade percebida do vídeo. Não houve render, chamada paga, consulta ao banco real, leitura de `.env`, build, PR ou deploy. Autenticação, autorização, moderação e falhas efetivas de fornecedor continuam podendo interromper o pedido.

**QUESTÃO PENDENTE / DESCONHECIDO — português:** as provas PT/EN cobrem os inputs conhecidos, oferta, CTA e correção de fala. A descrição específica do BUG 4 foi solicitada, mas não consta das mensagens recebidas; essa correção não especificada não é declarada como concluída.

**SUGESTÃO — o que pode melhorar e próximo passo recomendado:** após publicação autorizada em outra tarefa, repetir o creme UGC PT e o tênis product EN e julgar o vídeo junto de `narration_used` e `quality_notes`. Conferir especialmente ressalvas de mãos/produto, páginas finais rápidas e a exceção de duração da voz; nota automática não comprova aprovação visual do fundador.
