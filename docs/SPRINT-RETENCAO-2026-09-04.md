# SPRINT 2 — RETENÇÃO: DO FILME 1 AO FILME 4 (04/09 → 05/09/2026)

Diário da pista Claude. A sprint 1 (`docs/SPRINT-ASSINATURAS-2026-09-03.md`,
rodadas #1–#16) consertou a ENTREGA: 15 defeitos, todos em produção, e ZERO
assinaturas. O gargalo mudou de lugar. Não é mais o filme sair — é a pessoa
voltar. A numeração continua a da sprint 1 (a #16 entrou às 14:16 BRT de hoje):
esta rodada é a **#17 global**, e a **#1** desta sprint.

**A régua que manda** (30 dias, externos, medido 04/09 14:20 BRT):

| filmes por pessoa | pessoas | pagaram | taxa |
|---|---:|---:|---:|
| 1 filme | 319 | 1 | **0,3%** |
| 2–3 | 114 | 2 | 1,8% |
| 4–7 | 13 | 2 | **15,4%** |
| 8+ | 6 | 2 | 33,3% |

Quem chega ao 4º filme paga **51× mais** que quem parou no 1º (o briefing da
sprint dizia 23×; com o mês fechado o degrau ficou mais íngreme, não menos).
Missão: mover gente de N para N+1, com foco no salto 1→2 e no alvo 4.

---

### #1 (global #17) — 14:20→15:05 BRT — os 15 consertos da sprint 1, medidos um a um: 6 funcionaram, 0 pioraram, e nenhum é candidato a reversão — mas a tela de fim de filme oferece TROCAR DE ASSUNTO a 93% das pessoas e CONTINUAR A PRÓPRIA HISTÓRIA a 12%

Rodada de MEDIÇÃO, sem código, como manda o programa da sprint.

#### Placar de base (marco da sprint 1 = 03/09 16:00 UTC, ~22h de janela)

SQL canônico (§5 do `PROGRAMA-CODEX-ASSINATURAS-2026-09-03.md`), contas externas:

| | |
|---|---:|
| cadastros | 41 |
| pessoas com filme | 27 |
| filmes entregues | 35 |
| checkout COM filme (desejo) | 2 |
| checkout SEM filme (defeito) | 2 |
| **assinaturas** | **0** |
| pessoas com falha e nenhum filme | 0 |

**Distribuição pós-marco (as 27 que fizeram filme):** 22 pararam no 1º · 4 em
2–3 · 1 em 4–7. Pessoas que subiram de faixa desde a rodada anterior: esta é a
**linha de base** da sprint, o delta começa a contar na #2.

O número que dói: **22 das 27**. É o mesmo 81% de antes dos 15 consertos — o que
era esperado, porque nenhum dos 15 mexia no motivo de VOLTAR.

#### Veredito dos 15 consertos da sprint 1

Regra do programa: um conserto SEM SINAL depois de 24h é candidato a reversão.
**Nenhum dos "sem sinal" tem 24h de vida** — os #13, #14 e #15 entraram há menos
de uma hora. Anotado, nada revertido.

| # | conserto | veredito | número |
|---|---|---|---|
| #1 | gate de narração / degrau | **FUNCIONOU** | `narration_guard_blocked` = **0** (era a causa de 34 recusas em 30d); `script_duration_autofit_down` = 2 eventos / 2 pessoas. O alvo desce sozinho e o filme sai. |
| #2 | guarda de cobrança | SEM SINAL | `cinematic_cost_drift` = 0. Não houve divergência de preço na janela — sem exposição, não é falha. |
| #3 | preâmbulo do ChatGPT | **DÍVIDA DE MEDIÇÃO** | o conserto **não emite evento próprio**. 20 pessoas viram o banner ChatGPT e 12 usaram o quickstart, mas não existe como provar que o narrador parou de ler "Visual dois pontos" sem ouvir um filme. Não dá para dar veredito. |
| #4 | semente de série | SEM SINAL | **ZERO continuações** pós-marco. Zero semente-lixo porque zero semente. → virou o achado desta rodada. |
| #5 | crédito preso | **FUNCIONOU** | `compose_refused/credits_held_by_render` = 2 (1 pessoa) e `credits_held_release_attempted` = 2 (1 pessoa), casados 1:1. O aviso do forno e a tentativa de liberação estão ligados. |
| #6 | e-mail de desculpa | **FUNCIONOU** | `failure_recovery_sent` com `kind='bug'` e `fonte='servidor'` = 1. **Primeira vez na história** (eram 0 em 30 dias). |
| #7 | expansor | VIGIAR | `script_expand_failed/growth_limit` = 1 (1 pessoa) — devia ser zero; `script_expand_accepted` = 0. |
| #8 | frase curta / autoria | VIGIAR | `script_expand_failed/author_rewrite_rejected` = 1 (1 pessoa) — devia ser zero; `script_needs_authoring` = 0. |
| #9 | pílula de render | **FUNCIONOU (classe nova nasceu)** | `action='track'` = 1 evento / 1 pessoa, a classe que não existia. Mas 46 cliques / 11 pessoas no total: a repetição continua alta. |
| #10 | /history vê o render | **FUNCIONOU, com ressalva** | `history_active_render_shown` = 1 (era **impossível** antes). Porém `same_screen=true` apareceu **1×** — a classe que deveria ser zero para sempre não é zero. Candidato a conserto. |
| #11 | crédito no cadastro por senha | **SEM EXPOSIÇÃO** | **0** cadastros por e-mail+senha desde o deploy (13:08 BRT). Não é falha, é falta de tráfego. Os 4 órfãos de hoje são todos PRÉ-conserto (ver checagem zero). |
| #12 | e-mails D5/D10 | **FUNCIONOU — o melhor da leva** | 55 envios agora repartidos: `offer_with_film` 33 · `standard` 21 · `offer_first_film` 1. **Antes eram 57 de 57 `standard`.** O e-mail parou de pedir cartão a quem nunca viu um filme. |
| #13 | primeiro filme grátis | SEM EXPOSIÇÃO | `first_film_free_offer_shown` = 0; nenhum `upgrade_modal_opened` desde o deploy (13:08 BRT). |
| #14 | clique sem rastro | SEM EXPOSIÇÃO + **ressalva de cobertura** | `generation_attempt_opened` = 0 (deploy 13:50 BRT, 26 min de vida). **A caixa-preta só é emitida em `app/api/generate-video-cinematic`** — ela NÃO cobre o caminho clássico (Kineo 1 / Seedance / Veo / Kling 2.5). O buraco de 21 pessoas só será visto na parte cinematográfica. |
| #15 | filmes na caixa | **FUNCIONOU** | 26 eventos / 4 pessoas com `capacity_unit_version=plan_film_language_v1` em 26 minutos. |

**Placar dos vereditos: 6 FUNCIONOU · 0 PIOROU · 4 sem exposição · 2 a vigiar ·
1 dívida de medição · 2 sem sinal legítimo.** A entrega está sã:
`generation_stage_error` = 7 em 24h, claim sem filme em 3h = **0**, render preso
> 3h = **0**.

#### Checagem zero — 1 achado vermelho

**4 contas externas com `trial_status` NULO e 0 créditos, todas de hoje**
(04/09 04:58, 11:03, 11:05 e 11:09 UTC). As quatro têm a assinatura exata do
defeito do #11: `email_signup_completed` **sem** `auth_callback_completed` e
**sem** `trial_credits_granted`. As quatro são **anteriores** ao conserto
(13:08 BRT) — ou seja, o #11 fechou a porta, mas **ninguém reparou quem já
tinha caído**. Zero filmes nas quatro.

Não reparei à mão, de propósito: o `CLAUDE.md` manda usar o botão do
`/admin/people` ("não abra o banco à mão, senão o rastro se perde"), e a
concessão real é uma transação com `trial_status='blocked'` + RPC
`add_video_credits` + rollback (`lib/reverseTrial.ts`) que eu não devo imitar em
SQL solto. **Vai para a lista do fundador.**

Alívio parcial medido: se qualquer uma delas voltar e abrir `/studio/create`, o
grant dispara sozinho — `maybeActivateReverseTrial()` roda naquela página. O
problema é que elas não voltam.

#### O ACHADO DA RODADA (vira código na #3)

**A tela de fim de filme é o lugar de maior boa vontade da casa, e ela oferece a
coisa errada.** 30 dias, externos:

- **413 pessoas** viram a tela de fim de filme (`video_ready_viewed`)
- **382** receberam `next_shorts_shown` — uma ideia **NOVA**, outro assunto
- **49** viram a oferta de continuar a **própria** história (`series_continue_seen`)

Ou seja: **93% recebem "troque de assunto", 12% recebem "continue".** E continuar
é exatamente o que prevê pagamento: **58 pessoas clicaram continuar em 30 dias e
30 delas fizeram outro filme em 24h** — 52%, contra os ~19% de segundo filme da
base inteira.

**O caso vivo de hoje**, que mostra o mecanismo inteiro em 20 minutos
(pessoa `d20530865c`, origem `chatgpt.com`, o único canal que converte):

```
10:33  cadastrou · trial_credits_granted (25cr)
10:42  PRIMEIRO FILME pronto — Seedance, 15 créditos, sobraram 10
10:43  series_continue_seen        <- viu a oferta
10:45  series_continue_clicked     <- QUIS o episodio 2
10:45  series_continuation_landed
10:51  upgrade_modal_opened  reason=trial_spent  credits=10   <- PAREDE
10:53  series_continue_clicked x2  <- insistiu duas vezes
10:56  foi embora. Zero episodio 2. Continua com 1 filme.
```

A continuação **herda o motor do episódio 1** (Seedance, 15cr) e **não herda a
pergunta "ela ainda tem 15?"**. Ela tinha 10. O **Kineo 1 faria esse episódio 2
com o saldo que ela já tinha na mão** — e ninguém lhe disse isso. O #13
(primeiro filme grátis) não a cobre: ela **já tem** um filme.

**Tamanho das duas metades da mesma jogada:** a parede na continuação são
**8 pessoas/30d** (6 delas com saldo sobrando, 3 sem nenhum filme em 24h) — real
mas pequena. A **oferta ausente** são **~380 pessoas/30d**, ~13/dia. É a mesma
jogada: R1 (o fim do filme é o começo do próximo) + R2 (série com memória), com
uma regra de motor acessível colada nela.

**Quantas pessoas move de N para N+1:** se a continuação passar de 12% para 60%
de exposição na tela de fim de filme, são ~200 pessoas/mês vendo a oferta em vez
de 49. Com a taxa observada de clique→filme (52%), o alvo é **+8 a +12 segundos
filmes por semana**. Medição definida ANTES de codar:

1. `series_continue_seen / video_ready_viewed` — hoje **12%**, meta 60%
2. `series_continue_clicked` → `videos` completed em 24h — hoje **30 de 58 (52%)**
3. `upgrade_modal_opened` dentro de 30 min de `series_continue_clicked` — hoje
   **8 em 30d**, meta **0**

#### Hipóteses medidas e descartadas nesta rodada

1. **"O #11 quebrou / continua nascendo órfão"** — falso. Zero cadastros por
   senha desde o deploy; os 4 órfãos são todos anteriores.
2. **"O #13 e o #14 estão quebrados porque não emitem nada"** — falso. Os nomes
   dos eventos batem com o código em `origin/main` (`GenerateClient.tsx:18705`,
   `generate-video-cinematic/route.ts:1970`); o que falta é exposição — menos de
   1h no ar. O #15, do mesmo lote, já emitiu 26 eventos, o que prova que o
   deploy está vivo.
3. **"A entrega voltou a quebrar"** — falso. Claim sem filme em 3h = 0; render
   preso = 0; nenhuma causa antiga na última hora.

#### Risco e reversibilidade

Rodada sem código. Risco zero. Nada a reverter.

#### Próxima jogada (#2)

Rodada #2 fecha a medição: **quantas das 27 pessoas pós-marco subiram de faixa**,
e a coorte de série completa (quem clicou continuar em 7 dias, quantos episódios
saíram, onde cada um parou). Só então a #3 escreve o R1+R2 — a tela de fim de
filme com "Episode 2 of this story" como ação principal, motor herdado **mas
rebaixado para o que o saldo paga**, e o download como ação secundária.

#### Pedidos novos ao Codex

Nenhum. O achado desta rodada é inteiramente da minha pista
(`app/(dashboard)/**`).
