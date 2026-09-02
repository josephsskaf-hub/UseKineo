# HANDOFF CODEX → CLAUDE — RODADAS 253–254

**Data:** 2026-09-02

**Escopo:** B2B, descoberta passiva → brief de escopo encaminhável → uma superfície comercial existente → Checkout exato → pagamento da mesma Stripe Session. Nenhuma alteração de preço, crédito, Checkout, render, banco, interface ou comunicação externa.

## Hipótese e decisão antes da edição

**HIPÓTESE:** parte da fricção B2B ocorre no handoff agência → cliente/aprovador: fatos verdadeiros sobre uso comercial, limites e tipo de compra estão espalhados. Um documento curto, citável e encaminhável pode reduzir ambiguidade sem inventar feature enterprise nem criar outra landing page.

**DECISÃO:** criar `/agency-production-scope.txt`, texto puro e versionado. O GET de crawler não é evento. Só conta avanço explícito para a página de packs, fit review ou pricing.

## Contrato mensurável

- pack avulso: `entry=scope_brief` → `agency_bulk_page_viewed` v2 → `bulk_checkout_started` → `bulk_purchase_completed` da mesma Stripe Session;
- fit review: `entry=scope_brief` → `b2b_brief_viewed/submitted` com `entry_campaign=b2b_agency_scope_brief_v1`;
- assinatura recorrente: `intent_campaign=b2b_agency_scope_recurring_v1` → `pricing_view` de fonte exata anterior → `checkout_started` → `payment_success` da mesma Stripe Session;
- Autopilot: `intent_campaign=b2b_agency_scope_autopilot_v1` → `pricing_view` de fonte exata anterior → `checkout_started` mensal → `payment_success` da mesma Stripe Session;
- pessoas externas, sessões anônimas, Stripe Sessions, pagamentos e receita permanecem unidades separadas;

Os gates são deliberadamente separados porque cada destino já possui um relatório canônico diferente:

- **pack avulso:** relatório comercial por `entry=scope_brief`; 20 pessoas externas ou 20 sessões anônimas abrem diagnóstico, e o primeiro Checkout/pagamento exato abre somente reconciliação. Para esta origem, Checkout só recebe atribuição quando a chegada e o Checkout pertencem à mesma pessoa externa; continuidade apenas anônima falha fechada;
- **fit review:** relatório específico executado por `scripts/measure-agency-scope-fit-review.mjs`; 5 pessoas externas que enviaram o formulário + ao menos uma janela completa de 7 dias. Primeiro Checkout recorrente exato permite diagnóstico antecipado, não mudança automática;
- **assinatura recorrente e Autopilot:** caminhos separados no relatório de assinatura; 10 pessoas externas em cada `pricing_view` exato + 7 dias completos, ou primeira Stripe Session exata abre somente reconciliação;
- **stop por caminho:** quando o gate daquele caminho amadurecer com zero envio de fit review, zero Checkout e zero pagamento, preservar os outros caminhos e retirar somente o destino que não avançou. Nenhum evento de crawler conta.

## Risco e contenção

**RISCO:** o documento parecer contrato. **CONTENÇÃO:** título de escopo de produto, aviso explícito “not a contract”, link para `/terms` e frase de que os Termos prevalecem.

**RISCO:** drift comercial. **CONTENÇÃO:** limites e packs vêm de `BUSINESS_OFFER_FACT`; preço não é digitado no módulo novo.

**RISCO:** crawler inflar funil. **CONTENÇÃO:** nenhum evento no GET; somente a chegada humana a uma superfície existente é medida.

## Arquivos

- `lib/growth/agencyProductionScope.ts` — contrato e renderizador de texto;
- `app/agency-production-scope.txt/route.ts` — rota pública estática;
- `lib/agencyDistribution.ts` — nova origem interna allow-listed;
- `lib/growth/b2bLead.ts` — atribuição fechada do fit review;
- `app/sitemap.ts` — descoberta passiva, sem IndexNow/recrawl;
- `scripts/b2b-subscription-truth-report.mjs` e loader — assinatura recorrente exata;
- `scripts/agency-production-scope-contract.mjs` — identificadores de medição lidos da fonte TypeScript, sem segunda string manual;
- `scripts/measure-agency-scope-fit-review.mjs` — coorte exata do fit review desta origem;
- `scripts/test-agency-production-scope.mjs` — rota executada, fontes e funil financeiro.

## Estado

**TESTADO LOCALMENTE:** 1.015 verificações relacionadas verdes em 17 suítes. O typecheck reproduziu somente os três erros preexistentes em `app/api/admin/_shared/mrr.ts:113`, `app/api/me/subscription/route.ts:83` e `components/TrialDowngradeModal.tsx:334`; nenhum erro novo pertence a esta entrega. `git -c core.whitespace=cr-at-eol diff --check` limpo.

**AUDITORIA INDEPENDENTE:** GO, P0=0, P1=0, P2=0. A auditoria reprovou duas versões intermediárias e só aprovou depois de: gate real na primeira Stripe Session do fit review; separação estrita de tier entre recorrente e Autopilot; atribuição pack→Checkout restrita à mesma pessoa externa; marker por campanha; e callers proporcionais executados.

**BUILD LOCAL:** compilação concluída. A coleta global de páginas parou numa rota preexistente de render porque a worktree isolada não recebe `OPENAI_API_KEY`; nenhum segredo foi lido ou copiado. O build do deploy com o ambiente Vercel é o gate final.

**VALIDADO EM PRODUÇÃO — 2026-09-02 19:05 BRT:**

- commit de produto: `dcf41df31deee4de23ab3974d861790825eadc15`, publicado por fast-forward em `origin/main`;
- deploy Vercel: `dpl_FniwCpq5Cu6mxXLrtRXRLkn26zLX`, estado `READY`, sem erro de alias, servindo `www.usekineo.com`;
- `GET https://www.usekineo.com/agency-production-scope.txt`: HTTP 200, `Content-Type: text/plain; charset=utf-8`, `X-Robots-Tag: all`;
- conteúdo ao vivo confirmou: versão, packs derivados, aviso “not a contract”, Terms e quatro escolhas separadas — pack, fit review, recorrente e Autopilot;
- `https://www.usekineo.com/sitemap.xml` contém `/agency-production-scope.txt`;
- nenhum evento, lead, Checkout, pagamento, comunicação externa, banco, crédito ou render foi forçado na validação.
