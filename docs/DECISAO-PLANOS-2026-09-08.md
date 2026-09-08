# DECISÃO DO FUNDADOR — PLANOS NOVOS (08/09/2026 03:20 BRT)

**Literal:** "Aprovo esse modelo que você trouxe: $9, $19, $29 para os planos
Starter, Creator e Studio."

**Sobe em 15/09**, junto com a leitura de 7 dias da versão B (decisão anterior
do fundador: não mudar duas coisas no mesmo dia). Channel $99 fica para depois
do produto de série existir. Os 12 pagantes atuais mantêm preço e créditos.

## A tabela aprovada, fechada contra o piso de margem da casa

O guardião de margem (`worstCaseCogsUsd`, piso 24% no pior caso, custos
remedidos em 20/08: Kineo 1 $0,066/cr · Seedance $0,081/cr · H3 $0,116/cr)
só fecha se Starter e Creator forem **Kineo 1 + Seedance** — os dois motores
que fazem 99% dos filmes — e os motores caros ficarem do Studio para cima.

| plano | preço | créditos | motores | promessa na vitrine | pior caso | margem líquida |
|---|---|---|---|---|---|---|
| Trial | $1 / 7 dias | 80 | Kineo 1 + Seedance | 7 days of Creator | — | aquisição |
| **Starter** | **$9** | **60** | Kineo 1 + Seedance | **3 films a week** (12 Kineo 1, ou 3 cinematic) | $4,86 | **42%** |
| **Creator** | **$19** | **150** | Kineo 1 + Seedance | **1 film a day** (30 Kineo 1 + 2 cinematic, ou 7 cinematic) | $12,15 | **33%** |
| **Studio** | **$29** | **180** (como hoje) | **todo motor** (Kling 3, Veo, H3, Omni, Avatar) | **every engine + 1 film a day** (21 Kineo 1 + 5 cinematic, ou 9 cinematic) | $20,90 | **25%** |
| Autopilot | $299 | 400 | todo motor + serviço | agência | — | — |

Líquido = após Stripe (2,9% + $0,30). Studio não pode subir de 180cr a $29
sem furar o piso (200cr = 17%); se o fundador quiser mais no Studio, é $39.

Junto com a tabela (mesma rotação):
- anual = 10 meses (2 grátis): $90 · $190 · $290;
- créditos **não acumulam** de um mês para o outro (padrão do mercado);
- First Pack $4,90/30cr continua para o turista (aparece no pós-filme);
- gate de motor por plano: Veo/Kling 3/H3/Omni/Avatar exigem Studio+ (hoje
  o Creator promete "every engine" — a promessa que a auditoria chamou de
  mentira — e ninguém usa);
- preço por segundo continua (45s = 75% de 60s).

## Como sobe (uma rotação em 15/09)

`lib/checkoutPricing.ts` (TIER_PRICES 900/1900/2900, TIER_CREDITS 60/150/180,
anual), gate de motor em `getEffectiveEntitlement`/compose, vitrine em filmes
(`/pricing`, PricingCards, home #pricing, llms.txt, kineoFacts, openapi do
GPT, TAAFT/PH), guardião de margem recalculado, e-mail de anúncio aos 12
(grandfather) em dry-run. Stripe é `price_data` inline: **nenhum preço a
criar no painel** — sobe com o deploy.

## O que fica aberto

- Channel $99 ("2 films a day, posted for you", série com memória): produto
  primeiro (2 rotações), venda depois.
- Se a B der menos de 3% de entrada no $1 até 15/09, o plano de reserva é
  "1 filme grátis com marca d'água, depois $1" — e a tabela sobe do mesmo jeito.
