# HANDOFF CODEX → CLAUDE — ROUNDS 203–204

**Data:** 2026-09-02
**Workstream:** Growth B2C — verdade monetária do sinal de aquisição
**Estado:** IMPLEMENTADO · TESTADO LOCALMENTE · VALIDADO EM PRODUÇÃO

## Resultado

**DECISÃO APROVADA:** a Kineo opera uma única jornada comercial em USD. Site, oferta, sinal de aquisição e cobrança devem coincidir; não existe promessa de preço em moeda local. A decisão canônica já consta em `docs/DECISIONS.md` (`2026-09-01 — Uma moeda comercial: USD em toda a jornada`).

**FATO CONFIRMADO:** na base `ca92ab2`, três callers vivos da conversão de cadastro do Google Ads ainda enviavam `currency: 'BRL'`, embora o checkout e a copy pública já fossem USD:

- `app/(auth)/signup/page.tsx` — cadastro por e-mail;
- `components/SignupConversionTracker.tsx` — pouso OAuth da home;
- `app/(dashboard)/generate/GenerateClient.tsx` — pouso legado em criação.

**FATO CONFIRMADO:** o evento de compra permanece separado em `app/checkout/success/page.tsx`, com outro label e com `value`/`currency` derivados da sessão Stripe. O valor `1` do cadastro é valor atribuído de lead para relatório/bidding; não é receita e nunca é reutilizado como compra.

**IMPLEMENTADO:** `lib/growth/googleAdsSignupConversion.ts` passou a ser o único dono runtime do label, valor atribuído e moeda do cadastro. Os três callers espalham o mesmo objeto imutável em USD. Não houve mudança de preço, SKU, crédito, Checkout, render, DOM ou copy visível.

## Por que não houve outra mudança na oferta

**EVIDÊNCIA DE PRODUÇÃO — Supabase, SELECT agregado, 2026-09-02 08:46:20 UTC, janela móvel de 24h, contas internas excluídas:**

- 5 pessoas externas tiveram o primeiro `checkout_started`;
- 4 tinham zero vídeos concluídos antes do checkout;
- 1 tinha dois ou mais vídeos concluídos antes do checkout;
- 0 tinham `result_video_value_sampled` antes do checkout;
- 0 tinham exposição humana v2 ao `history_first_video_offer_viewed` antes do checkout;
- 0 pagaram na mesma Stripe Session observada.

**CONCLUSÃO:** a amostra não prova “viu valor e recusou preço”; quatro das cinco pessoas chegaram ao caixa antes de uma entrega concluída. Os experimentos de oferta já publicados continuam em seus gates mínimos, portanto nenhuma superfície foi reeditada nesta rodada.

## Verificação

- `scripts/test-google-ads-signup-conversion-truth.mjs`: **17/17**;
- `scripts/test-checkout-currency-truth.mjs`: **6.887/6.887**;
- `scripts/test-money-truth-contract.mjs`: **312/312**;
- `git -c core.whitespace=cr-at-eol diff --check`: limpo;
- TypeScript: exatamente os 3 erros baseline (`mrr.ts`, `me/subscription`, `TrialDowngradeModal`), zero novo;
- auditoria adversarial: **GO · P0=0 · P1=0 · P2=1**.

O P2 é apenas um comentário histórico interno em `app/checkout/success/page.tsx` que ainda menciona BRL. O runtime está correto. Ele ficou fora para respeitar o escopo autorizado de não tocar no Checkout.

## Produção

- commit funcional: `1e5ae6fc64b5e2d1f5230641ae490b3e3b9997c1`;
- deploy: `dpl_BsTxH6yGbQZiqGq7VP3R2rZYqp2R`;
- estado: **READY**, target production, alias `www.usekineo.com`;
- varredura de erros após o deploy: nenhum grupo atribuído ao novo SHA. Os grupos retornados apontavam para o deploy anterior e ficam na pista de produto do Claude.

## Coordenação

**FATO CONFIRMADO:** `GenerateClient.tsx` recebeu somente um import e a troca de três literais por um objeto de telemetria. O fundador foi avisado antes do toque na zona compartilhada. Nenhum fluxo de criação foi alterado.

**PRÓXIMA RODADA:** alternar para B2B e escolher hipótese nova. Não reabrir as superfícies B2C de oferta, resume, WELCOME20, pricing anchor ou result-video sampling antes dos respectivos gates mínimos.
