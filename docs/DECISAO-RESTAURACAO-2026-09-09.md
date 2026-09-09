# Restauração — de volta ao momento que mais vendia (09/09/2026, ~18h → publicado à noite)

## A ordem do fundador

"Nossa empresa estava boa, algumas mudanças fizeram ela ficar pior. Acho que mudamos demais em um curto período. Quero voltar na minha melhor fase, seja qual for o momento. Seja 100% sincero e diga o momento exato."

Depois, na sequência: "algo entre 25 e 40: 30 faz sentido, 1 Seedance e 1 Kineo" · "tira esse negócio de 1 dólar, isso só nos atrapalha" · "quero todas as mudanças pra agora, inclusive o preço, 9.90, 19.90 e 39.90".

## O momento exato (medido, contas externas)

| semana | cadastros | com filme | no checkout | pagaram | o que estava no ar |
|---|---|---|---|---|---|
| 03/08 | 151 | 110 | 12 | 1 | trial 40cr, preço regional, $4,90 |
| 10/08 | 159 | 93 | 29 | 1 | idem |
| **17/08** | **243** | 134 | **35** | **3** | V5 $9,90/$19,90/$39,90, trial 50cr, home vitrine, todo motor liberado |
| 24/08 | 127 | 65 | 14 | 0 | V6 $7/$15/$29, trial cai para 25cr |
| 31/08 | 239 | **160** | 25 | 2 | V6, trial 25cr, todo motor liberado |
| **07/09** | **43** | 21 | 6 | **0** | Versão B: sem trial, porta $1 (quebrada até 09/09 12:03), motores trancados, 3 preços em 24h |

A casa nunca teve fase "boa" de assinatura (recorde: 3 pagantes numa semana; 12 na história), mas teve uma fase **funcional**: 17/08 → 06/09, com ~240 cadastros/semana, 130–160 filmes, 25–35 checkouts e 2–3 pagantes por semana. A Versão B (08/09) cortou a entrada 5× e a única porta nasceu quebrada.

Por conta, desde 10/08: trial de 25 pagou igual ou melhor que 50 (0,7% vs 0%), e a pessoa gasta ~8 créditos em média receba 25, 40 ou 50.

## O que mudou (um commit, guardião `scripts/test-restauracao-2026-09-09.mjs`)

1. **Preço V5**: Starter $9,90 · Creator $19,90 · Studio $39,90; anual 10×; intro = cheio. Créditos do V7 (60/150/300) mantidos. `lib/checkoutPricing.ts`. Quem já assina não muda (Stripe cobra o que está na assinatura; renovação abaixo do preço vigente recebe o grant V6 via `renewalCreditsFor`).
2. **Entrada grátis de 30 créditos** (1 Seedance de 60 s + 1 Kineo 1 de 60 s): `CARD_ENTRY_ONLY = false` (lib/entryPolicy), `TRIAL_CREDIT_CAP = 30` (lib/reverseTrial), `TRIAL_GRANT_CREDITS_COPY = 30` (lib/freeTierOffer), `FREE_ENTRY_CREDITS = 30` (entryPolicy). A copy de entrada (`CARD_ENTRY_COPY`, lida por ~25 páginas no botão principal) passa a ser "Start free — 30 credits →"; o caminho de entrada é `/signup`.
3. **Trial de $1 morto inteiro**: `CARD_TRIAL_LIVE = false` (lib/checkoutPricing) → o cobrador ignora `?trial=1`; `TRIAL_DOOR_LIVE = false` (lib/growth/cleanFilmTrialDoor, puro, espelho) apaga todas as portas de $1 (pós-vídeo, export limpo, modal de upgrade, fim de trial, faixa, CardEntryDoor); /pricing e cards do app sem o botão; oferta pós-filme (history/go) e e-mail de entrega leem a fonte.
4. **Todo motor aberto** para conta nova: `ENGINE_GATE_SINCE = '2099-01-01'` (lib/enginePlanGate) — a função e os guardiões ficam para o dia de religar.
5. **Copy**: 40 arquivos públicos deixam de dizer "$1 trial / 7 days / 80 credits / no free tier"; /ph e o kit do Product Hunt (docs/ph/PH-TEXTOS) mandam para o cadastro grátis; llms.txt ganha a entrada da noite.
6. **Contas presas**: as 16 contas nascidas `card_required` (08/09 05:00 → 09/09) com 0 créditos e 0 pagamento receberam 30 créditos e trial ativo de 7 dias (evento `admin_credits_granted`, motivo `restauracao-2026-09-09`).

## O que NÃO voltou (fica, porque é conserto e não oferta)

Troca de plano sem cancelar, afiliado 30%, packs de agência V7, admin (entrantes, "no trial de $1 agora" — mostra 0 daqui em diante), consertos de entrega da noite, instrumentação da /ph, checkout do $1 consertado (040af511; fica desligado, mas correto).

## Regra que nasce hoje

**Preço e oferta congelados até 09/10/2026.** Uma métrica: pagantes novos por semana (placar 22:10/09:10). Toda proposta de mudar oferta antes disso vai para docs/PEDIDOS com o número que a justifica, e espera o fundador.

## Para o PH (10/09 04:01 BRT)

CTA único: `/signup?utm_source=producthunt&utm_medium=launch&utm_campaign=ph_sep10&intent_campaign=ph_sep10`. Ficha e comentário do maker em docs/ph/PH-TEXTOS-2026-09-10.md (já com "free to start, 30 credits, no card"). A galeria é regenerada por `node scripts/ph-galeria.mjs` (lê a fonte única).
