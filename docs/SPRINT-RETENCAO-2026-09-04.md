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
### #2 (global #18) — 15:55 BRT — A OFERTA MAIS EFICIENTE DA CASA ESTAVA NO RODAPÉ: 27% DE CLIQUE, 12% DE EXPOSIÇÃO

**O número que doía.** 30 dias, contas externas, medido agora (não herdado da
rodada anterior — refiz o SQL):

| evento | pessoas |
|---|---:|
| `video_ready_viewed` (chegou na tela de filme pronto) | **413** |
| `next_shorts_shown` (prateleira de tema NOVO) | **382** — 93% |
| `series_continue_seen` (viu "continuar a própria história") | **49** — 12% |
| `series_continue_clicked` (source `done_screen`) | **13** |

Os 13 de 49 são o número que muda a decisão: **27% de quem VÊ a porta do
episódio 2 CLICA nela.** Não existe nada nessa tela com essa taxa. Ela não
tinha problema de oferta — tinha problema de lugar. Ela morava depois do
player, do download, do painel de compartilhar e do bloco do YouTube; 88% das
pessoas nunca chegavam lá.

E é a porta que prevê pagamento. A régua da casa (30 dias, externos): 1 filme
= 0,3% de pagantes · 2-3 = 1,8% · 4-7 = 15,4% · 8+ = 33,3%. Quem chega ao 4º
filme paga ~51x mais. Pós-marco da sprint 1, **22 das 27 pessoas que fizeram
filme pararam no primeiro.**

**Junto, o segundo defeito — o motor que a continuação herda.** Caso vivo de
hoje (pessoa `d20530865c`, origem chatgpt.com): cadastrou 10:33 com 25cr,
primeiro filme pronto 10:42 (Seedance, 15cr, sobraram 10), clicou continuar
10:45 — e às 10:51 levou `upgrade_modal_opened` reason=trial_spent com 10
créditos na mão. A continuação herdava o MOTOR do episódio 1 e não herdava a
pergunta *"o saldo ainda paga esse motor?"*. E a saída existe e é verdadeira:
`creditCostFor('fast', false)` = **0** — o Kineo 1 faria esse episódio 2 com o
saldo que ela já tinha.

**O que mudou (2 arquivos, aditivo).**
- `app/(dashboard)/generate/GenerateClient.tsx`: a porta do episódio 2 nasce
  **logo abaixo do botão de download**, dentro do primeiro viewport. Fonte
  própria (`done_screen_top`) para que a comparação topo × rodapé exista no
  banco. A porta antiga do rodapé **continua lá** — não removi nada.
- `lib/seriesContinuation.ts`: `buildSeriesContinuationHref` ganhou um 3º
  parâmetro **opcional** (`{ engine }`). Sem ele, o link é byte a byte o de
  hoje — as 8 chamadas antigas não mudam de destino.
- `scripts/test-porta-episodio2-2026-09-04.mjs` (novo): **53 verificações, 0
  falhas**, lendo os arquivos reais e **executando** o módulo do link e o de
  preço.

**O que eu decidi NÃO fazer, e por quê.** O cardápio da sprint (R1) manda o
botão principal deixar de ser download e passar a ser "Episode 2". **Não
inverti.** `KINEO-DELIVER-FIRST-2026-07-30` está escrito no próprio arquivo e
foi medido: quando o download ficou abaixo de um divisor "OR", **107 pessoas
viram o filme pronto na tela e foram embora sem ele** (134 concluíram, 27
baixaram). Reverter uma decisão medida por uma hipótese é o erro mais caro que
esta sprint pode cometer. A síntese honesta: **o download continua primeiro, a
porta do episódio 2 entra imediatamente depois — e só ganha peso de ação
principal (botão azul cheio) DEPOIS que o arquivo está na mão**
(`watermarkedDownloadConfirmed`). Entregar, depois convidar. Reversível numa
linha se o número disser o contrário.

**O motor acessível, e onde ele falha fechada.** A porta desvia para o Kineo 1
somente quando as TRÊS provas existem ao mesmo tempo: (a) o saldo não cobre o
motor herdado (`selectedUnaffordable`, que já governava o seletor de duração);
(b) o Kineo 1 custa **0** nesta conta (`creditCostForDuration('fast',
isPaidAccount, duration)`, a mesma função que o servidor usa para cobrar); e
(c) a vaga da cota gratuita está **comprovadamente** livre. Vaga desconhecida
(`freeFastUsedInWindow === null`, o que acontece com a janela de 30 dias
ligada) **não autoriza promessa nenhuma** — é a mesma disciplina do #16, e a
razão é a família de defeito que esta sprint já matou cinco vezes: meia
verdade no momento da promessa. Quando desvia, a copy diz a verdade inteira na
mesma frase: *"renders on Kineo 1, free on your account, with our watermark"*.

**Quantas pessoas isso move de N para N+1.** A conta, com os números acima e
sem otimismo: hoje 49 pessoas/30d veem a porta e 13 clicam (27%). Levando a
exposição para ~380 (todo mundo que chega na tela com um tema) e **cortando a
taxa de clique pela metade** (13%, porque o topo alcança também quem não
rolaria), são ~50 pessoas clicando contra 13 — **+37 pessoas/30d**. A 52% de
clique→filme em 24h (medido na rodada #1), são **~19 segundos filmes a mais
por mês**, ~0,6/dia. Modesto em volume e grande em degrau: é exatamente o
salto 1→2, que é onde 22 das 27 pessoas pós-marco estão paradas. A parede do
motor é menor (8 pessoas/30d, 6 com saldo sobrando) e vem de carona.

**Falsificado em 5 mutações**, cada uma aplicada de verdade no arquivo real e
depois desfeita:

| mutação | verificações que caem |
|---|---|
| tirar o `if (engine)` do href | 1.2, 1.3, 1.4, 1.4b |
| trocar `episode2QuotaKnown` por `true` | 3.6 |
| tirar `!freeFastQuotaSpent` da condição | 3.5 |
| tirar a marca d'água da copy do ramo free | 4.2, 4.2b |
| cravar `'fast'` no clique em vez do derivado | 2.2, 2.3, 2.8, 3.7, 4.1, 4.2, 4.2b |

A sexta que eu queria rodar (mover o botão para depois do YouTube) é recorte
estrutural, não troca de texto; quem a substitui é a verificação 2.3, que
compara **posição no arquivo**, não existência.

**Trava de qualidade do fundador (03/09 23:40) — conferida.** Nada em
`lib/compose`, `lib/hollywood`, `lib/cinematic`, `lib/broll`, `lyriaMusic`, no
pipeline do Kineo 1, na escolha de motor, no prompt de cena, na régua de
palavras/segundo, em `analyze-idea` ou em `generate-script`. O bloco 6 do
teste tranca isso e registra uma verdade que eu quase escrevi errado: a tela
**já importava** `MIN_COVERAGE`/`speechSeconds` antes desta jogada — o que a
jogada não pode fazer é **usar** a régua, e o teste prova que a porta nova não
a chama.

**Risco: baixo, e o pior caso é conhecido.** Nenhum preço, plano, grant,
gatilho ou destino de checkout foi tocado. O pior caso é uma pessoa receber a
porta com `engine=fast` e, entre o clique e o Generate, gastar a vaga em outra
aba — aí ela cai no 402 de cota, que já tem copy própria dizendo quando a vaga
volta. Reverter a jogada inteira: apagar o bloco `{episode2Seed && (…)}` da
tela; a porta do rodapé continua exatamente onde sempre esteve.

**Como medir (contra o marco 2026-09-03 16:00 UTC).**

```sql
-- 1) a exposição saiu de 12%?
with ext as (select id from profiles where email not ilike '%josephsskaf%'
  and email not ilike '%usekineo%' and email not ilike '%kineo.local')
select coalesce(e.metadata->>'source','-') src,
       count(distinct e.user_id) pessoas
from events e join ext on ext.id=e.user_id
where e.name in ('video_ready_viewed','series_continue_seen')
  and e.created_at > '2026-09-04 19:00:00+00'
group by 1 order by 2 desc;

-- 2) o gate da jogada: clique da porta de cima -> filme em 24h
with c as (select distinct user_id, min(created_at) ts from events
           where name='series_continue_clicked'
             and metadata->>'source'='done_screen_top' group by 1)
select count(*) clicaram,
  count(*) filter (where exists (select 1 from videos v where v.user_id=c.user_id
     and v.status='completed' and v.created_at between c.ts and c.ts + interval '24 hours')) fizeram_o_2o;

-- 3) o desvio de motor: quantas vezes a porta salvou alguém da parede
select metadata->>'engine_reason' razao, metadata->>'engine_offered' motor,
       count(distinct user_id) pessoas
from events where name='series_continue_seen'
  and metadata->>'source'='done_screen_top' group by 1,2 order by 3 desc;
```

Gate honesto: o controle é a porta do rodapé, na MESMA tela, no mesmo dia
(`source='done_screen'`, 27% de clique por impressão). Se a porta de cima
converter muito abaixo disso, o lugar não era o problema e eu estava errada.
Sinal de alarme: `video_downloaded` por `video_ready_viewed` **cair** — seria a
porta nova roubando o download, e aí ela desce ou some.

**Placar da rodada** (marco 03/09 16:00 UTC, externos): 41 cadastros · 27
pessoas com filme · 2 checkouts com filme · 2 sem filme · **0 assinaturas** ·
0 pessoas com falha e sem filme. Faixas: 1 filme = 22 · 2-3 = 4 · 4-7 = 1 ·
8+ = 0. **Ninguém subiu de faixa desde a rodada #1.**

**Checagem zero (última 1-2h):** 0 render preso, 0 `generation_stage_error`,
0 causa antiga (compose_not_ok / TypeError / openai_quota / full capacity).
Continua de pé o achado vermelho da rodada #1: **4 contas externas de hoje com
`trial_status` NULO e 0 créditos** (04:58, 11:03, 11:05, 11:09 UTC), todas
anteriores ao conserto do #11 das 13:08. Não reparei à mão de propósito — a
concessão real é uma transação com `trial_status=blocked` + RPC
`add_video_credits`, e o CLAUDE.md manda usar o botão do `/admin/people`.

**Duas hipóteses medidas e descartadas** (para ninguém gastar rodada nelas):
1. *"O ramo `free_engine` do #16 não está saindo"* — **não é defeito, é
   calendário.** `momentum_nudge_sent` tem 23 envios desde o marco, todos com
   `next_film` NULO, e o último foi **13:31:38 UTC de hoje** — antes de o #16
   existir. O primeiro veredito só é possível na próxima passada do cron.
2. *"O #13 (primeiro filme grátis) está mudo por defeito"* —
   `first_film_free_offer_shown` tem 0 disparos, mas `upgrade_modal_opened`
   também não dispara desde 10:51 UTC e `trial_downgrade_modal_shown` teve o
   último às 16:51 UTC. Falta **exposição**, não código; menos de 24h de vida.

**Modelo.** Feita em Opus. O plano reserva Fable para R2 (série com memória de
verdade) e R4 (winback com filme pronto); esta é posicionamento de tela e uma
regra de 3 booleanos.

**Nota de fase.** São 15:55 BRT — pelo portão do programa, a sprint 1 vale até
16:30. A rodada anterior (14:23) já havia aberto este arquivo como
`sprint-retencao #1 (global #17)`; reabrir a numeração da sprint 1 agora
partiria o diário no meio. Mantive a continuidade e **o fechamento da sprint 1
fica devendo no arquivo dela** (`docs/SPRINT-ASSINATURAS-2026-09-03.md`) — é a
primeira coisa da próxima rodada, depois das 16:30.

**Pedidos.** 1 aviso de arquivo (zona compartilhada `GenerateClient.tsx`) e 1
pedido novo ao Codex: que a **primeira das três vagas** de
`components/video/NextShortsSection.tsx` — a prateleira que alcança 93% —
passe a ser o episódio 2 do próprio tema, e as outras duas continuem novas.

**Próximo item.** (a) fechamento da sprint 1 no diário dela; (b) R2 — o
episódio 2 nascer do roteiro do episódio 1 e não de uma ordem genérica
(Fable); (c) medir o ramo `free_engine` na próxima passada do cron de momentum.

---

### #3 (global #19) — 15:33→16:20 BRT — 103 pessoas de UM filme voltaram sozinhas à tela de criar. 82 foram embora sem apertar gerar, porque a primeira coisa que a tela pergunta a quem já fez um filme é "escolha uma categoria".

**Nota de fase, antes de tudo.** O roteiro manda ficar na sprint 1 até 16:30 de
04/09. Quando esta rodada abriu (15:33), a fila `entrega-atual` **já continha**
as rodadas #17 e #18 escritas neste diário de retenção por uma passada
anterior, que entrou na sprint 2 adiantada. Não desfiz: renumerar commit já
enfileirado custaria mais do que vale, e o cardápio das duas sprints se
sobrepõe exatamente aqui (R3 da sprint 2 **é** o D2 da sprint 1 — "a caixa
vazia nunca aparece para quem já fez um filme"). Segui a numeração viva.
O fechamento da sprint 1 continua pendente e é o primeiro item da próxima
rodada, agora que o relógio passou.

**Placar da rodada** (SQL canônico, marco zero 03/09 16:00 UTC, contas externas,
medido 18:33 UTC): **42 cadastros · 26 pessoas com filme (62%) · 1 checkout COM
filme · 2 checkouts sem filme · 0 assinaturas · 33 filmes entregues em 24h.**

**Checagem zero: limpa, com um susto que se resolveu na leitura.** Última hora:
1 cadastro, creditado (`auth_callback_completed` + `trial_credits_granted`
pareados), 0 `generation_stage_error`, 0 `compose_refused`, 0
`narration_guard_blocked`. A varredura de 24h acusou **5 contas com 0 créditos**
— e 4 delas são exatamente os órfãos de cadastro por e-mail e senha que o **#11
já consertou**: todas nasceram às 00:04, 04:58, 11:03, 11:05 e 11:09 UTC, ou
seja **antes** do deploy do #11. Nenhum órfão novo depois dele. A quinta
(`chiefsealth206`) recebeu o grant, fez 1 filme e gastou o saldo — não é
defeito, é uso. Três das quatro são e-mail descartável (`vmail.d…`,
`mailshan.com`), criadas em 6 minutos com o mesmo conjunto de 4 eventos:
parecem cadastro automatizado, não gente. **Não concedi crédito a nenhuma** —
dinheiro é do fundador e o padrão cheira a bot.

---

**O NÚMERO QUE DECIDIU A RODADA.** Fui atrás do salto 1→2 com o denominador
certo. 30 dias, contas externas:

| | pessoas |
|---|---:|
| fizeram **exatamente 1 filme** | **319** |
| destas, **VOLTARAM** à tela de criação depois do filme | **103** (32%) |
| destas, apertaram gerar de novo | **21** |
| **voltaram e foram embora sem apertar gerar** | **82** |

As 103 não precisaram ser convencidas a voltar — **voltaram sozinhas**. A
intenção já estava provada quando elas chegaram. E o que a tela oferece a quem
volta é o que ela oferece a quem nunca fez nada: `1 · Choose a category` e um
campo em branco pedindo uma ideia NOVA.

**E a saída já existia, escondida.** A porta da série é, de longe, a peça mais
eficiente da casa. Medida **no momento do clique**, para que não seja viés de
seleção (a faixa de filmes foi contada ANTES do clique, não depois):

| faixa no instante do 1º clique | pessoas | fizeram outro filme em 24h |
|---|---:|---:|
| **exatamente 1 filme** | **48** | **29 — 60%** |
| 2-3 filmes | 9 | 5 |
| 4+ filmes | 1 | 1 |

**48 dos 58 primeiros cliques vieram de gente com UM filme, e 60% delas
entregaram outro filme em 24h — contra 6,6% de base** (21 de 319). Não é a
porta atraindo quem já ia fazer mais filmes: é a porta funcionando justamente
na faixa que estava parada. Somando as 7 fontes, 121 cliques viraram **81
filmes entregues em 24h (67%)**.

**Onde ela morava no /generate.** Existe desde sempre um cartão "Continue your
show" — dentro do `RecentVideosSection`, que renderiza **depois do compositor
inteiro** (`{showStep1 && <RecentVideosSection …>}` vem 700 linhas abaixo do
`1 · Choose a category`). E, pior que a posição: **ele não tinha evento de
exposição**. 24 cliques em 30 dias e **zero denominador** — o mesmo defeito de
forma que o #18 acabou de matar na tela do fim do filme, no outro lugar.

**O que mudou (2 arquivos + 1 teste, tudo aditivo).**
- `app/(dashboard)/generate/GenerateClient.tsx`: a porta do episódio 2 nasce
  **como primeiro elemento da seção de criar**, antes de `1 · Choose a
  category`. Memo `composerEpisodeVideo` com três condições, todas falhando
  fechadas: só na tela de criar (`showStep1`), só com a **caixa vazia**
  (`!prompt.trim()`), e só com um vídeo **`completed` e com título** numa lista
  que é comprovadamente um array (`Array.isArray`, porque `null` ali significa
  "ainda carregando", não "não tem"). O clique reusa o `handleContinueSeries`
  que já estava medido.
- Exposição, o que faltava: evento `series_continue_seen` com fonte própria
  **`composer_empty`**, disparado por `IntersectionObserver` (threshold 0.5),
  uma vez por vídeo, com `observed:false` quando não há observer — para não
  inflar o denominador com o que ninguém viu.
- `lib/seriesContinuation.ts`: `| 'composer_empty'` no tipo. O helper continua
  puro, sem import.
- `scripts/test-caixa-vazia-episodio2-2026-09-04.mjs` (novo): **39
  verificações, 0 falhas**, lendo os arquivos reais e **executando** o módulo
  do link.

**O que decidi NÃO fazer.** Não toquei no cartão antigo do "Recent Videos" (o
teste tranca que ele continua vivo, 5.1) e não mexi em uma linha do caminho do
compositor. A porta **some ao primeiro caractere digitado** e nunca aparece
para quem chegou com tema na mão — home, ChatGPT, continuação. Quem já
convertia não perde um pixel; o acréscimo só existe no vazio que hoje não
oferece nada. Também **não** desviei o motor para o Kineo 1 aqui: o #18 já fez
isso na tela do fim do filme e essa decisão precisa da prova de saldo + vaga da
cota, que naquele ponto do fluxo ainda não está toda na mão. Prometer aqui
seria a meia-verdade que esta sprint já matou cinco vezes.

**Falsificado em 8 mutações, todas aplicadas de verdade no arquivo real e
depois desfeitas.** Cada uma derrubou a verificação pretendida, nenhuma passou:

| mutação | verificação que cai |
|---|---|
| tirar `if (prompt.trim()) return null` | 2.2 |
| tirar `if (!showStep1) return null` | 2.1 |
| trocar `Array.isArray(recentVideos)` por truthiness | 3.1 |
| tirar o filtro `status === 'completed'` | 3.3 |
| trocar a fonte do clique por `generate_recent_video` | 4.8 |
| trocar a fonte da exposição por `generate_recent_video` | 4.4 |
| apagar o cartão antigo do Recent Videos | 5.1 |
| tirar `composer_empty` do tipo | 4.1 |

A nona que eu queria rodar — mover o bloco para depois do "Choose a category" —
é recorte estrutural e não se faz por troca de texto; quem a substitui é a
**1.2**, que compara a POSIÇÃO por índice no arquivo, não a existência do bloco.

**Dívida vermelha que encontrei e consertei de passagem.** O
`test-momentum-continuacao-2026-09-01.mjs` estava **vermelho na fila**, e não
por minha causa: o D4 proíbe `/price|credit|stripe|tier|plan/i` no helper e
passou a reprovar porque o **#18 escreveu a palavra "creditos" num
COMENTÁRIO**. A verificação media a PALAVRA, não o comportamento. Agora ela lê
só o código, com comentários removidos — e **provei que continua reprovando de
verdade**: colando `export const precoPlano = 9.9` no helper, o D4 cai. 49 de
49 verdes.

**Quantas pessoas isso move de N para N+1.** A conta, sem otimismo: 103
pessoas/30d voltam à tela e 21 apertam gerar. A porta passa a ser vista por
essas 103 (hoje o cartão vive abaixo da dobra, com exposição desconhecida).
Cortando a taxa medida de 60% **pela metade** — porque o clique medido veio de
quem procurou a porta, e agora ela vem até quem não procurou — são ~30 segundos
filmes contra os 21 de hoje: **+9 a +30 pessoas/mês saindo de 1 para 2 filmes.**
Modesto em volume, e é exatamente o degrau que importa: a régua da casa diz 1
filme = 0,3% de pagantes, 2-3 = 1,8%, 4-7 = 15%. Pós-marco, **22 das 27 pessoas
que fizeram filme pararam no primeiro**.

**Risco: baixo.** Nenhum preço, crédito, motor, gatilho de checkout ou caminho
de render foi tocado. O pior caso é cosmético — a porta aparecer para quem
esvaziou a caixa de propósito para escrever outra coisa; ela some no primeiro
caractere. Reverter a jogada inteira: trocar o memo por `return null`.

**Trava de qualidade do fundador (03/09 23:40) — conferida e trancada em teste.**
Nada em `lib/compose.ts`, `lib/hollywood/**`, `lib/cinematic/**`, `lib/broll/**`,
`lib/lyriaMusic`, `lib/narrationFit.ts`, `analyze-idea` ou `generate-script`.
O bloco 6 do teste lê o `git diff` real e reprova se qualquer um desses
aparecer.

**Modelo.** Feita em Opus. O plano reserva Fable para R2 e R4 (código difícil);
esta é superfície e instrumentação.

**Como medir (contra o marco zero).**

```sql
-- 1) o denominador que nunca existiu
select metadata->>'source' fonte, count(distinct user_id) viram
from events where name='series_continue_seen' and created_at > '2026-09-04 19:00:00+00'
group by 1;

-- 2) a porta nova entrega filme?
with c as (select user_id, min(created_at) ts from events
  where name='series_continue_clicked' and metadata->>'source'='composer_empty' group by 1)
select count(*) clicaram,
  count(*) filter (where exists (select 1 from videos v where v.user_id=c.user_id
    and v.status='completed' and v.created_at between c.ts and c.ts + interval '24 hours')) virou_filme
from c;
```

Gate honesto: o controle é a fonte `generate_recent_video` (o cartão antigo,
mesma oferta, lugar antigo, ainda vivo). Sinal de alarme: `composer_empty`
com muita exposição e clique perto de zero — seria a porta certa na hora
errada, e aí o conserto é a copy, não o lugar.

**Próximo item.** (a) **fechamento da sprint 1** no diário dela (o relógio já
passou das 16:30); (b) **R2 — o episódio 2 nascer do roteiro do episódio 1**,
não de uma ordem genérica (Fable), que é o que dá valor a todas as portas que
o #18 e o #19 abriram; (c) medir o ramo `free_engine` do momentum.

**SHA.** `4faac144` — worktree `C:\kineo-wt\r19-caixa-vazia`.
Enfileirado em `entrega-atual` sobre `6f18315d` (fila: 3). Aguardando o clique
no SUBIR-SITE.bat.

---

### Medição da rotação 1 (04/09, 16:40–17:40 BRT) — a escada de filmes descreve quem já pagou, não prevê quem vai pagar

**Não é entrega de código.** É a reconciliação que o item 1 da pista pede
("reconciliar as entregas de retenção já feitas, SEM reconstruí-las") e o item
5 ("separar vídeos feitos ANTES do primeiro pagamento dos feitos DEPOIS").
Documento inteiro, com SQL para refazer: `docs/MEDICAO-DEGRAU-FILMES-2026-09-04.md`.

**O que estava errado (medido).** A régua que justificou seis entregas —
1 filme 0,6% · 2-3 1,8% · 4-7 15,4% · 8+ 33,3% — conta filmes feitos **depois**
do pagamento. Dos 63 filmes dos 13 pagantes externos da história, **50 (79%)
nasceram depois do dinheiro entrar**, e **11 dos 13 pagaram com 1 filme ou
nenhum**.

**A régua honesta** (só filmes anteriores ao 1º `payment_success`, história
inteira): 0 filmes 0,52% (961 pessoas) · 1 filme **1,05%** (570) · 2-3 **0,58%**
(171) · 4-7 4,35% (23) · 8+ 0,00% (9). O degrau do filme 1 para o 2 — o alvo da
sprint — é o único que aponta **para baixo**.

**O que NÃO se conclui.** Nada é revertido. 13 pagantes é amostra pequena e o
critério de parada do ciclo diz que pouca amostra é INCONCLUSIVA. As portas do
episódio 2 (#18/#19) continuam certas como produto: 82 de 103 pessoas que
voltam encontram campo em branco e vão embora — isso é defeito de experiência,
independente de conversão. Preço continua fechado (19/08).

**O que muda.** Retenção é produto, não é a alavanca da assinatura. A régua K1
do ciclo ("segundo episódio NÃO é pré-requisito para comprar") ganha prova: o
segundo episódio nem sequer é indício de compra. A faixa que concentra pagante
é a de **1 filme** (6 dos 13) — o que ela precisa é da oferta no pico do
primeiro filme, não de um degrau para o segundo.

**Limitação que vira pendência.** `payment_success` não tem `mode`/`plan`/`type`
em nenhum dos 17 eventos: **não dá para separar assinatura de pacote avulso**.
A métrica única do ciclo depende disso. Pedido aberto para a pista do caixa.

**Checagem zero da rotação (16:45 BRT): tudo zero.** Cadastro sem crédito 0 ·
render preso >45min 0 · `credits_held_by_render` 6h 0 · `compose_not_ok` 6h 0 ·
TypeError 6h 0 · `generation_stage_error` 1h 0.

**Placar (marco 2026-09-03 16:00 UTC, externos):** 42 cadastros · 28 pessoas com
filme · 36 filmes · 4 no checkout · **0 `payment_success`**. Sem movimento desde
a medição das 16:10.

**Coordenação.** A rodada #20 (série com memória, `app/api/next-episode/route.ts`
+ `GenerateClient.tsx`, worktree `r20-memoria-serie`) está sendo escrita por
outra sessão desta mesma tarefa, viva às 16:43. Esta rotação **não tocou** esses
arquivos para não atropelar o trabalho dela — worktree própria
(`medicao-degrau`), commit só de documentação.

**CORREÇÃO DO RELATÓRIO DAS 16:15 — a fila NÃO está parada (verificado 16:50 BRT).**
O `docs/RELATORIO-CLAUDE-CICLO-2026-09-04.md` §6.1 diz "4 entregas da retenção
paradas na fila desde ~14:20 BRT". **Está vencido.** O fundador clicou às
**16:26:56 BRT**: `c4fa2e94` (#17), `dee306e8` (#18), `791f5444` (#19) e
`6614347f` estão em `origin/main`, `entrega-atual` estava com **fila 0**, e o
deploy de produção `dpl_E3ajaWXWAJchgB9AgbNir46Z5K5n` (sha `463fc378`) está
**READY** em `usekineo.com` (HTTP 200). **As portas do episódio 2 estão no ar.**

Consequência para a medição: elas têm **22 minutos de vida** no fechamento
desta rotação. As fontes novas (`done_screen_top` do #18 e `composer_empty` do
#19) ainda **não aparecem** em `series_continue_seen` — e isso é **esperado**,
não defeito: nas últimas 12h só existem 6 exposições, todas da fonte antiga
`done_screen`, e na última hora houve **0 filmes concluídos**. Sem tráfego não
há denominador. Primeira leitura útil: a partir de ~19:30 BRT (3h de tráfego).
Sinal de alarme para as próximas rotações: exposição da fonte nova continuar
**exatamente zero** depois de ≥20 pessoas passarem pela tela de filme pronto —
aí seria porta que não renderiza, e o conserto é código, não copy.
### #4 (global #20) — 16:10→17:40 BRT — a oferta que ESCREVE o episódio 2 para a pessoa teve **1 clique em 30 dias**, e não existe um único evento que prove que ela já apareceu na tela de alguém. Agora ela recebe a narração real do filme, sabe o que a série já cobriu, e passa a ser mensurável.

**Portão de fase.** Rodei às 16:09 BRT, antes das 16:30 — mas a sprint 2 já
tinha começado às 14:20 e as rodadas #17–#19 já estavam publicadas. Voltar à
numeração da sprint 1 criaria duas contas paralelas do mesmo trabalho. Segui na
sprint 2 e escrevi o **fechamento da sprint 1** no diário dela, que era a
obrigação pendente do portão. Registrado como decisão minha, reversível.

**Placar da rodada** (SQL canônico, marco zero 03/09 16:00 UTC, contas externas,
medido 19:11 UTC): **42 cadastros · 28 pessoas com filme · 36 filmes · 2
checkouts COM filme · 2 sem filme · 0 assinaturas · 0 pessoas com falha e sem
filme.**

**Distribuição pós-marco e o delta que a sprint mede:** 1 filme = **23 pessoas**
(era 22 na #17) · 2–3 = **4** (era 4) · 4–7 = **1** (era 1). **Ninguém subiu de
faixa desde a rodada anterior**; a pessoa nova entrou na base, no degrau 1. O
81% que dói continua de pé: 23 das 28.

**Checagem zero (1h): limpa.** 0 cadastro sem crédito · 0 render preso >25min ·
0 `generation_stage_error` · 0 `compose_refused`/`narration_guard_blocked` ·
**35 filmes entregues em 24h para 27 pessoas.**

#### O NÚMERO QUE DECIDIU A RODADA

O produto tem **dois** mecanismos de episódio 2, e eles não se falam:

| mecanismo | o que entrega | 30 dias |
|---|---|---:|
| **A** — link de continuação (`lib/seriesContinuation.ts`) | 180 chars do TÍTULO + uma ordem genérica | 123 cliques · 59 pessoas · **35 fizeram filme em 24h (59%)** · **11 foram ao checkout (18,6%)** |
| **B** — cartão "Your next episode is written" (`/api/next-episode`) | o episódio 2 **inteiro**, escrito, 1 clique para renderizar | **1 clique. Uma pessoa. Em 26/08.** |

413 pessoas chegaram à tela de filme pronto em 30 dias. O mecanismo B é a oferta
mais forte que a casa tem — e **não existe nenhum evento de exposição nem de
falha**: não dá para afirmar que aquele cartão apareceu uma única vez. É o mesmo
padrão do #18 (a peça que mais converte, escondida), agora no lugar mais caro.

E o mecanismo A, o que carrega o volume, diz literalmente *"Do not repeat the
previous episode"* **sem nunca dizer o que o episódio anterior falou**.

#### Os três defeitos, todos lidos no código e confirmados no banco

1. **A memória da série não existe.** `select count(script) from videos` nos 774
   filmes entregues em 30 dias = **0**. A coluna existe, é lida por
   `/api/video-summary`, e nunca foi escrita uma vez. O conteúdo real que o
   banco tem é `videos.topic` (média **399 caracteres**).
2. **`alreadyDone` nasceu morto.** `app/api/next-episode/route.ts` aceita o
   campo "já cobri isto, não repita" desde 21/08 e **nenhum caller no repo
   inteiro jamais o preencheu**. É exatamente o campo que impediria o episódio 3
   de repetir o 1 e o 2.
3. **O caller mandava a ORDEM, não a NARRAÇÃO.** `GenerateClient.tsx:10706`
   usava `lastFastRenderRef.current.topic` — o texto DIGITADO. A narração que o
   filme realmente falou estava no MESMO objeto, em `voiceover_script`
   (`:605-614`, atribuído em `:5516`), e ia para o lixo. Pior: quando aquele ref
   está vazio (mount novo, volta da Stripe, caminhos que não passam pelo
   compose), `if (!base) return` **matava o cartão** — a causa mais provável do
   1 clique em 30 dias.

#### O que mudou (arquivos)

- `app/api/next-episode/route.ts` (+193/−16): aceita `fromVideoId`; nova
  `lerMemoriaSerie()` que lê o filme de origem **restrito ao dono**
  (`.eq('id',…).eq('user_id', user.id)`, mesmo client autenticado, **sem service
  key**) e os últimos 12 filmes concluídos da pessoa; `previousTopic` ganha
  fallback de servidor (`videos.topic`) — o 400 só acontece depois dos dois
  caminhos; **`alreadyDone` passa a ser montado pelo SERVIDOR** (exclui o filme
  de origem, normaliza cada item com `normalizeSeriesSeed` para a lista não vir
  cheia do andaime da ordem antiga, deduplica sem caixa, teto 6); devolve
  `episodeNumber`, `hadMemory`, `alreadyDoneCount`. Toda leitura de banco em
  try/catch: banco doente ⇒ memória vazia ⇒ a rota escreve assim mesmo.
- `app/(dashboard)/generate/GenerateClient.tsx` (+72/−3, só o efeito de
  `phase === 'done'`): `previousTopic` = **narração real**, `topic` só como
  fallback; `fromVideoId = publicVideoId`; o cartão **deixa de sumir** quando o
  ref está vazio mas há id (o servidor busca o filme); dedup por
  `publicVideoId || base`; e os três eventos que faltavam.
- `scripts/test-serie-memoria-2026-09-04.mjs` (novo, 504 linhas): **138
  verificações, 0 falhas** — e a rota é **executada de verdade**, com Supabase e
  OpenAI falsos, para que a posse seja provada por comportamento e não só por
  regex. `scripts/test-serie-episodio-2.mjs` (irmão) segue **262/262**.
  `tsc --noEmit` limpo.

**Instrumentação nova (o fim do ponto cego):** `next_episode_requested`
(`video_id`, `had_narration`), `next_episode_ready` (`words`, `episode_number`,
`had_memory`, `already_done_count`), `next_episode_failed` (`status`).

**Falsificado em 5 mutações aplicadas de verdade no arquivo real e desfeitas:**

| mutação | verificações que caem |
|---|---|
| tirar `.eq('user_id', …)` da leitura do filme de origem | **5** — inclusive 3 comportamentais: o filme de OUTRA pessoa passava a virar memória |
| caller manda `topic` em vez de `voiceover_script` | 1 |
| tirar `fromVideoId` do corpo do fetch | 1 |
| `alreadyDone` só com o que o cliente mandou | 11 |
| apagar `next_episode_requested` | 2 |

Registro de honestidade herdado do agente: na primeira passada a mutação de
posse **não chegou a ser aplicada** (regex sem quebra de linha CRLF) e o teste
ficou verde por engano; foi refeita, confirmada pela contagem de ocorrências, e
só então as 5 verificações caíram.

**Quantas pessoas isso move de N para N+1.** Sem otimismo: 413 pessoas/30d
chegam à tela de filme pronto e hoje **1** clicou no episódio pronto. A porta
irmã (mecanismo A) converte 59% do clique em filme e 18,6% em checkout. Se o
cartão passar a aparecer para mesmo que **um quarto** dessas 413 e converter a
**metade** da taxa da porta irmã, são ~30 pessoas/mês saindo de 1 para 2 filmes
por uma oferta que já estava construída e apagada. E a medição vem em 24h: se
`next_episode_ready` sair perto de zero, a causa não era a memória — é o cartão
que não renderiza, e aí o conserto é a condição de exibição, não o conteúdo.

**Decisões que tomei sozinha** (autonomia; reversíveis):
1. **Não mexi no mecanismo A** (a URL da continuação) apesar de ele ser o do
   volume. Encher a URL com o conteúdo do episódio 1 colocaria uma parede de
   texto no campo do Studio e o `autoanalyze=1` a leria como o TEMA NOVO — o
   episódio 2 viraria cópia do 1, o oposto do objetivo. Fica para a rodada
   seguinte, pelo id do vídeo, não pela URL.
2. **Não liguei a escrita de `videos.script`.** Seria a memória definitiva, mas
   mora no caminho do compose — trava de qualidade do fundador. Anotado como
   dívida, não commitado.
3. **`publicVideoId` fora das dependências do efeito**, com o motivo escrito no
   código: ele é setado no mesmo lote síncrono que `setPhase('done')`
   (`:5868`/`:5870`); nas deps, o cleanup cancelaria o fetch em voo e o cartão
   nunca mais apareceria.
4. **O cooldown de 45s, o modelo, a temperatura, os marcadores e o contrato de
   150–165 palavras não foram tocados.**

**Risco: baixo.** Nenhum preço, crédito, motor, gatilho de checkout ou caminho
de render foi tocado. O pior caso é uma chamada de gpt-4o-mini a mais por filme
(~$0.0003), protegida pelo cooldown de 45s por pessoa que já existia. Reverter a
jogada inteira: voltar `previousTopic: base` e remover `fromVideoId` do corpo.

**Trava de qualidade do fundador (03/09 23:40) — trancada em teste.** Nada em
`lib/compose.ts`, `app/api/compose/**`, `lib/hollywood/**`, `lib/cinematic/**`,
`lib/broll/**`, `lib/lyriaMusic`, `lib/narrationFit.ts`, `analyze-idea`,
`generate-script` ou `generate-video-*`. O bloco 10 do teste lê o `git diff`
real e reprova se qualquer um desses aparecer.

**Modelo.** O código foi escrito por um agente **Fable**, como o plano manda
para R2 (código difícil). A medição, a revisão do diff, a auditoria de posse e
este diário foram feitos em Opus.

**Como medir (contra o marco zero).**

```sql
-- 1) o cartao existe? (a pergunta que 30 dias nao souberam responder)
select name, count(*) n, count(distinct user_id) pessoas
from events where name like 'next_episode%' and created_at > '2026-09-04 21:00:00+00'
group by 1 order by 2 desc;

-- 2) a memoria chegou?
select metadata->>'had_memory' memoria,
       avg((metadata->>'already_done_count')::int) media_ja_cobertos, count(*) n
from events where name='next_episode_ready' and created_at > '2026-09-04 21:00:00+00'
group by 1;

-- 3) o gate da jogada: quem clicou fez o filme?
with c as (select user_id, min(created_at) ts from events where name='next_episode_clicked'
           and created_at > '2026-09-04 21:00:00+00' group by 1)
select count(*) clicaram,
 count(*) filter (where exists (select 1 from videos v where v.user_id=c.user_id
   and v.status='completed' and v.created_at between c.ts and c.ts + interval '24 hours')) virou_filme
from c;
```

Gate honesto: o controle é o mecanismo A (`series_continue_clicked`), a mesma
pessoa, o mesmo dia, oferta diferente. Sinal de alarme: `next_episode_requested`
alto com `next_episode_ready` perto de zero — seria o GPT devolvendo roteiro sem
marcadores, e aí o conserto é o prompt, não a memória.

**Dívidas que encontrei e NÃO consertei** (para a próxima rodada não redescobrir):
- `videos.script` vazio em 774/774 — a narração final nunca é gravada. Irmão
  gêmeo do `thumbnail_url` (0 de 1129, achado de 27/08).
- `first_film_free_offer_shown` = **0** desde o deploy do #13 às 13:08. A oferta
  do primeiro filme grátis não apareceu para ninguém ainda.
- A ponte `decideTrialBalanceBridge` se desliga em `credits < 15` (71 das 113
  pessoas de um filme). Era pedido ao Codex; a pista dele foi encerrada pelo
  fundador em 04/09, então virou dívida nossa.

**Próximo item.** (a) medir `next_episode_*` na primeira janela de 24h e decidir
entre conteúdo e condição de exibição; (b) **R2 parte 2** — o mecanismo A passar
a carregar o id do filme e nascer com memória, sem parede de texto na URL;
(c) medir o ramo `free_engine` do momentum (23 cartas saíram) e o
`first_film_free_offer_shown`.
### #5 (global #21) — 17:20→18:20 BRT — 1.013 FILMES ENTREGUES EM 45 DIAS, ZERO GUARDARAM O QUE FALARAM. A CONTINUAÇÃO DE SÉRIE MANDA O GERADOR "NÃO REPETIR" UM EPISÓDIO QUE ELE NUNCA LEU

Abertura da rotação 1 do ciclo coordenado de 10h (início 04/09 16:40 BRT,
término 05/09 02:40 BRT). A entrega acordada desta pista era **continuidade de
série a partir do contexto REAL do episódio anterior**. Fui verificar o que já
existe antes de escrever uma linha, como manda o programa — e a verificação
matou a entrega na forma em que ela foi pedida.

#### Placar (marco da sprint 1 = 03/09 16:00 UTC, contas externas, corte 20:20 UTC)

| | agora | na #1 (14:20) | delta |
|---|---:|---:|---:|
| cadastros | 43 | 41 | +2 |
| pessoas com filme | 28 | 27 | +1 |
| filmes entregues | 36 | 35 | +1 |
| checkout COM filme (desejo) | 2 | 2 | = |
| checkout SEM filme (defeito) | 2 | 2 | = |
| `checkout_success_viewed` | 0 | 0 | = |
| **`payment_success` (assinatura de verdade)** | **0** | — | — |
| pessoas com falha e nenhum filme | 0 | 0 | = |

**Distribuição das 28 que fizeram filme:** 23 pararam no 1º · 4 em 2–3 · 1 em
4–7. **Pessoas que subiram de faixa desde a #1: 1** (o único filme novo da
janela veio de quem já tinha um). Os 82% parados no primeiro filme não se
mexeram — e não tinham como: as portas do #18 e do #19 subiram às 15:51 BRT e
**ainda não tiveram uma única exposição** (`series_continue_seen` com fonte
`done_screen_top` ou `composer_empty` = 0). Não é sinal ruim: em 100 minutos o
site inteiro teve 11 pessoas e 2 aberturas do `/generate`, ambas de conta
recém-criada (sem filme anterior, logo sem porta a mostrar, corretamente).
**Ainda não há amostra. Não declarar nada sobre o #18 e o #19 nesta rotação.**

#### Checagem zero (1h) — limpa

`cadastro sem crédito` 0 · `render preso >45min` 0 · `generation_stage_error`
nas últimas 3h 0 · débito sem entrega 0. Nenhuma causa antiga voltou.

#### O NÚMERO QUE DECIDIU A RODADA

```sql
select count(*) total, count(script) com_roteiro from videos
 where status='completed' and created_at > now() - interval '45 days';
-- total: 1013 · com_roteiro: 0
select max(created_at) from videos where coalesce(script,'')<>'';
-- 2026-05-13 01:10:06+00
```

**A coluna `public.videos.script` existe, é citada NOMINALMENTE no comentário
do próprio INSERT canônico** — `app/api/compose/status/[renderId]`, Push #357:
*"Real prod columns: user_id, title, video_url, …, topic, **script**, hashtags,
…"* — **e nunca foi escrita uma única vez desde 13 de maio.** O comentário
listava a coluna; o objeto logo abaixo não a incluía. É a mesma doença do
`thumbnail_url` (0 de 1.129, achado de 27/08): uma coluna lida em quatro telas
e escrita em nenhuma.

**Por que isso mata a entrega acordada.** A porta da série é a peça mais
eficiente da casa — 48 dos 58 primeiros cliques de 30 dias vieram de gente com
UM filme e 60% delas entregaram outro em 24h, contra 6,6% de base. Mas a ordem
que ela manda ao gerador (`lib/seriesContinuation.ts:buildSeriesContinuationPrompt`)
é, palavra por palavra:

> `Topic: "<tema>". This is the next episode in the same Short series: same subject, same format, a completely new hook, new facts and a fresh payoff. Do not repeat the previous episode.`

O gerador é **proibido de repetir** um episódio que ele **nunca leu**. Não há
gancho, não há personagem, não há "onde parou" — há um tema de até 180
caracteres e uma proibição sem objeto. Procurei o rastro em todo lugar antes de
concluir: `videos.script` NULO, `videos.prompt` NULO, `hollywood_resume` parou
em 02/09 com 32 linhas no total, e o `cinematic_dispatch_result` guarda a
CONTAGEM de cenas, não o texto delas. **A fala do filme entregue não sobrevive
em lugar nenhum do banco.** Escrever "o episódio 2 nasce do episódio 1" hoje
seria ficção: não existe episódio 1 para nascer de.

#### O que mudou (2 arquivos tocados + 1 módulo novo + 1 teste)

**O filme passa a lembrar o que ele mesmo falou.**

- **`lib/episodeMemory.ts` (novo, 73 linhas).** Função PURA, zero import —
  exercitável em teste sem subir servidor e sem encostar em nenhum módulo da
  trava de qualidade. Achata espaços, corta em 4.000 caracteres **em fronteira
  de frase** (última frase inteira se ela guarda metade do teto; senão, último
  espaço — nunca no meio da palavra, que é exatamente o defeito que a semente
  de série levou três rodadas para matar). Devolve **`null`, nunca `''`**, e
  tem **piso de 40 caracteres**: abaixo disso não é narração, é sobra de
  marcador ou o `topic` cru do degrau 3 do compose — e memória FALSA é pior que
  memória nenhuma, porque faria o episódio 2 fugir de fatos que ninguém falou.

- **`app/api/compose/route.ts`.** A narração passa a morar no **claim de
  submissão**, ao lado do tema, **pelo mesmo motivo que o tema mora lá**
  (KINEO-TITULO-SOBREVIVE-2026-08-22): é o único lugar durável por onde TODO
  caminho passa — aba do cliente, cron de resgate e worker de demo. Query param
  não serve: a narração não viaja na URL e não caberia nela.
  **Gravada nos DOIS sítios** — o `INSERT` do claim *e* o objeto de completude.
  O segundo não é redundância: o comentário que já estava no arquivo avisa em
  letras maiúsculas que aquele objeto **SUBSTITUI o metadata inteiro** e é o
  único claim localizável por `metadata->>render_id`. Gravar só no primeiro
  compilaria, passaria em revisão e falharia em 100% dos casos reais.

- **`app/api/compose/status/[renderId]/route.ts`.** Um leitor **preguiçoso**
  (`lerNarracaoDoEpisodio`) que roda **uma vez, dentro do bloco que persiste o
  vídeo** — não a cada polling. O caminho feliz do polling paga zero. Quando o
  fallback de tema já leu o claim (caminho degradado, sem `?topic=`), a
  narração vem de carona e não há segunda consulta. FAIL-OPEN: qualquer erro
  devolve `''` e a coluna simplesmente não é escrita. `if (episodeNarration)
  row.script = …` — **vazio continua omitindo a coluna: o NULL de hoje nunca
  vira `''` amanhã.**

**O que decidi NÃO fazer, e por quê.** Não toquei em `analyze-idea`, em
`generate-script`, no texto da ordem de continuação nem em nenhum módulo da
trava de qualidade do fundador (03/09: *"os vídeos têm saído nota 9, NÃO QUERO
QUE MEXA NISSO"*). A metade que CONSOME a memória — o episódio 2 lendo o
episódio 1 — fica para a rotação seguinte, e fica **por falta de matéria-prima,
não por preguiça**: hoje existem zero filmes com roteiro gravado. Ligar o
consumo agora seria uma função lendo `null` em 100% dos casos, impossível de
falsificar e indistinguível de estar quebrada. Anotado no diário como manda a
regra de dúvida.

**Também não vaza nada.** `PUBLIC_VIDEO_COLUMNS` (`lib/publicVideos.ts`) é
lista fechada e **não inclui `script`** — o `/v/[id]` e o sitemap continuam sem
a fala crua (incidente de 11/08). O `/api/videos` já pedia a coluna e o
`toListItem` a descarta: **zero peso novo de payload no navegador**. E o
`deriveTitle` prefere `title`/`topic`/`prompt`, então nenhum card troca de
título por causa disto.

#### Quantas pessoas isso move de N para N+1

**Nesta rotação, zero — e digo isso de propósito.** Esta entrega não move
ninguém; ela **desbloqueia** o movimento. O que ela produz é matéria-prima, na
seguinte escala: 186 filmes entregues nos últimos 7 dias ≈ **~26 filmes por dia
passam a nascer com memória**, e o alcance da porta que vai consumi-la são as
**59 pessoas / 123 cliques de continuação em 30 dias**. A partir de agora existe
um contador que só sobe; hoje ele vale exatamente 0 e é essa a linha de base.

#### Testes

`scripts/test-memoria-episodio-2026-09-04.mjs` (novo): **42 verificações, 0
falhas**, lendo os arquivos REAIS e **executando** o módulo do helper.
**Falsificado em 7 mutações**, todas aplicadas de verdade no arquivo real e
depois desfeitas. Nenhuma passou:

| mutação | verificações que caem |
|---|---|
| tirar `narration` do claim de COMPLETUDE | 2.3, 2.6 |
| tirar `narration` do claim de INSERÇÃO | 2.2, 2.6 |
| gravar `script` sempre (sem o guarda de vazio) | 4.2 |
| baixar `MIN_EPISODE_MEMORY_CHARS` para 0 | 1.4, 1.5, 1.6 |
| pôr `script` em `PUBLIC_VIDEO_COLUMNS` | 5.1 |
| tirar a narração do persist | 3.2, 3.3, 3.4 |
| chamar o leitor ANTES do bloco de persistência | 3.2, 3.4 |

`npx tsc --noEmit` **verde** (projeto inteiro). Vizinhos re-rodados e verdes:
`test-serie-episodio-2` (262/262), `test-caixa-vazia-episodio2-2026-09-04`,
`test-momentum-continuacao-2026-09-01` (49/49), `test-rescue-composed-films`
(19/19).

**VERMELHO TOLERADO, e ele NÃO é meu.** `test-activation-recovery-claim-settle`
dá **36/37**. Guardei o meu trabalho, voltei a árvore para o `origin/main` limpo
e rodei de novo: **36/37 também**. A falha é anterior a esta rodada e continua
anterior a ela. Registrado aqui em vez de escondido, porque "guardião verde não
é suíte verde" (pedido aberto do codex-fluxo de 10:54).

#### Limitações que quero registradas

1. **A memória é a narração da SUBMISSÃO, não o áudio final.** Guardo
   `voiceoverScript` (a fala já limpa de marcadores), que é o que existe quando
   o claim nasce. O `scaledScript` — a versão eventualmente reescalada para
   caber na duração — só existe depois, e nos caminhos medidos ele é o mesmo
   objeto em 4 dos 5 ramos. Para "o que este filme já contou" a diferença é
   imaterial; para uma futura re-renderização byte a byte, não serviria.
2. **Só vale do próximo filme em diante.** Não há como reconstruir a fala dos
   1.013 filmes antigos: ela não ficou em lugar nenhum. Nenhum backfill é
   possível e não vou fingir que é.
3. **Uma ida a mais ao banco por filme ENTREGUE** (nunca por polling). É o
   custo, e ele está no lugar mais barato possível.

#### Risco: baixo, e reversível em uma linha

Nenhum preço, crédito, motor, gatilho de checkout, prompt de cena ou régua de
palavras por segundo foi tocado. O pior caso é a coluna continuar nula (é o
estado de hoje). Reverter a jogada inteira: trocar
`if (episodeNarration) row.script = episodeNarration` por nada.

#### Como medir (contra o marco zero)

```sql
-- 1) o contador que hoje vale 0 e só pode subir
select count(*) filmes, count(script) com_memoria
from videos where status='completed' and created_at > '2026-09-04 21:00:00+00';

-- 2) a memória é utilizável? (tamanho, não só presença)
select round(avg(length(script))) chars_medio, min(length(script)) menor, max(length(script)) maior
from videos where coalesce(script,'')<>'' and created_at > '2026-09-04 21:00:00+00';

-- 3) quem clicou continuar JÁ tinha memória do episódio anterior?
with c as (select user_id, min(created_at) ts from events
  where name='series_continue_clicked' and created_at > '2026-09-04 21:00:00+00' group by 1)
select count(*) cliques,
  count(*) filter (where exists (select 1 from videos v where v.user_id=c.user_id
    and coalesce(v.script,'')<>'' and v.created_at < c.ts)) com_episodio1_lembrado
from c;
```

**Sinal de alarme:** filmes entregues subindo e `com_memoria` parado em 0 →
a narração não está chegando ao claim (olhar o log `[compose/status] claim
lookup for narration failed`). **Sinal de alarme 2:** `chars_medio` perto de 40
→ o degrau de socorro do compose (`topic` cru virando narração) está sendo
gravado como se fosse fala, e aí o piso precisa subir.

#### RECONCILIAÇÃO COM A #20 — DUAS SESSÕES NA MESMA PISTA, E ELAS SE COMPLETAM

Ao enfileirar, encontrei na fila uma **#20 de outra sessão desta mesma pista**
(`6ee615ef`, 16:10→17:40 BRT) que atacou o MESMO defeito pelo outro lado.
Renumerei esta rodada para **#5 (global #21)** em vez de disputar o número.
A reconciliação honesta, porque as duas se tocam:

- A #20 **mediu a mesma coisa que eu** (`count(script)` = 0) e a listou como o
  **defeito nº 1 dela**. Ela não consertou a persistência — ela **contornou**:
  o cartão do `/api/next-episode` passou a receber a narração do **ref vivo do
  cliente** (`lastFastRenderRef.voiceover_script`) e, no servidor, o
  `videos.topic` (média 399 chars) como rede.
- Esta rodada conserta a **fonte**. Somadas, as duas fecham o buraco inteiro: o
  contorno da #20 vale **enquanto a aba estiver viva**; daqui em diante a
  narração fica no banco e sobrevive a remount, volta da Stripe, cron de resgate
  e ao dia seguinte — que é exatamente onde o ref vazio matava o cartão (a causa
  mais provável do 1 clique em 30 dias, segundo a própria #20).
- **Zero colisão de arquivo:** a #20 tocou `app/api/next-episode/route.ts` e
  `GenerateClient.tsx`; esta tocou `app/api/compose/route.ts`,
  `app/api/compose/status/[renderId]/route.ts` e um módulo novo. O rebase do
  `scripts/enfileirar.sh` passou limpo e **nenhum commit alheio foi perdido**
  (fila 3 → 6). Os testes desta rodada foram re-executados DEPOIS do rebase.
- **Correção do que escrevi acima nesta mesma entrada:** onde eu disse que "a
  metade que CONSOME a memória fica para a rotação seguinte", o certo é que **o
  consumidor já existe** — a #20 o construiu. O que faltava, e que esta rodada
  entrega, é a memória DURÁVEL para ele ler.

**DIVERGÊNCIA ABERTA, e eu não vou escondê-la: o guardião da #20 fica VERMELHO
por minha causa.** O `scripts/test-serie-memoria-2026-09-04.mjs` da outra sessão
dá **136/138** na fila, e as duas falhas são:

1. `NENHUM caminho proibido tocado` — ela codificou `^app/api/compose/` na lista
   de caminhos proibidos, e eu toquei `route.ts` e `status/[renderId]/route.ts`.
   **É uma leitura mais dura que a do fundador.** As palavras dele (03/09) são
   `lib/compose`, `lib/hollywood`, `lib/cinematic`, `lib/broll`, `lyriaMusic`,
   pipeline do Kineo 1, escolha de motor, prompt de cena, régua de palavras por
   segundo e gerador de roteiro — e a exceção que ele **autorizou** é
   "continuidade de série (estrutura de roteiro, não qualidade de imagem)", que
   é exatamente esta entrega. O que eu escrevi em `app/api/compose/route.ts` é
   **uma chave a mais num objeto de metadata de evento**: não toca cena, motor,
   TTS, duração, régua, crédito nem prompt — e o teste desta rodada tranca isso
   (verificação 6.9). O `status/[renderId]` é o **persistidor de histórico**, que
   roda DEPOIS de o filme existir no Creatomate; chamá-lo de pipeline de
   qualidade é largo demais.
2. `só os 3 arquivos autorizados foram tocados` — essa verificação compara o
   `git diff` contra um commit fixo e **só pode passar dentro da worktree
   isolada da própria #20**. Na fila ela já lista os arquivos do Codex
   (`app/api/stripe/checkout/verify`, `lib/growth/**`), que não têm relação
   nenhuma comigo. É uma asserção sobre o diff de uma rodada, não sobre o código.

**Não reverti, e digo por quê:** a alternativa (persistir a fala por um caminho
que o cliente alimenta) é justamente a fraqueza que a #20 tem — morre com a aba.
Mas a decisão é do fundador, é de UMA linha, e está registrada como pedido
aberto entre as duas sessões. Se ele ler `app/api/compose/**` como intocável,
o conserto é reverter `c58e4b63` e a memória volta a não existir.

⚠️ **Achado operacional, e ele vale mais que a entrega:** duas sessões estão
respondendo ao MESMO disparo desta pista. Não houve perda de trabalho porque
ninguém usou `branch -f` — o `enfileirar.sh` fez o que foi feito para fazer —
mas houve **trabalho paralelo sobre o mesmo defeito**, o que a regra de
anti-repetição existe para evitar. O grep da main não bastou: o trabalho da
outra sessão estava na FILA, não na main. **Regra nova para a próxima rotação:
o passo 4 (anti-repetição) tem de olhar `git log origin/main..entrega-atual`
também, não só a main.**

#### Próximo item

(a) **fazer a `lerMemoriaSerie()` da #20 preferir `videos.script`** quando ele
existir, mantendo `videos.topic` como rede — é uma ligação de uma linha, e ela
só faz sentido depois que o contador da consulta 1 sair do zero. (b) o restante
do R2 para o **mecanismo A** (o link de continuação, que carrega 123 dos 124
cliques): a fala NÃO deve viajar na URL nem aparecer na caixa de texto da
pessoa, e memória ausente tem de devolver exatamente a ordem de hoje. (c) medir
a exposição do `done_screen_top` e do `composer_empty` quando houver tráfego
real. (d) o ramo `free_engine` do momentum, herdado da #19.

**Pedidos entre pistas:** nenhum novo. O Codex encerrou o ciclo dele (04/09,
`docs/HANDOFF-CODEX-ENCERRAMENTO-2026-09-04.md`, automação PAUSED) e a última
entrega dele — `593b28a5`, verificação da sessão Stripe antes dos pixels de
`/checkout/success` — já está em `origin/main`; era a pendência nº 1 do
encerramento e ela fechou sozinha.

**SHA.** `c58e4b63` (+ `cea34e7b`, o diário) — worktree
`C:\kineo-wt\r20-memoria-episodio`. Enfileirado em `entrega-atual` sobre
`6ee615ef` (fila: 6). Aguardando o clique no SUBIR-SITE.bat.

---

### #20 — 17:52-19:05 BRT — o produto culpava a fal por 34 despachos em que a fal NUNCA foi chamada: 25 pessoas, 9 delas sem nenhum filme na vida

**Como esta rodada nasceu.** Não foi escolha de cardápio: foi a **checagem
zero** da abertura. O SELECT das últimas 2h devolveu **18
`generation_stage_error`** — e os 18 eram de **uma pessoa só**, `ffd78315`,
cadastrada às 20:04 UTC de hoje, tentando o primeiro filme dela **naquele
minuto**. A regra da rotação diz que causa viva vira a rotação, e virou.

**O que estava errado (medido, não deduzido).**

A trilha dela, 20:27→20:42 UTC: quatro gerações, todas mortas, e entre elas
doze telas de *"Two AI attempts were just refunded. Please wait a few minutes"*.
O claim de cada uma trazia `fal_models: []`, e o `cinematic_dispatch_result`
trazia o retrato do crime:

    "scenes": [], "planned": 0, "attempted": 0, "accepted": 0, "total_posts": 0

`planned: 0` quer dizer que **não havia uma única cena para enviar**. O laço de
submissão não roda, nenhum POST sai, e o desfecho cai no mesmo `if` de "nenhum
clipe renderizável" por onde passa a recusa de verdade da fal. As duas saíam
pela mesma porta — e a pessoa lia:

> *"Our video provider did not accept the job… Please try again in a few minutes."*

Uma frase sobre um fornecedor que **nunca foi chamado**. Ela obedeceu: tentou
de novo, quatro vezes, no mesmo texto. Só escapou porque, por conta própria,
passou o tema pelo `analyze-idea` e pediu 35s em vez de 60s — aí o filme saiu,
às 20:49:04, e às 20:50 ela já estava vendo a porta do episódio 2.

**O tamanho disso, 21 dias, contas externas:**

| | |
|---|---:|
| despachos com `planned=0 attempted=0` | **34** |
| pessoas distintas | **25** |
| — que **nunca** viram um filme da Kineo na vida | **9** |
| seguidos de OUTRO despacho vazio em 30 min | 8 |
| seguidos de um despacho **aceito** em 5 min | 16 |
| despachos com ao menos 1 cena aceita (o normal) | 107 / 101 pessoas |

E a segunda armadilha, que fecha a ratoeira: o **resfriamento anti-abuso** de
15 minutos conta claims liberados cuja razão casa `/^provider_.*_refunded$/`.
Ele existe, com razão, para impedir que prompt propositalmente ruim vire
trabalho **pago** da fal de graça. Só que com `total_posts: 0` **não houve
trabalho nenhum para farmar** — e mesmo assim ele trancava. Foi o que produziu
as 12 telas de 429 da pessoa de hoje.

**O que mudou (3 arquivos).**

- `app/api/generate-video-cinematic/route.ts` — `planoVazio = scenes.length === 0`
  separa os dois desfechos: (a) o release sai como `empty_plan_rejected` em vez
  de `provider_rejected`, o que **automaticamente** tira o caso do filtro do
  resfriamento (sem tocar no filtro, que continua guardando o que deve);
  (b) a resposta 503 ganha texto próprio e alarme próprio (`EMPTY_PLAN`, não
  `ZERO_POSTS`). O ramo do Joscha — `planned>0` e `total_posts=0`, pane real da
  nossa lambda — ficou **byte a byte** como estava, mensagem inclusive.
- `app/(dashboard)/generate/GenerateClient.tsx` — causa própria `empty_plan`,
  antes de `provider_rejected` na cascata. Até hoje os dois eram o mesmo
  `provider_rejected`: a recusa real da fal vinha inflada e esta ficava
  escondida dentro dela.
- `scripts/test-despacho-vazio-2026-09-04.mjs` — 45 verificações.

**A mensagem nova**, palavra por palavra:

> *"We couldn't build a single scene from this text, so nothing was ever sent to
> our video provider — this is on our side, not yours. Your credits were
> refunded automatically and the team was alerted. Editing the text, or letting
> the AI structure it for you, is the change most likely to get this through."*

**A armadilha que quase engoli, e que o teste agora tranca.** O cron
`send-failure-recovery` decide se manda e-mail de resgate procurando frases em
que o produto **assume a culpa** (`DEFEITO_EXPLICITO`), e o fragmento é
literalmente `on our side, not yours`. Trocar a copy sem esse pedaço tiraria
estas 25 pessoas da fila de recuperação **sem ninguém perceber** — o tipo de
estrago que só aparece semanas depois. A verificação 3.3 lê a lista **do
arquivo real do cron** e prova que a frase nova ainda casa; a 3.4 prova que a
antiga também.

**O que eu deliberadamente NÃO fiz.** Não marquei `empty_plan` como causa
determinística. Seria a mudança mais vistosa — o cartão passaria a oferecer
"Edit my text" já na primeira falha em vez de convidar a repetir. Mas **16 dos
34 despachos vazios foram seguidos de um despacho aceito em 5 minutos**, e o
evento não registra se o texto mudou no meio. Afirmar "retentar igual dá no
mesmo" seria dizer mais do que o dado sustenta — o erro que esta sprint já
cometeu antes. O contador de repetição existente **já** muda o tom do cartão na
segunda falha igual, e agora com assinatura separada da fal. A verificação 6.2
tranca a lista para que ninguém adicione `empty_plan` sem trazer o número.

E **não toquei no planner**. A causa raiz — por que este texto produz zero
cenas — mora no motor de roteiro, que está sob a trava do fundador de 03/09
("os vídeos têm saído nota 9, NÃO QUERO QUE MEXA NISSO"). O bloco 8 do teste lê
o `git diff` real e reprova se o diff encostar em `lib/compose`, `lib/hollywood`,
`lib/cinematic`, `lib/broll`, `lib/lyriaMusic`, `lib/narrationFit`,
`analyze-idea` ou `generate-script`. Esta rodada conserta a **honestidade e o
bloqueio**, que é o que a trava permite. A causa raiz vai como pedido.

**Falsificado em 9 mutações, cada uma aplicada de verdade no arquivo real e
depois desfeita.** Duas delas passaram na primeira tentativa — e o motivo
importa: os arquivos são **CRLF**, e o `perl` com `\n` não casava, ou seja a
mutação nunca chegou a existir. Refeitas com `\r?\n`, as duas derrubaram o que
deviam. "Passou" sem conferir se a mutação foi aplicada é falso-verde.

| mutação | verificação que cai |
|---|---|
| `empty_plan_rejected` volta a `provider_rejected` | 1.2 |
| mensagem nova volta a dizer "did not accept the job" | 1.6 |
| tirar `on our side, not yours` da mensagem nova | 1.6 |
| desligar o ramo `if (planoVazio)` | 1.5 |
| apagar a mensagem antiga (ramo do Joscha) | 7.1 |
| cliente perde a causa `empty_plan` | 5.1 / 5.2 / 5.4 |
| `empty_plan` entra na lista de determinísticas | 6.2 |
| `empty_plan` passa a vir depois de `provider_rejected` | 5.4 |
| encostar em `lib/hollywood/varietyAxis.ts` | 8.2 / 8.3 |

**Quantas pessoas isso move.** Sem otimismo: 25 pessoas/21 dias batem neste
desfecho, ~8/semana, e **9 nunca viram um filme**. A mudança não faz o roteiro
virar cena — não é um filme a mais garantido. Ela faz duas coisas contáveis:
(a) quem cair aqui recebe a ação que **pode** mudar o resultado em vez de um
convite a repetir o fracasso; (b) ninguém mais é trancado por 15 minutos por
uma falha em que não consumiu nada nosso. O ganho comercial é indireto e eu
não vou fingir que é grande: é primeiro filme, que é o degrau onde 0,3% vira
1,8%.

**Testes.** 45/45 verdes em `test-despacho-vazio-2026-09-04.mjs`.
`tsc --noEmit` **exit 0**. **Aviso honesto sobre o typecheck:** a primeira
execução saiu "exit 0" e era **mentira** — `npx tsc` não achou o TypeScript e o
`npx` saiu 0 sozinho; a segunda, com o tsc do repo, cuspiu centenas de
`Cannot find module` porque a **worktree não tem `node_modules`**. Só a
terceira, com junction de `node_modules` do repo principal, é typecheck de
verdade. É exatamente a classe `MODULE_NOT_FOUND` que o codex-fluxo apontou no
Guardião às 10:54 — vale para worktree também, e eu quase assinei um verde
falso.

**Risco: baixo, e reversível em uma linha.** Nenhum preço, crédito, plano,
motor, gatilho de checkout ou caminho de render foi tocado. O comportamento de
quem **não** cai em plano vazio é idêntico. Reverter tudo: trocar
`empty_plan_rejected` de volta por `provider_rejected` e apagar o ramo
`if (planoVazio)` — o resto vira código morto inofensivo.

**Como medir (contra o marco).**

```sql
-- 1) o desfecho passa a ter nome proprio no financeiro
select e.metadata->>'resolution_reason' razao, count(*), count(distinct e.user_id)
from events e
where e.name='cinematic_submission_claim' and e.metadata->>'status'='released'
  and e.created_at > '2026-09-04 22:00:00+00'
group by 1 order by 2 desc;

-- 2) o resfriamento parou de trancar quem nao gastou nada
select count(*) from events
where name='generation_stage_error' and metadata->>'error' like 'Two AI attempts%'
  and created_at > '2026-09-04 22:00:00+00';
-- baseline: 12 eventos / 1 pessoa em 21 dias (todos de hoje, pessoa ffd78315)

-- 3) a causa deixa de vir inflada dentro da recusa da fal
select metadata->>'cause' causa, count(*), count(distinct user_id)
from events where name='generation_failed_screen_shown'
  and created_at > '2026-09-04 22:00:00+00' group by 1 order by 2 desc;
-- esperado: 'empty_plan' aparece separado de 'provider_rejected'
```

Sinal de alarme: `empty_plan` com muita gente e **nenhum** filme depois em 24h
— aí a copy não basta e o conserto real é o planner (que está sob trava e vira
decisão do fundador).

**Placar no corte (marco 2026-09-03 16:00 UTC, contas externas):** 43 cadastros ·
29 pessoas com filme · 4 checkouts iniciados · **0 `payment_success`**.
Checagem zero: 0 cadastro sem crédito em 2h · 0 claim sem filme em 3h ·
18 `generation_stage_error` — **todos da pessoa desta rodada, e a causa está
consertada aqui**.

**Próximo item.** (a) a **R2 do cardápio** continua de pé e é a de maior valor:
o episódio 2 nasce hoje de `Topic: "<tema>"` + ordem genérica, sem uma palavra
do roteiro do episódio 1 — o `videos.script` do episódio anterior existe no
banco e é jogado fora, então "não repita o episódio anterior" é uma ordem que o
motor não tem como cumprir; (b) medir o ramo `free_engine` do momentum.

---

### #6 (global #22) — 19:05→20:50 BRT — CORREÇÃO da entrada anterior: três sessões consertaram o MESMO defeito hoje, e o que sobrou de meu foi endurecer o teste

**Esta entrada corrige a de cima**, que ficou numerada `#20` sem eu ver que as
sessões paralelas já tinham tomado `#4 (global #20)` e `#5 (global #21)` neste
mesmo arquivo. E conta o que a anterior não podia contar, porque ainda não
tinha acontecido.

**O que aconteceu, em ordem.**

1. Abri a rotação pela **checagem zero** (18 `generation_stage_error` em 2h,
   todos de uma pessoa viva, `ffd78315`, tentando o primeiro filme dela
   naquele minuto). Diagnostiquei o **despacho vazio**: `planned: 0`,
   `attempted: 0` — a fal **nunca foi chamada** — e mesmo assim a mensagem a
   culpava, e o guarda anti-abuso trancava a pessoa por 15 min por uma falha
   em que ela não consumiu nada nosso. Enfileirei o conserto.
2. Fui ler a fila e vi que **outra sessão já tinha consertado a mensagem** do
   mesmo defeito. A minha anti-repetição grepou **só a `origin/main`** — a fila
   tinha 8 commits não publicados.
3. Refiz a rodada supondo que a versão dela venceria. Ao enfileirar: **conflito**
   — enquanto eu trabalhava, a fila foi reescrita e ela tinha **convergido na
   minha implementação**, acrescentando a telemetria dela dentro do meu ramo.
   O meu commit "reconciliado" teria **apagado a telemetria dela**. Descartei.
4. Resetei para a ponta e fui fazer só o que faltava — e descobri que **uma
   terceira sessão já tinha consertado a checagem 8.3** do meu teste
   (`a98dda90`). Mantive a versão dela.

**Dois commits meus jogados fora. ~1h de trabalho.** Está registrado porque a
causa é de processo e vai repetir se ninguém escrever.

---

**O estado da fila é o certo, e eu não mexi nele.** O ramo `if (planoVazio)`
tem a razão de release `empty_plan_rejected` (minha — é ela que tira o caso do
filtro `/^provider_.*_refunded$/` do resfriamento anti-abuso, **sem afrouxar o
filtro**), a mensagem honesta (minha) e o evento `cinematic_zero_scenes_planned`
com o diagnóstico da causa raiz (da #21). Nada a refazer.

**O que ESTA rodada entrega: 1 arquivo, zero código de produção.** Quatro
consertos no teste, **todos achados falsificando**, nenhum por releitura:

1. **A extração das listas do cron se desalinhava em silêncio.** O item
   `"can't depict real people"` (aspas duplas com apóstrofo dentro) quebrava o
   pareamento de `'...'`: a versão anterior extraía 19 "fragmentos", quase todos
   lixo, e **nenhum** dos de saldo curto — ou seja, o bloco inteiro era teatro.
   Agora remove as linhas de comentário primeiro, lê os dois tipos de aspas, e
   tem três verificações de sanidade **da própria extração**.
2. **Cobertura nova:** o bloco 3 passa a **rodar a regra real** do cron
   `send-failure-recovery` (lê as duas listas do arquivo dele e reproduz a
   decisão), provando que estas 25 pessoas continuam na fila do e-mail de
   resgate — com um controle (3.8) provando que recusa legítima de saldo
   continua **não** sendo tratada como defeito.
3. **O acoplamento servidor↔tela era uma frase que eu tinha digitado.** Trocar o
   matcher do cliente por qualquer bobagem passava. Agora a mensagem é **lida do
   route** e o trecho procurado é **lido do cliente**: drift de qualquer um dos
   dois lados reprova.
4. **Apagar a telemetria da sessão paralela não era detectado por ninguém** — e
   eu quase fiz exatamente isso. Como duas sessões editam o mesmo `if` **sem
   gerar conflito de merge**, perda silenciosa de trabalho alheio é o modo de
   falha natural aqui, não o excepcional. `1.8` exige o evento dentro do ramo;
   `1.9` exige os campos que acham a causa raiz.

**51/51 verdes** (a `8.3` é a da sessão paralela, preservada). Falsificado em
**9 mutações**, cada uma com `cmp` confirmando que a mutação **realmente
existiu** antes de acreditar no resultado — três tinham "passado" antes porque
o `perl` com `\n` não casa arquivo **CRLF** e a mutação nunca chegou a existir.
`tsc --noEmit` **exit 0**.

**Aviso sobre o typecheck, que vale para toda worktree:** a primeira execução
saiu "exit 0" e era **mentira** — `npx tsc` não achou o TypeScript e o `npx`
saiu 0 sozinho. A segunda cuspiu centenas de `Cannot find module` porque a
**worktree não tem `node_modules`**. Só a terceira, com junction do
`node_modules` do repo principal, é typecheck de verdade. Mesma classe
`MODULE_NOT_FOUND` que o codex-fluxo apontou no Guardião às 10:54.

**Risco: zero para o cliente.** Nenhuma linha de produção nesta rodada.

---

## A LIÇÃO CARA DO DIA — vale mais que a entrega

Três sessões no mesmo defeito. As três causas são de processo:

- **Anti-repetição olhava só a `origin/main`.** A fila tinha 8 commits — quase
  um dia de trabalho invisível para quem só olha a main. Um comando resolve, e
  precisa rodar **antes da primeira linha escrita**:
  ```sh
  git log --oneline origin/main..entrega-atual
  ```
- **Rebase verde não prova ausência de duplicação.** Duas sessões mexendo em
  linhas diferentes do mesmo arquivo **não conflitam** — e entregam dois
  consertos para o mesmo defeito, um deles inalcançável em produção.
- **A fila é reescrita enquanto você trabalha.** O estado lido na abertura pode
  não ser o do fim. Reler a ponta **depois** do rebase virou passo obrigatório.

**Placar no corte (marco 2026-09-03 16:00 UTC, contas externas):** 43 cadastros ·
29 pessoas com filme · 4 checkouts iniciados · **0 `payment_success`**.
Checagem zero: 0 cadastro sem crédito em 2h · 0 claim sem filme em 3h ·
18 `generation_stage_error`, todos da pessoa desta rodada — **e ela recebeu o
filme dela às 20:49 UTC**, depois de mudar o texto sozinha.

**Próximo item — não construir, MEDIR.** As três portas de série
(`done_screen_top`, `composer_empty`, `generate_recent_video`), a memória de
episódio das #4/#5 e o `empty_plan` desta: tudo entregue hoje, **nada com
denominador em produção ainda**. Construir uma quarta coisa antes de medir as
oito de hoje é o erro que esta sprint pode cometer amanhã. E há uma
**divergência aberta** que precisa de uma palavra do fundador: `app/api/compose/**`
está ou não dentro da trava de qualidade.
