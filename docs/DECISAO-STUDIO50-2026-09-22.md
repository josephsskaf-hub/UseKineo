# DECISÃO — Oferta "Studio a 50%" para quem chegou ao checkout e não pagou (22/09/2026)

**Ordem do fundador (22/09, 11:47 BRT):** "pega essa lista de pessoas que fizeram checkout e não pagaram e oferece
50% no plano mais caro… se você tiver um plano melhor, me manda." Depois (12:2x): "você decide para quem, quantas,
e com que desconto. Cinco pagantes é a meta."

## O que o banco disse antes de escrever (22/09, 12:00 BRT)
- 162 pessoas com `checkout_attempted/started` em 60 dias e nenhum `payment_success`; 155 tentaram 2+ vezes;
  100 têm filme concluído; só 35 tentaram nos últimos 14 dias, 76 nos últimos 30.
- Plano em que pararam: Creator 91 · Starter 45 · Studio 10 · Autopilot 8 · sem tier 8. Moeda: 22 em INR, 1 BRL.
- Quatro cartas já foram para essa coorte: checkout_rescue (19/08, com FIRST50 = 50%), comeback50 (50% por 3
  meses), checkout_recovery (link da sessão Stripe), second_try_1usd. **196 envios · 2 voltaram ao site · 0 pagaram.**
- 115 delas receberam algum e-mail da casa nos últimos 14 dias (weekly_quota 72, trial_lifecycle 64…).

## Decisão (Claude, por delegação)
1. **A oferta mora onde a pessoa volta sozinha**, não só no e-mail: banner em `/pricing` e em `/checkout/cancelled`
   para qualquer conta elegível (tentou checkout, nunca pagou, opt-in), cupom aplicado no link — sem digitar código.
   Motivo: 155/162 voltaram ao checkout por conta própria; o e-mail para essa coorte rendeu 0 em 196.
2. **O desconto segue o plano em que a pessoa parou** (`lib/offers/studio50.ts::studio50OfferFor`):
   - parou no **Starter** → **Creator a 50%** no 1º mês (150 créditos pelo dinheiro do Starter). Pedir Studio
     ($19,95) a quem achou caro $9,90 é pedir o dobro.
   - parou em **Creator / Studio / Autopilot / sem tier** → **Studio a 50%** no 1º mês (300 créditos pelo dinheiro do
     Creator — pitch de valor, "o plano de cima pelo preço do de baixo").
3. **Duração: 1ª fatura ('once')**, não 3 meses. Studio a 50% = 300 créditos; 12 filmes Seedance custam ~US$ 22,7 na
   fal (US$ 1,89/filme, brief de 21/09) — acima do que entra. Um mês é CAC limitado; 3 meses seria margem negativa
   recorrente. Trocar é decisão de preço do fundador (`STUDIO50_DURATION`).
4. **Carta só para os últimos 30 dias** (76 pessoas; menos internos/opt-out/escritos hoje), da intenção mais recente
   para a mais velha, lotes de 60, 1× por pessoa para sempre (`studio50_sent`), nunca no mesmo dia de outra carta.
   Os 86 de 31–60 dias ficam para o banner.
5. Cupons: `STUDIO50` (novo, auto-provisionado; gate = só Studio mensal) e `CREATOR50` (já existia; gate = só Creator
   mensal). Nunca anual.

## Como medir (marco = deploy desta decisão)
- Impressão/clique: `studio50_offer_shown` / `studio50_offer_clicked` (metadata.surface, offer).
- Carta: `studio50_sent` (metadata.code) → `payment_success` em 14 dias.
- Meta do fundador: 5 pagantes. Leitura em 48h e em 7 dias.

## Achado colateral
`send-second-try-1usd` seguia saindo por cron (81 pessoas em setembro, até 20/09) prometendo a porta de $1 que morreu em
09/09 — sem trava no `CARD_TRIAL_LIVE`. Travada no mesmo commit (devolve `DISABLED`).
