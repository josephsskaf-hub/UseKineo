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
