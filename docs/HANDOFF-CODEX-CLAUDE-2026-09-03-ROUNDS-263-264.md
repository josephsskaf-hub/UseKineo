# HANDOFF CODEX → CLAUDE — rodadas 263–264

**Janela da entrega:** 2026-09-03 01:15–01:45 UTC  
**Pista:** B2C · primeiro vídeo concluído → oferta → checkout → pagamento  
**Commit funcional:** `a45c8c94846863560006ff5bc61032dbc6281be6`  
**Deploy:** `dpl_B1P2KtnAMjaav2QcQNWKquA7giP7` · READY em 2026-09-03 01:44:48.956 UTC · `www.usekineo.com`

## Resultado

**IMPLEMENTADO E VALIDADO EM PRODUÇÃO (deploy):** o CTA de assinatura já existente em `TrialActiveBanner` passou a ter um denominador humano, versionado e pós-entrega. Nenhum pixel, texto, estilo, preço, crédito, SKU, link ou comportamento do checkout mudou.

**QUESTÃO PENDENTE:** ainda não existe amostra da versão nova. READY prova que o código está servido; não prova conversão. O primeiro evento real inicia o relógio do experimento.

## Evidência anterior à mudança

**EVIDÊNCIA DE PRODUÇÃO — Supabase, SELECT somente leitura, corte em 2026-09-03 01:15:16.727607 UTC, janela de 30 dias, contas internas excluídas:**

- 649 pessoas externas tiveram `trial_active_banner_shown`, evento técnico de montagem e não visão humana;
- em apenas 10 pessoas a primeira montagem ocorreu depois do primeiro vídeo concluído;
- 13 pessoas externas clicaram na superfície `trial_active_banner`;
- 2 dessas pessoas clicaram depois do primeiro vídeo concluído;
- esses cliques originaram 2 Stripe Checkout Sessions exatas;
- 0 dessas Sessions tinha pagamento de assinatura exato.

Esses números são baseline descritivo. Não formam uma coorte causal e não devem ser somados a eventos da nova versão.

## Contrato novo

**FATO CONFIRMADO:** versão `trial_active_subscription_cta_human_view_v1`, modo `trial_active_subscription`, evento `trial_active_subscription_cta_viewed`.

Uma pessoa só entra no denominador quando:

1. está autenticada e o banner está aberto;
2. o botão real de assinatura é o modo renderizado;
3. `/api/videos` confirma `historyReliable=true` e `completedCount>=1` para o próprio usuário;
4. ao menos 50% do botão permanece no viewport por 1 segundo contínuo;
5. a aba permanece visível;
6. o evento fechado é confirmado como armazenado ou fica terminalmente ambíguo, sem reenvio cego.

O clique carrega a mesma versão. Um clique rápido, anterior ao dwell de 1 segundo, não infla o denominador humano, mas pode ser ligado ao checkout se for versionado, da mesma sessão e posterior ao primeiro vídeo concluído.

## Verdade de atribuição

**FATO CONFIRMADO:** o relatório canônico agora separa:

- pessoas expostas;
- pessoas expostas já maduras individualmente;
- pessoas que clicaram;
- pessoas com clique maduro;
- Checkout Sessions exatas;
- pessoas e Sessions pagas exatas;
- receita por moeda;
- ambiguidades por motivo;
- contexto `return_ladder_rendered=true|false` da visão ao pagamento.

Cliques persistidos até 5 segundos depois de `checkout_started` viram `click_persistence_race`, nunca atribuição exata. Contextos contraditórios da escada também falham fechados.

## Gate

**DECISÃO OPERACIONAL:** não reeditar `TrialActiveBanner` antes de uma destas condições:

- 20 pessoas externas com exposição individualmente madura por 7 dias → `ready_for_decision`; ou
- 1 pagamento exato da versão → `ready_for_reconciliation`, apenas para reconciliação, nunca como prova causal isolada.

O caminho de clique tem subgate separado de 5 pessoas com clique maduro. Zero clique após 20 exposições maduras continua sendo resultado válido; o subgate não pode segurar indefinidamente uma decisão negativa.

## Arquivos funcionais

- `components/TrialActiveBanner.tsx`
- `lib/growth/trialActiveSubscriptionCta.ts`
- `scripts/b2c-subscription-truth-report.mjs`
- `scripts/test-b2c-subscription-truth-report.mjs`
- `scripts/test-trial-active-subscription-cta.mjs`

## Gates executados depois do rebase

**TESTADO LOCALMENTE:**

- `test-trial-active-subscription-cta.mjs`: 80/80;
- `test-b2c-subscription-truth-report.mjs`: 96/96;
- `test-trial-balance-bridge.mjs`: 208/208;
- `test-trial-post-video-primary.mjs`: 57/57;
- `test-trial-post-video-funnel.mjs`: 32/32;
- `test-post-delivery-checkout-origin-report.mjs`: 34/34;
- `test-subscription-revenue-ledger.mjs`: 31/31;
- `test-checkout-auth-session-bridge.mjs`: 61/61;
- total relacionado: 599/599;
- `git -c core.whitespace=cr-at-eol diff --check origin/main..HEAD`: limpo;
- três auditorias independentes: GO, P0=0, P1=0.

**CONTRADIÇÃO PREEXISTENTE:** `npx tsc --noEmit` mantém exatamente três erros fora desta entrega: `app/api/admin/_shared/mrr.ts:113`, `app/api/me/subscription/route.ts:83` e `components/TrialDowngradeModal.tsx:334`. Nenhum erro novo nos cinco arquivos funcionais.

## Comparação visual

**NÃO APLICÁVEL:** o diff não altera JSX visível, copy, `className`, estilo, href, preço ou estado de checkout. Adiciona apenas `ref`, observer e metadados. Portanto não há antes/depois visual honesto a apresentar.

## Riscos residuais

- `/api/videos` devolve também a lista do próprio usuário, embora esta medição use apenas o count; é um GET `no-store`, autenticado e owner-filtered, mas adiciona payload quando o CTA entra no viewport.
- Falha HTTP, JSON, rede, storage ou autoridade indisponível fecha somente a medição; nunca bloqueia o CTA.
- Não emitir canário manual do evento: isso contaminaria o denominador. A primeira pessoa real é a validação de persistência.

## Bloqueios comerciais passados adiante — não alterados

**CONTRADIÇÃO CONFIRMADA EM CÓDIGO:** `app/models-pricing/page.tsx:77-78` diz que 25 créditos dão doze filmes Kineo 1. A própria tabela calcula filmes de 60s, e `lib/credits/engineCost.ts:38-83,205-223` cobra 5 créditos no Kineo 1 pago, logo 25/5 = 5 filmes, não 12.

**CONTRADIÇÃO CONFIRMADA EM CÓDIGO:** `lib/checkoutPricing.ts:517-538` vende pacotes de 10/20/30/50 vídeos Fast e concede 12/24/36/60 créditos. Com Kineo 1 pago a 5 créditos por 60s, os grants não sustentam a quantidade prometida. Não promover nem ampliar o B2B desses pacotes antes de decisão explícita do fundador e correção coordenada na pista do Claude.

## Próxima rodada

Alternar para B2B, preservando o 50/50. Não criar mais uma landing ou CTA: primeiro procurar demanda mensurável em superfícies já publicadas e escolher outro estágio do funil. A superfície B2C desta rodada fica congelada até o gate acima.
