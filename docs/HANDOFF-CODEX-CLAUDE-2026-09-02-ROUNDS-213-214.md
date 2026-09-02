# HANDOFF CODEX -> CLAUDE — RODADAS 213–214

**Data da evidência:** 2026-09-02 11:55 UTC

**Base:** `862b7352a305b9d111a1a065b60587c9babe1d72`

**Commit funcional:** `7fbd78d01d9d67d3933ff0bbbb57e3ba4cd4ae01`

**Workstream:** aquisição, fluxo e assinaturas B2B

**Escopo:** medição somente; nenhuma tela, preço, crédito, checkout, render ou migration alterados

## Resultado executivo

**FATO CONFIRMADO:** o repositório não tinha um leitor autoritativo que ligasse um artefato B2B a uma assinatura recorrente paga pela mesma Stripe Checkout Session. `scripts/b2b-commercial-funnel-report.mjs` mede packs; `scripts/b2c-subscription-truth-report.mjs` exclui origens B2B; e `scripts/local-business-brief-funnel-report.mjs` não exige modo de assinatura, tier recorrente e a mesma Session.

**IMPLEMENTADO / TESTADO LOCALMENTE:** `scripts/b2b-subscription-truth-report.mjs` agora responde por caminho B2B:

- quantas pessoas externas chegaram a uma assinatura recorrente;
- quantas Stripe Sessions exatas foram iniciadas e pagas;
- receita exata por moeda, sem converter ou misturar moedas;
- mensal e anual separados; Autopilot apenas mensal;
- pack avulso e piloto Autopilot excluídos de assinantes;
- proposta copiada, calculadora e artefato gerado tratados como assistência, não como venda;
- conflitos de dono, produto, campanha, linha do tempo ou Session falham fechados;
- contas internas, perfis desconhecidos e sessões anônimas permanecem unidades separadas.

O runner somente leitura é `scripts/measure-b2b-subscription-truth.mjs` e o contrato executável é `scripts/test-b2b-subscription-truth-report.mjs`.

## Evidência de produção observada

**EVIDÊNCIA DE PRODUÇÃO — Supabase, 2026-09-02 11:55 UTC, janela de 30 dias, contas internas excluídas:**

- `weekly_business_video_plan`, `client_short_brief_v1` e `autopilot_case_study_v1`: **0 pessoas externas com checkout recorrente atribuível, 0 Stripe Sessions recorrentes, 0 pagamentos atribuíveis e US$0 de receita atribuível**;
- `business_content_plan_viewed`: 1 evento, 0 pessoas externas, 1 sessão anônima;
- `client_short_brief_viewed`: 1 evento, 1 pessoa externa;
- não havia geração, cópia ou ativação observada nesses dois artefatos;
- calculadora de margem da agência: 5 visualizações, 1 pessoa externa e 4 sessões anônimas;
- calculadora Autopilot: 11 visualizações na versão de break-even (9 pessoas externas, 2 sessões anônimas) e 5 visualizações humanas na versão de decisão (3 pessoas externas, 2 sessões anônimas); sem cálculo ou clique de checkout observado.

**EVIDÊNCIA DE PRODUÇÃO — ledger global, mesma observação:** havia 5 pessoas externas pagas, 5 Stripe Sessions e US$92,70 em assinaturas, mas **não existe evidência para atribuí-las aos caminhos B2B acima**. O relatório deixa isso como desconhecido; não inventa origem.

## Call graph e lacunas de atribuição

**FATO CONFIRMADO:** o plano semanal preserva `intent_campaign=weekly_business_video_plan` em `lib/growth/businessContentPlan.ts:238`; o briefing de cliente preserva `intent_campaign=client_short_brief_v1` em `lib/growth/clientShortBrief.ts:157`; o gerador carrega essa origem até os links de preço em `app/(dashboard)/generate/GenerateClient.tsx:927-933`; e o servidor grava a campanha no `checkout_started` em `app/api/stripe/checkout/route.ts:935`.

**FATO CONFIRMADO / QUESTÃO PENDENTE:** o briefing de negócio local cria um redirect explícito por `lib/toolActivationHref.ts:71`, mas esse redirect não inclui `intent_campaign`. Em seguida, `app/(auth)/signup/page.tsx:43-44` retorna o redirect explícito antes da propagação dos parâmetros externos feita em `app/(auth)/signup/page.tsx:55`. Portanto, essa superfície continua sendo assistência sem atribuição causal ao checkout.

**FATO CONFIRMADO / QUESTÃO PENDENTE:** a calculadora Autopilot distingue `pilot | monthly` em `app/pricing/AutopilotBreakEvenCalculator.tsx:156`, mas a escolha não é ligada pelo servidor à mesma Checkout Session. Ela é assistência, não prova de venda mensal.

## Gate de decisão

**DECISÃO DESTA RODADA:** não editar UI B2B com uma amostra tão pequena. Cada caminho fica em `collecting` até atingir 20 pessoas externas que geraram o artefato, ou até surgir a primeira Checkout Session/assinatura exata — o primeiro desses sinais libera diagnóstico específico do caminho.

**SUGESTÃO PARA A PRÓXIMA RODADA B2B:** corrigir primeiro uma única lacuna de atribuição existente, sem mudar a oferta: preservar a campanha do briefing de negócio local pelo redirect explícito. Só executar após reconciliar `origin/main` e confirmar que Claude não está tocando `lib/toolActivationHref.ts` ou `app/(auth)/signup/page.tsx`.

## Decisão comercial de moeda

**DECISÃO APROVADA PELO FUNDADOR EM 2026-09-02:** comunicar e cobrar em USD do começo ao fim. A confiança no último metro vem da consistência entre anúncio, preço e cobrança, não de simular moeda local. Stripe Tax permanece uma decisão fiscal separada; esta rodada não habilitou imposto automático nem alterou preço.

## Verificação

- `test-b2b-subscription-truth-report.mjs`: **46/46**;
- `test-subscription-revenue-ledger.mjs`: **31/31**;
- `test-b2b-commercial-funnel-report.mjs`: **98/98**;
- `test-local-business-brief-funnel-report.mjs`: **46/46**;
- `test-autopilot-break-even.mjs`: **41/41**;
- sintaxe do runner: verde;
- `git diff --check`: limpo;
- typecheck: somente os 3 erros pré-existentes em `app/api/admin/_shared/mrr.ts:113`, `app/api/me/subscription/route.ts:71` e `components/TrialDowngradeModal.tsx:334`; zero erro novo desta rodada.

**RISCO RESIDUAL:** até as duas lacunas de atribuição serem fechadas, briefing local, proposta de agência e calculadora Autopilot não podem receber crédito por assinatura. O novo leitor declara essa limitação em vez de preencher a lacuna com inferência.
