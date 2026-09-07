# SPEC — A primeira compra pequena (pack $4.90 / oferta $2.90) — 07/09/2026

Item Q9 do ciclo (ordem do fundador 06/09 21:05). Documento de decisão: **nada foi
ligado, nenhuma linha de código mudou, nada foi commitado.** Todo número vem do
banco (`cqqukkvjjrguayiyjvhh`, contas externas = e-mail sem `josephsskaf`,
janela de 30 dias fechada em 07/09 ~02:00 UTC) ou de `origin/main`
(`684d1614`), com arquivo:linha. Preço público **não muda** aqui — o documento
instrui a decisão, não a toma.

## Resumo em 5 linhas

1. **Recomendação: NÃO virar `OFFER_290_ENABLED`.** O SKU de $2.90 concede 25 créditos = exatamente 1 Seedance de 60s, e a fatura de agosto mediu esse render a **$3.30** (`lib/credits/engineCost.ts:97`). Líquido da Stripe é $2.516 → **−$0.78 por venda** no único uso que a própria faixa anuncia. O invariante do repositório não enxerga isso porque contabiliza a sobra a $0.066/cr (`lib/checkoutPricing.ts:308-313`).
2. **O pack de $4.90 não está dormindo — está no ar e ninguém compra.** O SKU responde em `/api/stripe/checkout?pack=starter` sem flag nenhuma, aparece em 2 lugares do GenerateClient e em 2 e-mails automáticos, e tem **0 `checkout_attempted` em 54 dias** de instrumentação (0 de 231 pessoas que passaram pelo bloco onde ele mora, dobrado dentro de "Other options").
3. **A coorte que ele alcança: 65 pessoas bateram na parede de saldo em 30 dias** (62 não pagantes; 44 já tinham filme entregue; 22 chegaram ao checkout; 3 pagaram — todas assinatura). 41 das 65 estão com saldo **0**; 40 das 65 bateram na parede **em menos de 24h** depois do 1º filme (mediana 0,2h).
4. **30 créditos compram 1 Seedance 60s + 1 Kineo 1, ou 2 Seedance 35s, ou 6 Kineo 1 — e zero de qualquer outro motor a 60s.** Para 12 das 22 pessoas com déficit medido (`limit_purchase_fit` 1–24cr) o pack fecha a conta; para quem quer Kling 2.5/H3/Kling 3 a 60s ele não serve a ninguém com saldo 0.
5. **Se for fazer algo, é UMA superfície e sem flag:** expor o pack de $4.90 que já existe dentro do modal do "não" (`upgrade_modal_opened`), só para não-assinante com déficit ≤ 30cr — tela do Codex. Condição que derruba a ideia: 30 exposições nesse recorte com 0 `checkout_attempted sku=starter10` = a parede não é de $4.90.

---

## 1. O que existe hoje, exatamente

| Peça | Preço | Créditos | Onde vive | Stripe | O que esconde |
|---|---|---|---|---|---|
| **First Pack** (`?pack=starter`, sku interno `starter10`) | $4.90 (`lib/checkoutPricing.ts:425` `PACK_PRICE_MINOR`) | **30** (`lib/checkoutPricing.ts:410-412` `PACK_CREDITS.starter`) | Builder `app/api/stripe/checkout/route.ts:2289` `buildPackAndRedirect`; produto inline `:718-731` `STARTER_PACK`; despacho `:3157` (fallback de todo `?pack=` desconhecido) | `mode:'payment'` + `price_data` inline (`:2365`); **não há Price criado na Stripe**; `metadata.pack='starter10'`, `pack_credits='30'` | **NENHUMA flag.** Está no ar. Só a posição na tela o esconde (ver §2) |
| **Oferta $2.90** (`?pack=starter290`) | $2.90 (`app/api/stripe/checkout/route.ts:756` `PACK290_PRICES`) | **25** (`lib/checkoutPricing.ts:413-414` — o comentário do checkout ainda diz "20": `route.ts:746-750`, desatualizado) | Builder `route.ts:2444` `buildStarter290AndRedirect`; produto `:751-755`; despacho `:3154-3156` | `mode:'payment'` + `price_data` inline (`:2516`); metadata `pack='starter290'`, `pack_credits='25'` | `OFFER_290_ENABLED = false` em **`lib/flags.ts:13`**. Com false: SKU responde **410** (`route.ts:2470-2474`), banner devolve `null` (`Offer290Banner.tsx:44,119`), `/api/credits` não calcula `firstVideoAt` (`app/api/credits/route.ts:124-133`) e devolve `offer290Enabled:false` (`:246`) |
| **Offer290Banner** | mostra "$4.90 → $2.90", contagem de 24h | 25 → copy "enough for 1 AI Generated video" (`Offer290Banner.tsx:145-146`, via `videosForCredits`) | `app/(dashboard)/generate/Offer290Banner.tsx`; montado em `GenerateClient.tsx:11745` — e `GenerateClient` serve **/generate e /studio/create** (`app/(dashboard)/studio/create/page.tsx:29`) | botão → `?pack=starter290` (`:159`) | 4 portões além da flag: `hasPaid=false`, `offer290Used=false` (`:75-76`), 1× por navegador (`localStorage kineo_offer290_seen`, `:62,101`) e âncora de 24h: **ou** `firstVideoAt + 24h` (`:80-84`) **ou** `kineo_exit_seen_at + 24h` gravado pelo ExitIntentOffer (`:89-95`) |
| Webhook (os dois packs) | — | soma ao saldo | `app/api/stripe/webhook/route.ts:1007` `{ video_credits: next, has_paid: true }`; `:1008` carimba `offer290_used` só no $2.90; fallback por valor `:929` (490) e `:934` (290) | — | — |
| Trava 1-por-conta do $2.90 | — | — | `route.ts:2504-2513`: recusa se `offer290_used` **ou** `has_paid` (409) | — | coluna `profiles.offer290_used` existe (verificado no banco); **0 perfis** com ela ligada |
| PayPal | $4.90 | 30 | `lib/paypalCatalog.ts:41-43` `PAYPAL_PACK` | trilho PayPal | CLAUDE.md: tabelas PayPal vazias e idempotência invertida — não contar com ele |

**Lista de mudanças, em ordem, para "ligar com uma palavra":**

- Para a oferta $2.90: **uma linha** — `lib/flags.ts:13` `false → true`. Constante de módulo (não é env), logo exige **deploy**. Nada mais precisa mudar: banner, SKU e `/api/credits` leem a mesma constante. **Mas veja §4 antes: a $2.90 o SKU perde dinheiro.**
- Para o pack $4.90: **não há o que ligar** — a questão é **expor** (§2), e expor é tela (Codex).

---

## 2. Onde a oferta apareceria — superfícies reais (grep em `origin/main`)

### 2a. Onde o pack de $4.90 JÁ está (e o alcance medido)

| Superfície | Arquivo:linha | Dona | Condição para aparecer | Alcance 30d | Cliques |
|---|---|---|---|---|---|
| "Other options" (`<details>` **fechado por padrão**) dentro da oferta pós-filme do trial | `GenerateClient.tsx:15695-15733` (`handleBuyCreditsOnly` `:10097-10101`) | **tela (Codex)** | bloco `showTrialPostVideoOffer && !trialBalanceBridge.eligible` (`:15471-15473`) | `trial_post_video_offer_viewed`: **231 pessoas** (o evento observa o bloco inteiro, `:5275`; não prova que a pessoa abriu o `<details>`) | `post_video_single_unlock_clicked`: **0 na história** |
| "Just this one video — $4.90" no modal de marca d'água + botão pós-download | `GenerateClient.tsx:14953,14962,15029` (`handleBuyThisVideoOnly` `:10066-10088`) | tela (Codex) | `showPostVideoExportChoice` = resultado **com marca d'água** e `!trialActive` (`:4914-4916`) — só Fast grátis de conta **fora** do trial | `clean_paywall_opened`: **0 na história**; `clean_paywall_shown`: **0**; `post_video_clean_export_clicked`: 3 (último 02/08) | 0 |
| E-mail `send-oneoff-unlock` (cron, `vercel.json:112`) | `app/api/cron/send-oneoff-unlock/route.ts:94,120` — link **direto** ao checkout `?pack=starter&return=wm` | servidor (Claude) | pessoa com filme com marca d'água | `oneoff_unlock_emailed`: 29 pessoas (21/08) | 0 `checkout_attempted` |
| E-mail `send-video-rescue` (cron, `vercel.json:24`) | `.../send-video-rescue/route.ts:106,117` — "Grab 30 more credits for $4.90" → **`/pricing`** | servidor | — | — | — |
| `/pricing` | `app/pricing/PricingClient.tsx:864` (comentário: o pack **não** é vendido lá; `ExitIntentOffer.tsx:311-313` removeu o card) | tela | — | — | — |
| `components/PostVideoPaywall.tsx:195-221` | botão do pack | tela | **componente morto**: nenhum `import`/`<PostVideoPaywall` fora de um comentário (`GenerateClient.tsx:16629`) | 0 | `starter_pack_checkout_clicked`: 40 eventos/10 pessoas, **último em 12/07** |

Verdade do servidor, que não depende de clique de UI: `checkout_attempted`/`checkout_started` com `sku='starter10'` = **0 desde 15/07** (início da instrumentação); `payment_success` com `pack` = **0** no mesmo período. As 3 linhas "starter · 490" de agosto são **assinaturas** Starter no preço de entrada de $4.90 (`checkout_mode:'subscription'`, `intro:true`), não o pack. Existem **5 perfis externos com `has_paid=true` e sem plano** — o rastro provável dos packs de junho/julho (pré-metadata), sem como confirmar por evento.

Achado colateral: `send-video-rescue` promete o pack e manda para `/pricing`, que **não o vende**. É a classe "vitrine oferece o que o cobrador recusa" (memória de 06/09) — não é assunto deste Q9, mas fica anotado.

### 2b. As três candidatas do ciclo

| Candidata | Existe? | Mostra a oferta hoje? | Dona | O que teria de ser construído |
|---|---|---|---|---|
| **O "não" por saldo insuficiente** | Sim, em dois corpos. **Cliente:** modal `upgrade_modal_opened` (`GenerateClient.tsx:9937`, reasons `credits/trial_spent/trial_stalled/trial_ended`) — o `limit_purchase_fit_viewed` já calcula `shortfall_bucket` e recomenda **plano** (`recommendation_id:'starter'`, `topup_purchasable:false` em todos os 22 casos). **Servidor:** 402 do compose (`app/api/compose/route.ts:1645,1726`) e do cinematic (`generate-video-cinematic/route.ts:1854-1900`, texto "Add a plan…") | **Não.** Nem pack nem $2.90 em nenhum dos dois | modal = **tela (Codex)**; texto do 402 = servidor, mas é só frase | Um card/linha "30 credits — $4.90, one-time" no modal, condicionado a `account_state:'non_subscriber'` e `shortfall ≤ 30`. Atenção: o 402 "AI Generated videos are available on paid plans" (`compose/route.ts:1639`) **não emite evento** — é uma parede invisível (2 pessoas em 30d via `generation_stage_error`) |
| **A faixa da temporada** | Sim: `components/video/SeasonStrip.tsx`, montada em `GenerateClient.tsx:16682` | **Não.** Fala "season unlock with a plan" e linka `/pricing` (`:302-307`, evento `season_plan_clicked` — **0 na história**) | tela (Codex) | Trocar/adicionar CTA; mas `season_shown` = **2 pessoas** em 24h — peça ainda vista por quase ninguém (SPRINT-AQUISICAO #12) |
| **A carta da parede** (`next_episode_wall_emailed_v1`, 35 pessoas em 06/09) | Sim: `app/api/admin/send-next-episode-wall/route.ts` | **Não.** Linka `/pricing` (`:188`) e declara "SEM DESCONTO, SEM CRÉDITO, SEM PREÇO" (`:36`) | **servidor (Claude)** | Uma linha com o pack — porém a regra da casa (PUSH #97) proíbe link direto de checkout em e-mail de campanha, e `/pricing` não vende o pack → só funciona se o Codex puser um card no `/pricing` antes. A carta da temporada (`send-season-letter/route.ts:131`) está no mesmo caso |

Resumo do §2: **não existe hoje nenhuma superfície viva que mostre o pack para quem acabou de bater na parede.** Os dois lugares onde ele está exigem marca d'água fora do trial (0 exposições) ou abrir um `<details>` fechado (0 cliques em 231 exposições).

---

## 3. A coorte, dimensionada antes de qualquer remédio

### 3a. O nome real da parede no banco (inspeção de `events.name`)

Não existe evento chamado `insufficient_*`. Os emissores reais:

- `compose_refused` com `metadata.reason` — escrito por `/api/compose` (`logComposeRefusal`, `compose/route.ts:249-255`) **e** por `/api/generate-video-cinematic` (`logCinematicRefusal`, `:1149-1160`, mesmo nome). Reasons de saldo já emitidos: `trial_credits_stalled` (26 ev/15 pessoas), `credits_held_by_render` (18/11). Os reasons `insufficient_credits_ai`, `insufficient_credits_fast` e `insufficient_credits` existem no código (`compose/route.ts:1645,1726`; `cinematic:1854`) e **nunca foram emitidos na história**.
- `upgrade_modal_opened` (cliente, `GenerateClient.tsx:9937`) com reasons `trial_spent` (34/29), `trial_stalled` (26/15), `trial_ended` (19/8), `credits` (10/4); `studio/creator/footage` são cadeado de motor, não saldo — excluídos.
- `trial_balance_bridge_viewed` (120/79): não é parede, é a ponte "Seedance 35s por 15cr" para quem ainda tem 15–24cr. Contada à parte.

**Definição usada:** pessoa distinta com `compose_refused` (reasons de saldo acima) **ou** `upgrade_modal_opened` (reasons de saldo), 30 dias, conta externa.

### 3b. Números

| Degrau | Pessoas | Denominador |
|---|---:|---|
| Bateram na parede de saldo | **65** | — |
| … já tinham ≥1 filme entregue (`videos.status='completed'`) | **44** | de 65 (68%) |
| … chegaram a `checkout_started` | **22** | de 65 (34%) |
| … pagaram (`payment_success`) | **3** | de 65 (4,6%) — as 3 são **assinaturas** (Starter intro $4.90 em 17/08, Pro $29 em 23/08, Starter $7 em 02/09 — esta bateu na parede **depois** de pagar) |
| Não pagantes hoje (`has_paid=false`) | **62** | de 65 |
| Saldo **0** hoje | **41** | de 65; 1–4cr: 2 · 5–14: 9 · 15–24: 2 · ≥25: 11 (mediana **0**) |
| Trial `downgraded` / `active` / outro | 45 / 16 / 4 | de 65 |
| Origem `chatgpt` / `taaft` | 32 / 22 | de 65 |
| Parede em **< 24h** do 1º filme entregue | **40** | de 65 (mediana **0,2h** no grupo maior) |
| Viram a ponte de 35s (`trial_balance_bridge_viewed`) | 79 | 70 delas **sem** parede; 3 checkout; **0** pagaram; 4 clicaram |

Contexto do trial: 398 dos 842 cadastros de 30d receberam **25cr** (`lib/reverseTrial.ts:133,140`) = exatamente 1 Seedance 60s. O downgrade **revoga o não gasto** (`lib/reverseTrial.ts:1666-1668`), por isso a mediana de saldo é 0. O padrão dominante da parede é literal: "fiz o filme 1, sobrou 0, tentei o filme 2 em 12 minutos".

### 3c. O que 30 créditos compram — por motor, conta paga (`lib/credits/engineCost.ts`)

| Motor (`quality`) | 60s | 35s | 90s | Filmes em **30cr** | Filmes em **25cr** ($2.90) |
|---|---:|---:|---:|---|---|
| Kineo 1 (`fast`) `:82` | 5 | 3 | 8 | **6** × 60s | 5 × 60s |
| Seedance 1.5 (`cinematic_ai`) `:102` | **25** | **15** | 38 | **1 × 60s (+1 Kineo 1)** ou **2 × 35s** | **1 × 60s** (sobra 0) ou 1 × 35s + 2 Kineo 1 |
| Kling 2.5 (`cinematic_kling`) `:108` | 50 | 30 | 75 | 0 × 60s · **1 × 35s** (30 cravados) | **0** |
| MiniMax H3 (`cinematic_h3`) `:120` | 45 | 27 | 68 | 0 × 60s · 1 × 35s | 0 |
| Veo 3.1 `:126` | 100 | 60 | 150 | 0 | 0 |
| Kling 3 / Omni / Seedance 2.5 `:134,142,150` | 150 | 90 | 225 | 0 | 0 |

Escala por duração: `creditCostForDuration` `:190-202` (60% / 100% / 150%, teto arredondado para cima). Nota: ao comprar, `has_paid` vira `true` (`webhook:1007`) → o Kineo 1 **deixa de ser grátis** e passa a custar 5cr (`engineCost.ts:82`; `compose/route.ts:1583,1629-1631`), e a conta perde o free tier de Fast com marca d'água. É efeito colateral que a copy do pack não menciona.

### 3d. Cruzando: a quem o pack **realmente** desbloquearia o que a pessoa tentava

| Evidência do motor tentado | Pessoas | Pack de 30 resolve? |
|---|---:|---|
| Recusa do servidor, `engine=seedance` (`needed` 18–24 vs `balance` 9–17) | 20 | **Sim** — déficit ≤ 15 |
| Recusa do servidor, `engine=h3` (36 vs 25) / `kling` (44 vs 25; 30 vs 26) | 2 / 3 | Sim, por pouco (déficit 4–19) |
| Recusa do servidor, `engine=hollywood` (150 vs 62) | 1 | **Não** |
| Modal do cliente com déficit medido (`limit_purchase_fit_viewed`, 22 pessoas): `shortfall 1_24` | 12 | **Sim** |
| … `25_49` | 7 | só se o déficit real for ≤ 30 (o bucket não separa) |
| … `50_99` / `100_199` | 2 / 1 | **Não** |
| Último filme antes da parede: nenhum / Kineo 1 / Seedance | 34 / 18 / 13 | Com +30: **65 de 65** pagam 1 Seedance 60s; **12 de 65** pagariam Kling 2.5 60s (só quem já tem ≥20); **0 de 65** pagam Kling 3 |

**O achado que o fundador pediu, dito na cara:** para a parede típica da casa (trial de 25cr, 1 Seedance, saldo 0, tentou de novo em 12 min), o pack de 30 **serve** — compra exatamente **mais um filme igual ao que a pessoa acabou de fazer**. Ele **não** serve para ninguém com saldo 0 que tenha escolhido Kling 2.5, H3, Veo, Kling 3, Omni ou Seedance 2.5 a 60s — e o modal do cliente hoje dispara `trial_spent` com 25–80cr na conta justamente porque a pessoa escolheu um motor caro (16 eventos com saldo ≥25 em 30d). Para essas, oferecer "$4.90 → 30 créditos" é oferecer o que o cobrador vai recusar — a queimadura de 06/09 de novo. Qualquer exposição do pack tem de ser **condicionada ao déficit** (`shortfall ≤ 30`), nunca ao reason.

---

## 4. Dinheiro

Custos por render no repositório (não há tabela viva; são comentários datados):

| Motor | Custo por filme | Origem | Confiança |
|---|---|---|---|
| Seedance 60s | **$3.30** tudo-dentro (âncoras + retries) | `engineCost.ts:96-99` (fatura de agosto) | a mais recente e a única **medida** |
| Seedance 60s (números antigos) | $1.61 · $0.65 | `checkoutPricing.ts:286` · `docs/PRECOS-MOTORES-V4.md:21` | superados pelo de cima |
| Seedance 35s | não medido | — | **não medível no repositório** (âncoras são custo fixo; 60% de $3.30 = $1.98 é chute) |
| Kineo 1 | ~$0.33 (Creatomate + OpenAI; sem fal) | `engineCost.ts:66-71`, `checkoutPricing.ts:284` | estimativa do próprio código |
| Kling 2.5 60s / 35s | ~$5.50 / não medido ($0.07/s → ~$2.45 só de vídeo) | `checkoutPricing.ts:288` / `PRECOS-MOTORES-V4.md:11` | estimativa |
| H3 65s / 35s | $3.90 / não medido ($0.06/s) | `engineCost.ts:110-112` | estimativa |

Líquido da Stripe (`netAfterStripeUsd`, `checkoutPricing.ts:316-318`): **$4.90 → $4.458**; **$2.90 → $2.516**; **Starter $7 → $6.497**.

| SKU | Uso | COGS | Margem sobre o líquido |
|---|---|---:|---:|
| **Pack $4.90 (30cr)** | 1 Seedance 60s + 1 Kineo 1 (o mix que o próprio Stripe description anuncia, `marketingPrice.ts:147-155`) | $3.63 | **+$0.83 (19%)** |
| | 2 Seedance 35s (se linear) | ~$3.96 | ~+$0.50 (11%) — pior se âncoras forem fixas |
| | 6 Kineo 1 | $1.98 | +$2.48 (56%) |
| | 1 Kling 2.5 35s (estimado) | ~$3.20 | ~+$1.25 |
| **Oferta $2.90 (25cr)** | **1 Seedance 60s — o único uso que a faixa anuncia** (`Offer290Banner.tsx:145-146`) | $3.30 | **−$0.78 (prejuízo)** |
| | 1 Seedance 35s + 2 Kineo 1 | ~$2.64 | ~−$0.12 |
| | 5 Kineo 1 | $1.65 | +$0.87 |
| **Starter $7/40cr (mês 1 e renovação)** | 1 Seedance 60s + 3 Kineo 1 | $4.29 | **+$2.21 (34%)** |
| | 1 Seedance 60s + 1 Seedance 35s | ~$5.28 | ~+$1.22 (19%) |

Três coisas que o dinheiro decide:

1. **O $2.90 é estruturalmente morto a esse preço.** O comentário que o justificou (`route.ts:746-750`: "COGS $2.34 → +$0.18") usava o Seedance de julho; o de agosto custa $3.30. Ponto de equilíbrio para 1 Seedance: **(3.30 + 0.30) / 0.971 = $3.71**. O invariante `checkPricingInvariants` (`checkoutPricing.ts:683-696`) aprova o SKU porque `worstCaseCogsUsd(25)` = 25 × $0.066 = $1.65 — a função só reconhece o H3 como "pior motor" e trata qualquer sobra < 45cr como Kineo 1 (`:308-313`). Para 25–44 créditos o pior caso real é Seedance a **$0.132/cr**, o dobro do que a função assume. **Isso é defeito de guardião, independente da decisão de ligar.**
2. **O pack custa menos por crédito que o Starter:** $4.90/30 = **$0.163/cr** contra $7/40 = **$0.175/cr**. O invariante (1) que proíbe top-up mais barato que o plano (`:663-672`) **não cobre os packs** (`packSkus` só testa "compra ≥1 vídeo" e "não fica negativo"). 40cr comprados em packs sairiam por $6.53 — o mecanismo de canibalização é aritmético, não hipotético.
3. **Uma assinatura Starter vale ≥ 2,7 packs no mês 1 e o pack não renova.** Mesmo no cenário bom (+$0.83/pack), 65 paredes/mês a uma conversão otimista de 10% = 6–7 packs = **~$5–6 de margem/mês**. Não é linha de receita; é, no máximo, cartão-na-conta e âncora de preço (argumento já escrito em `GenerateClient.tsx:10056-10065`).

---

## 5. Canibalização — medida, não opinada

Pagantes externos em 90 dias (`payment_success`, 09/06 → 07/09): **13 pessoas** (4 pré-metadata de junho/julho + 9 assinaturas rastreadas).

| Pagante | Pagou | Bateu na parede **antes**? | Filmes antes | O que precisava |
|---|---|---|---:|---|
| `7d4baa98` | 17/08 · Starter (intro $4.90) | **Sim** (`credits`, mesmo dia) | 1 | déficit pequeno — **o único caso em que um pack de $4.90 era substituto plausível** (pagou exatamente $4.90, mas por um plano) |
| `e7f1a87c` | 23/08 · Pro $29 | **Sim** (`trial_credits_stalled`, véspera) | 5 | Studio/Kling 3 — pack irrelevante |
| `d51f2aac` | 02/09 · Starter $7 | não (parede **depois** de pagar) | 0 | — |
| outros 10 | — | não (nenhum evento de parede/ponte) | — | — |

**2 de 13** pagantes (15%) cruzaram a parede antes de pagar; **1 de 13** comprou o tier que o pack substituiria. Exposição máxima de canibalização observada: **1 pagante em 90 dias**, ~$7/mês de MRR.

O que o dado **não** responde: (a) se `7d4baa98` teria escolhido o pack — ele viu o pack? Não: 0 exposições vivas (§2a); (b) contrafactual dos 19 que bateram na parede, chegaram ao checkout e **não** pagaram — quantos pagariam $4.90? O único proxy histórico é o pack de junho/julho (`starter_pack_checkout_clicked` 10 pessoas → 4 compras avulsas em 713 cadastros, CLAUDE.md), medido antes do reverse trial e a 10 créditos — regime diferente, não transfere.

---

## 6. Kill-switch e reversão

| Cenário | Como desliga | O que acontece com quem comprou |
|---|---|---|
| Oferta $2.90 ligada → desligar | `lib/flags.ts:13` `true → false` + deploy. Efeito imediato: banner `null` (`Offer290Banner.tsx:44,119`), SKU 410 (`checkout/route.ts:2470-2474`), `/api/credits` volta a `offer290Enabled:false` (`:246`) | Crédito **fica**: o webhook soma ao `video_credits` (`webhook:1004-1007`) e a flag nunca é lida de novo. `mode:'payment'` (`:2516`) = cobrança única; **a Stripe não cobra de novo, não há subscription, nada a cancelar**. `has_paid=true` e `offer290_used=true` (`:1007-1008`) **permanecem**: a pessoa nunca mais vê a oferta, Kineo 1 passa a custar 5cr para ela e ela sai do free tier de Fast |
| Pack $4.90 → desligar | **Não existe interruptor.** O builder `buildPackAndRedirect` (`:2289`) não lê flag. Opções: (a) remover os botões (Codex, tela); (b) adicionar um gate no builder devolvendo 410 (servidor, código novo); (c) os 2 crons de e-mail (`send-oneoff-unlock`, `send-video-rescue`) continuariam anunciando — são independentes | idem acima: crédito fica, `has_paid` fica, sem renovação |
| Sessão Stripe aberta no momento do desligamento | a sessão de checkout já criada **completa normalmente** (a flag é checada antes de criar a sessão, `:2470`); o webhook credita por `metadata.pack_credits` sem consultar a flag | recebe os créditos |

Reversão de emergência do banner sem deploy: não há (constante, não env). Se isso importa, a mudança correta é converter `OFFER_290_ENABLED` para leitura de env como `CINEMATIC_ANCHOR_ENABLED` (`lib/flags.ts:23-25`) — **decisão de código, não desta sessão**.

---

## 7. Recomendação — com o "não" incluído

**Não ligar `OFFER_290_ENABLED`.** Número que sustenta: **−$0.78 por venda** no uso anunciado (Seedance $3.30 medido vs $2.516 líquido), com 0 vendas na história para provar o contrário e um guardião que aprova o SKU por engano. Condição que falsificaria: o custo tudo-dentro do Seedance 60s cair abaixo de **$2.20** (aí $2.90 rende +$0.30), **ou** o fundador decidir explicitamente que é loss-leader com teto (ex.: 1× por conta já existe; faltaria teto mensal) — decisão de preço, dele.

**Não construir superfície nova para o pack** (faixa da temporada, carta da parede): a faixa é vista por 2 pessoas/dia e a carta não pode linkar checkout; as duas mandariam para um `/pricing` que não vende o pack. Construir ali é repetir "peça escrita para muitos, vista por poucos".

**Se for fazer UMA coisa: expor o pack de $4.90 que já existe dentro do modal do "não"** (`upgrade_modal_opened`, a superfície com 60 pessoas/30d e o déficit já calculado em `limit_purchase_fit`), **somente** para `account_state:'non_subscriber'` **e** `shortfall ≤ 30`, como opção secundária abaixo do Starter (o Starter continua recomendado — a diferença de $2.10 compra 40cr/mês contra 30 uma vez, e o modal já sabe dizer isso). É tela → **Codex**, pedido a registrar em `docs/PEDIDOS-CODEX-2026-09-06.md` (outra sessão está editando; não toquei). Medição já existe no servidor: `checkout_attempted sku=starter10` e `payment_success pack=starter10` — zero código de telemetria novo. Alcance esperado: **12–19 pessoas/mês** (déficit 1–24 + parte do 25–49). **Condição que derruba:** 30 exposições nesse recorte com **0** `checkout_attempted sku=starter10` → a parede não é de $4.90, é de vontade, e o pack sai do modal.

**Dois consertos que valem independente da decisão** (código, próximo ciclo, não esta sessão):
1. `worstCaseCogsUsd` (`checkoutPricing.ts:308-313`) precisa reconhecer Seedance a $0.132/cr como pior caso para grants entre 25 e 44 créditos; hoje aprova um SKU que perde dinheiro.
2. `send-video-rescue` (`:106,117`) anuncia o pack e manda para `/pricing`, que não o vende — ou o `/pricing` ganha o card (Codex), ou a carta para de prometer.

---

## ✅ O QUE VOCÊ PRECISA FAZER

1. Decidir **não** virar `lib/flags.ts:13` (ou, se quiser o $2.90 mesmo assim, dizer o novo preço ≥ $3.71 — o número é seu).
2. Dizer "vai" ou "não" para o pedido ao Codex: pack de $4.90 como opção secundária no modal do "não", só para não-assinante com déficit ≤ 30cr.
3. Nada mais. Não há botão, bat ou deploy nesta entrega.

## 📋 O QUE ACONTECEU

Medi antes de recomendar. O pack de $4.90 nunca esteve dormindo: está no ar há meses, escondido num menu dobrado e num modal que ninguém mais vê, com zero tentativas de compra em 54 dias. A oferta de $2.90 está desligada — e deve continuar, porque a $2.90 ela perde $0.78 em cada venda desde que o Seedance passou a custar $3.30. A parede de saldo tem 65 pessoas por mês, quase todas com saldo zero doze minutos depois do primeiro filme; para elas 30 créditos compram exatamente mais um filme igual — e nada além disso. O único lugar onde expor o pack faz sentido é o modal que já diz "não", com o déficit calculado, e isso é tela do Codex, não flag. Fica em aberto: um guardião de preço que não enxerga o custo real do Seedance, e uma carta automática que promete um pack que a página de preços não vende.
