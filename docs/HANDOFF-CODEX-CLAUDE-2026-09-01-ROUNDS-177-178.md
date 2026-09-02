# Handoff Codex → Claude — rodadas 177–178

**Data local:** 2026-09-01 BRT
**Workstream:** Growth / B2C retorno pós-trial + B2B preservação de gate
**Base inicial:** `d3042a5d9f3015cc9fb235d5f353530e86771692`
**Base final após rebase:** `86ccdf28d9685cbbd82a61414771b59bb228625c`
**Branch isolada:** `codex/trial-downgrade-human-view-v1`

## Rodada 177 — B2C: separar modal montado de oferta realmente vista

**EVIDÊNCIA DE PRODUÇÃO (Supabase, SELECT somente leitura medido em 2026-09-02 01:30 UTC; contas internas excluídas):** na janela móvel de sete dias, 19 pessoas externas produziram `trial_downgrade_modal_shown`; 9 escolheram `stay_free`, 4 fecharam pelo backdrop e nenhuma produziu `trial_downgrade_modal_cta` ou `trial_downgrade_compare_plans_clicked`. O evento `shown` atual é disparado depois de `setOpen(true)`, antes de qualquer teste de viewport, dwell ou aba visível (`components/TrialDowngradeModal.tsx`). Logo, 19 é montagem técnica por conta, não 19 pessoas comprovadamente expostas.

**EVIDÊNCIA DE PRODUÇÃO (mesma medição):** a coorte estrita de pessoas externas cujo primeiro vídeo concluído antecede o fim do trial e que teve evento de navegador pós-expiração nos últimos sete dias contém 7 pessoas: 3 com um vídeo e 4 com dois ou mais. Cinco montaram o modal, três voltaram ao Generate, duas viram Pricing, nenhuma iniciou checkout e nenhuma gerou `payment_success` depois do retorno. Apenas uma viu Pricing sem modal nem retorno ao Generate. O gate de dez retornantes para testar “retorno público sem contexto” permanece abaixo da amostra; nenhuma copy, plano, preço, trial ou rota foi alterada.

**DECISÃO APROVADA:** a Kineo informa e cobra em USD no percurso inteiro. A confiança vem da coincidência entre o que foi comunicado e o que aparece no último segundo de decisão; não existe promessa de moeda local. Esta rodada não altera preço nem moeda.

**IMPLEMENTADO / TESTADO LOCALMENTE:** foi criado o evento fechado `trial_downgrade_offer_viewed`, uma vez por conta, somente depois de o preço em USD estar resolvido e o CTA primário real ocupar ao menos 60% da própria área por 1 segundo contínuo em uma aba com `document.visibilityState === 'visible'`. A medição usa `trackClosedEvent`, não herda UTM livre, e o marcador local só fecha como `stored` depois da confirmação de `/api/events`. `not_stored` recebe uma única nova tentativa; se a aba ou o CTA ficarem invisíveis, a intenção de retry é preservada e só rearma um novo dwell quando ambos voltam a ser elegíveis. Qualquer clique, dispensa ou CTA desabilitado encerra a medição antes do evento de ação. Um Web Lock serializa duas abas da mesma conta: uma pode gravar e a outra é deduplicada. Fora do lock, apenas `stored` encerra; `pending` aguarda sua vez, permitindo que a segunda aba grave se a primeira receber `not_stored`. Resposta ambígua nunca provoca re-POST cego. Navegador sem `IntersectionObserver`, Web Locks ou storage preserva o produto e falha apenas a medição.

**ESCOPO:** `components/TrialDowngradeModal.tsx`, `lib/growth/trialDowngradeHumanView.ts` e `scripts/test-trial-downgrade-human-view.mjs`. Zero mudança visual; por isso não há preview antes/depois. Nenhum preço, crédito, SKU, desconto, copy, plano recomendado, checkout, Stripe, render, banco ou migration mudou.

**TESTES:** `test-trial-downgrade-human-view.mjs` = 105/105; `test-trial-downgrade-plan-choice.mjs` = 39/39; `test-money-truth-contract.mjs` = 308/308; `tsc --noEmit --incremental false` = 0 erros; `git diff --check` limpo.

**GATE:** preservar a variante visual `trial_downgrade_plan_choice_v1`. Reabrir a hipótese de oferta apenas com 20 pessoas externas em `trial_downgrade_offer_viewed` ou com uma ação/pagamento anterior. Funil correto: união de `trial_downgrade_offer_viewed` e ação imediata comprovada → `trial_downgrade_modal_cta|trial_downgrade_compare_plans_clicked|trial_downgrade_modal_dismissed` → `checkout_cta_clicked(surface=trial_downgrade_modal)` → `checkout_started` → `payment_success`. `shown` continua útil como diagnóstico técnico, nunca como exposição humana.

## Reconciliação da intervenção anterior — Plan Fit

**EVIDÊNCIA DE PRODUÇÃO (Supabase, SELECT em 2026-09-02 01:30 UTC; contas internas excluídas):** desde 2026-09-02 01:05 UTC houve um primeiro vídeo externo concluído e zero `plan_fit_card_rendered`, `plan_fit_impression`, `plan_fit_checkout_cta_viewed` ou clique. Esse único vídeo foi `cinematic_ai`, 45 s, 19 créditos. O código ainda exige, além da primeira entrega, coorte vendável, estado de histórico confiável, ausência de `trialBalanceBridge` e ausência de caminho de episódio (`GenerateClient.tsx:4827-4966`). O banco não prova esses estados transitórios do cliente. **VEREDITO:** amostra insuficiente; não chamar zero de falha nem de rejeição e não reeditar a superfície antes do gate de dez montagens elegíveis.

## Rodada 178 — B2B: volume cresceu, nenhuma entrada atingiu o gate

**EVIDÊNCIA DE PRODUÇÃO (Supabase, SELECT somente leitura em 2026-09-02 UTC; contas internas conhecidas excluídas):** `agency_volume_bridge_viewed` alcançou 21 atores externos em 25 eventos na janela de sete dias, mas essa soma cruza entradas diferentes. Por entrada, a visão humana foi: `home=8`, `pricing=5`, `cost_page=4`, `state_report=4`, `kineo1_engine=1`. Nenhuma entrada gerou `agency_volume_bridge_clicked`. A regra canônica é vinte atores por entrada (`lib/growth/agencyBridgeTelemetry.ts`), portanto nenhuma mensagem ou posição pode ser julgada ainda.

**NO-GO PRESERVADO:** não editar ponte, landing, CTA, packs ou checkout B2B. O próximo diagnóstico abre somente quando uma entrada chega a vinte atores ou surge o primeiro clique real. Clique continua sendo avanço; `bulk_purchase_completed|payment_success` é receita. Zero ação externa, anúncio, outreach ou comunicação foi enviado.

## Cadeia até assinatura e próximo sprint

**Curto prazo:** o novo denominador distingue “a aplicação montou o modal” de “uma pessoa viu o CTA com o preço pronto para decidir”, evitando trocar oferta por um falso zero.
**Médio prazo:** a sequência por pessoa aponta se a perda está em leitura → escolha, escolha → checkout ou checkout → pagamento.
**Longo prazo:** só `payment_success`, assinatura ativa e renovação contam como receita; eventos de visão permanecem diagnóstico.
**PRÓXIMA AÇÃO SEGURA:** publicar e validar o novo evento; depois alternar para outra superfície enquanto os gates B2C e B2B coletam amostra, sem reeditar o Plan Fit, o modal ou a ponte empresarial.
