# Handoff Codex → Claude — rodadas 175–176

**Data:** 2026-09-01
**Workstream:** Growth / B2C medição do Plan Fit + B2B preservação de gate
**Base auditada:** `0c806d7ae0f1fbb282882a2484f22d7f258c45b6`
**Branch isolada:** `codex/planfit-card-rendered-v1`

## Rodada 175 — B2C: separar montagem técnica de exposição humana

**FATO CONFIRMADO EM CÓDIGO:** o Plan Fit só monta após o pai confirmar primeira entrega, vídeo persistido, motor suportado e coorte vendável (`app/(dashboard)/generate/GenerateClient.tsx:14185-14197`). Já `plan_fit_impression` exige ao menos 35% do card em viewport e `plan_fit_checkout_cta_viewed` exige 60% do botão; ambos revalidam elegibilidade antes de fechar o denominador (`components/growth/PlanFitCard.tsx`).

**LACUNA CONFIRMADA:** antes desta rodada não existia evento entre o render condicional do pai e o primeiro `IntersectionObserver`. Zero `plan_fit_impression` podia significar “o card nunca montou” ou “montou fora da área visível”; essas hipóteses pedem intervenções opostas.

**IMPLEMENTADO / TESTADO LOCALMENTE:** `plan_fit_card_rendered` é emitido uma vez por `videos.id` quando o card elegível monta. O contrato declara `event_unit=eligible_card_mount`, `surface_state=rendered_not_viewed`, `human_exposure_claimed=false`, `first_delivery=true` e `eligibility_basis=parent_confirmed_first_delivery`. A chave de `sessionStorage` só fecha depois de `trackEvent` confirmar armazenamento; falha ou exceção continua retentável. Nenhum `IntersectionObserver`, preflight de Stripe ou nova leitura de elegibilidade foi misturado ao denominador técnico.

**ESCOPO:** somente `lib/growth/planFitCtaExposure.ts`, `components/growth/PlanFitCard.tsx` e `scripts/test-plan-fit.mjs`. Nenhuma mudança visual, de copy, preço, USD, crédito, trial, SKU, checkout, Stripe, render ou banco. `app/api/admin/**` permaneceu intocado porque pertence à pista do Claude.

**TESTES:** `node scripts/test-plan-fit.mjs` = **382/382**; `tsc --noEmit --incremental false` = **0 erros**; `git diff --check` limpo. Uma asserção preexistente foi corrigida com justificativa dentro do teste: `indexOf('<NextShortsSection')` casava um comentário na linha ~9k, não o JSX na linha ~15k; o novo padrão ancora uma tag no começo de linha. A condição era falsa no próprio `origin/main` e não foi causada por esta rodada.

**GATE:** preservar a UI atual até pelo menos **10 pessoas externas** com `plan_fit_card_rendered` ou **20 conclusões externas estritas** de `chatgpt_quickstart_v5`, o que vier primeiro. Ler a sequência por pessoa: `plan_fit_card_rendered → plan_fit_impression → plan_fit_checkout_cta_viewed → plan_fit_checkout_clicked → checkout_started → payment_success`. Montagem técnica nunca conta como exposição humana, checkout ou venda.

## Rodada 176 — B2B: caminho financeiro vivo, amostra comercial ainda ausente

**FATO CONFIRMADO EM CÓDIGO:** a compra de packs continua ligada da seleção ao checkout e ao webhook: o caller vive em `app/ai-shorts-for-agencies/AgencyPacksClient.tsx`; a rota cria checkout de pagamento avulso em `app/api/stripe/checkout/route.ts`; o webhook reconhece e conclui a compra em `app/api/stripe/webhook/route.ts`. Pack é receita avulsa em USD, não assinatura nem MRR.

**EVIDÊNCIA DE PRODUÇÃO RECONCILIADA (SELECT de 2026-09-01, registrada no handoff 173–174):** quatro sessões anônimas alcançaram bulk/planner/brief e uma alcançou recrutamento empresarial; zero clique, seleção, brief submetido, checkout bulk ou pagamento. Nenhum dado novo contradiz esse retrato nesta rodada.

**NO-GO PRESERVADO:** não editar landing, CTA, oferta ou checkout B2B antes de dez exposições externas ou do primeiro clique real. Reabrir hipótese de mensagem somente com dois clickers distintos e ao menos uma aplicação ou cópia do destino business. O próximo diagnóstico seguro deve contar pessoas identificadas e sessões anônimas separadamente na cadeia recrutamento → aplicação/destino business → bulk → checkout → pagamento.

## Veredito e próximo sprint

**PROGRESSO:** a rodada transforma um zero ambíguo em um funil diagnosticável sem introduzir nova fricção. O código está implementado e testado localmente; produção e SHA de entrega serão preenchidos após push/deploy.

**PRÓXIMA AÇÃO SEGURA:** publicar a instrumentação; depois medir pessoas externas, não eventos. Enquanto o gate coleta amostra, alternar para uma superfície diferente do funil em vez de reeditar Plan Fit ou B2B.
