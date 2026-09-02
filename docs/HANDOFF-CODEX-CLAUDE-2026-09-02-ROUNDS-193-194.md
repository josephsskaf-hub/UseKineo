# HANDOFF CODEX → CLAUDE — RODADAS 193–194

**Data:** 2026-09-02 (BRT)
**Workstream:** Growth / decisão B2B no calculador Autopilot
**Commit de código:** `6b0ea2061f79b68d544b81786100591a71e46273`
**Ponta compartilhada ao publicar:** `origin/main = 6b0ea2061f79b68d544b81786100591a71e46273`

## 1. O evento histórico não provava que uma pessoa viu a proposta

**EVIDÊNCIA DE PRODUÇÃO em 2026-09-02, contas internas excluídas:** desde `2026-09-01T00:00:00Z`, 11 atores externos emitiram `autopilot_break_even_viewed`; nenhum emitiu `autopilot_break_even_calculated`, clicou no checkout do calculador, iniciou checkout ou pagou. Em 30 dias, `autopilot_page_viewed` teve 61 eventos/40 atores, `autopilot_pilot_checkout_clicked` 4/3 e `autopilot_monthly_checkout_clicked` 2/2. Estes números são pessoas/atores distintos quando indicado, não sessões tratadas como clientes.

**FATO CONFIRMADO no código anterior:** `autopilot_break_even_viewed` era emitido por `useEffect` ao montar o componente. Portanto, os 11 atores provavam render técnico da página, não visibilidade humana do calculador.

**HIPÓTESE:** o vazio entre carregamento e checkout pode estar em descoberta, compreensão, interação ou valor percebido. O dado anterior não distinguia as quatro causas; mudar oferta agora seria adivinhação.

## 2. Funil de decisão implementado sem alterar a oferta

**IMPLEMENTADO em `6b0ea206`:**

- `autopilot_break_even_viewed` foi preservado para continuidade histórica, mas passa a declarar em metadata fechada `rendered_not_viewed`;
- `autopilot_break_even_human_viewed` exige o calculador pelo menos 50% visível por 1 segundo contínuo, aba visível e elemento conectado;
- `autopilot_break_even_started` nasce somente na primeira entrada de lucro bruto não vazia, não em foco acidental;
- `autopilot_break_even_calculated` e `autopilot_break_even_checkout_clicked` continuam sendo os marcos posteriores;
- metadata é categórica e fechada; não grava lucro digitado, e-mail, URL, UTM, usuário ou sessão;
- storage indisponível falha fechado com zero POST;
- `stored` e `ambiguous` são terminais; somente `not_stored` permite uma tentativa posterior, com teto de dois POSTs por etapa no ciclo de vida atual;
- uma Promise em voo é compartilhada entre remount/StrictMode; timers, observer, listener e retry são limpos no unmount;
- versão do contrato: `autopilot_decision_funnel_v1`.

**NÃO MUDOU:** aparência, copy, link, CTA, preço, moeda, plano, crédito, SKU, trial, checkout, Stripe Tax, banco, migration, render ou pipeline do produto.

## 3. Testes, auditoria e publicação

**TESTADO LOCALMENTE:**

- `test-autopilot-decision-funnel.mjs`: 102/102;
- `test-autopilot-break-even.mjs`: 41/41;
- `test-money-truth-contract.mjs`: 312/312;
- `test-checkout-currency-truth.mjs`: 6.869/6.869;
- `test-pricing-business-path.mjs`: 25/25;
- `git diff --check`: limpo, exceto avisos informativos LF/CRLF;
- typecheck: exatamente os três erros preexistentes (`mrr.ts`, `me/subscription/route.ts`, `TrialDowngradeModal.tsx`), nenhum da entrega.

Os testes executam policy, recorder, relógio falso e ciclo de vida: fronteira 49,9%→50%, hidden→visible reiniciando dwell, atraso e teto de retry, unmount, StrictMode/remount, concorrência com Promise em voo, storage indisponível e resposta ambígua.

**FATO CONFIRMADO DE BASELINE:** o build Next local compilou o patch; depois falhou na coleta de `/api/generate-broll-plan` pela ausência de `OPENAI_API_KEY`, sem leitura de `.env.local`. O build de produção concluiu.

**AUDITORIA ADVERSARIAL:** a primeira revisão reprovou porque não havia retry após `not_stored` e parte dos testes era textual. Ambos foram corrigidos. Veredito final: **GO, P0=0 e P1=0**. P2 futuro: o orçamento de dois POSTs é por ciclo de vida; hoje existe um único caller em `PricingClient.tsx` e StrictMode/remount está coberto.

**PUBLICADO:** `origin/main` recebeu `6b0ea206` por fast-forward e o remoto foi verificado byte a byte pelo SHA de 40 caracteres.

**VALIDADO EM PRODUÇÃO em 2026-09-02:** deployment Vercel `dpl_E7zbrZzxbmmcrx297GoVEM1gYvBC`, target production, SHA `6b0ea206`, estado `READY`, aliasado em `www.usekineo.com`; build sem erros, runtime sem `error`/`fatal` no intervalo verificado e `https://www.usekineo.com/pricing` respondeu HTTP 200.

## 4. Gate causal obrigatório

**DECISÃO DE EXPERIMENTO:** preservar o calculador sem nova alteração até atingir **10 atores externos distintos com `autopilot_break_even_human_viewed` e sete dias completos**, o que ocorrer por último, ou até o primeiro `autopilot_break_even_checkout_clicked`, `checkout_started` ou `payment_success` relacionado ao caminho.

Contar usuários autenticados distintos primeiro; sessões anônimas ficam separadas. Nunca somar eventos como pessoas.

Árvore de decisão pré-registrada:

1. `human_viewed / technical_mount < 50%`: problema de descoberta/posição;
2. razão ≥80% e `<30%` de `started` entre pelo menos 10 humanos: problema de compreensão/enquadramento;
3. `started` sem `calculated` entre pelo menos cinco iniciadores: problema de interação/entrada;
4. `calculated` sem checkout entre pelo menos cinco calculadores: problema de valor/oferta;
5. qualquer checkout ou pagamento: preservar a superfície e reconciliar resultado real antes de editar.

## 5. Achado para a pista do Claude, sem edição

**FATO CONFIRMADO:** existem emissores de `agency_margin_proposal_copied` e `client_short_brief_*`, com `entry` allow-listed, mas o funil do admin (`app/api/admin/funnel/route.ts` e `FunnelClient.tsx`) não os consome. Hoje a cadeia proposta copiada → brief do cliente não aparece no painel.

**SUGESTÃO / PISTA DO CLAUDE:** tratar isso como observabilidade do admin em rodada futura. O Codex não editou `app/admin/**` nem `app/api/admin/**`, respeitando a divisão de trabalho.

## 6. Próxima rodada sem duplicação

**SUGESTÃO:** alternar para B2C em uma superfície diferente de WELCOME20, moeda, retomada de checkout, afiliados e deste calculador. Todos esses experimentos permanecem nos gates de amostra já registrados.
