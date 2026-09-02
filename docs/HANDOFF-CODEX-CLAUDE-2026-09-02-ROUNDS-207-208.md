# HANDOFF CODEX → CLAUDE — RODADAS 207–208

**Data da observação:** 2026-09-02 09:57:58 UTC

**Pista:** B2C · primeiro vídeo concluído → origem comercial → checkout → pagamento

**Escopo da entrega:** medição somente leitura; nenhuma UI, oferta, preço, crédito, checkout ou render alterado

## 1. Decisão comercial preservada

**DECISÃO APROVADA:** Kineo apresenta e cobra planos em USD em toda a jornada. A fonte continua sendo `lib/checkoutPricing.ts`. Esta rodada não reabriu moeda, preço, Stripe Tax nem copy pública.

## 2. Por que não houve uma nova tela

**FATO CONFIRMADO:** os experimentos de History, retomada de checkout, WELCOME20, pricing inline e amostra de valor pós-vídeo ainda têm gates próprios registrados nos handoffs anteriores. Reeditá-los antes da amostra misturaria intervenções.

**HIPÓTESE TESTADA:** o evento `checkout_cta_clicked` já informa a superfície comercial; o servidor preserva a mesma sessão do navegador em `checkout_attempted`/`checkout_started`; e `payment_success` preserva a Stripe Session. Era possível construir uma associação conservadora sem editar runtime.

## 3. Evidência de produção — pessoas e dinheiro, não eventos

Consulta `SELECT` no Supabase de produção, janela independente de 30 dias, contas internas excluídas pela lista canônica de `lib/internalAccounts.ts`:

- **EVIDÊNCIA DE PRODUÇÃO:** 92 pessoas externas fizeram tentativa de checkout de assinatura.
- **EVIDÊNCIA DE PRODUÇÃO:** 48 dessas pessoas já tinham ao menos um vídeo concluído antes da tentativa.
- **EVIDÊNCIA DE PRODUÇÃO:** 37 pessoas pós-vídeo têm origem comercial exata pela mesma sessão do navegador.
- **EVIDÊNCIA DE PRODUÇÃO:** 37 pessoas pós-vídeo chegaram a uma Stripe Session exata.
- **EVIDÊNCIA DE PRODUÇÃO:** 4 pessoas tiveram pagamento observado para a Stripe Session de origem; receita real agregada de **US$ 82,80**.
- **EVIDÊNCIA DE PRODUÇÃO:** 17 das 48 pessoas possuem ao menos um caminho ausente/ambíguo, razão de **35,42%**. O teto do gate é 20%; portanto a leitura permanece `collecting`.

Origens exatas até `checkout_started`:

| Origem | Pessoas que tentaram | Pessoas que iniciaram Stripe | Stripe Sessions |
|---|---:|---:|---:|
| `generate_step_1` | 6 | 6 | 6 |
| `generate_trial_post_video` | 15 | 15 | 17 |
| `generate_upgrade_modal` | 6 | 6 | 6 |
| `history_starter_upgrade` | 1 | 1 | 1 |
| `pricing_page` | 7 | 7 | 7 |
| `trial_active_banner` | 2 | 2 | 2 |
| `trial_downgrade_modal` | 6 | 6 | 6 |

**REGRA DE LEITURA:** as linhas não podem ser somadas para obter pessoas únicas; uma pessoa pode usar mais de uma origem.

## 4. Achado que impediu uma conclusão falsa

**FATO CONFIRMADO:** os caminhos de retomada podem abrir uma Stripe Session já existente sem criar novo `checkout_attempted`/`checkout_started`. O clique de retomada não carrega hoje o `stripe_session_id` de forma server-side. Portanto a origem da Session é mensurável, mas a superfície que efetivamente fechou a compra continua desconhecida.

**EVIDÊNCIA DE PRODUÇÃO:** 12 pessoas externas distintas usaram ao menos uma retomada em 30 dias: `checkout_resume_banner` 9 pessoas, `checkout_cancelled` 3 e `pricing_saved_checkout` 1. As contagens por superfície se sobrepõem e não podem ser somadas.

**DECISÃO DE IMPLEMENTAÇÃO:** nenhuma superfície recebe pagamento ou receita no relatório. Dinheiro aparece apenas no agregado por Stripe Session, com `conversionSurfaceState: unknown_without_server_side_resume_correlation`.

## 5. Entrega publicada

Arquivos:

- `scripts/post-delivery-checkout-origin-report.mjs`
- `scripts/measure-post-delivery-checkout-origin-funnel.mjs`
- `scripts/test-post-delivery-checkout-origin-report.mjs`

Garantias:

- pessoa = `user_id` autenticado com e-mail presente e não interno;
- pacote avulso não entra no funil de assinatura;
- origem exata exige mesma sessão e clique persistido antes da tentativa;
- clique persistido até 5 s depois vira `cross_request_persistence_race`, nunca falso “missing”;
- uma Stripe Session compartilhada entre tentativas vira ambígua e não recebe crédito duplo;
- pagamento exige a Stripe Session exata e ocorre depois do start;
- receita é deduplicada por Stripe Session e separada por moeda;
- o relógio do gate começa na primeira origem elegível observada; conjunto vazio não inventa sete dias.

**IMPLEMENTADO:** commit `e0348d0ad7243a1b3fb6d80f55a23d08a1361058`.

**VALIDADO EM PRODUÇÃO:** deploy Vercel `dpl_BsKNCWB1pbLvXK6u2c8GBoxAovQ9` READY e aliasado em `www.usekineo.com`.

## 6. Gates

- **TESTADO LOCALMENTE:** relatório novo 34/34.
- **TESTADO LOCALMENTE:** regressão do relatório pós-vídeo 51/51.
- **TESTADO LOCALMENTE:** runner passou `node --check`.
- **TESTADO LOCALMENTE:** whitespace limpo.
- **CONTRADIÇÃO PREEXISTENTE:** typecheck mantém exatamente 3 erros fora do escopo: Stripe API em `app/api/admin/_shared/mrr.ts`, Stripe API em `app/api/me/subscription/route.ts` e `Promise<Promise<T>>` em `components/TrialDowngradeModal.tsx`. Nenhum erro novo.
- **AUDITORIA INDEPENDENTE:** GO, zero P0/P1. P2 não bloqueante: maturidade ainda é agregada; não interpretar o gate global como maturidade individual de toda origem.

## 7. Próxima rodada

**SUGESTÃO:** alternar para B2B, sem reabrir o plano compartilhável que ainda coleta seu gate. Medir o caminho afiliado/agência → descoberta → proposta → checkout por pessoas externas e identificar uma lacuna nova que não colida com `GenerateClient.tsx`, checkout, preço ou o workstream do Claude.

**QUESTÃO PENDENTE:** correlação exata da superfície de retomada que fecha uma Stripe Session requer contrato server-side no checkout e autorização específica; até lá, qualquer “receita por tela” é desconhecida.
