# ROTINA PORTA — noite 08→09/09/2026

Missão: a porta de $1 (Versão B) tem que deixar de ser AVISO e virar CENA que a
pessoa clica. Métrica: pessoas distintas que clicam / pessoas distintas que veem.

Worktree: `C:\kineo-wt\noite-porta` (detached sobre origin/main).

---

## r1 20:05 — MEDIR ANTES DE MEXER

Base `origin/main = db1d00c0`. SQL contra o projeto `cqqukkvjjrguayiyjvhh`, contas
externas (e-mail sem josephsskaf/usekineo/kineo.local), desde `2026-09-08 05:00+00`.

### Quem viu a faixa (`card_entry_banner_shown`) — 7 pessoas, 13 impressões, 0 cliques

| # | pessoa | views | path | clicou faixa | tentou gerar | modal | checkout | total eventos |
|---|--------|-------|------|--------------|--------------|-------|----------|---------------|
| 1 | atoyebiolakam2010 | 1 | /studio | 0 | não | não | 0 | 5 |
| 2 | samuelhabtub | 2 | /studio | 0 | não | não | 0 | 9 |
| 3 | huychnuant…angmanh | 2 | /studio, /studio/create | 0 | sim | **sim** | 0 | 23 |
| 4 | kaursimrannn20 | 1 | /studio/create | 0 | sim (render FALHOU) | não | 0 | 49 |
| 5 | samu.mikkonen | 2 | /studio/create | 0 | sim | **sim (3×)** | **1** | 89 |
| 6 | ep5451873 | 4 | /studio, /studio/create | 0 | sim | **sim** | 0 | 90 |
| 7 | kingtopman | 1 | /studio | 0 | não | não | 0 | 2 |

Todas: `plan=free`, `has_paid=false`, `video_credits=0`; 6 com `trial_status='card_required'`,
1 (kingtopman) sem carimbo e com saldo 0 — a faixa apareceu para ela pelo ramo
`semCarimboMasSemCredito`, funcionou como projetado.

### O NÚMERO QUE MUDA A NOITE

Existem DUAS portas no ar, e a que a rotina foi mandada consertar não é a que converte:

| superfície | pessoas | impressões | cliques de checkout |
|---|---|---|---|
| faixa `card_entry_banner_shown` | **7** | 13 | **0** |
| modal `upgrade_modal_trial_door_shown` | **3** | 5 | **1** |

Quem clicou (samu.mikkonen, 11:18:25) clicou **de dentro do modal**
(`checkout_cta_clicked.surface = 'generate_upgrade_modal'`) — nunca da faixa.

### E O DEFEITO QUE ISSO REVELA — a porta de $1 PERDEU dentro da própria caixa

O `checkout_cta_clicked` da única pessoa que apertou algo hoje diz:

```
{ surface: 'generate_upgrade_modal', tier: 'starter', selection: 'starter', intro: true, reason: 'credits' }
```

E o `checkout_started` que veio 1s depois: `tier='starter'`, `intent_campaign='push77_short_cost_calculator'`,
`intro_requested=true`. Ou seja: **a porta de $1 estava na tela**
(`upgrade_modal_trial_door_shown` 3× para essa mesma pessoa, `visible:true`,
`door_reason:'ok'`, `entry_fee_minor:100`) **e ela escolheu o plano de $9** — que
é a oferta cara, exige decisão de assinatura e não entrega o filme que ela acabou
de escrever. Ela foi ao Stripe e **não pagou**. Voltou (`checkout_resume_banner_viewed`),
dispensou a faixa de retomada e bateu na parede mais 3 vezes
(`compose_refused` 6× no total, `reason='free_fast_limit'`, `limit:0`).

A porta de $1 não está fraca por copy. Está **competindo com uma grade de planos
dentro da mesma caixa, e perdendo**. Uma caixa que oferece 4 saídas não é uma porta.

### O que mais aparece no mesmo instante do bloqueio (ruído contra a porta)

Sequência real de quem bate na parede: `compose_refused` → `free_limit_wall_shown`
→ `upgrade_modal_opened` → `topup_unavailable_note_shown` (5 eventos, 3 pessoas)
→ `upgrade_modal_trial_door_shown`. A pessoa recebe, no pico de intenção, um aviso
de que **um produto não está disponível** colado na única oferta que a casa quer
que ela aceite.

### Onde a gente perde gente antes da porta

Das 7, **3 nunca apertaram Generate** (atoyebiolakam, samuelhabtub, kingtopman):
viram a faixa e saíram. Para elas a faixa é a única superfície — ela fica.
As outras 4 chegaram ao bloqueio, e é ali que a folha nova vai morar.
E 1 (kaursimrannn20) nem chegou à porta: o render dela **falhou**
(`video_generation_failed` 10:36) antes de qualquer conversa de dinheiro.

---

## r1 — DESENHO DA PORTA NOVA (`CardEntryDoor`, version `door_v2`)

**Onde entra:** no momento do bloqueio, em `openOutOfCreditsModal` — para a coorte
da porta (`CARD_ENTRY_ONLY && !hasPaid && saldo 0`) a folha abre **no lugar do
UpgradeModal**, não além dele. É esse "no lugar de" que mata a competição medida
acima. Fora dessa coorte (assinante sem crédito, saldo parcial, footage), o
UpgradeModal continua exatamente como está.

**O que a pessoa vê, nesta ordem:**

1. **A ideia dela, entre aspas** (prompt atual, cortado em 140 chars). A folha
   fala do filme DELA, não de planos. Sem ideia escrita, essa linha some.
2. **O robô rodando** — `public/previews/36a04f7b-…mp4`, loop, mudo, `playsInline`,
   poster `public/posters/36a04f7b-….jpg`, `max-height:40vh`. É o produto em
   movimento no segundo em que ela decide.
3. **Título** — `CARD_ENTRY_COPY.headline` (fonte única).
4. **Linha de preço** montada em runtime: `formatCheckoutMoney(currency, CARD_TRIAL_ENTRY_FEE_MINOR)`
   + `CARD_TRIAL_DAYS` + `CARD_TRIAL_GRANT_CREDITS` + `getTierPrice('basic', …)`.
   Nenhum "$1", "$19" ou "80" digitado no arquivo.
5. **Três linhas do que ela ganha**, derivadas de `TRIAL_ACCESS` (`engineCoverage`
   dá "80 créditos = N filmes inteiros de Kineo 1" — número calculado, não prometido).
6. **UM botão** → `CARD_ENTRY_CHECKOUT_PATH` com `intent_campaign=door_v2`
   (só a campanha muda; `tier=basic&billing=monthly&trial=1` intactos).
7. **"Not now"** discreto, que fecha e devolve a tela.

**O que a folha NÃO tem, de propósito:** grade de planos, nota de top-up
indisponível, segunda oferta, contagem regressiva.

**Rascunho:** gravado em `kineo_studio_draft_v1` ANTES de ir ao checkout (o
`resume=card_entry` já existe e não é duplicado).

**Eventos:** `card_entry_door_shown` / `card_entry_door_clicked` /
`card_entry_door_dismissed`, com `{version:'door_v2', path, prompt_len, surface}`.

**A faixa `CardEntryBanner` fica.** As 3 pessoas que nunca apertaram Generate só
têm ela.

**SHA desta rotação:** só documento — nada de código publicado na r1.
**Ficou para a r2:** construir a folha e ligá-la no bloqueio.
