# HANDOFF CODEX → CLAUDE — RODADAS 183–184

**Data:** 2026-09-02 (BRT)  
**Workstream:** Growth / conversão B2C e B2B  
**Ponta validada:** `b1f4280d57dd277fb07f60b118724582c8fe56fc`

## 1. Decisão comercial fechada: USD do anúncio à cobrança

**DECISÃO APROVADA pelo fundador em 2026-09-02:** a UseKineo permanece USD-only. Toda superfície deve dizer a mesma verdade: preço listado em USD, cobrança em USD e eventual conversão feita pelo banco do cliente. Não prometer preço ou cobrança em moeda local.

**IMPLEMENTADO:** commit `b1f4280d57dd277fb07f60b118724582c8fe56fc` removeu resíduos mortos de BRL/INR dos mapas internos de packs em `app/api/stripe/checkout/route.ts` e corrigiu a explicação da campanha aposentada em `app/api/admin/send-india-price/route.ts`. Não mudou preço, SKU, moeda efetiva nem checkout vivo.

**TESTADO LOCALMENTE:** `node scripts/test-money-truth-contract.mjs` passou em **312/312** verificações. Os testes travam `resolveCheckoutCurrency()` em USD para país ausente, EUA, Brasil, Índia e Nigéria; exigem apenas `usd` nos mapas de packs; e impedem que a rota aposentada volte a prometer moeda local.

**TESTADO LOCALMENTE:** `npx tsc --noEmit` deixou de acusar os dois resíduos BRL/INR. Permanecem 3 erros preexistentes e fora deste escopo: `app/api/admin/_shared/mrr.ts`, `app/api/me/subscription/route.ts` e `components/TrialDowngradeModal.tsx`.

**VALIDADO EM PRODUÇÃO em 2026-09-02:** deploy Vercel `dpl_DR1S8F2ofMZKK8QZGFSre16FfyNW` ficou `READY`, target production, alias `www.usekineo.com`, no SHA acima. `GET https://www.usekineo.com/api/admin/send-india-price` respondeu `410 Gone` com `listed and charged in USD`; a busca de runtime errors da rota nos 30 minutos posteriores retornou zero clusters.

## 2. B2C: os dois checkouts auditados ocorreram antes da entrega

**EVIDÊNCIA DE PRODUÇÃO em 2026-09-02, Supabase somente SELECT, contas internas excluídas:** a janela iniciada em `2026-09-01T19:47:24.677Z` continha dois atores externos com checkout.

- Ator anonimizado `e2764ccd0c`: recebeu 25 créditos, viu `limit_purchase_fit_viewed` e `upgrade_modal_opened` classificados como `trial_spent` com saldo ainda em 25; abriu checkout 8 segundos depois; não havia vídeo entregue na cadeia observada.
- Ator anonimizado `69baa40109`: recebeu 25 créditos, iniciou geração, recebeu `cinematic_gate_credits_held` e abriu checkout antes de qualquer entrega registrada.

**CONCLUSÃO:** essa amostra de duas pessoas não sustenta a hipótese “viram o valor, rejeitaram o preço”. Ambas chegaram ao caixa antes do primeiro vídeo entregue. Não usar esses dois checkouts como evidência causal de preço ou oferta.

## 3. Defeito de classificação pertence à pista do Claude

**FATO CONFIRMADO no código:** `app/(dashboard)/generate/GenerateClient.tsx:9564` faz o preflight local em `outOfCredits()`. Em `app/(dashboard)/generate/GenerateClient.tsx:9637`, `openOutOfCreditsModal()` pode reclassificar o motivo padrão `credits` como `trial_spent` apenas porque grant > 0, trial ativo e fase ativa — sem exigir saldo zero, sem distinguir crédito preso por render e sem conferir o valor efetivamente usado.

**EVIDÊNCIA DE PRODUÇÃO em 2026-09-02:** isso produziu `trial_spent` para uma pessoa que ainda tinha os 25 créditos. A mensagem “You used your whole trial” era falsa naquele momento.

**COORDENAÇÃO:** o gatilho e o estado de criação são pista do Claude conforme `docs/ESCOPO-CLAUDE-VS-CODEX-2026-08-31.md`; o Codex não editou `GenerateClient.tsx`. Correção sugerida ao executor: saldo parcial insuficiente deve permanecer `trial_stalled`; crédito reservado por geração deve permanecer em espera; `trial_spent` exige evidência real de consumo/zero disponível. Depois, medir pessoas distintas por motivo verdadeiro.

## 4. Evento `trial_balance_bridge_viewed`: não é duplicata nesta amostra

**EVIDÊNCIA DE PRODUÇÃO em 2026-09-02, Supabase somente SELECT, contas internas excluídas:** houve duas linhas para um ator, com fontes diferentes:

- `result_trial_balance_bridge` em `2026-09-02T03:01:27Z`;
- `trial_active_banner_return`, superfície `persistent_trial_banner`, em `2026-09-02T03:02:47Z`.

Ambas tinham versão `trial_balance_seedance_35s_v2` e `credits_before=21`.

**FATO CONFIRMADO no código:** existem dois emissores reais, a superfície de resultado em `GenerateClient.tsx` e o banner persistente `TrialActiveBanner`. Portanto, as duas linhas observadas são duas superfícies legítimas, não prova de remount duplicado.

**RISCO PENDENTE:** os emissores não aguardam o ACK de `trackEvent`; remount ou falha de storage ainda pode distorcer contagem futura. Medir pessoas distintas segmentadas por `metadata.source`. Qualquer correção do emissor de resultado exige coordenação por tocar arquivo compartilhado.

## 5. B2B: preservar variante, ainda sem amostra

**EVIDÊNCIA DE PRODUÇÃO em 2026-09-02, Supabase somente SELECT, contas internas excluídas:** desde a fronteira `2026-09-02T03:00:00Z`, a consulta por `agency_bulk_page_viewed`, `agency_bulk_pack_clicked`, `bulk_checkout_started`, `bulk_purchase_completed` e `payment_success` retornou zero linhas.

**CONCLUSÃO:** ainda não há sessões externas suficientes para avaliar a oferta B2B. Isso é ausência de amostra, não rejeição. Preservar a página e não reeditá-la antes do gate de **20 sessões externas ou primeiro avanço**.

**FATO CONFIRMADO no inventário do repositório:** já existem 12 entradas internas mensuradas de distribuição (home, state report, cost page, pricing, comment tool, product tool, content plan, real estate, client brief, Kineo 1 engine, text-to-video e alternativa ao HeyGen). Não criar outra landing/entrada sem provar lacuna nova.

## 6. Próxima ação segura

**SUGESTÃO:** Claude corrige primeiro a classificação falsa `trial_spent` no gatilho compartilhado e registra o teste red/green do caso “25 créditos disponíveis + motor acima do saldo”. Codex preserva as variantes de oferta e mede novamente pessoas externas após entrega real, separando: vídeo entregue → oferta vista → checkout → pagamento.

**NÃO FOI FEITO:** nenhuma alteração em render, crédito, preço, SKU, promessa comercial, banco, migration, e-mail ou outreach.
