# KINEO-ADS-CENA-SEGUE-2110

**FATO CONFIRMADO:** base `e10f8efeec12b7cf8c7ba29cf80d4075fa8f9f97`; regra recebida em 22/10/2026; verificação local em 22–23/10/2026.

**EVIDÊNCIA DE PRODUÇÃO — relato do fundador em 22/10/2026:** o pedido de tênis identificado como `73d834f5` passou em três ensaios e terminou após onze minutos com `cena_keyframes_rejected`. Não houve consulta a banco, logs remotos ou render nesta tarefa.

## Comportamento entregue

**IMPLEMENTADO / FATO CONFIRMADO — texto:** o gerador tenta o GPT até três vezes no total. JSON incompleto, campos ausentes, instrução visual na fala, exagero sem respaldo e fala longa passam por recuperação e correção local; esgotadas as tentativas, o plano usa texto utilizável do próprio input. As frases opcionais são retiradas inteiras para buscar 30 palavras em PT ou 35 em EN, preservando nome, benefícios, oferta e CTA digitados. Se esse núcleo exceder a régua, ele segue completo com `word_budget_exception`. Referências: `lib/ads/cena/ajusteRespaldo.ts:126`, `:151`, `:195`, `:199`; classificação inválida vira cenário neutro em `lib/ads/cena/plan.ts:79`. Input inválido, autenticação e moderação mantêm suas proteções.

**IMPLEMENTADO / FATO CONFIRMADO — imagens:** permanecem dois candidatos por keyframe-base, em duas posições de composição. O juiz grava nota e motivos e escolhe o melhor candidato disponível por posição, mesmo com ressalvas; indisponibilidade do juiz também vira nota. Uma imagem sobrevivente pode cobrir a posição sem imagem, registrando a reutilização. Não há nova rodada paga para tentar satisfazer uma nota de qualidade. Ausência de qualquer imagem e divergência explícita de categoria contra a foto do cliente continuam falhas técnicas/de referência. A categoria sugerida pelo classificador, sozinha, nunca exclui uma imagem. Referência: `lib/ads/cena/pipeline.ts:44`.

**FATO CONFIRMADO — correção encontrada na revisão local:** havia um contraexemplo em que o classificador sugeria a categoria errada, o juiz devolvia outro enum sem `category_match`, e os candidatos eram descartados. A seleção agora exige `category_match:false` contra a foto para excluir; enum discordante sem essa comparação gera `keyframe_category_uncertain`. Isso foi identificado por leitura e dublês; não é apresentado como um novo incidente de produção. Referência: `lib/ads/cena/pipeline.ts:59`.

**IMPLEMENTADO / FATO CONFIRMADO — ensaio e execução:** `preflightCenaAjuste` faz as mesmas correções no dry-run, no start e nas retomadas. O start salva o plano corrigido na trava atômica já existente antes da cobrança. Nenhuma regra de qualidade exclusiva do render foi adicionada. Referências: `lib/ads/cena/ajustePreflight.ts:11`, `lib/ads/cena/internalAjuste.ts:25`, `lib/ads/v2StartCore.ts:84`, `:135`, `lib/ads/cena/runtime.ts:59`.

**IMPLEMENTADO / FATO CONFIRMADO — revisão do fundador:** `quality_notes` registra etapa, código, mensagem, nota, candidato, posição e motivos disponíveis. A narração e as notas são persistidas juntas no JSON do pedido, sob a mesma condição de lease; aparecem em `GET /api/ads/v2/status?order_id=…` e em `GET /api/ads/v2/orders?id=…`, além do dry-run. `narration_used` contém o roteiro selecionado e, após o envio, conserva o texto contratado na voz; não é uma transcrição independente do áudio nativo. Narração já paga ou com intenção de envio salva conserva o texto original. Jobs nativos ainda sem envio recebem o texto corrigido antes da intenção durável. Referências: `lib/ads/cena/ajusteQuality.ts:6`, `:13`, `lib/ads/cena/runtime.ts:54`, `:60`, `lib/ads/cena/pipeline.ts:77`, `lib/ads/v2Advance.ts:1543`, `app/api/ads/v2/orders/route.ts:48`.

**FATO CONFIRMADO — pedidos anteriores:** uma falha de qualidade no estado da cena pode ser recuperada reaproveitando imagens existentes somente enquanto o pedido está em `generating`. Pedidos já encerrados ou estornados não são reabertos. Referências: `lib/ads/cena/runtime.ts:32`, `lib/ads/cena/pipeline.ts:46`.

**IMPLEMENTADO / FATO CONFIRMADO — voz e montagem:** áudio narrado válido acima de 15 segundos segue inteiro. Nesse caso excepcional, a montagem dura o tempo da voz, mantendo o close móvel nos últimos cinco segundos e nome/oferta/CTA nos últimos dois; isso fica explícito em `voice_duration_extended`. O pedido comercial e seus créditos continuam com a duração contratada de 15 segundos, sem alteração de preço, cobrança ou estorno. Clipes positivos mais curtos usam repetição visual quando necessário; fala nativa toca uma vez. Texto final muito longo é paginado sem apagar caracteres e com aviso de leitura rápida. Referências: `lib/ads/cena/runtime.ts:120`, `lib/ads/cena/ajusteMontage.ts:10`, `:31`, `lib/ads/cena/ajusteMedia.ts:112`.

**FATO CONFIRMADO — schema consultado em 22/10/2026:** a composição remove `trim_start` e `trim_duration` dos vídeos com `loop:true`, conforme a [documentação oficial do elemento de vídeo do Creatomate](https://creatomate.com/docs/api/render-script/video-element). A consulta foi somente documental, sem render. Música opcional, close da foto real e final sobre a cena continuam no AJUSTE.

**FATO CONFIRMADO — escopo:** `ADS_CENA_LIVE='internal'` e `CENA95_LIVE=false` continuam iguais à base (`lib/ads/cena/catalog.ts:4`, `lib/ads/cena/live.ts:2`). Os arquivos específicos do motor 9,5, KidsVenda/KidsCartoon, módulos de preço/créditos/estorno, `lib/engineWall.ts` e `lib/homeVideoCuration.ts` não foram alterados. O JSON existente recebe as notas; não há migration nem tabela nova.

## Provas locais

**TESTADO LOCALMENTE — compilação:** `node node_modules/typescript/bin/tsc --noEmit --incremental false` terminou com código zero na sessão real `6013`, sobre `186670571c803c712e90ebefed36a9974262f876`. Os 1.827 inputs de compilação foram conferidos como idênticos aos da fonte congelada da suíte final, `f3683d1294f8310e3bdaff108265150cac4d2f0f`. O fechamento posterior altera somente este relatório; não se atribui uma nova execução a uma comparação de hashes. Recibos: `root-tsc-18667057.json` e `ads-cena-segue-final-r2-f3683d12-tsc-source-equivalence.json`, em `.claude/ads-cena-segue-proof-2210/`.

**TESTADO LOCALMENTE — desfaz:** camada `desfaz-ads-cena-segue-2110` antes de Respaldo e das demais camadas históricas, com snapshots e hashes antes/depois dos treze arquivos modificados e inventário das cinco adições. As provas conferem restauração exata, LF/CRLF, caminhos Windows, idempotência e rejeição de adulteração. Referências: `scripts/test-support/desfaz-ads-cena-segue-2110.mjs:1`, `scripts/test-support/desfaz-ads-cena-respaldo-2110.mjs:1`.

**TESTADO LOCALMENTE — guardião novo:** `node scripts/test-ads-cena-segue-2110.mjs` terminou com código zero dentro da suíte final. Todos os 49 mutantes foram detectados por `ERR_ASSERTION`; erro de sintaxe ou importação não conta como mutante morto. O guardião reproduz o comportamento antigo e executa POST, start, avanço, persistência e GET reais com dublês somente nas fronteiras de GPT, mídia, banco e cobrança. Cobre PT/EN, JSON ruim e indisponibilidade do GPT, texto longo, CTA/oferta preservados, juiz indisponível, duas imagens com ressalvas, categoria incerta, ausência de imagens, categoria explicitamente errada, fala já contratada, clipes curtos, duração da voz e desfaz exato. Log da execução final: `ads-cena-segue-final-r2-f3683d12/test-ads-cena-segue-2110.mjs.log` no diretório de provas.

**TESTADO LOCALMENTE — suíte inteira contra a base:** inventários reais, sem excluir scripts vermelhos:

| Fonte | Scripts | Verdes | Vermelhos |
| --- | ---: | ---: | ---: |
| Base `e10f8efeec12b7cf8c7ba29cf80d4075fa8f9f97` | 991 | 842 | 149 |
| Candidata congelada `f3683d1294f8310e3bdaff108265150cac4d2f0f` | 992 | 843 | 149 |

**TESTADO LOCALMENTE — comparação:** nenhum vermelho novo nos 991 scripts compartilhados. Os 149 vermelhos preservam os mesmos checks, resumos e detalhes. Nos logs compartilhados, foram comparados 697 checks e 88 cabeçalhos de exceção. A auditoria preserva os logs brutos e trata somente aliases exatos de worktree e TEMP, incluindo os dois diretórios efêmeros comprovados do teste de limitPurchase. O novo guardião tem stderr vazio. Sem timeout nem acionamento do bloqueio de rede/segredos; os sete testes que modificam fontes rodaram isoladamente ao final e restauraram seus arquivos. A snapshot final permaneceu limpa. Manifestos em `.claude/ads-cena-segue-proof-2210/`: `ads-cena-segue-origin-main.json`, `ads-cena-segue-final-r2-f3683d12.json` e `audit-independent-ads-cena-segue-final-r2-f3683d12.json`.

**FATO CONFIRMADO — proveniência:** a rodada parcial `ef2b8ef6` foi interrompida ao encontrar o bloqueio de categoria descrito acima; seus logs foram preservados e ela não conta como suíte final. A versão corrigida passou por uma nova execução integral dos 992 scripts. O fechamento do relatório não modifica produto, guardiões ou configuração de compilação.

## Limitações e próximo passo

**QUESTÃO PENDENTE / DESCONHECIDO:** dublês comprovam a política de correção e seleção, não fidelidade visual, naturalidade da locução, sincronismo ou qualidade percebida do vídeo. Não houve render, chamada paga, consulta ao banco real, leitura de `.env`, build, PR ou deploy. Autenticação, autorização, moderação e falhas efetivas de fornecedor continuam podendo interromper o pedido.

**QUESTÃO PENDENTE / DESCONHECIDO — português:** as provas PT/EN cobrem os inputs conhecidos, oferta, CTA e correção de fala. A descrição específica do BUG 4 foi solicitada, mas não consta das mensagens recebidas; essa correção não especificada não é declarada como concluída.

**SUGESTÃO — o que pode melhorar e próximo passo recomendado:** após publicação autorizada em outra tarefa, repetir o creme UGC PT e o tênis product EN e julgar o vídeo junto de `narration_used` e `quality_notes`. Conferir especialmente ressalvas de mãos/produto, páginas finais rápidas e a exceção de duração da voz; nota automática não comprova aprovação visual do fundador.
