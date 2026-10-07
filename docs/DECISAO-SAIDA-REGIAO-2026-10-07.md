# Saída de quem nasce `region_paid_only` — filme grátis de 15 s + passe na moeda local

**Decisão do fundador (07/10): "vai pra tudo".** Slug `saida-regiao`. Branch `codex/saida-regiao-0710` (base `5ca07684`).
Commit 1 = tudo pronto com os dois interruptores **desligados** (o site de hoje, byte a byte). Commit 2 = só liga os dois.

## O que a medição mostra (Supabase, só SELECT, 07/10 ~20h UTC)

| | |
|---|---|
| Cadastros desde 28/09 | **194**, dos quais **78 (40%)** são hoje `region_paid_only` |
| Países (país do cadastro) | Índia 16 · Egito 9 · Jordânia 6 · Paquistão 6 · Nigéria 4 · Colômbia/Geórgia/Indonésia/Filipinas/Turquia 3 cada · Argentina/Bangladesh/Iraque 2 · 13 outros com 1 |
| Brasil | **8** caíram na regra desde 28/09; **7** viraram teste depois que o Brasil voltou à lista (03/10). Hoje só **1** é `region_paid_only` |
| Fizeram filme | **0** (nenhuma linha em `videos`) |
| Clipe grátis de 5 s | **75** ganharam, **4** usaram (`clip_delivered`) |
| Vieram do ChatGPT | **34** pela utm do cadastro (37 no briefing; 42 contando qualquer evento com "chatgpt") |
| Abriram a caixa de planos (`upgrade_modal_opened`) | **32** pessoas · a nota "top-up unavailable" foi vista por **32** pessoas (51 vezes; o briefing dizia 66) — a última em 05/10 15:26, quando a caixa nova do MRR a substituiu |
| `/pricing` (`pricing_view`) | 27 pessoas |
| Abriram o checkout | **11** pessoas — todas de **plano** (Starter/Creator/Studio, 1 piloto do Autopilot); **nenhuma** do passe |
| Compraram | **0** |
| Ritmo | 8 a 12 por dia (média 30/09–06/10 ≈ 9,7/dia; o briefing usa ≈ 8/dia) |

## (a) Filme grátis de 15 s — interruptor `REGION_FREE_FILM_LIVE`

- **O quê:** quem cai em `region_paid_only` ganha **UM** filme Seedance 1.5 de 15 s, do jeito que o resto do mundo tem o teste
  (o teste de 10 cr paga exatamente esse filme). Sai com a marca d'água de sempre do plano grátis.
- **Crédito:** nenhum crédito novo. São `video_credits`, o saldo de sempre, no valor de **1 filme** =
  `creditCostForDuration('cinematic_ai', true, 15)` = **9 cr** (espelho `REGION_FREE_FILM_CREDITS`, conferido pelo guardião
  contra a função que cobra e contra a cota semanal).
- **Onde nasce:** no cadastro, dentro de `maybeActivateReverseTrial` (o grant do teste que o `/auth/callback` chama),
  **na mesma transição** que marca a região (`markedPais` — uma vez por conta, para sempre). Compare-and-set no saldo
  lido (nunca escreve por cima de outro crédito). Evento `region_free_film_granted` (sempre, dizendo se deu).
- **Onde é gasto:** `/api/generate-video-cinematic` admite **só** Seedance 1.5, **só** 15 s, **só** conta `region_paid_only`
  sem pagar, e **só se ela nunca teve vídeo** (sem janela de 7 dias: não é cota semanal). Depois de gravar o próprio claim, a
  trava confere: nenhum outro crédito reservado e nenhum débito `cinematic-*` não estornado **na vida da conta** — pedido
  duplo ou leitura falha = 402 sem cobrar. O débito é o de sempre; render que falha é estornado e o filme volta.
  Evento `region_free_film_used` logo depois do débito confirmado; `region_free_film_refused` quando a trava recusa.
- **Abuso (tudo o que existe hoje continua):** e-mail descartável continua virando `blocked` antes de tudo. **Novo:** com o
  filme ligado, a conta de fora da lista passa pela **mesma digital do aparelho** do teste (2 ativações por digital em 30 dias):
  estourou → `trial_status='blocked'`, sem filme **e sem clipe**, evento `trial_blocked_fingerprint` (scope
  `region_free_film`) e linha `blocked` na tabela de digitais (aparece no `/admin/trial-abuse`). O filme concedido grava
  `activated` na digital: teste e filme dividem a mesma cota por aparelho. Desligado, nada disso roda (é o de hoje).
- **A faixa** (`RegionPaidOnlyBanner`): com o filme disponível (saldo de 1 filme e nenhum vídeo), "**Seu primeiro filme é
  grátis**" vem na frente de tudo, com o botão para o Studio no Seedance de 15 s (no próprio `/studio` não há botão — seria
  o botão morto de 06/10). Com o filme ligado, as faixas de sempre perdem o "não está disponível no seu país" (seria mentira),
  e a recusa do servidor também (`REGION_FREE_FILM_REFUSAL`).
- **O clipe grátis de 5 s CONTINUA.** Não conflita: o cadastro dá clipe (5) + filme (9) = 14 cr; a faixa anuncia o filme
  primeiro e o clipe depois (o aviso "Você tem 1 clipe grátis" só volta quando o filme já foi feito); a trava do filme não
  conta o clipe (débito `clips-*`, não `cinematic-*`). Custo extra do clipe ≈ US$ 0,13–0,35 × 5% de uso (4 de 75) ≈ US$ 0,02
  por cadastro. Tirar o clipe seria desfazer a decisão 1A de 05/10 sem dado novo.

## (b) Passe avulso na moeda local — interruptor `REGION_PASS_OFFER_LIVE`

- **O SKU é o de 05/10:** `?pack=starter`, `PACK_PRICE_MINOR` = US$ 4,99 = 35 cr = 1 filme Seedance 1.5 de 60 s, pagamento
  **único** (`mode: 'payment'`), sem marca d'água (a compra grava `has_paid`).
- **Onde aparece para `region_paid_only`:** (1) **na parede** — a caixa de planos do Studio (`ConversionUpgrade`) e o
  `/pricing` (para onde a prévia de cenas e a faixa levam); (2) **logo depois do filme grátis ficar pronto** — no lugar do
  pack regional de sempre (mesmo SKU; nunca dois passes, nunca nenhum: quem não é da régua continua vendo o cartão de sempre).
- **Moeda:** a **mesma** chamada que o checkout do pack faz (`resolveSettlementCurrency` com o país do IP e o idioma +
  `settlementAmountMinor` sobre `PACK_PRICE_MINOR.usd`). Brasil (ou navegador pt-BR) = **R$ 24,90** pela fórmula da casa
  (`usdToBrlMinor`); o resto = **US$ 4,99**. **INR não:** o ramo INR do checkout morreu em 19/08 (KINEO-USD-ONLY) e a fórmula da
  casa não cobre a rúpia — a Índia vê e paga US$ 4,99 (o Dodo mostra INR na tela, mas cobra USD e não é a fórmula dos planos).
  Nenhum preço digitado: o servidor (`/api/region-pass`) calcula e o cartão só mostra.
- **Conta sem plano compra:** sim. A recarga (`topup*`) exige basic/pro (`canPurchaseCreditTopup`) — por isso a nota
  "top-up unavailable". O passe é **outro SKU** (`buildPackAndRedirect`), que não olha plano; o webhook (Path A) soma
  `pack_credits` e grava `has_paid` para qualquer conta. O guardião prova executando o GET real com Stripe falso.
- **Sem login:** não se aplica e não é compatível. `region_paid_only` é carimbo de **conta** (nasce no cadastro pelo país do
  IP) — quem vê o passe já está logado. E a compra de convidado (`lib/growth/guestCheckout.ts`) só existe para assinatura:
  `isGuestCheckoutSession` exige `mode: 'subscription'` e só o Path B do webhook cria conta; uma sessão de pack sem dono seria
  dinheiro sem entrega. O pack continua pedindo o login antes (o de hoje).
- **Eventos de servidor:** `region_pass_offer_shown` (a rota grava quando confere a régua e devolve o preço),
  `region_pass_offer_clicked` (o clique passa pela rota, que grava e redireciona ao checkout). O `payment_success` do passe sai
  com `metadata.pack = 'starter10'` (o SKU) e `metadata.intent_campaign = 'region_pass_<tela>_v1'`.
- **Régua estreita:** só `region_paid_only` com `has_paid === false` (leitura nula não abre a porta) e plano grátis.

## Custo esperado

- **Teto:** 8 cadastros/dia × US$ 0,80 = **US$ 6,40/dia** (≈ US$ 192/mês). No ritmo medido de 30/09–06/10 (≈ 9,7/dia):
  US$ 7,76/dia.
- **Esperado:** o teste do resto do mundo é usado por **44%** (30 de 68 testes desde 29/09 fizeram o Seedance) →
  ≈ US$ 2,80–3,40/dia (≈ US$ 85–100/mês). O clipe segue como hoje (≈ US$ 0,02/cadastro).
- O passe não custa nada até alguém comprar (e quando compra, o filme de 60 s ≈ US$ 3,30 sai de US$ 4,55 líquidos).

## Meta

**5–10% da coorte comprando o passe em 7 dias** (≈ 3–7 passes/semana no ritmo atual, US$ 17–34/semana). Abaixo de 5% em
14 dias: o filme grátis não está virando venda — desligar o filme e manter o passe, ou rever a oferta.

```sql
-- troque <deploy> pelo created_at do primeiro region_free_film_granted (o carimbo do deploy, nunca "últimos N dias")
with c as (select id from profiles where trial_status = 'region_paid_only' and created_at > '<deploy>')
select
  (select count(*) from c) as cadastros,
  (select count(distinct e.user_id) from events e join c on c.id = e.user_id where e.name = 'region_free_film_granted' and (e.metadata->>'granted')::boolean) as filme_dado,
  (select count(distinct e.user_id) from events e join c on c.id = e.user_id where e.name = 'region_free_film_used') as filme_usado,
  (select count(distinct e.user_id) from events e join c on c.id = e.user_id where e.name = 'region_pass_offer_shown') as viu_passe,
  (select count(distinct e.user_id) from events e join c on c.id = e.user_id where e.name = 'region_pass_offer_clicked') as clicou,
  (select count(distinct e.user_id) from events e join c on c.id = e.user_id where e.name = 'payment_success' and e.metadata->>'pack' = 'starter10' and e.metadata->>'intent_campaign' like 'region_pass_%') as pagou_passe;
```

## Como desligar

Uma linha cada, em `lib/freeFilmPolicy.ts`, e publicar:

- `export const REGION_FREE_FILM_LIVE = false` — volta o de hoje: cadastro de região sem filme (só o clipe), sem a digital,
  cinematic recusa como antes, faixas com o texto de antes. **Quem já ganhou os 9 cr fica com eles** (é saldo), mas o
  cinematic volta a recusar o Seedance para a conta — o saldo só serve para clipe/imagem até a pessoa pagar.
- `export const REGION_PASS_OFFER_LIVE = false` — a parede e o filme pronto voltam aos cartões de sempre; `/api/region-pass`
  responde `off` e o clique vai ao pack de sempre, sem evento.

## Prova

- `scripts/test-saida-regiao-2026-10-07.mjs` — executa com banco e Stripe falsos: grant só na região; um filme por pessoa
  (cadastro, 2º login, pedido concorrente, admissão e trava reais da rota); abuso (descartável, digital estourada, vaga do
  aparelho); preço da fórmula regional = o que a rota real de checkout cobra (BR, PT-BR, IN, PK, US); conta free compra;
  sem login vai ao cadastro; rota `/api/region-pass` real com os eventos; desligado = hoje (o `lib/reverseTrial.ts`
  desligado contra o mesmo arquivo SEM os blocos novos, 10 cenários, traço a traço). 21 mutantes, cada um provado por grep.
- Rota do cinematic (trava 8.2, "vai pra tudo" do fundador 07/10): **toda** linha nova leva a marca
  `KINEO-SAIDA-REGIAO-2026-10-07`; tiradas as 50 marcadas, a rota é a base byte a byte (nenhuma linha da base trocada). As
  travas 8.2 da rota (`test-veo-marcado`, `test-veo-modo-ia`, `test-estrela-sobretaxa-assinada` E26) foram reancoradas para
  aceitar a marca, como nas entregas S25/JUIZ/ESTRELA.
- Diferencial byte a byte contra a base (`5ca07684`), com o terser do Next dobrando `false` nos interruptores: ver o relato do
  commit 1.

## O que só um pagamento real prova

- A Stripe aceitar a sessão **em BRL** (R$ 24,90, Pix) de uma conta **sem plano**, o webhook somar 35 cr + `has_paid`, a volta
  ao Studio liberar o Generate e o Seedance de 60 s sair **limpo** para quem comprou o passe.
- O filme grátis de região de ponta a ponta numa conta real de fora da lista (cadastro → 14 cr → Studio no 15 s → admissão →
  claim → débito de 9 → montagem com marca d'água → `region_free_film_used`). O guardião prova as peças; só um render real
  (≈ US$ 0,80, conta de teste com IP de fora da lista) prova a costura inteira.
- Que alguém de fato compra.
