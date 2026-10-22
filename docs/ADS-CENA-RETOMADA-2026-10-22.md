# KINEO-ADS-CENA-RETOMADA-2110 — retorno ao AJUSTE aprovado

Data: 22/10/2026. Base: `796333e9a07ee0c83bb414312a062b63f8fc32bb`.

## Motivo e decisão

**EVIDÊNCIA DE PRODUÇÃO — relato do fundador nesta tarefa, 22/10/2026:** três rodadas reais do motor 9,5 não entregaram vídeos. Foram relatados `person0_rejected`, exigência de packshot apenas no real, UGC sem pessoa e narração artificial. O fundador relata que o motor AJUSTE-2110 anterior entregou vídeos aprovados. Não acessamos logs de produção nesta tarefa.

**IMPLEMENTADO / FATO CONFIRMADO:** `CENA95_LIVE=false` seleciona AJUSTE no admin; o seletor não vem do body nem de `.env` (`lib/ads/cena/live.ts:2`, `lib/ads/cena/internal.ts:28`). A restrição interna `ADS_CENA_LIVE='internal'` continua anterior ao seletor. Os módulos `*95.ts` não foram modificados nesta camada.

**IMPLEMENTADO / FATO CONFIRMADO:** plano 9,5 salvo e ainda não cobrado recebe `409 cena95_disabled_replan` antes do débito e precisa ser refeito como AJUSTE (`lib/ads/v2StartCore.ts:83`). Pedidos 9,5 já cobrados continuam sua execução original, sem reinterpretar o trabalho salvo (`lib/ads/cena/runtime.ts:39`). Essa política foi confirmada pelo fundador nesta conversa em 22/10/2026.

## Comportamento entregue

**IMPLEMENTADO / FATO CONFIRMADO:** o novo caminho chama o planejador, o juiz de keyframes, os adaptadores e a montagem AJUSTE. Não usa rodízio de atores, planejamento de três tomadas, reparador de fala, juiz de vídeos ou exigência de foto isolada do 9,5 (`lib/ads/cena/internalAjuste.ts:24`, `lib/ads/cena/runtime.ts:61`). O planejamento AJUSTE legado sem a nova opção permanece disponível para compatibilidade.

**IMPLEMENTADO / FATO CONFIRMADO:** o GPT escreve as frases, o nome do produto e os benefícios naturais. O código valida e pede uma segunda resposta quando a primeira é inválida; não cria prefixos, não reescreve frases nem completa uma lista com “It offers”/“O produto oferece”. A régua máxima de 40 palavras vem do AJUSTE; o prompt orienta fala mais curta, sem mínimo nem preenchimento (`lib/ads/cena/ajustePlan.ts:10`, `lib/ads/cena/plan.ts:80`).

**IMPLEMENTADO / FATO CONFIRMADO:** UGC mantém criador, rosto e produto; product prioriza produto e partes do corpo necessárias ao uso, sem atleta de corpo inteiro. O mesmo juiz AJUSTE exige `ugc_face_visible` somente no novo UGC; não cria uma etapa adicional de vídeo (`lib/ads/cena/ajustePlan.ts:37`, `lib/ads/cena/pipeline.ts:46`, `lib/ads/cena/plan.ts:120`).

**IMPLEMENTADO / FATO CONFIRMADO:** `narrated` mantém cena silenciosa e voz TTS por cima; `talking` mantém áudio nativo, sem TTS paralelo. A tomada própria de produto é silenciosa nos dois modos; no talking a fala original continua por baixo dela até o fim (`lib/ads/cena/ajusteMontage.ts:31`). O caminho de áudio antecipado pula os novos pedidos AJUSTE para não sintetizar voz/música duplicadas (`lib/ads/v2AudioCedo.ts:48`).

**IMPLEMENTADO / FATO CONFIRMADO:** a cena original aparece até 10 s; de 10 a 15 s entra i2v da URL exata da foto do cliente, com movimento lento e preservação do conteúdo da fonte. Nome, oferta digitada e CTA entram sobre esse vídeo nas trilhas visuais separadas já usadas pelo AJUSTE. Não há cartão ou caixa separados (`lib/ads/cena/ajusteMedia.ts:36`, `lib/ads/cena/ajusteMontage.ts:33`).

**IMPLEMENTADO / FATO CONFIRMADO:** música por categoria usa o caminho Lyria existente. A montagem usa aproximadamente −18 dB enquanto há voz e −15 dB depois, com fade. Erro, ausência de recibo ou prazo da música permitem seguir sem música (`lib/ads/cena/ajusteMedia.ts:94`, `lib/ads/cena/ajusteMontage.ts:12`). Não foi criado um provedor novo.

**IMPLEMENTADO / FATO CONFIRMADO:** o close grava intenção antes de submeter, reaproveita recibos e retenta somente falhas confirmadas uma vez. Cópia transitória não gera outro vídeo; resposta ambígua não é reenviada. Falha definitiva usa o caminho de falha/estorno já existente, sem mudar valores ou regras financeiras (`lib/ads/cena/ajusteMedia.ts:51`, `lib/ads/cena/runtime.ts:103`).

**IMPLEMENTADO / FATO CONFIRMADO:** admin dry/live compartilham planejamento, validação de texto, moderação, adaptadores e composição final antes da bifurcação. Start e retomada chamam o mesmo preflight. A foto não precisa ser packshot isolado (`lib/ads/cena/internalAjuste.ts:24`, `lib/ads/cena/ajustePreflight.ts:7`, `lib/ads/v2StartCore.ts:84`). Dry run planeja; não demonstra que um quadro ou áudio ainda não gerado passará na avaliação real.

## Custos e contratos

**FATO CONFIRMADO:** preço, créditos, débito e estorno não foram alterados. `cenaCosts` conserva `totalUsd:null`; a resposta AJUSTE avisa que os subtotais legados não incluem o novo close nem música (`lib/ads/cena/internalAjuste.ts:28`, `lib/ads/cena/adapters.ts:207`). Não se apresenta o subtotal antigo como custo completo desta retomada.

| Rota do close | Contrato reaproveitado do código | Duração solicitada / usada |
| --- | --- | --- |
| Kling 3 | `fal-ai/kling-video/v3/pro/image-to-video`, `start_image_url` | 5 s / 5 s |
| Seedance 2 | `bytedance/seedance-2.0/image-to-video`, `image_url` | 5 s / 5 s |
| Veo 3.1 | `fal-ai/veo3.1/image-to-video`, `image_url` | 6 s / 5 s |

**FATO CONFIRMADO — código de 22/10/2026:** a tabela descreve `lib/ads/cena/ajusteMedia.ts:36`. Esses contratos já existiam na camada 9,5 e foram reaproveitados, sem chamadas pagas nesta tarefa. As referências de documentação permanecem nos adaptadores e no relatório 9,5 anterior; não se alega uma nova validação do serviço remoto.

**QUESTÃO PENDENTE / DESCONHECIDO:** custo total faturado por rota, tokens, juiz, música, TTS, montagem e novas tentativas. Nenhuma proposta de preço foi aplicada. O acréscimo obrigatório de close aumenta trabalho de geração; o valor final precisa ser medido na rodada autorizada após publicação.

## Provas locais e desfaz

**TESTADO LOCALMENTE:** resultados finais da suíte, TypeScript, mutantes e desfaz serão registrados aqui antes da entrega. A execução é offline, com provedores, banco e cobrança substituídos por dublês. A referência da comparação é a base acima, sem atribuir falhas históricas à nova camada.

## Limites e próximo passo

**QUESTÃO PENDENTE / DESCONHECIDO:** qualidade visual real, fidelidade do produto no vídeo gerado, mãos, continuidade do rosto, naturalidade da voz, mixagem percebida e entrega de ponta a ponta em produção não foram validadas sem render. Teste offline verde não comprova vídeo entregue nem nota do fundador.

**SUGESTÃO:** depois do merge/publicação por responsável autorizado, repetir primeiro o pedido Kling 3 narrated já aprovado e conferir entrega, pessoa no UGC, produto protagonista no product, fala natural e close fiel. Só então ampliar a rodada; não reativar o 9,5 com base apenas em fixtures.

**FATO CONFIRMADO — escopo desta tarefa:** somente push na branch solicitada; sem PR, deploy, acesso a banco, render pago ou leitura de `.env`. `lib/engineWall.ts`, `lib/homeVideoCuration.ts` e as fontes financeiras foram preservados.
