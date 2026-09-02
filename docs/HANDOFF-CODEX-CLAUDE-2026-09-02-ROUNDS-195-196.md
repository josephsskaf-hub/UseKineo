# HANDOFF CODEX → CLAUDE — RODADAS 195–196

**Data da verificação:** 2026-09-02 (BRT)

**Pista:** Codex / B2C / último metro

**Commit funcional:** `fd061a7446258f64d202fb21246fca9446c996ea`

**Deploy:** `dpl_E1jpMjMhHGMWXtfxxzSRDiH7819C` — `READY`, produção, alias `www.usekineo.com`

## Resultado

**IMPLEMENTADO E VALIDADO EM PRODUÇÃO.** A oferta que já existia no primeiro passo do Studio agora mede uma exposição humana real ao seu argumento de valor. O evento `inline_pricing_value_anchor_viewed` só é elegível quando o parágrafo de valor está pelo menos 50% visível, por 1 segundo contínuo, com a aba visível.

Não houve mudança visual ou comercial. Preço, moeda, créditos, planos, CTA, href, checkout e Stripe permaneceram intocados. `/generate` respondeu HTTP 200 após redirecionar para `/studio` no smoke pós-deploy.

## Evidência que motivou a rodada

**EVIDÊNCIA DE PRODUÇÃO — consulta somente leitura em 2026-09-02, contas internas excluídas.** Nos 30 dias anteriores, 25 pessoas externas distintas emitiram `inline_pricing_checkout_clicked`; as 25 chegaram depois ao checkout e nenhuma tinha pagamento registrado na janela consultada. Antes do primeiro clique, 19 ainda não tinham vídeo concluído, 5 tinham exatamente 1 e 1 tinha 2 ou mais.

Isso é sinal para medir, não prova causal de que a grade atrapalha. A alteração desta rodada serve para separar três coisas que antes estavam misturadas: montagem técnica, exposição humana e clique.

**FATO CONFIRMADO EM CÓDIGO.** `inline_pricing_currency_resolved` ocorre depois de `/api/geo` e mede montagem técnica, não visualização humana. `PricingCards` é chamado no passo 1 do Studio. O card de plano já funciona como clique único para o checkout; não existe uma segunda escolha humana de plano. Uma primeira versão desta rodada modelou incorretamente `plan_selected`. A auditoria adversarial detectou o falso positivo, e o estágio inexistente foi removido do código e dos testes antes do push.

## Contrato do novo evento

- Nome: `inline_pricing_value_anchor_viewed`
- Unidade: pessoa autenticada / exposição humana do argumento de valor
- Dedupe: uma vez por aba, com compartilhamento de requisição em voo entre remontagens
- Elegibilidade: interseção ≥ 0,5 por 1.000 ms contínuos, aba visível e nó conectado
- Retry: no máximo duas tentativas e somente quando o servidor confirma `not_stored`
- `stored` e resposta ambígua são terminais para evitar inflação
- Sem PII, UTM, preço, plano, créditos ou ID de vídeo nos metadados

## Gates e testes

- `test-inline-pricing-decision-funnel.mjs`: **72/72**
- `test-checkout-currency-truth.mjs`: **6.878/6.878**
- `test-pricing-plan-choice-attribution.mjs`: **26/26**
- `test-money-truth-contract.mjs`: **312/312**
- Typecheck: somente os 3 erros preexistentes em `mrr.ts`, `me/subscription/route.ts` e `TrialDowngradeModal.tsx`; zero erro novo
- Build local compilou; coleta de rota parou apenas porque a worktree não lê `OPENAI_API_KEY`
- Build Vercel: concluído, sem erro de build
- Auditoria adversarial final: **GO; P0=0, P1=0, P2=0**

## Gate de aprendizado

Preservar esta variante até ocorrer o primeiro destes marcos:

1. pelo menos 20 pessoas externas distintas com `inline_pricing_value_anchor_viewed` **e** 7 dias completos; ou
2. primeiro pagamento atribuído ao caminho.

Depois, contar pessoas — nunca eventos — e segmentar por vídeos concluídos antes da exposição e antes do clique:

- exposição humana / montagem técnica abaixo de 50%: problema de posição ou descoberta;
- exposição humana ≥80% em amostra ≥20, mas clique abaixo de 10%: problema de compreensão ou valor percebido;
- cliques continuam concentrados antes do primeiro vídeo, com zero pagamento: propor mover ou condicionar a grade, mas somente em turno coordenado, pois `GenerateClient.tsx` é zona compartilhada;
- qualquer pagamento no caminho: preservar e reconciliar a sequência antes de mexer.

## Coordenação e limites

`app/(dashboard)/generate/GenerateClient.tsx` **não foi tocado**. Pipeline de render, cenas, voz, legendas, créditos e qualidade também não foram tocados.

**DECISÃO APROVADA já canônica em `docs/DECISIONS.md`:** site e Stripe comunicam e cobram somente em USD. A consistência até o caixa protege credibilidade no último segundo; esta rodada preservou integralmente esse contrato.

Durante a validação da Vercel apareceram grupos de runtime ligados a render/cron, todos atribuídos ao deploy anterior `0927f029…`, incluindo `cinematic billing verification failed` e um alerta de `supplier-watch`. São observação fora da pista Codex; nenhuma correção foi tentada aqui.
