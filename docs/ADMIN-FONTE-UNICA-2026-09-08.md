# ADMIN — UMA RÉGUA PARA CLIENTE E DINHEIRO (08/09/2026)

**Ordem do fundador (09:50 BRT):** "arruma o administrador de uma forma mais
completa e mais ampla, pra não ter esse tipo de erro mais". O erro do dia: o
MRR subiu no /admin e "não apareceu nada" — porque cada tela contava com a
sua própria tabela.

## O que estava errado (medido no código)

**16 arquivos** do admin e das campanhas tinham a própria lista de "plano
pago", e nenhuma era igual à outra:

| arquivo | lista | esquecia |
|---|---|---|
| overview (página e rota) | starter/basic/pro/autopilot + _trial + pilot | contava trial como pagante e MRR |
| people | starter/basic/pro/autopilot | creator/studio (aliases) |
| users | completa | — (mas escrita à mão) |
| 8 campanhas send-* | starter/basic/pro + _trial | autopilot, creator, studio |
| send-second-try-1usd, send-winback-25 | starter/basic/pro (+autopilot) | trials — mandava oferta a quem já está no $1 |
| send-day19, send-made-video-today, next-episode-wall, season-letter | starter/basic/pro/autopilot (+creator/studio) | trials |
| trial-roi | isPaidPlan OR has_paid | o $1 tem has_paid=true → "pagou" |
| ceo/compute | isPaidPlan | trial contava no MRR |
| funnel | payment_success = pagou | o $1 é payment_success |

## O que existe agora

`app/api/admin/_shared/mrr.ts` é a **única** fonte:

- `isPaidPlan` = tem relação paga (inclui `*_trial` e `autopilot_pilot`).
  **Use para excluir de campanha/oferta.**
- `isPayingPlan` = paga mensalidade agora (exclui `*_trial`). **Use para
  "pagantes" e MRR.**
- `isTrialPlan` = está no trial de $1.
- `classifyAccount(p, isInternal)` → `internal | paying | trial_1usd |
  card_required | free`.
- `isNewSubscriberEvent(name, meta)` = `payment_success` de assinatura sem
  `card_trial`, OU `subscription_invoice_paid` com `trial_conversion`.
  `isTrialEntryEvent` = o $1.
- `mrrForPlan` (tabela, preço NOVO) e `stripeMrrUsd` (o que cada assinatura
  cobra de fato; cache de 5 min). Os 12 pagantes antigos pagam o preço antigo:
  **MRR real é o da Stripe**, a tabela é "se todos estivessem no preço novo".

Os 16 arquivos passaram a importar daqui. O guardião
`scripts/test-admin-fonte-unica-2026-09-08.mjs` varre `app/admin` e
`app/api/admin` inteiros e **falha se qualquer arquivo voltar a escrever
`new Set(['starter', …])` ou `PLAN_PRICE_USD`**, além de executar a
classificação com fixtures (trial nunca é pagante; o $1 nunca é assinante
novo; renovação nunca é assinante novo).

## Como ler o admin a partir de hoje

- **Pagantes / MRR**: só `isPayingPlan`. MRR mostrado = Stripe.
- **Trials $1**: KPI próprio no /admin/overview; "viram $19 no dia 8".
- **Assinante novo**: `isNewSubscriberEvent`. Restaurar uma assinatura
  (dunning repair) sobe o MRR sem assinante novo — e é isso mesmo.

## Ficou fora (próximo passo se o fundador quiser)

- `app/admin/page.tsx` (HQ) e `/admin/paying` já usavam a fonte; não foram
  reescritos.
- A UI do "ao vivo" recebe `is_trial` mas ainda não pinta um selo.
- As 13 campanhas passaram a excluir também trials/autopilot — é o
  comportamento certo (nunca oferecer desconto a quem está no $1), mas muda
  o alcance delas em poucas contas.
