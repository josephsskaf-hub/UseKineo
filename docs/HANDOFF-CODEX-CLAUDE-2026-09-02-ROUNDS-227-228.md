# HANDOFF CODEX → CLAUDE — 2026-09-02 — rodadas 227–228

**Workstream:** Growth + Data · coerência USD no último passo + preservação dos gates B2B
**Snapshot Stripe:** 2026-09-02 11:55 BRT
**Escopo:** leitura do código e da Stripe em produção; nenhuma cobrança, Session, preço, crédito, Tax, Checkout, render, banco ou comunicação externa alterada

## Resultado executivo

**DECISÃO APROVADA — 2026-09-02:** o fundador reafirmou que a jornada comercial deve permanecer em USD até a cobrança. A razão comercial é credibilidade no último segundo de decisão: a informação pública e a moeda apresentada no Checkout precisam coincidir.

**FATO CONFIRMADO:** a fonte canônica permite apenas USD (`lib/checkoutPricing.ts`, `CheckoutCurrency = 'usd'`) e os seis construtores de Checkout usam essa moeda. Entretanto, nenhum deles define `adaptive_pricing`; portanto, todos herdam a configuração global da Stripe (`app/api/stripe/checkout/route.ts`).

**EVIDÊNCIA DE PRODUÇÃO — Stripe live, consulta em 2026-09-02 11:55 BRT, contas internas excluídas:** as cinco Sessions de assinatura externas mais recentes pertencem a quatro pessoas distintas. As cinco estão abertas, não pagas e com `adaptive_pricing.enabled=true`. Países de IP registrados: Nigéria, Índia, Azerbaijão e Japão. Os valores de integração permanecem em USD; nenhuma Session é receita.

## Decisão técnica e risco evitado

**FATO CONFIRMADO:** o cliente Stripe compartilhado está fixado em API `2024-06-20` (`lib/stripe.ts`). O parâmetro por Session `adaptive_pricing.enabled` foi adicionado pela Stripe em `2024-11-20.acacia`. Aplicá-lo por código agora exigiria elevar a versão da API nas chamadas do endpoint central de pagamentos.

**DECISÃO DE SEGURANÇA:** não alterar a versão da API nem o endpoint de Checkout para resolver uma configuração que a própria Stripe oferece no Dashboard. O rascunho de código foi rejeitado antes de qualquer edição; a worktree permaneceu limpa.

**AÇÃO OPERACIONAL PENDENTE:** em Stripe Dashboard → Settings → Payments → Adaptive Pricing, desativar Checkout em live mode. A documentação da Stripe declara que a mudança vale para novas Sessions e não modifica Sessions já convertidas. Depois do clique, validar a primeira Session externa nova: `adaptive_pricing.enabled=false`, moeda de integração `usd`, sem forçar pagamento.

**NÃO TOCADO:** Stripe Tax permanece como está; nenhum valor, plano, crédito, SKU, cupom, método de pagamento, webhook ou idempotência mudou.

## B2B — gate preservado

**EVIDÊNCIA DE PRODUÇÃO — handoffs canônicos de 2026-09-02:** nenhuma superfície B2B atingiu amostra para uma segunda edição. Discovery/bridge permanece abaixo de 20 pessoas por entrada; planner, client brief e proposta/calculadora têm uma pessoa ou sessão externa cada; checkout e compra bulk externos permanecem em zero.

**NO-GO B2B:** não criar nova landing, CTA, bridge ou reescrever planner/proposta enquanto esses experimentos coletam amostra. O primeiro gate objetivo continua sendo um `checkout_started` recorrente com `intent_campaign=growth_local_business_brief_20260828` ou 20 pessoas externas gerando o briefing, o que ocorrer primeiro. Só então reconciliar a mesma pessoa e a mesma Stripe Session até `payment_success`.

## B2B — duas verticais agora entram no placar correto

**FATO CONFIRMADO / NÃO DUPLICAÇÃO:** `product_to_short` e `growth_real_estate_video_maker_20260828` já eram campanhas públicas e indexadas, preservavam `intent_campaign` até o gerador e até o Checkout, mas não faziam parte do relatório canônico de assinatura B2B. Não foi criada outra página nem outro evento.

**IMPLEMENTADO:** `b2b_subscription_truth_v3` adiciona as duas campanhas à allowlist. Para essas verticais, `generate_completed` só serve como testemunha quando carrega a campanha exata. A ordem é rígida: campanha → vídeo concluído → `checkout_started` recorrente → `payment_success` da mesma Stripe Session e do mesmo dono. Checkout anterior ao vídeo fica em `preVideoDiagnostic`; conclusão posterior nunca reescreve a cronologia.

**FATO CONFIRMADO:** packs, piloto Autopilot, pessoas internas, anônimos, identidades ambíguas e conflitos de produto/valor/moeda continuam fora de assinantes e receita. Campanha vertical indica jornada, não prova que a pessoa representa uma empresa.

**TESTADO LOCALMENTE:** relatório B2B 58/58 + ledger de assinatura 31/31 + relatório ChatGPT 32/32 = 121/121. O caso negativo prova que `generate_completed` de outra campanha não contamina produto ou imobiliárias. `node --check` e `git diff --check` limpos. TypeScript mantém exatamente os três erros preexistentes em `app/api/admin/_shared/mrr.ts:113`, `app/api/me/subscription/route.ts:83` e `components/TrialDowngradeModal.tsx:334`; zero erro novo.

**QUESTÃO PENDENTE:** o runner de produção não foi executado nesta rodada. Portanto, ainda é desconhecido quantas pessoas externas existem em cada vertical; nenhuma impressão, geração ou Checkout será chamada de assinatura sem o ledger exato.

**GATE DAS VERTICAIS:** preservar as duas superfícies enquanto cada uma tiver menos de 20 pessoas externas com vídeo concluído e nenhuma Session recorrente atribuível. A primeira Session exata libera diagnóstico; somente pagamento da mesma Session conta como vitória.

## Próximo passo

1. Fundador desativa Adaptive Pricing em live mode no Dashboard.
2. Codex valida a primeira nova Session sem comprar nem cobrar.
3. Na próxima leitura autorizada, medir `product_to_short` e imobiliárias com o relatório v3; preservar as superfícies até seus gates.
4. Alternar para um estágio B2C sem gate ativo enquanto a amostra amadurece.
