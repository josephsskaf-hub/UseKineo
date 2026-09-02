# HANDOFF CODEX → CLAUDE — ROUNDS 205–206

**Data:** 2026-09-02
**Workstream:** Growth B2B — atribuição do plano de conteúdo compartilhado
**Estado:** IMPLEMENTADO · TESTADO LOCALMENTE · VALIDADO EM PRODUÇÃO

## Resultado

**DECISÃO APROVADA:** a Kineo mantém uma única jornada comercial em USD. Esta rodada não alterou preço, moeda, oferta, crédito, SKU ou Checkout.

**EVIDÊNCIA DE PRODUÇÃO — Supabase, SELECT agregado, 2026-09-02, janela móvel de 30 dias, contas internas excluídas:**

- `business_content_plan_viewed`: 0 pessoas identificadas e 1 sessão anônima;
- nenhum `business_content_plan_generated`, `business_content_plan_copied`, `business_content_plan_activation_clicked` ou `business_content_plan_packs_clicked`;
- nenhuma entrada do `agency_volume_bridge` atingiu o gate mínimo de 20 atores: `home` tinha 7 pessoas identificadas + 10 sessões anônimas; `pricing`, 5 + 1; demais entradas abaixo disso;
- os experimentos recentes do Autopilot tinham montagem registrada, mas ainda sem amostra humana suficiente para nova alteração comercial.

**CONCLUSÃO:** não havia evidência para mudar UI ou oferta. A ação segura era tornar mensurável o loop já existente do artefato gratuito compartilhável.

## Causa do ponto cego

**FATO CONFIRMADO:** todo plano copiado já carregava a URL canônica com `utm_source=business_plan_copy`, `utm_medium=referral` e `utm_campaign=weekly_business_video_plan_share_v1`, mas a página não classificava essa entrada. Seus cinco eventos omitiam a origem, o marcador de visualização era global e era gravado antes do ACK do servidor, e o CTA de ativação substituía a origem por `business_planner/organic`.

**IMPLEMENTADO:** o servidor agora classifica somente a combinação exata allowlisted como `plan_copy_referral`; arrays ou qualquer divergência falham fechados como `direct_or_other`. A categoria é congelada no mount e acompanha, sem texto livre:

- visualização confirmada pelo servidor;
- plano gerado;
- plano copiado;
- clique para criar o primeiro Short;
- clique para ver pacote B2B.

O marcador passou a ser separado por entrada e usa `createReliableViewRecorder`: só fecha após `stored:true`, compartilha requisições concorrentes, limita retry e respeita desmontagem/StrictMode.

**FATO CONFIRMADO:** o CTA de signup preserva a origem `business_plan_copy/referral` para um novo visitante referido. A captura já existente continua first-touch e não sobrescreve Google, ChatGPT ou outra origem salva anteriormente. O `intent_campaign=weekly_business_video_plan` continua separado, descrevendo intenção de produto em vez de aquisição.

## Limite honesto da atribuição

**QUESTÃO PENDENTE:** a página de pacotes continua recebendo `entry=content_plan`. Portanto, a origem compartilhada deve ser reconciliada pelo evento de clique anterior e pelo mesmo `session_id`; `agency_bulk_page_viewed` isolado não prova essa origem. Nenhuma receita será atribuída ao plano compartilhado sem Stripe Session paga reconciliada.

**GATE DE APRENDIZADO:** preservar a superfície até haver pelo menos 10 visualizações referidas e 3 planos gerados, ou o primeiro clique em pacote/checkout/pagamento referido — o que ocorrer primeiro. Contar pessoas identificadas e sessões anônimas em colunas separadas; receita somente por Stripe Session paga, uma vez.

## Verificação

- `scripts/test-business-content-plan.mjs`: **196/196**;
- `scripts/test-reliable-page-view.mjs`: **10/10**;
- `scripts/test-agency-bridge-attribution.mjs`: **67/67**;
- `scripts/test-affiliate-landing-context.mjs`: **55/55**;
- `git -c core.whitespace=cr-at-eol diff --check`: limpo;
- TypeScript: exatamente os 3 erros baseline (`mrr.ts`, `me/subscription`, `TrialDowngradeModal`), zero novo;
- auditoria adversarial: **GO · P0=0 · P1=0 · P2=2**, ambos documentados e não bloqueantes.

## Produção

- commit funcional: `7de1ba1e8d4d8ebe203cc3bb877e96e97b6a0bb2`;
- deploy: `dpl_5gV9uKn4u2Dz3JMDbi37aqV38ike`;
- estado: **READY**, target production, alias `www.usekineo.com`;
- smoke GET em 2026-09-02 06:32 BRT: HTTP 200 na URL referida, query preservada e título do planner presente;
- erros runtime na rota nos 15 minutos pós-deploy: zero.

## Coordenação

Nenhum arquivo de render, geração, dashboard logado, crédito, preço ou Checkout foi tocado. A próxima rodada do Codex volta ao B2C e não reedita as superfícies ainda dentro de gate mínimo.

**ACHADO PARA RODADA B2B FUTURA:** o painel admin atual mistura pessoas e Stripe Sessions e não incorpora `bulk_purchase_completed` ao funil B2B. Corrigir essa verdade de medição antes de afirmar conversão ou receita por entrada.
