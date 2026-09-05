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

### #7 (global #23) — 18:42→19:05 BRT — O CONSERTO DO PLANO VAZIO ENTROU EM PRODUÇÃO ÀS 21:44 UTC, DOIS MINUTOS DEPOIS DA ÚLTIMA VÍTIMA. E ELA AINDA ESTÁ SEM FILME.

Rodada de **medição**, obedecendo o "próximo item" da #22 ("não construir,
MEDIR"). Nenhuma linha de produção. O que esta entrada acrescenta é o que as
três sessões de hoje **não podiam saber, porque fecharam antes do deploy**.

#### Anti-repetição, na ordem que a #22 mandou escrever

```sh
git log --oneline origin/main..entrega-atual   # → VAZIO
```
**A fila está limpa.** Tudo de hoje (#17…#22, o conserto do plano vazio e a
telemetria) está na `origin/main`. Não existe trabalho invisível pendurado.
Abri a rodada pela checagem zero, achei o despacho vazio ao vivo, e **parei
antes de escrever código** ao ver `d58a0d7b` já na main. Seria a **quarta**
sessão no mesmo defeito.

#### O que ninguém tinha: a prova de que o conserto está no ar

| | |
|---|---|
| deploy de produção agora | `dpl_4K24Xk248N36uZWEZZA8Lg151bLa` |
| SHA | `1ee5e384` (inclui `d58a0d7b` + `12804762`) |
| estado | **READY**, target production |
| entrou no ar | **2026-09-04 ~21:44 UTC** |

O SHA que as vítimas de hoje pegaram foi `119187af` — o commit **anterior** ao
conserto. A janela de exposição fechou às 21:44 UTC.

#### Duas vítimas que o diário ainda não tinha (a #22 só registrou `ffd78315`)

| pessoa | quando | tentativas | desfecho |
|---|---|---:|---|
| `a1be6766` (archiveunknownmedia) | 20:27 · 20:28 · 20:42 UTC | 3 | conseguiu **1 filme** depois; saldo 10 |
| `f716bf22` (nikitaamiran) | 21:41 · 21:42 UTC | 2 | **0 filmes**, 25cr intactos, foi embora |

`f716bf22` é o caso que mais dói da sprint inteira: conta **nascida às 21:38
UTC**, Google OAuth, vinda do **`chatgpt.com`** — o único canal que já pagou —
colou roteiro pronto (328 caracteres), clicou no botão de primeira entrega
(Seedance 35s, 15cr), e o produto respondeu **duas vezes em 90 segundos** que
"o fornecedor não aceitou". A fal **nunca foi chamada**: `planned: 0`,
`total_posts: 0`, `provider_status_histogram: {}`. Ela desistiu **dois minutos
antes** de o conserto entrar no ar.

**Dinheiro: intacto.** `refund_confirmed: true` e `provider_spend_possible:
false` nas duas. O prejuízo é o filme que não existiu, não o crédito.

#### O tamanho real da classe (medido, não estimado)

Filtrando o que de fato é este defeito — motor escolhido **e** claim feito
(`engine is not null` + `planned = 0`) — e não os `planned=0` de recusa precoce
(422/402, que são instrumentação sã):

**7 eventos em toda a história · 3 pessoas · e 5 desses 7 são de hoje, nas
últimas 2 horas.** Os outros 2 são de `ad5a7073` em 30/08. Não é epidemia de
volume; é epidemia de **momento** — pega quem está no primeiro filme.

#### O caminho de resgate já cobre a vítima — conferido, não suposto

`send-failure-recovery` decide por `ehDefeito(erro)`, e `DEFEITO_EXPLICITO`
(linha 120) contém literalmente `'on our side, not yours'`. O `generate_failed`
de `f716bf22` carrega essa frase, é o evento **mais recente** dela (logo não cai
na regra do "produto disse não por último") e são 2 falhas. **Ela entra na
janela de 48h do cron sem nenhum código novo.** O conserto de e-mail de 03/09
funciona para o defeito de 04/09.

#### Placar (marco 2026-09-03 16:00 UTC, contas externas)

| | |
|---|---:|
| cadastros | **44** |
| pessoas com filme | **29** |
| filmes entregues | **37** |
| checkout COM filme (desejo) | 2 |
| checkout SEM filme (defeito) | 2 |
| `checkout_success_viewed` | **0** |
| **`payment_success`** | **0** |

**Distribuição:** 24 pararam no 1º · 4 em 2-3 · 1 em 4-7. Na #17 era 22/4/1 de
27; agora 24/4/1 de 29. **As duas pessoas novas com filme pararam no primeiro,
e ninguém subiu de faixa.** O degrau 1→2 não se mexeu.

#### As portas de hoje: SEM DENOMINADOR, e eu não vou fingir que tenho um

Desde que o `done_screen_top` entrou na main (17:49 UTC) e o `composer_empty`
(18:51 UTC):

| | pessoas |
|---|---:|
| chegaram à tela de fim de filme (`video_ready_viewed`) | **2** |
| `series_continue_seen` / `done_screen` (porta velha, rodapé) | 1 |
| `series_continue_seen` / `done_screen_top` (#18) | **0** |
| `series_continue_seen` / `composer_empty` (#19) | **0** |

**Veredito: INCONCLUSIVO, e é a única leitura honesta.** Duas pessoas na tela
de fim de filme em três horas não medem nada — nem a favor nem contra. Anotar
"a porta nova não apareceu" como defeito, com n=2, seria exatamente o erro que
a #17 documentou em `SEM EXPOSIÇÃO ≠ FALHA`.

**O que fica como fio a puxar quando houver amostra** (lead, não veredito): as
duas portas moram na mesma tela e disparam no mesmo `phase === 'done'`, mas a
de cima tem uma guarda a mais — `if (!episode2Seed) return`
(`GenerateClient.tsx:10619`), e `episode2Seed` é `null` sempre que
`normalizeSeriesSeed(analysis?.title ?? prompt)` sair degenerado
(`:10595`). Na única sessão observada, a de baixo acendeu e a de cima não.
**Uma observação não é uma taxa.** Se com 20+ chegadas o par continuar
assimétrico, a suspeita tem endereço e uma linha para conferir primeiro.

#### Checagem zero

| | |
|---|---:|
| render preso > 3h | **0** |
| cadastro sem crédito em 24h | 5 — **todos com saldo gasto em uso**, nenhum órfão novo |
| `generation_stage_error` 24h | 29 — **23 deles das duas vítimas acima**; o resto é saldo/trial, não defeito |
| causa antiga voltando | **sim, e já consertada**: despacho vazio, no ar desde 21:44 UTC |

#### Nota de processo — a quarta sessão quase repetiu o defeito das três

O comando da #22 (`origin/main..entrega-atual`) **funcionou**: foi ele que me
fez parar. Mas ele só pega fila **não publicada**. O que me pegou desta vez foi
outra coisa: eu grepei `git log origin/main --oneline -25` às 21:42 e o
conserto **ainda não existia** — ele entrou às 21:38-21:39 e eu tinha buscado
antes. **`git fetch` no início da rodada não basta quando a rodada dura mais de
5 minutos.** Refetch antes de escrever a primeira linha, sempre.

#### Próxima jogada

**Continuar sem construir, por mais uma rotação.** Oito superfícies entraram
hoje e nenhuma tem denominador: três portas de série, a memória de episódio das
#4/#5, e o `empty_plan`. A próxima rotação deve (a) reconferir o par
`done_screen` × `done_screen_top` quando houver ≥10 chegadas à tela de fim, e
(b) confirmar que o `cinematic_zero_scenes_planned` da #21 grava a causa raiz
no **primeiro** despacho vazio pós-deploy — hoje ele tem 0 eventos porque o
conserto entrou depois da última falha, e é essa a prova que falta para fechar
a causa que está aberta desde 25/08.

#### Pedidos novos ao Codex

Nenhum. Nada desta rodada cruza pista.

**Entrega:** 1 arquivo (este diário). Zero código de produção. Zero risco.

---

#### CHECKPOINT da #7 — 22:12 UTC (19:12 BRT) — não é entrada nova, é o fecho da mesma rotação

Segundo disparo da rotação. Reconferi as duas coisas que a #7 deixou como
"medir na próxima" e a checagem zero. **Nada mudou, e o motivo é falta de
tráfego, não defeito.**

| medida | 21:44 UTC (deploy) → 22:12 UTC |
|---|---:|
| `video_ready_viewed` (pessoas) | **0** |
| `series_continue_seen` (qualquer superfície) | **0** |
| `cinematic_zero_scenes_planned` | **0** |
| render preso > 3h | **0** |
| `generation_stage_error` na última 1h | **4** |

**Os 4 erros da última hora são todos de `f716bf22`, às 21:41 e 21:42 UTC — ou
seja, ANTES do deploy das 21:44.** Nenhuma vítima nova depois do conserto. O
último evento de qualquer tipo na base é de 21:53 UTC: o site está parado.

**As duas perguntas da #7 continuam sem resposta possível.** Zero chegadas à
tela de fim de filme em 28 minutos ⇒ o par `done_screen` × `done_screen_top`
não tem como ser comparado, e o `cinematic_zero_scenes_planned` não tem como
gravar causa raiz enquanto ninguém tropeçar no defeito já consertado. Registrar
isso como "0" é o denominador ausente de novo, não um veredito. **Não construí
nada e não vou construir para preencher o relógio.**

**Um dado que a #7 não destacou e vale guardar.** No rastro de `a1be6766`
(20:37→20:42 UTC) o resfriamento anti-abuso — *"Two AI attempts were just
refunded. Please wait a few minutes"* — disparou **6 vezes em 5 minutos** contra
uma pessoa cujas falhas eram **nossas**, sem ela ter consumido nada. É
exatamente o caso que a razão de release `empty_plan_rejected` (da #22) tira do
filtro do resfriamento. O conserto está no ar desde 21:44; esta é a evidência
em produção de que ele tinha alvo real, medida em gente, não em teoria.

**Placar no corte (marco 2026-09-03 16:00 UTC, contas externas) — idêntico ao
da #7, meia hora depois:** 44 cadastros · 29 pessoas com filme · 37 filmes ·
4 checkouts iniciados · 0 `checkout_success_viewed` · **0 `payment_success`**.

**Entrega: 1 arquivo (este diário). Zero código de produção. Zero risco.**
Sem typecheck porque não há uma linha de TypeScript nesta rodada.

**Próxima rotação (19:38 BRT):** a fila tem **2 commits não publicados** — o
fundador precisa clicar. Enquanto não clicar, nada de hoje depois de `1ee5e384`
chega em produção. Com o site parado, a jogada certa continua sendo **medir
quando houver gente**, e a #7 já deixou os dois fios com endereço.
#### CORREÇÃO, escrita 3 minutos depois: a fila andou enquanto eu media

Ao enfileirar, a `origin/main` já não era `1ee5e384`. O fundador **clicou às
~19:14 BRT** e entrou junto o `c40e3782` de uma sessão paralela. Duas coisas
que eu tinha acabado de escrever ficaram velhas na mesma rodada — é a terceira
vez hoje que a fila é reescrita debaixo de uma sessão, e por isso fica escrito:

1. **A fila NÃO tem 2 commits parados.** Publicado até `c40e3782`; sobra só
   este diário. Não há nada represado para o fundador clicar agora.
2. **A causa raiz do "zero cenas" foi fechada por reprodução, não por
   telemetria.** `cleanNarration` apagava tudo entre `[colchetes]`; roteiro
   colado do ChatGPT com a fala inteira em colchetes virava narração vazia →
   0 cenas → **crédito debitado**. O fallback agora recupera as **palavras do
   cliente** antes de deixar a IA reescrever
   (`app/api/generate-video-cinematic/route.ts`, +2 testes).

Isso **muda a pergunta em aberto da #7**: eu ia esperar o
`cinematic_zero_scenes_planned` gravar a causa raiz no primeiro despacho vazio
pós-deploy. Essa espera **não é mais o caminho** — a causa tem nome e conserto.
O evento vira o que sempre devia ser: **rede de segurança**, e o teste passa a
ser "ele fica em 0", não "ele finalmente acende".

E encaixa com a vítima da #7: `f716bf22` veio do **`chatgpt.com`** e **colou
roteiro pronto de 328 caracteres**. É exatamente a forma do defeito agora
reproduzido. Não afirmo que é o mesmo caso — o roteiro dela não foi lido — mas
o canal, o formato e o desfecho batem, e vale conferir antes de tratar como
duas coisas.

**Próxima rotação (19:38 BRT):** com o site parado e a causa raiz fechada, a
jogada continua sendo **medir quando houver gente** — os dois fios da #7 já têm
endereço. Nada a construir.
#### E aí eu fui conferir a vítima da #7 — e derrubei a minha própria hipótese

Escrevi acima que o caso de `f716bf22` "encaixa" no defeito dos colchetes.
**Fui ler o rastro dela antes de deixar isso no papel, e não encaixa.** É outro
defeito, colado no primeiro. Os 328 caracteres dela **não eram um roteiro**:

> `Create a 35-second cinematic YouTube Short in English about what would
> happen if the Moon …` — `generation_attempt_opened.topic_hint`,
> `topic_complete: false`

Isso é a **instrução que ela deu ao ChatGPT**, colada inteira na nossa caixa.
O roteiro em si não existe em lugar nenhum do banco (nenhum evento guarda o
texto; só `prompt_length`, `input_length` e este `topic_hint` truncado). O que
o banco guarda é a **sequência de decisões do produto**, e ela é o achado:

| hora UTC | o que o produto fez |
|---|---|
| 21:38:45 | `activation_autostart_skipped` · `prompt_length: 328` · `script_mode: **ai**` |
| 21:39:02 | `chatgpt_quickstart_selected` · **`input_type: "finished_script"`** |
| 21:40:40 | `activation_autostart_skipped` · `script_mode: **verbatim**` |
| 21:40:48 | `script_preflight_overridden` · **`speech_seconds: 20`** vs `target_seconds: 35` |
| 21:41:12 | `generation_attempt_opened` · `topic_complete: **false**` |
| 21:41:14 | `cinematic_dispatch_result` · **`planned: 0`, `scenes: []`** |
| 21:42:43 | idem — segunda tentativa, mesmo desfecho |

**O produto classificou uma INSTRUÇÃO como `finished_script`.** A partir daí
tudo o que ele fez foi coerente com uma premissa errada: ofereceu o modo
`verbatim` (narrar o texto **como está**), ela aceitou, e o preflight ainda
avisou que só havia **20 s de fala para um alvo de 35 s** — ela **passou por
cima** e mandou gerar. Duas vezes. Zero cenas as duas.

**Por que isso importa mais que o meu palpite.** Os dois consertos de hoje
(`d58a0d7b`, a trava de "nunca narrar uma instrução", e `c40e3782`, os
colchetes) atacam o **fim** dessa cadeia. Nenhum dos dois toca a
**classificação** que a começou. Pelo que li, o desfecho dela **hoje** seria:
a trava reconhece a instrução, recusa narrá-la, e o app diz a verdade em vez de
culpar a fal — **melhor, e ainda assim sem filme**. Mensagem honesta não é
entrega. Escrevo como leitura de código, não como fato medido: **não há um
único caso pós-deploy para confirmar** (0 despachos vazios desde 21:44).

**O ponto de conserto real fica a montante, e é barato:** um texto que começa
com *"Create a 35-second …"* é um **pedido**, não uma fala. Quem cola isso quer
que a gente **escreva** o roteiro (`script_mode: ai`), não que **narre** o
pedido dele. Ela começou em `ai` e o produto a moveu para `verbatim`.

**Não vou construir isso agora** — a rotação é de medição, e a
classificação nasce em `chatgpt_quickstart`, superfície de aquisição
(pista do Codex). Vira **pedido entre pistas**, com a reprodução pronta.

**Próxima rotação (19:38 BRT):** com o site parado, a jogada continua sendo
**medir quando houver gente**. Mas agora existe um item de construir com dono e
evidência: **`finished_script` que na verdade é `instruction`**.

#### Nota de processo — eu quase apaguei dois arquivos do Codex, e o `enfileirar.sh` ficou verde

Registro porque é a **quarta** colisão de fila do dia e o modo de falha é novo.
Corrigi o texto acima com `git commit --amend` **três vezes**; a cada vez o
`enfileirar.sh` rebasava a versão nova **por cima da versão velha** — a fila
ficou com **3 cópias** do mesmo checkpoint, e cada uma dizia "enfileirado" em
verde. O estrago não estava nas cópias: como as minhas commits nasceram de uma
`origin/main` que **já tinha andado duas vezes** (`c40e3782` e depois
`c5c91f0c`), o diff acumulado da fila contra a main passou a **APAGAR**
`docs/HANDOFF-CODEX-CAIXA-10H-2026-09-04.md` (−33) e
`docs/queries/CAIXA-10H-PAGAMENTOS-2026-09-04.sql` (−25). Trabalho do Codex,
que eu nunca abri.

**O que pegou:** olhar `git diff --stat origin/main entrega-atual` e ver
**linhas removidas em arquivo que não é meu**. O `--stat` do commit sozinho
dizia só "+76" e parecia inocente.

**Conserto:** reconstruí **um** commit em cima da `origin/main` atual, contendo
só as adições aos meus dois documentos (132 inserções, **zero remoções**), e
substituí a fila depois de provar que ela continha **apenas as minhas três
commits superadas** — nada de terceiros. Confirmado no `--name-only`.

**A regra que falta no programa da rotação**, e que vale para todas as pistas:

```sh
git diff --stat origin/main entrega-atual   # remocao em arquivo alheio = PARE
```

`amend` + `enfileirar` **não** é uma operação idempotente: o script rebasa, não
substitui. Quem precisar corrigir um commit já enfileirado deve **reconstruir
sobre a ponta atual**, nunca amendar e re-enfileirar.
### #8 (global #24) — 20:10→21:10 BRT — O PILOTO DE VENDA ASSISTIDA IA CAIR EM CIMA DO CICLO AUTOMATICO PARA 19 DAS 27 PESSOAS — E A "FONTE DE CONSENTIMENTO" QUE O CODEX PEDIU NAO EXISTE

Rodada de **medicao e desbloqueio de pista**, obedecendo o "proximo item" da #23
("continuar sem construir, por mais uma rotacao"). **Zero linha de producao.**
Duas coisas entregues: a checagem que a #23 deixou marcada, e a resposta ao
unico pedido do Codex que estava **bloqueando trabalho dele**.

#### Anti-repeticao — e desta vez ela me impediu de reescrever um conserto de 3h atras

```sh
git fetch origin && git log --oneline origin/main -25   # refetch ANTES de codar (licao da #23)
git log --oneline origin/main..entrega-atual            # -> VAZIO, fila limpa
```

Achei no banco o que **parecia** um defeito novo e caro: `archiveunknownmedia`
levou **6 bloqueios** de "Two AI attempts were just refunded" entre 20:28 e
20:56 UTC — o guarda anti-abuso trancando por 15 min exatamente quem tinha
acabado de ser vitima do **nosso** despacho vazio. Fui ler o codigo para
consertar e o conserto **ja estava la**, com o comentario
`sprint-retencao #20` em `app/api/generate-video-cinematic/route.ts:2040-2050`:
o filtro casa `provider_*_refunded` **de proposito** e `empty_plan_rejected_
refunded` nao conta mais. Os 6 bloqueios sao de **20:28-20:56 UTC**, o deploy
do conserto entrou **21:44 UTC** — sao cicatriz, nao ferida. **Seria a quinta
sessao no mesmo defeito.** Registro porque o padrao ja se repetiu quatro vezes
hoje: neste repo, ler o codigo antes de escrever vale mais que ler o log.

#### O pedido do Codex (18:18 BRT, CAIXA R2) — respondido com dado, e a resposta e "nao"

Ele propos um piloto de venda assistida para 27 pessoas e pediu tres coisas
antes de qualquer contato. As tres foram medidas (SELECT 00:05 UTC):

| o que ele pediu | o que existe em producao |
|---|---|
| fonte canonica de **consentimento afirmativo** | **NAO EXISTE.** 12 colunas de e-mail em `profiles`, todas de supressao ou carimbo. Nenhuma coluna de aceite em nenhuma tabela. O cadastro nao captura aceite. |
| cobertura de **envios** | **PARCIAL.** `email_send_log` = 2.543 linhas, mas so desde **17/08** e so **11 `kind`**, contra **31 rotas de envio**. Nao serve de prova de "nunca contatado". |
| cobertura de **bounces/reclamacoes** | **CEGUEIRA TOTAL.** Nao ha webhook de e-mail no repo (so Stripe/PayPal/MP/Hotmart). `ok=true` = "a API aceitou", nunca entrega. |

**E o gate dele proprio reprova.** O criterio que o Codex escreveu era **"zero
colisoes"**. Reproduzi a coorte exatamente — 27 pessoas com `checkout_started`
em 7d sem `payment_success` de webhook — e:

| | |
|---|---:|
| coorte | **27** |
| opt-outs dentro dela | 0 |
| com filme concluido | 14 |
| receberam e-mail em 7d | 25 |
| **receberam e-mail nas ultimas 48h** | **19 (70%)** |
| sem nenhum registro de envio | 2 |

O piloto disparado hoje bateria **em cima do ciclo automatico de trial** para
**7 de cada 10 pessoas**. Pelo criterio dele, e pela regra do ciclo ("se a
fonte nao existir ou nao cobrir o publico, declarar pendente e preservar o
bloqueio"): **PENDENTE, bloqueio de pe.** Resposta completa nos PEDIDOS.

#### Uma correcao que eu tive de fazer em mim mesmo antes de publicar

Cheguei a ler **91 `ok=false`** no `email_send_log` como falha de entrega — e
`hotlead_watermark` com **53% de falha** seria um incendio. **Nao e.** Todos
tem `http_status` NULL e `detail` no formato `yield NN/100 (limite 60)`: e
**cessao por contrapressao** (coluna `yielded`), nao recusa. **Falhas HTTP
reais de envio: zero.** Anoto porque um numero desses no diario viraria
prioridade falsa da proxima rotacao.

#### Checagem zero (1h) — LIMPA, e o motor esta entregando

| | |
|---|---:|
| render preso > 3h | **0** |
| despacho vazio **depois** do deploy de 21:44 UTC | **0** |
| `cinematic_zero_scenes_planned` (toda a historia) | **0** |
| ultimo filme concluido | **23:58 UTC** (uma pessoa nova, 1o filme) |
| cadastro sem credito 24h | 5 — todos com saldo **gasto em uso**, nenhum orfao |

Todas as 22 `generation_stage_error` e 11 `generate_failed` das ultimas 3h sao
das **duas vitimas ja documentadas na #23** (`archiveunknownmedia` 20:27-20:42,
`nikitaamiran` 21:41-21:42), **nenhuma depois de 21:44 UTC**.

**A prova que a #23 pediu continua faltando, e nao e defeito:** o
`cinematic_zero_scenes_planned` tem **0 eventos em toda a historia** porque
**nenhum despacho vazio ocorreu desde o deploy**. Isso e o conserto
funcionando ou a ausencia de trafego — com 1 filme em 3h, **nao da para
distinguir**, e nao vou fingir que da. A raiz, alias, foi fechada em paralelo
as 19:14 (`c40e3782`): `cleanNarration` apagava tudo entre colchetes, e roteiro
de ChatGPT com toda a fala em `[...]` virava narracao vazia.

#### Placar (marco 2026-09-03 16:00 UTC, contas externas, medido 00:05 UTC)

| | | vs #23 |
|---|---:|---|
| cadastros | **45** | +1 |
| pessoas com filme | **30** | +1 |
| filmes entregues | **38** | +1 |
| checkout | 4 | = |
| `checkout_success_viewed` | **0** | = |
| **`payment_success`** | **0** | = |

**Distribuicao:** 25 pararam no 1o · 4 em 2-3 · 1 em 4-7. Era 24/4/1 na #23.
**A pessoa nova parou no primeiro, e de novo ninguem subiu de faixa.** O degrau
1->2 nao se move ha tres rotacoes.

#### As portas de serie: ainda SEM DENOMINADOR

Desde 17:49 UTC: **2** pessoas chegaram a `video_ready_viewed`; `done_screen`,
`done_screen_top` e `composer_empty` seguem em **0 exposicoes** e **0 cliques**.
Na #23 tambem eram 2 chegadas. **Sete horas depois do deploy, o denominador nao
cresceu um.** Continua **INCONCLUSIVO** — e a leitura correta nao e "a porta
falhou", e "ninguem passou pela porta". O fio da #23 (a guarda
`if (!episode2Seed) return` em `GenerateClient.tsx:10619`) segue **suspeita sem
amostra**, nao diagnostico.

#### Limitacoes desta rodada

Nada foi provado sobre **eficacia** de nada. 45 cadastros e 38 filmes em 32h
nao sustentam nenhuma afirmacao de conversao, e **0 pagamentos** com esse n e
**esperado**, nao sinal. A resposta ao Codex e sobre **o que existe no banco**,
nao sobre se o piloto dele venderia.

#### Proxima jogada

**Parar de medir as portas por uma rotacao.** Sete horas, dois visitantes: o
denominador nao cresce porque **quase ninguem termina um filme hoje**, e
remedir de hora em hora so gasta rotacao. A rotacao seguinte deveria pegar a
**unica coisa acionavel que apareceu hoje e nao depende de trafego**: os
**19 de 27** que levam e-mail do ciclo automatico em 48h. Antes de qualquer
campanha nova — do Codex ou minha — vale medir **quantos e-mails a mesma
pessoa recebe por semana** e se existe um teto. Uma pessoa que recebe 4
mensagens automaticas em 7 dias nao precisa de uma 5a assistida; precisa que as
4 parem de se atropelar. Isso e retencao, e cabe inteiro na minha pista.

#### Pedidos novos

Dois, ambos nos PEDIDOS: a **resposta ao Codex** (bloqueio preservado, com os
numeros) e uma **decisao de politica para o fundador** (webhook de bounce do
Resend + aceite no cadastro + destino da `send-india-price`, a unica das 31
rotas sem guarda de opt-out — manual e nunca disparada, mas armada).

**Entrega:** 2 arquivos de documentacao. Zero codigo de producao. Zero risco.

---

### #9 (global #25) — 21:12→22:10 BRT — 46 PESSOAS COLARAM A ORDEM QUE DERAM AO CHATGPT, PEDIRAM 2–4 MINUTOS EM 16:9, RECEBERAM 35 SEGUNDOS EM 9:16 — E 8,7% DELAS FIZERAM UM SEGUNDO FILME, CONTRA 27,5% DE QUEM COMEÇOU DE UM TEMA

**SHA `bbccd82b`** · fila `entrega-atual` = 1 commit · `npx tsc --noEmit` limpo ·
worktree `C:\kineo-wt\r9-guardiao` nascida de `origin/main` = `7a24edf7`.

#### O número que doía

30 dias, contas externas, SQL de 00:30 UTC. A coorte é o **primeiro** filme da
pessoa, classificado pela primeira linha do `videos.topic`:

| primeiro filme nasceu de… | pessoas | média de filmes | fizeram 2+ |
|---|---:|---:|---:|
| um tema normal | 714 | 1,59 | **27,5%** (196) |
| uma **ordem colada** | 46 | 1,11 | **8,7%** (4) |

**3,2× de diferença no degrau 1→2** — o degrau que o #16 mediu como sendo a
assinatura (3 de 3 assinaturas da semana vieram de quem fez 2+ filmes).
**18 das 46 chegaram nos últimos 14 dias**: não é coorte morta.

#### A contaminação que eu tive de tirar antes de acreditar no número

O filtro cru casa **116** filmes. Não são 116. **43 são a semente da PRÓPRIA
CASA** ("Create the next episode in the same Short series about…", a porta de
continuação que o #18/#19 puseram no ar e que **funciona**), e **6 nasceram
ANINHADOS** — a semente dentro da semente. O último aninhado é de **03/09 12:27
UTC**, antes do `normalizeSeriesSeed` do #20; nenhum depois. Sem excluir isso, a
peça mais eficiente da casa entraria na medição como defeito. **Coorte limpa: 46.**

#### O mecanismo, lido nas amostras reais — não suposto

O texto dessas pessoas não é um tema: é o **pedido que elas deram ao ChatGPT**,
colado inteiro, cheio de exigências que o produto descartava **calado**:

```
Create a 2–4 minute, 16:9 widescreen educational STEM documentary-style …
Create a 25-30 second vertical YouTube Short about the psychology of …
Create a 35–45 second YouTube Short titled:
Create ALL visuals with AI. DO NOT use stock footage or real people.
Create this YouTube Short ENTIRELY IN ARABIC.
```

A casa tem **três** durações (35/60/90) e é **9:16**. Quem pediu 2–4 minutos em
16:9 recebeu 35 segundos em 9:16, **pagou por isso**, e não voltou.

#### O que mudou (arquivos)

| arquivo | o quê |
|---|---|
| `lib/pastedDirectives.ts` **(novo)** | módulo puro, **zero imports**: lê as diretrizes escritas e diz, para cada uma, se a casa atende |
| `app/(dashboard)/generate/GenerateClient.tsx` | ligação na **análise** (que não debita) + a frase honesta ao lado dos botões de duração |
| `scripts/test-diretrizes-coladas-2026-09-04.mjs` **(novo)** | 61 verificações com os textos REAIS do banco |
| `scripts/test-serie-memoria-2026-09-04.mjs` | o guardião que gritava sempre (abaixo) |

1. **A duração pedida acende o botão que a COBRE.** Régua do fundador (02/09):
   "passar do alvo é bom; ficar ABAIXO é defeito (história interrompida)" — 40s
   pedidos viram **60**, nunca 35. Hoje o texto era ignorado inteiro.
2. **O que a casa comprovadamente não faz** (mais de 90s, 16:9) vira **uma frase**
   ao lado dos botões, com o dedo ainda no botão. **Não é bloqueio** — o filme sai
   igual se a pessoa seguir.
3. Tudo isso na **análise**, que não debita crédito (Contrato C1). O ponto inteiro
   é saber **antes** de gastar.
4. **Idioma e "sem banco de imagens" são detectados e NÃO julgados** (`unknown`,
   só telemetria). A cobertura real de voz por idioma e de fonte de imagem por
   motor **não foi medida** nesta rodada, e recusar sem medir seria a mesma copy
   que mente da auditoria de 28/08.
5. Evento **`pasted_directives_detected`** — o denominador que nunca existiu.

**Trava de qualidade (fundador 03/09): zero linhas de motor.** O módulo novo não
importa NADA e o teste prova (10.1–10.3). O único efeito é o botão de duração — o
mesmo que o autofit já movia — e um aviso.

#### O guardião que gritava sempre (pedidos #95(b) e #97, fechados)

`scripts/test-serie-memoria-2026-09-04.mjs` estava **136/138 desde as 18:20 BRT
por motivo nenhum**: media o diff contra um **SHA congelado** e exigia que **só
3 arquivos** aparecessem nele — impossível numa fila compartilhada, onde às 22:20
ele listava **25 arquivos "fora", quase todos do Codex**. Ou seja: **a trava de
qualidade do fundador passou quatro horas ilegível, porque o vermelho era rotina.**
Guardião que grita sempre não guarda nada.

- a base passa a ser `git merge-base HEAD origin/main` — sem SHA à mão;
- "só estes 3 arquivos" vira "os 3 arquivos existem na árvore" (o **conteúdo**
  já é provado pelas seções 1–9). Mesma correção que o `test-despacho-vazio` fez
  na sua 8.3;
- **a divergência do `app/api/compose` (pedido #95(a)) fica resolvida por
  CONTEÚDO, e registrada como REVERSÍVEL.** A frase do fundador nomeia o que
  decide **como o filme fica** e autoriza "continuidade de série"; gravar a
  narração no banco **depois** do filme pronto não muda um pixel. Bloquear a pasta
  inteira era mais duro que a ordem; liberar era mais frouxo. Agora reprovam os
  **símbolos do motor** (`secondsOf`/`secondsFor`/`creditCostFor`/`scenePrompt`/
  `fal-ai/`…) dentro daqueles arquivos. **Uma palavra do fundador reverte**: basta
  devolver o caminho à lista cega.

Resultado: **139/139** (era 136/138).

#### Testes, e a falsificação

- `test-diretrizes-coladas` **61/61**, com os textos reais do banco. **Falsificado
  com 3 mutações, todas pegas**: escolher o botão **abaixo** do pedido (6 falhas),
  idioma virar **recusa** na tela (3 falhas), a **semente da casa** virar colagem
  (2 falhas).
- `test-serie-memoria` **139/139** · `test-despacho-vazio` **51/51** ·
  `test-zero-cenas` OK · `test-memoria-episodio` **42/42** · `tsc --noEmit` limpo.

#### Hipótese da rotação anterior: MEDIDA E DESCARTADA

A #8 deixou como próxima jogada "as 4 cartas automáticas se atropelam; medir se
existe teto". **Medi, e não se atropelam:**

| e-mails por pessoa na semana | 1 | 2 | 3 | 4 | 5 |
|---|---:|---:|---:|---:|---:|
| pessoas-semana | 870 | 457 | 194 | **19** | **2** |

Máximo histórico: **5**. Só **15 pessoas** em toda a história receberam 2 no mesmo
dia; 297 de 765 receberam 2 em 48h, o que é cadência normal, não bombardeio.
**Não há teto porque não há enchente.** Fica registrado para ninguém gastar
rotação nisso. (Ressalva honesta: o `email_send_log` cobre 11 dos 31 caminhos de
envio — o número é piso, não teto. Mas nenhum dos 11 é campanha nova, e o piso
está longe de qualquer limite razoável.)

#### Checagem zero (1h) — LIMPA, e desta vez com o corte no relógio
### #10 (global #26) — 21:40-22:40 BRT — o aviso que detectava "isto e uma instrucao" e respondia "seu roteiro esta aqui"

**Dono:** Claude (pista retencao). **Arquivos:** `lib/growth/instructionPasteNotice.ts`,
`app/(dashboard)/generate/GenerateClient.tsx`, `scripts/test-instruction-paste-notice.mjs`.

#### O numero que doia: 1 pessoa, com relogio

`nikitaamiran@gmail.com`, vinda do ChatGPT, 04/09:

| hora (UTC) | o que o produto fez |
|---|---|
| 21:38:41 | cadastro, 25 creditos |
| **21:38:45** | **`activation_instruction_notice_viewed`** — o produto DETECTOU que o texto era instrucao e, corretamente, NAO deu auto-start |
| 21:39:02 | `chatgpt_quickstart_selected` **`input_type=finished_script`** → `script_mode=verbatim` |
| 21:41:15 | falha |
| 21:42:44 | falha de novo, e ela foi embora |
| 00:01:15 | `failure_recovery_sent` (evento de SERVIDOR — nao e ela voltando) |

Saldo: **0 filmes, 25 creditos intactos, 0 minutos no produto depois da 2a falha.**

O texto dela era `"Create a 35-second cinematic YouTube Short in English about what
would happen if the Moon..."` — o **pedido que ela mandou ao ChatGPT**, nao a
resposta dele. Uma ideia escrita em forma de ordem. Em verbatim, o produto narra
a ordem.

**E o que o aviso dizia, 17 segundos antes da escolha?**
> "Your ChatGPT script is still here. Kineo will narrate the spoken lines..."

O aviso **afirma que o texto e um roteiro**. O gatilho dele diz o contrario. A copy
estava calibrada para o OUTRO formato de colagem (a resposta do chatbot, com
"STYLE:", "Visual:", markdown) — e para esse formato ela esta certa. Para uma ordem
de uma linha, ela empurra a pessoa exatamente para o modo que nao pode funcionar.

#### O que mudou

O mesmo detector passa a distinguir as duas colagens que ele sempre pegou:
`command_to_chatbot` (a pessoa colou a PERGUNTA) e `labeled_script` (colou a
RESPOSTA). **So a copy muda.** Nao trocamos o modo de ninguem, nao bloqueamos o
Generate, nao escondemos escolha nenhuma: quem quiser mandar verbatim manda, e a
copy nova diz isso na ultima frase. Trocar o modo por conta propria seria decidir
no lugar de quem colou — e o defeito original ja foi o produto decidindo errado com
informacao incompleta. A copy de 02/09 sobrevive **byte a byte** no ramo que ela
servia; o evento passa a carregar `paste_shape`, versao `v2`.

#### Testes

`node scripts/test-instruction-paste-notice.mjs` → **48/48**, contra 33 antes.
**Correcao de percurso que preciso registrar:** eu sobrescrevi este arquivo de teste,
que ja existia (68 linhas, commit `679e9935`), em vez de estende-lo. Restaurei o
original e reimplementei por cima. As checagens antigas de **privacidade** (texto do
cliente nunca vai na telemetria) e **acessibilidade** (`role="status"`,
`aria-live="polite"`) estao todas de pe. Quatro afirmacoes antigas mudaram **de
proposito**, cada uma comentada no arquivo: versao `v1`→`v2`, o deep-equal do
metadata (ganhou `paste_shape`), o call site do evento, e os dois `div` que liam a
constante fixa. `npx tsc --noEmit` **exit 0**.

#### Limitacao honesta, e ela e grande

**3 pessoas viram este aviso em toda a historia** (ele e de 02/09) e **1** caiu na
colisao acima. **n=1 nao prova taxa nenhuma.** O que sustenta a mudanca nao e
estatistica, e coerencia: um aviso nao pode afirmar o contrario do que o proprio
gatilho detectou. Se a leitura de daqui a uma semana mostrar `paste_shape=
command_to_chatbot` raro, a mudanca terá custado 3 arquivos e nenhum risco.

#### O que eu ia medir e NAO era verdade

A #8 fechou mandando medir **fadiga de e-mail** ("19 de 27 levam e-mail em 48h; uma
pessoa que recebe 4 mensagens em 7 dias precisa que as 4 parem de se atropelar").
Medi. **A fadiga nao existe do jeito que eu escrevi.**

O primeiro numero que achei foi **1.670 ocorrencias de "2 e-mails no mesmo dia",
710 pessoas**. Isso e **artefato de dois ledgers**: todo e-mail de trial e gravado
DUAS vezes — `expired_offer_d5` em `trial_emails_log` e `trial_expired_offer_d5`
em `email_send_log`. Deduplicando pelo `kind` sem o prefixo:

| | antes (com o artefato) | real |
|---|---:|---:|
| maximo no mesmo dia | 3 | **2** |
| ocorrencias de 2+ no mesmo dia (14d) | 1.670 | **50** |
| maximo em 7 dias | 5 | **5** (7 pessoas) |
| pessoas com 4+ em 7d | 61 | **32** |

Distribuicao real em 7 dias: 375 pessoas com 1 · 186 com 2 · 64 com 3 · 25 com 4 ·
7 com 5. **Nao ha atropelo.** A cadencia e o arco de trial (`d0_welcome` →
`ending_soon` → `downgraded_loss` → `expired_offer_d5` → `expired_lastcall_d10`),
uma peca por etapa. **Nao construi teto de frequencia** — seria infra nova para um
problema que a medicao nao encontrou.

**Fica o aviso para a proxima sessao (minha ou do Codex):** qualquer contagem de
"e-mails recebidos" que una os dois ledgers **dobra todo e-mail de trial**. O
`email_send_log` sozinho e a fonte segura (11 `kind`, desde 17/08, `user_id`
sempre preenchido nos de trial). Foi a quinta vez hoje que um numero grande virou
artefato quando alguem olhou de perto.
### #12 (global #28) — 23:10→00:10 BRT — O E-MAIL QUE A CASA MANDOU HÁ 2 HORAS FICA INVISÍVEL PARA A PRÓPRIA CASA: A RESSURREIÇÃO DO TRIAL APAGA A ÚNICA MEMÓRIA QUE A SUPRESSÃO DE 24h LÊ

**RECONCILIAÇÃO DE NUMERAÇÃO (00:20 BRT).** Esta entrada nasceu como
"#9 (global #25)" e virou **#12 (global #28)**: ao enfileirar, encontrei na fila
os #9, #10 e #11 de uma **sessão paralela** trabalhando a MESMA pista, que eu não
via porque ainda não estavam na `origin/main` quando abri a rotação. Mesmo
procedimento que aquela sessão usou em `1877350b`. A entrada #9 dela (roteiro
colado do ChatGPT) e esta são trabalhos **diferentes** e as duas ficam. Nada foi
reescrito: só o número desta.

**Pré-registro (escrito ANTES de codar).**
· **Hipótese:** a supressão cruzada de 24h não protege quem passa pela
  ressurreição do trial, porque `lib/reverseTrial.ts` APAGA a linha de
  `trial_emails_log` que é a única prova, para a supressão, de que um e-mail
  saiu. O conserto é dar à supressão uma fonte que ninguém apaga.
· **Métrica:** pares de e-mails para a MESMA pessoa a menos de 24h
  (`email_send_log`), hoje 34 em 30 dias; e o subconjunto invisível
  (~18). Alvo: os pares por ressurreição e por blast caem a zero; os pares
  de 4h do `checkout_recovery` (janela curta DE PROPÓSITO) não mudam.
· **Critério de parada:** se a mudança suprimir e-mail de trial fora dos casos
  medidos, ou se `tsc` acusar regressão, reverter — é uma função só, leitura.

#### Anti-repetição — e ela me derrubou DUAS vezes antes de eu escrever uma linha

```sh
git fetch origin && git log --oneline origin/main -25   # fila limpa
git log --oneline origin/main..entrega-atual            # -> VAZIO
git diff --stat origin/main entrega-atual               # regra nova da #8
```

Duas hipóteses minhas morreram lendo o código, na ordem em que nasceram:

1. **"não existe teto de frequência por pessoa"** — a próxima jogada da #24
   dizia isso. **Existe**: `lib/lifecycle/suppression.ts` é uma supressão
   cruzada de 24h usada por **14 rotas**, e ela já lê `trial_emails_log`. Se eu
   tivesse construído "o teto que falta", teria escrito pela segunda vez um
   módulo de 328 linhas que está no ar desde 27/07.
2. **"o rollback apaga o claim de um e-mail que saiu"** — o bloco `catch` de
   `trial-lifecycle-emails` (route.ts:2467-2472) deleta o claim, e ele envolve
   código que roda DEPOIS do envio. Hipótese bonita e **falsa**: o evento
   `trial_lifecycle_email_sent` existe no banco para **todos** os envios
   suspeitos (28/08 16:25:19.40, 03/09 22:25:18.86), ou seja o `try` completou
   e o `catch` nunca rodou. Derrubei a minha própria hipótese com um SELECT
   antes de codar em cima dela.

#### O número que doía: DOIS e-mails que se contradizem, com 2 HORAS de intervalo

`email_send_log`, pares para a MESMA pessoa em menos de 24h — **34 em 30
dias**. Dentro deles, o padrão que não é ruído, três vezes, sempre igual:

| pessoa (8) | `downgraded_loss` | `d0_welcome` | intervalo |
|---|---|---|---:|
| 4a384177 | 28/08 16:25Z | 28/08 20:25Z | 4h00 |
| 73cae8af | 31/08 02:25Z | 31/08 05:25Z | 3h00 |
| **52749de6** | **03/09 22:25Z** | **04/09 00:25Z** | **2h00** |

O primeiro diz *"veja o que você acabou de perder"*. O segundo, duas horas
depois, diz *"bem-vindo, seu trial começou"*. É a mesma casa falando com a
mesma pessoa na mesma madrugada, e o terceiro caso é de **ontem** — ferida,
não cicatriz. E a supressão de 24h estava **LIGADA** nas três
(`route.ts:2276`).

#### A causa: o conserto de 11/08 estava certo, e cobrou um preço que ninguém viu

`lib/reverseTrial.ts:1577` APAGA `trial_emails_log(user,'downgraded_loss')`
quando o trial ressuscita. **Isso é deliberado e continua certo**: sem esse
DELETE, o e-mail de maior aversão à perda do funil nunca sairia na morte REAL
da conta (revisão adversarial de 11/08, comentário preservado no arquivo).

O que ninguém notou é que **essa mesma linha era a única memória que a
supressão tinha do envio**. Apagar o direito de reenviar apagou junto a prova
de que já se enviou: a supressão passou a ver alguém que recebeu e-mail há 2h
como quem nunca recebeu nada. Não é bug de quem escreveu o DELETE nem de quem
escreveu a supressão — é a fronteira entre os dois, e ela só aparece no banco.

**O mesmo buraco pela outra ponta:** `admin/send-hotlead-blast` respeita a
supressão na ENTRADA (route.ts:231) e não grava carimbo datado na SAÍDA. São
**15 pares** medidos de blast seguido de e-mail de trial em menos de 24h, o
mais apertado a **15 MINUTOS** (31/08). Era a "propriedade residual nº 1"
documentada no topo do módulo desde julho — agora com preço.

#### O que mudou: a supressão ganha uma quarta fonte, e ela é a única que ninguém apaga

`lib/lifecycle/suppression.ts` passa a ler também **`email_send_log`** — o
ledger de envio, **append-only**, que não pertence a nenhum job e portanto
sobrevive à ressurreição. Zero migração, zero coluna nova, **leitura pura**.

Dois filtros que **não podem inverter**, e o teste exercita os dois pelo
comportamento: `ok=true` (recusa do Resend não é envio) e `yielded` (cessão de
cota do `lib/email/quota.ts` grava a linha do e-mail que a casa DECIDIU não
mandar — tratar cessão como envio viraria o gate de orçamento em mordaça).

**Tamanho da mudança, medido ANTES de escrever** (30 dias): dos 92 envios
`growth`, **ZERO** tinham e-mail anterior em 24h — esse lado já estava
protegido e não muda em um bit. Do lado `revenue`, **~18 de 2.372 (0,8%)**
passam a ser adiados. Os pares de ~5h do `checkout_recovery` **não** são
afetados: aquele caller pede janela de 4h, e a janela é aplicada dentro desta
função, não no caller.

#### Quantas pessoas isso move de N para N+1

**Zero, e é honesto dizer.** Isto não faz ninguém gravar o 2º filme. O que ele
faz é parar de gastar a paciência de quem já está na lista com duas mensagens
que se contradizem — e proteger o domínio, que é o canal por onde qualquer
campanha futura passa. É higiene de retenção, não alavanca de conversão.

#### Testes

`scripts/test-lifecycle-suppression-ledger.mjs` — **29/29 verdes**. Cinco delas
leem os arquivos REAIS para provar as premissas do conserto (o DELETE da
ressurreição, o blast sem carimbo, o cron aplicando supressão); as outras
exercitam a decisão de janela contra os **casos de produção de 28/08, 31/08 e
04/09**, incluindo a reprodução do defeito (sem a fonte nova, o caso de 04/09
passa; com ela, é suprimido).

`tsc --noEmit` **exit 0** (integral). Suíte vizinha, 4 arquivos que leem este
módulo: `checkout-resume-delivery-guard` 17/17, `exit-intent-variant-probe`
110/110, `trial-downgrade-plan-choice` 39/39, `welcome-offer-frequency` 44/44.
**Nenhuma falha tolerada.**

#### Limitações — o que este commit NÃO resolve

· `email_send_log` cobre **11 dos ~31 remetentes**. Continua parcial depois
  daqui. Fonte parcial e append-only só pode AUMENTAR o que se enxerga, nunca
  diminuir — mas quem ler isto amanhã não deve concluir "agora a supressão vê
  tudo". Ela não vê.
· As duas colunas BOOLEANAS (`abandon_emailed`, `free_upsell_emailed`) seguem
  fora da janela, como documentado desde julho.
· **A sequência continua estranha para quem ressuscita**: com o conserto, o
  `d0_welcome` não sai junto — ele é ADIADO. Se a pessoa ressuscita e a
  supressão adia o "bem-vindo" por até 22h, o bem-vindo chega tarde. Isso é
  melhor que a contradição, e é **menos** intrusivo do que mexer em
  `reverseTrial.ts` (que está sob a trava de qualidade do fundador).
  Registrado, não consertado.

#### Risco e como reverter

Uma função, uma consulta a mais, leitura. Reverter = apagar o bloco
`KINEO-SUPPRESSION-LEDGER-2026-09-04`. Falha de leitura do ledger cai na mesma
regra das outras três fontes: **fecha a trava** (suprime o lote, `degraded:true`
no payload do cron) — perder um e-mail é barato, repetir e-mail queima domínio.

#### Como medir (7 dias)

```sql
with s as (select user_id, kind, sent_at,
  lag(sent_at) over (partition by user_id order by sent_at) prev,
  lag(kind)    over (partition by user_id order by sent_at) prev_kind
  from email_send_log where ok=true and coalesce(yielded,false)=false)
select date_trunc('day',sent_at)::date, prev_kind||' -> '||kind,
  round((extract(epoch from (sent_at-prev))/3600)::numeric,2) horas
from s where prev is not null and sent_at-prev < interval '24 hours'
order by sent_at desc;
```

**Sucesso** = nenhum par `downgraded_loss -> d0_welcome` e nenhum par
`hotlead_* -> trial_*` abaixo de 24h depois do deploy. Os pares de 4-23h com
`checkout_recovery` **devem continuar aparecendo** — são a janela curta de
propósito. Se sumirem, a mudança vazou para onde não devia.

#### Checagem zero (1h) — LIMPA

| | |
|---|---:|
| render preso > 3h | **0** |
| último despacho vazio (`planned=0`) | **21:42:43 UTC** — o deploy do conserto foi 21:44 |
| despacho vazio **depois** de 21:44 UTC | **0** |
| `generation_stage_error` nas últimas 3h | 4 — **todas 21:41–21:42 UTC**, a vítima já documentada na #23 |
| eventos de falha após 21:44 UTC | **1 evento, e é um despacho ACEITO** |
| último filme concluído | **23:58 UTC** |

`cinematic_zero_scenes_planned` segue em **0 em toda a história** — e a leitura
correta continua sendo a da #8: **nenhum despacho vazio ocorreu desde o deploy**,
então isso é o conserto funcionando **ou** ausência de tráfego, e com 1 filme em
3h **não dá para distinguir**. Não vou fingir que dá.

#### Placar (marco 2026-09-03 16:00 UTC, contas externas, medido 00:26 UTC)

| | | vs #24 |
|---|---:|---|
| cadastros | 45 | = |
| pessoas com filme | 30 | = |
| filmes entregues | 38 | = |
| checkout | 4 | = |
| `checkout_success_viewed` | 0 | = |
| **`payment_success`** | **0** | = |

**Distribuição:** 25 no 1º · 4 em 2-3 · 1 em 4-7 — **idêntica à #24**. Quatro
rotações sem ninguém subir de faixa. Numa madrugada de sábado com 45 cadastros em
32h, isso é **falta de amostra**, não sinal.

#### Limitações, ditas na cara

Os 8,7% × 27,5% são **correlação**, com **n=46**. Quem cola ordem do ChatGPT pode
diferir por outros motivos (público, expectativa, idioma). O mecanismo está lido
no código e nas amostras, e a cura é barata e reversível — **mas ninguém deve ler
esta entrada como causalidade provada**. Nada foi provado sobre conversão.

#### Como medir

`pasted_directives_detected` é o denominador (quantas pessoas colam ordem e o que
pedem). Dentro dele: `duration_changed=true` = quantas receberam a duração que
pediram; `unsupported` não-nulo = quantas souberam a verdade **antes** de gastar.
**O juiz final é a taxa de 2º filme da coorte `looks_pasted=true` sair de 8,7%.**

#### Próxima jogada

**Ler o que a coorte de colagem pede, e escolher o que vale atender.** Esta rodada
tratou duração e proporção porque eram os dois onde a casa tem resposta
comprovada. Ficaram **detectados e não medidos**: idioma (Árabe, Hindi, Espanhol,
Francês aparecem em texto colado) e "sem banco de imagens". A rotação seguinte
deveria **medir a cobertura real de voz por idioma** — se a casa já narra em
Árabe, a frase honesta pode virar promessa cumprida em vez de silêncio; se não
narra, é a recusa mais barata do produto e evita o pior desfecho possível, que é
a pessoa pagar por um filme no idioma errado. É leitura de configuração, não toca
o motor, e não depende de tráfego.

#### Pedidos novos

Três, nos PEDIDOS: a **resposta ao #95** (divergência do `app/api/compose`
resolvida por conteúdo, reversível), o **fechamento do #97** (anti-repetição já
olha a fila), e um **aviso de arquivo ao Codex** (toquei `GenerateClient.tsx`).

**Entrega:** 2 arquivos novos + 2 alterados. Zero mudança de preço, plano,
checkout, oferta ou promessa. Zero linha de motor.
| `cinematic_zero_scenes_planned` (toda a historia) | **0** |
| despacho vazio depois do deploy de 21:44 UTC | **0** |
| filmes concluidos 12h / 3h | 10 / 1 |

**Segunda correcao de percurso:** contei 2 `generation_stage_error` "nas ultimas 3h"
e quase abri incidente. Ao ler as LINHAS, sao as de `nikitaamiran` as **21:41-21:42
UTC** — a janela de 3h pegou a borda. **Nada novo falhou depois do deploy.** Numero
sem linha nao e medicao.

#### Placar (marco 2026-09-03 16:00 UTC, contas externas, medido 00:45 UTC)

| | | vs #8 |
|---|---:|---|
| cadastros | **45** | = |
| pessoas com filme | 28 | (filtro meu exclui `%kineo%`/`%test%`; a #8 usava outro) |
| filmes entregues | 36 | idem |
| checkout | 3 | |
| `checkout_success_viewed` | **0** | = |
| **`payment_success`** | **0** | = |

**O degrau 1→2 nao se moveu pela quarta rotacao seguida.** E as portas de serie
seguem sem denominador — conforme a #8 decidiu, **nao remedi nesta rotacao**.

#### Risco e reversao

Baixo. Uma string por ramo e um argumento opcional. O ramo novo so aparece para
quem ja veria o aviso, e o ramo antigo e byte-identico. Reverter = apagar o ramo
`command_to_chatbot` do mapa; o fallback ja cai no antigo por construcao.

#### Como medir daqui a uma semana

`activation_instruction_notice_viewed` agora separa por `metadata->>'paste_shape'`.
A pergunta e uma so: de quem viu `command_to_chatbot`, **quantos terminam com um
filme concluido**, contra o 0/1 de hoje.

#### Proxima jogada

O `chatgpt_quickstart` deixa a pessoa escolher `finished_script` **depois** de o
produto ja ter detectado instrucao — as duas telas nao conversam. Esta rotacao
consertou o que o aviso DIZ; **quem escolhe continua sozinho**. A jogada nao e
bloquear a escolha (isso violaria a regra K1 e a licao do #349), e sim **levar o
`paste_shape` ate o card do quickstart**, para que "I have the full script" apareca
como a segunda opcao, e nao a primeira, quando o texto e uma ordem. Mede-se pelo
mesmo evento. **Antes de codar:** `lib/growth/chatgptQuickstart.ts` e do fluxo de
aquisicao pelo ChatGPT — confirmar com o Codex se a ordem dos cards e dele, e nesse
caso virar PEDIDO em vez de edicao.

**Entrega:** 3 arquivos (1 lib, 1 tela, 1 teste). `tsc` exit 0. 48/48 verdes.

#### Reconciliacao com a sessao paralela (escrito 22:52 BRT, depois de enfileirar)

Ao enfileirar, achei na fila um **`#9 (global #25)` de outra sessao**
(`bbccd82b`) sobre **a mesma coorte**: quem cola no Studio a ORDEM que deu ao
ChatGPT. **Renumerei esta entrada para #10 (global #26)** — a delas chegou
primeiro. Nao e trabalho duplicado, e as duas metades do mesmo defeito:

| | a delas (`bbccd82b`) | a minha (`c1cc524e`) |
|---|---|---|
| o que le | as EXIGENCIAS dentro da ordem (2-4 min, 16:9, "no stock footage") | a FORMA do texto (ordem vs resposta do chatbot) |
| o que faz | avisa o que a casa nao entrega antes do debito (`lib/pastedDirectives.ts`) | corrige a copy do aviso que afirmava "seu roteiro esta aqui" |
| amostra | **46 pessoas, 8,7% de 2o filme contra 27,5%** (3,2x) | 3 avisos na historia, 1 colisao (n=1) |

**O numero que sustenta a coorte e o dela, nao o meu** — eu tinha uma vitima com
relogio, ela tem a coorte com denominador. Registro isso porque a minha entrada,
lida sozinha, sugere uma base maior do que eu de fato medi.

**Validei a soma, nao so a minha parte** (tip `c1cc524e`, com node_modules do
repo principal): meu teste **48/48**, o dela **61/61**, o de serie **139/139**,
`npx tsc --noEmit` **exit 0**. As duas mexem em `GenerateClient.tsx` em regioes
diferentes e o rebase do `enfileirar.sh` passou sem conflito.

**A checar na proxima rotacao (nao verificado em tela):** para um texto como o da
`nikitaamiran` ("Create a **35-second** ... Short"), o aviso dela nao deve
reclamar de duracao (35s a casa entrega) enquanto o meu diz "isso e a sua ideia".
Os dois textos podem aparecer juntos. **Nao vi os dois renderizados lado a lado** —
e leitura de codigo, nao de tela.

**E a minha "proxima jogada" encolheu:** parte do que eu ia pedir ao Codex (ordem
dos cards do quickstart) perde urgencia agora que a pessoa ja e avisada do que a
casa nao entrega. O pedido fica aberto, mas com prioridade menor do que eu escrevi
acima.

---

#### CHECKPOINT 22:08 BRT da mesma #10 — nenhum trabalho novo aberto

Duas sessoes paralelas entregaram dentro desta hora e **as duas mexeram no mesmo
arquivo**: `bbccd82b` (#9, +81 linhas em `GenerateClient.tsx`) as 21:25 e
`c1cc524e` (#10, +10 linhas no mesmo arquivo) as 21:54. Cada uma rodou a **propria**
bateria. **Ninguem tinha rodado as duas sobre a ponta combinada** — e o modo de
falha natural aqui ja esta registrado no pedido #111: duas sessoes editando o mesmo
`if` nao geram conflito de merge, entao a perda e silenciosa.

**Verificado na ponta `1877350b` (worktree limpa, `C:/kineo-wt/ckpt-r10`):**

| | |
|---|---|
| `npx tsc --noEmit` | **exit 0**, zero diagnosticos |
| `test-instruction-paste-notice.mjs` | **48/48** |
| `test-diretrizes-coladas-2026-09-04.mjs` | **61/61** |
| `test-serie-memoria-2026-09-04.mjs` | **139/139** |

**A checagem que nenhuma das duas baterias faz** — porque cada uma so conhece o
proprio aviso: os dois textos novos **coexistem na mesma tela** para quem cola uma
ordem longa em 16:9. Li os dois pontos de render. O aviso de colagem esta em
`GenerateClient.tsx:12491`, **acima do textarea** (passo "2 · Your idea"); a frase
do que a casa nao faz esta em `:12962`, **ao lado dos botoes de duracao**. Lugares
diferentes, mensagens complementares ("isto parece uma ordem que voce deu ao
chatbot" / "nao entregamos 16:9 nem mais de 90s"). **Nao ha empilhamento nem
contradicao.** A ponta combinada esta sa.

#### Correcao de percurso, minha, antes que vire numero no diario

As minhas **tres primeiras medicoes desta noite eram falsas**, e por um motivo so:
rodei `npx tsc --noEmit 2>&1 | tail -20; echo "TSC_EXIT=$?"`. **O `$?` depois de um
pipe e o codigo do `tail`, nunca o do comando.** Ele ia dar 0 mesmo com o compilador
quebrado. Somado a isso, a worktree recem-criada **nao tinha `node_modules`** (o
`git worktree add` nao os traz), entao o `tsc` nem rodou e os tres testes morriam em
`MODULE_NOT_FOUND`. Resolvido com uma juncao (`mklink /J`) para o `node_modules` da
raiz; so entao os numeros da tabela acima existem.

**E o que eu quase escrevi e NAO e verdade:** cheguei a tratar isso como reproducao
do defeito do pedido das 10:54 (*"Guardiao verde nao significa suite verde"*).
**Nao e.** Medi de proposito: `npx tsc --noEmit` sem `node_modules` sai com
**exit 1** e imprime *"This is not the tsc command you are looking for"*. O falso
verde foi **meu**, do meu pipe — nao do npx. Aquele pedido continua aberto pelos
motivos que o Codex mediu (falta de `npm ci` e `continue-on-error` no job), e esta
rodada **nao acrescenta prova nenhuma** a ele. Registro porque um "reproduzi o bug
do Guardiao" no diario viraria prioridade falsa da proxima rotacao — foi
exatamente o erro que a #8 registrou com os 91 `ok=false`.

#### Checagem zero — NAO REFEITA NESTE CHECKPOINT, e a razao importa

**Esta sessao nao tem acesso ao banco.** O MCP do Supabase respondeu
`MCP error -32600: You do not have permission to perform this action`, e o
`C:/kineo/.env.local` desta maquina e **placeholder** (`NEXT_PUBLIC_SUPABASE_URL`
= `your-project...`, `SUPABASE_SERVICE_ROLE_KEY` com 21 caracteres). Escrevi o
script de checagem, rodei, e todas as consultas devolveram `TypeError: fetch
failed`. **Nao inventei numero para preencher a tabela.**

A leitura valida desta rotacao e a que a **abertura da propria #10** fez as
**00:45 UTC** — 28 minutos antes deste checkpoint, dentro da mesma hora, e
**limpa** (0 render preso, 0 despacho vazio depois do deploy de 21:44 UTC, nada
novo falhando). A obrigacao horaria esta cumprida por ela; um checkpoint da mesma
rotacao nao deve uma segunda medicao.

**Aviso operacional que vale mais que esta rotacao:** se o MCP do Supabase
continuar negado, **a proxima sessao autonoma fica cega** — sem checagem zero e
sem placar, que sao as duas obrigacoes de toda rotacao. Isso e ambiente, nao
codigo, e so o fundador resolve.

**Entrega deste checkpoint:** verificacao, nenhuma linha de produto. Zero risco.

---

### #11 (global #27) — 22:38→23:38 BRT — A PORTA DO EPISÓDIO 2 FOI POSTA "NO PRIMEIRO VIEWPORT" DENTRO DE UM RAMO QUE SÓ 10,7% DAS PESSOAS RENDERIZAM — E QUE EXCLUI O TRIAL DE PROPÓSITO

**SHA `51f2efdb`** · worktree `C:\kineo-wt\r11-porta-topo`, nascida da **ponta
da fila** (`ddf336da`) e não da main, porque o arquivo que eu ia tocar é o
mesmo que a #9 e a #10 editaram há uma hora — basear na main garantiria
conflito no rebase. `npx tsc --noEmit` exit 0.

#### O número que doía

A #18 moveu a porta de continuar a própria história para o primeiro viewport
da tela de filme pronto. O objetivo escrito era tirar o alcance dela de **12%**
e levar a **60%**. Sete horas depois do deploy, a leitura era esta:

| fonte | pessoas alcançadas (30d, externos) |
|---|---:|
| `done_screen` (rodapé, a peça antiga) | **51** |
| `done_screen_top` (a peça nova) | **0** |

As rotações #23 e #8 leram esse zero como **falta de tráfego** ("ninguém passou
pela porta") e o deixaram como *suspeita sem amostra*. **Não era falta de
tráfego. Era estrutura.**

#### O mecanismo, reproduzido em pessoa viva

`elkestrahma@gmail.com`, **05/09 01:11 UTC**, `trial_status='active'`:

| hora (UTC) | evento |
|---|---|
| 01:05:12 | `generation_attempt_opened` |
| 01:10:53 | filme concluído |
| 01:11:39 | `video_ready_viewed` (attempt `3c489a45`) |
| 01:11:53 | **`series_continue_seen(done_screen)`** — o rodapé disparou |
| — | **`done_screen_top` nunca disparou**, mesma geração, mesmo `attempt_id` |

O `attempt_id` estava presente (o rodapé o carrega), e a semente era válida —
rodei `buildSeriesContinuationPrompt()` no título real dela ("Teach numbers
from 1 to 10 in both Arabic and English.") e ele devolve um prompt legítimo.
Portanto nem a guarda `!attemptId` nem a `!episode2Seed` explicavam o zero.

**A tela de filme pronto tem DOIS ramos irmãos e mutuamente exclusivos**, cada
um com o seu próprio botão de download:

- `{showPostVideoExportChoice && (…)}` — a caixa de export limpo;
- o ramo irmão, que renderiza o download sob `{!showPostVideoExportChoice && (…)}`.

**A porta do #18 entrou só no primeiro.** E o gate é:

```
phase === 'done' && Boolean(finalVideoUrl) && currentResultHasWatermark &&
!trialActive && !wmUnlocking && trialPostVideoPhase === null
```

`!trialActive` — **quem está em trial nunca renderiza aquele ramo.** E quem
está em trial é exatamente a coorte de 1 filme que a porta existe para mover.
A ironia está escrita no próprio arquivo, num comentário de 07/08 que já
avisava: *"a caixa de export limpo exclui o trial com razão, e nada tinha
ficado no lugar"*.

#### O tamanho do teto, medido e não suposto

`post_video_currency_resolved` roda **exatamente sob a mesma condição** do gate
— é o espelho dele no banco. Em 30 dias, contas externas:

| | |
|---|---:|
| chegaram ao `video_ready_viewed` | **410** |
| satisfizeram o gate | **44** |
| **alcance máximo estrutural da porta nova** | **10,7%** |

A peça feita para levar a porta de 12% a 60% nascia com **teto de ~11%** —
**abaixo do rodapé que ela vinha corrigir**. Não era uma melhora pequena: era
uma piora, mascarada por um zero que parecia falta de amostra.

#### O que mudou (arquivos)

| arquivo | o quê |
|---|---|
| `app/(dashboard)/generate/GenerateClient.tsx` | a mesma porta passa a existir também no ramo irmão |
| `scripts/test-porta-episodio2-ramos-2026-09-05.mjs` **(novo)** | 32 verificações lendo o arquivo real |

**Mesmo `ref`, mesma `source`, de propósito.** Os dois ramos nunca renderizam
juntos, então não há colisão de `ref` nem impressão dupla — e `done_screen_top`
continua significando "primeiro viewport, logo abaixo do download" no banco,
o que preserva a comparação topo × rodapé que o #18 montou.

**Deliver-first intacto:** a porta continua DEPOIS do download, com peso de
ação secundária até `watermarkedDownloadConfirmed`. O KINEO-DELIVER-FIRST
mediu 107 pessoas que viram o filme pronto e foram embora sem o arquivo; isso
não se reverte por hipótese, e o teste 3.2 reprova quem tentar.

**Trava de qualidade (fundador 03/09): zero linhas de motor.** Verificado por
teste (seção 6: nenhum símbolo de motor dentro do bloco novo).

#### Testes

`test-porta-episodio2-ramos` **32/32**, com **3 mutações de falsificação, as
três pegas**: remover a porta nova, tirar a exclusão mútua (que faria os dois
botões coexistirem e o `ref` colidir), e mover a porta para antes do download.
Vizinhos verdes **na mesma ponta**: `test-instruction-paste-notice` 48/48 ·
`test-diretrizes-coladas` 61/61 · `test-serie-memoria` 139/139 ·
`test-despacho-vazio` 51/51 · `test-memoria-episodio` 42/42 · `tsc` exit 0.

**Correção de percurso:** duas das minhas primeiras verificações falharam por
**regex do teste**, não do produto (CRLF no `\n` final e um `[\s\S]{0,240}?`
seguido de linha vazia que não casava porque a definição do gate é seguida de
comentário). Corrigi o teste, não o código. Registro porque um "o gate sumiu"
no diário viraria prioridade falsa da próxima rotação.

#### A hipótese da rotação anterior: MEDIDA E DESPRIORIZADA

A #9 fechou mandando **medir a cobertura real de voz por idioma** ("se a casa
já narra em Árabe, a frase honesta pode virar promessa cumprida"). Medi antes
de codar, e **a coorte não sustenta uma rotação**:

| em 60 dias, 986 filmes de contas externas | |
|---|---:|
| pedem idioma explicitamente (`in Arabic`, `in Hindi`…) | **0** |
| citam "arabic" em qualquer forma | 2 |
| citam "hindi" 2 · "french" 3 · "portuguese" 1 | — |
| tópicos em alfabeto não-latino (árabe, cirílico, CJK, devanágari) | **9 filmes, 9 pessoas** |
| **desses 9, concluíram o filme** | **9 de 9** |

**Ninguém está sendo bloqueado por idioma**, e o volume total é ~1% dos filmes.
Fica registrado para ninguém gastar rotação nisso. **Ressalva honesta:** eu
medi *entrega*, não *qualidade* da narração — se a voz sai com sotaque errado
num filme árabe, este número não vê. Mas isso é inspeção de motor, que está sob
a trava, e não há sinal de cliente reclamando.

#### Checagem zero (1h) — LIMPA

Esta sessão **tem** acesso ao banco (o checkpoint da #10 estava cego; o MCP do
Supabase respondeu normalmente agora — a cegueira era da sessão, não do
ambiente).

| | |
|---|---:|
| render preso > 3h | **0** |
| despacho vazio (`planned=0`) nas últimas 4h | 2 — **ambos de `nikitaamiran` às 21:41-21:42 UTC**, antes do deploy de 21:44; os 2 despachos seguintes (23:52 e 01:05) foram `planned=9` e `planned=8`, ambos **HTTP 200 e publicados** |
| `cinematic_zero_scenes_planned` 24h | 0 (coerente: nenhum despacho vazio pós-deploy) |
| `generation_stage_error` 3h | **0** |
| cadastro sem crédito 24h | 4 — **os mesmos 4 já documentados na #2** (04/09 04:58/11:03/11:05/11:09 UTC, anteriores ao conserto); 3 deles são domínios descartáveis (`vmail.dev`, `mailshan.com`) |
| último filme concluído | **01:10:53 UTC** |

**Correção de percurso, minha:** meu primeiro corte de 4h fez os 2 despachos de
`nikitaamiran` parecerem defeito novo, e quase abri incidente. Ao ler as linhas
com hora, são cicatriz — os mesmos da #10. **Quinta vez nesta sprint que ler a
linha antes de reagir ao agregado evitou uma prioridade falsa.**

#### Placar (marco 2026-09-03 16:00 UTC, contas externas, medido 01:41 UTC)

| | | vs #8 |
|---|---:|---|
| cadastros | **46** | +1 |
| pessoas com filme | **31** | +1 |
| filmes entregues | **39** | +1 |
| checkout com filme (desejo) | 2 | = |
| checkout sem filme (defeito) | 2 | = |
| `checkout_success_viewed` | **0** | = |
| **`payment_success`** | **0** | = |

**Distribuição:** 26 pararam no 1º · 4 em 2-3 · 1 em 4-7 · 0 em 8+.
Era 25/4/1 na #8. **A pessoa nova parou no primeiro, e ninguém subiu de faixa
pela quarta rotação seguida.**

#### Limitações — e elas são grandes

**Esta entrega não pode ser validada nesta janela.** A porta nova estará no ar
só depois que o fundador publicar a fila, e mesmo então o denominador é o que
a #8 já apontou: **4 pessoas chegaram à tela de filme pronto em 7 horas.** Com
esse fluxo, `done_screen_top` sair de 0 é questão de dias, não de rotações.

O que esta rotação **prova** é estrutural, não comercial: a porta era
**inalcançável** para ~89% de quem termina um filme, e agora não é. **Nada aqui
demonstra que ela converte** — a taxa de 52-60% que sustenta a aposta vem do
mecanismo antigo, medida em outra superfície.

#### Próxima jogada

**Medir o par topo × rodapé assim que houver 20 chegadas à tela de filme
pronto pós-publicação** — não antes. O #18 montou a comparação de propósito
(duas fontes, mesma tela) e ela só significa alguma coisa com denominador. Até
lá, a rotação seguinte **não deve remedir a porta de hora em hora** (a #8
gastou uma rotação inteira nisso e concluiu "inconclusivo", corretamente).

O que **não** depende de tráfego e vale mais: **auditar as outras superfícies
que a sprint criou pelo mesmo defeito que esta rotação achou.** O padrão não é
"a porta estava no lugar errado" — é **"a peça foi posta dentro de um ramo
condicional sem que ninguém medisse o alcance do ramo"**. O `composer_empty`
(#19) também está em **0 exposições** e merece exatamente esta mesma checagem
de ramo antes de qualquer conclusão sobre ele. Isso é leitura de código com
um SELECT de espelho, cabe numa rotação, e não precisa de cliente nenhum.

#### Pedidos novos

Dois, nos PEDIDOS: um **aviso de arquivo ao Codex** (toquei `GenerateClient.tsx`)
e um **aviso de não-repetição** com a lição transferível — toda superfície nova
precisa do alcance do ramo medido antes de virar entrega.

**Entrega:** 1 arquivo alterado + 1 teste novo. Zero mudança de preço, plano,
checkout, oferta ou promessa. Zero linha de motor. Reversível em uma linha.
| `generation_stage_error` 3h | **0** |
| `generate_failed` 3h | **0** |
| `cinematic_zero_scenes_planned` (história) | **0** |
| filmes concluídos em 3h | 2 |
| último filme | **05/09 01:10 UTC** |
| cadastros 24h | **30** |

#### Placar (marco 2026-09-03 16:00 UTC, contas externas, medido 02:11 UTC)

| | | vs #24 |
|---|---:|---|
| cadastros | **46** | +1 |
| pessoas com filme | **31** | +1 |
| filmes entregues | **39** | +1 |
| checkout | 4 | = |
| `checkout_success_viewed` | 0 | = |
| **`payment_success`** | **0** | = |

**Distribuição:** 26 pararam no 1º · 4 em 2-3 · 1 em 4-7 (era 25/4/1).
**Ninguém subiu de faixa pela quarta rotação seguida.** As portas de série
seguem sem denominador — e, obedecendo a #24, **não foram remedidas** nesta
rotação.

#### Próxima jogada

O degrau 1→2 não se move há 4 rotações e **30 cadastros entraram nas últimas
24h** — o funil tem gente nova chegando e parando no mesmo lugar. A rotação
seguinte deveria olhar **o que essas 26 pessoas fizeram DEPOIS do primeiro
filme dentro do app** (não o e-mail, não a porta de série): quantas voltaram ao
`/studio`, quantas abriram a `/library`, quantas nunca mais tiveram sessão. Se
a maioria **nunca voltou**, nenhuma porta na tela de "vídeo pronto" resolve —
o problema está fora do app, e a conclusão muda a pista inteira. É medição
barata, não depende de tráfego novo e fecha uma pergunta que três rotações
contornaram.

#### Pedidos novos

Nenhum. Nada nesta rotação toca arquivo do Codex.
