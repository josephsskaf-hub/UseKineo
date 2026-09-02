# Handoff Codex → Claude — rodadas 173–174

**Data:** 2026-09-01
**Workstream:** Growth / B2C retorno pós-checkout + B2B preservação de gates
**Base auditada:** `293c85ef90c60915b34616037e6bc83b55658e60`

## Rodada 173 — B2C: uma pessoa, um checkout, nenhuma razão declarada

**EVIDÊNCIA DE PRODUÇÃO (Supabase, `SELECT` em 2026-09-01; fronteira `chatgpt_quickstart_v5` em `2026-08-30T18:13:17Z`; contas internas excluídas pela lista canônica):** o funil estrito continua com uma única pessoa externa que concluiu vídeo e depois abriu checkout. Ela iniciou Starter mensal em USD em `2026-09-01T17:43:45Z`, voltou à Kineo 11,39 segundos depois, passou duas vezes por `/pricing`, não pagou e permanece `plan=free`, `has_paid=false`, `trial_status=downgraded`, sem identificador de assinatura.

**EVIDÊNCIA DE PRODUÇÃO / RETORNO:** a mesma pessoa gerou dois `pricing_saved_checkout_viewed`, cinco `checkout_resume_banner_viewed` e um `checkout_resume_banner_dismissed`, mas zero `pricing_saved_checkout_clicked`, zero `checkout_resume_banner_clicked`, zero `checkout_resume_smaller_plan_clicked`, zero `checkout_cancel_objection_viewed`, zero `checkout_cancel_reason`, zero novo `checkout_started` e zero `payment_success`. Os cinco eventos do banner pertencem a uma pessoa e nunca são cinco compradores.

**FATO CONFIRMADO EM CÓDIGO / SEMÂNTICA DE MEDIÇÃO:** `checkout_resume_banner_viewed` é emitido quando `/api/stripe/checkout/resume` devolve uma oferta e o estado é preenchido, antes da renderização condicional; não usa `IntersectionObserver` (`components/CheckoutResumeBanner.tsx:86-109`). `pricing_saved_checkout_viewed` segue o mesmo padrão de oferta carregada (`components/PricingSavedCheckout.tsx:69-78`). Portanto esses eventos provam montagem/data-ready, não visão humana. Já a caixa de objeção exige documento visível e pelo menos 50% de interseção antes de emitir `checkout_cancel_objection_viewed` (`lib/growth/checkoutCancelObjectionVisibility.ts:1-60`).

**FATO CONFIRMADO EM CÓDIGO / USD:** a cadeia observada foi coerente: `checkout_attempted`, a sessão, as duas recuperações de pricing e os cinco banners carregaram `currency=usd`, `first_charge_amount=700` e `renewal_amount=700`. A fonte canônica define checkout somente em USD; `/api/geo` chama `resolveCheckoutCurrency`, que hoje resolve USD mundialmente (`lib/checkoutPricing.ts`; `app/api/geo/route.ts:1-23`). Ocorrências de BRL/INR encontradas no grep são majoritariamente comentários históricos ou integrações órfãs; a campanha India responde 410 e não é reativada.

**HIPÓTESE, NÃO PROVADA:** o retorno duplo a pricing e a dispensa do lembrete sugerem que a pessoa comparou a decisão e não quis retomar, mas a amostra é uma pessoa e ela não declarou objeção. Não há base para chamar preço, moeda, confiança, plano ou forma de pagamento de causa.

**GATE / NO-GO:** não redesenhar checkout, banner, pricing ou objeções com `n=1`. Preservar `resume_smaller_choice_v1` e a verdade USD até pelo menos três pessoas externas com checkout pós-primeira entrega; avaliar somente cliques reais, novo `checkout_started`, `payment_success` e assinatura ativa. Eventos `*_viewed` sem verificação de viewport permanecem denominadores técnicos, não exposição humana.

## Rodada 174 — B2B: quatro visitas anônimas, nenhum avanço financeiro

**EVIDÊNCIA DE PRODUÇÃO (Supabase, `SELECT` em 2026-09-01; janela móvel de sete dias; contas internas excluídas):** `agency_bulk_page_viewed`, `agency_margin_calculator_viewed` e `b2b_brief_viewed` têm quatro sessões anônimas cada. `affiliate_business_recruitment_viewed` continua em uma sessão anônima. Não apareceu `affiliate_business_recruitment_clicked`, `agency_margin_pack_selected`, `agency_bulk_pack_clicked`, `b2b_brief_submitted`, `bulk_checkout_started` ou `bulk_purchase_completed`.

**EVIDÊNCIA DE PRODUÇÃO / NÃO CONFUNDIR:** existe uma `affiliate_application_submitted` identificada em `2026-08-27`, anterior à variante empresarial e sem cadeia atribuída a `business`; ela não prova que o recrutamento empresarial funcionou e não é compra.

**NO-GO B2B PRESERVADO:** nenhuma landing, CTA, mensagem, oferta ou checkout novo. `affiliate_business_recruitment_v1` permanece até dez exposições externas; o caminho business só reabre com dois clickers distintos e ao menos uma aplicação ou cópia business. Packs continuam compra avulsa em USD e não contam como assinatura ou MRR.

## Estado da rodada

**VEREDITO:** a intervenção correta foi impedir duas decisões falsas: cinco montagens não viraram cinco compradores, e uma aplicação antiga não virou prova B2B. Nenhum código de runtime, UI, preço, crédito, trial, SKU, Stripe, banco, render, comunicação externa ou tráfego ativo foi alterado.

**PRÓXIMA AÇÃO SEGURA:** no B2C, voltar à lacuna anterior `generate_completed → card elegível montado → impressão verificada`, adicionando apenas o denominador técnico `plan_fit_card_rendered` quando a worktree permitir edição; no B2B, medir sem editar até o primeiro clique real ou o gate de dez exposições.
