# NOITE AUTÔNOMA 02→03/09/2026 — relatório

> Sessão sozinha, sem shell, sem push, sem gasto. Só leitura de banco + leitura
> de código + escrita de documentos.
> **Nenhum arquivo de produção foi alterado.** Nenhum e-mail enviado. Nenhum
> crédito gasto. Nenhum dado apagado.

---

## ✅ O QUE VOCÊ PRECISA FAZER

1. **Decidir o gate de narração** (§3). Uma constante: `MIN_COVERAGE` em
   `lib/narrationFit.ts:148`, hoje `0.95`. Ele barrou **41 renders de 31 pessoas
   em 14 dias**, e **16 dessas pessoas nunca entregaram um único vídeo**. Baixar
   para `0.70` transformaria 24 dos 41 bloqueios em filmes entregues. O próprio
   arquivo já documenta como reverter. **Não mexi.** Preciso do seu "vai".
2. **Ler `docs/REGUA-REAL-POR-MOTOR-2026-09-03.md`** e confirmar a recomendação:
   **não mexer em nenhuma constante de palavras por segundo.** Nem 3,1 nem 2,3.
3. **Descobrir o que aconteceu no TAAFT em 02/09** (§4). Foram **33 cadastros
   num dia** contra 2-4/dia na semana inteira. Se você souber o que causou
   (posição na lista, newsletter, ranking), é repetível — e foi o maior evento
   de tráfego da semana.
4. **Escrever para a Cintia** (`cintia@hello-chat.eu`) — a assinante nova de
   02/09. Ela está fazendo uma **série em alemão** e a continuação de série é
   exatamente o caminho que hoje entrega metade da duração (§2.2). Não redigi o
   rascunho: quero que você decida o tom antes, porque é o único cliente novo
   da semana. Digo o que eu escreveria em §6.
5. **Nada de push.** Não há entrega nova para subir. O `SUBIR-SITE.bat` não
   precisa ser clicado hoje por causa desta sessão.

---

## 📋 O QUE ACONTECEU

Fui medir a régua de duração que eu mesmo tinha acusado de estar quebrada. **Eu
estava errado, e agora está provado com número: nenhum cliente pediu 60 segundos
e recebeu menos.** Zero em 63 filmes. As constantes estão certas e não vou
encostar nelas.

Mas o caminho até essa negativa passou por três coisas que valem mais do que a
pergunta original: um gate nosso que está matando o primeiro vídeo de uma pessoa
a cada dois dias, uma continuação de série que entrega metade do filme, e a
primeira assinante vinda do ChatGPT — que pagou **antes** de fazer o primeiro
vídeo, invertendo a regra que a gente escreveu ontem.

---

## 1. VIGIA DO FUNIL — desde 02/09 00:00 UTC

⚠ **03/09 é dia parcial** (dados até ~05:35 UTC). Não comparar 03/09 com dia
cheio.

| Métrica (contas externas) | Valor |
|---|---:|
| Cadastros | **63** |
| Vídeos entregues | **52** |
| Pessoas distintas que entregaram vídeo | **41** |
| Checkout iniciado (pessoas) | **13** |
| **ASSINANTES NOVOS** | **1** ✅ |
| Renders falhos | 12 |
| Renders presos / status ≠ completed | **0** |
| Débito sem entrega | **0** (todos os bloqueios com `charged:false` ou estorno confirmado) |
| Total de pagantes hoje | **12** (basic 2 · starter 4 · pro 2 · free-com-has_paid 4) |

### Por dia (externos) — 02/09 foi recorde

| dia | cadastros | vídeos | checkout (pessoas) | assinou |
|---|---:|---:|---:|---:|
| 28/08 | 29 | 9 | 2 | 0 |
| 29/08 | 26 | 16 | 8 | 0 |
| 30/08 | 24 | 20 | 1 | 0 |
| 31/08 | 23 | 15 | 2 | 1 |
| 01/09 | 24 | 17 | 2 | 0 |
| **02/09** | **57** | **43** | **11** | **1** |
| 03/09 (parcial) | 6 | 9 | 2 | 0 |

**02/09 fez 2,3× os cadastros e 2,7× os vídeos da média da semana.**

---

## 2. A ASSINANTE NOVA — e o que ela desmente

**cintia@hello-chat.eu** · Starter · Espanha · veio do **ChatGPT**
Pagou **$7,00** (`cs_live_b18TFksN…`) em **02/09 20:22 UTC**, **32 minutos depois
de criar a conta**.

Linha do tempo dela, na ordem exata:

| hora (UTC) | o que fez |
|---|---|
| 19:50 | cadastro, `utm_source=chatgpt` |
| 20:06 | abriu checkout do **Pro** — **sem ter feito nenhum vídeo** |
| 20:19 | colou um **roteiro pronto** vindo do ChatGPT (`input_type: finished_script`, 999 caracteres) |
| 20:22 | abriu checkout do **Starter** e **pagou** |
| 20:40 | primeiro vídeo (Kineo 1, 35s) |
| 20:44 | **baixou o vídeo duas vezes** |
| 20:57 | segundo vídeo |

### O que isso muda em duas regras que a gente escreveu

**Regra de 02/09 §4** — *"checkout de conta sem vídeo é defeito, não desejo."*
**Precisa de exceção.** A Cintia abriu o checkout com zero vídeos e comprou. A
diferença entre ela e os `trial_ended` de frustração é que **ela chegou com o
material na mão**. Quem traz roteiro pronto já decidiu comprar a ferramenta
antes de testar; quem tropeça no paywall com 25 créditos intactos não.
Sugestão de leitura nova: **separar "checkout sem vídeo COM roteiro colado"
(desejo) de "checkout sem vídeo e sem input" (defeito).**

**Regra de 14 dias §6** — *"os 4 pagantes vieram da própria ideia; ChatGPT
quickstart tinha 0 pagantes."* **Agora tem 1.** O canal ChatGPT entrega 13-21
cadastros por dia, todo dia, e acabou de produzir o primeiro pagante. Não é mais
um canal de curiosos.

### Os outros 12 checkouts, classificados pela régua nova

| perfil | pessoas | leitura |
|---|---:|---|
| tinha vídeo entregue | **8** | desejo |
| **zero vídeos, 25 créditos intactos** | **5** | paywall cedo demais ou defeito |

O caso mais gritante: `dd292444@gmail.com` bateu no checkout **10 segundos**
depois de criar a conta (05:33:04 → 05:33:14), com os 25 créditos intactos, e
cancelou 19 segundos depois. Isso não é uma pessoa avaliando preço.

---

## 3. 🔴 O ACHADO DA NOITE — o gate `narration_too_short`

**As 12 falhas de render desde 02/09 são todas o mesmo evento.** Zero falha de
fornecedor, zero render preso, zero cobrança indevida. Todas são o **nosso
próprio código recusando montar o filme**.

A mensagem que a pessoa recebe, textual, tirada de `events.metadata->>'error'`:

> *"Your script is about 33 seconds of narration, but you asked for a 35-second
> video — that would leave roughly 2 seconds of music with no story being told.
> **Add about 2 more words.**"*

**Duas palavras.** O produto se recusou a fazer o filme e mandou a pessoa voltar
e digitar duas palavras.

### Quem levou o bloqueio desde 02/09 (10 pessoas, 12 bloqueios)

Todos nos **primeiros minutos de vida da conta** — é o *primeiro vídeo*, que
segundo a nossa própria medição de 14 dias **é o produto**.

| pessoa | tempo desde o cadastro | fala/alvo | entregou vídeo depois? |
|---|---|---|---|
| livehigorxly | 1min40 | 33/35 (94%) | **NUNCA** |
| adrianwellsvadrian | 4min | 27/35 (77%) | **NUNCA** — e é um dos checkouts de frustração de 02/09 |
| albertopopacristian | 1min | 40/60 (67%) | **NUNCA** |
| khaledbercy | 10min | 3/35 | **NUNCA** — criou uma **segunda conta** 6 min depois (`khaledbercy477`) e levou bloqueio de novo (30/35 = 86%) |
| viralcovemedia | 1min | 33/35 (94%) | sim, depois |
| peterjk999 | 3min | 22/35 | sim, depois |
| anybodyhi5 | 5min | 51/60 (85%) | sim, depois |
| chukwuebukastanley | 3min | 48/60 (80%) | sim, depois |
| asuquoalbert07 | 6min (×3) | 3/60 | sim, depois |

**4 das 10 pessoas nunca fizeram um vídeo.** Uma delas abriu uma segunda conta.

### O tamanho do buraco, na janela de 14 dias (externos, desde 20/08)

| | |
|---|---:|
| Bloqueios | **41** |
| Pessoas atingidas | **31** |
| **Pessoas que NUNCA entregaram um vídeo** | **16** |
| Bloqueios com cobertura ≥ 70% do alvo | **24** (59%) |
| Bloqueios com cobertura ≥ 80% | 18 (44%) |
| Bloqueios com cobertura ≥ 90% | 4 |

**16 pessoas em 14 dias.** No mesmo período, 174 pessoas externas chegaram ao
primeiro vídeo. Este gate sozinho destrói **~9% do topo do funil.**

### Por que ele contradiz a sua própria regra de ouro

Você escreveu em 02/09 (§9b da memória):

> *"A régua serve para o roteiro NASCER do tamanho certo, não para o filme ser
> AMPUTADO no fim."*

O gate faz pior que amputar: com 33s de fala num pedido de 35s, ele não entrega
um filme de 33s (94% da história) — **ele entrega zero.**

### Onde está e o que custa mudar

- Constante: `lib/narrationFit.ts:148` → `export const MIN_COVERAGE = 0.95`
- Uso: `app/api/generate-video-cinematic/route.ts:~2094-2152` (devolve 422 e
  estorna)
- O comentário do próprio arquivo já diz: *"PARA REVERTER: 0.8 volta ao
  intermediário, 0.7 ao calibrado no julgamento inicial dos 6 demos."*
- A resposta 422 **já devolve `suggestedDuration`** — a UI já sabe qual botão
  caberia. O caminho mais elegante nem é baixar o corte: é **encolher o alvo
  sozinho** para o `suggestedDuration` e renderizar, como o
  `script_duration_autofit` já faz para o caso oposto (roteiro grande demais).
  Hoje o filme grande demais sobe de botão sozinho; o pequeno demais leva porta
  na cara. É assimetria, não regra.

**⚠ Isto não é novidade — é a terceira vez que aparece.** Já está escrito em
`docs/SPRINT-V1-AO-V4-2026-08-31.md` §"o guardrail de narração é o maior matador
do vídeo 1" (12 pessoas em 7 dias) e em
`docs/BRIEFING-5-DIAS-PARA-SEGUNDA-OPINIAO-2026-08-26.md` (13 ocorrências,
9 pessoas). Nunca foi consertado. Os números só pioraram.

---

## 4. TAAFT: 33 CADASTROS NUM DIA (e ninguém sabe por quê)

| dia | taaft | chatgpt | direto |
|---|---:|---:|---:|
| 28/08 | 2 | 14 | 13 |
| 29/08 | 2 | 21 | 3 |
| 30/08 | 4 | 16 | 1 |
| 31/08 | 3 | 13 | 6 |
| 01/09 | 0 | 19 | 4 |
| **02/09** | **33** | 16 | 6 |
| 03/09 (parcial, 5h) | 3 | 1 | 2 |

O tráfego não veio em rajada: veio **espalhado pelas 24 horas**, começando por
volta de 01:00 UTC de 02/09 — poucas horas depois de o listing v3.2.0 ter ido ao
ar em 01/09. Comportamento de **posição na página**, não de e-mail disparado.

Qualidade dele: **28 dos 33 fizeram vídeo (85%)** — taxa de ativação melhor que
a do ChatGPT (59%). **Zero pagaram.**

Leitura: o TAAFT é hoje o melhor canal de *ativação* e o pior de *receita*;
o ChatGPT é o contrário. Vale saber o que mudou lá, porque 33/dia repetido é
uma outra empresa.

*(Pendência antiga que ficou mais cara com isso: o screenshot da listagem do
TAAFT ainda é o antigo, "Five engines". 33 pessoas por dia estão vendo ele.)*

---

## 5. RÉGUA DE DURAÇÃO — a resposta curta

Documento completo: **`docs/REGUA-REAL-POR-MOTOR-2026-09-03.md`**.

- **Ninguém pediu 60 e recebeu menos.** 0 em 63. A hipótese de ontem morreu.
- **Palavras por segundo não é mensurável** — o banco não guarda a narração de
  nenhum vídeo (`videos.script` é NULL em 1.102 de 1.115 linhas; `videos.topic`
  é cortado em 500 caracteres e no modo "Let AI structure" guarda a *ideia*, não
  a fala). **Não estimei.** A taxa 2,63 do 3I/ATLAS é n=1, contada à mão.
- **Recomendação: não mexer em nenhuma constante.**
- Dois defeitos reais achados no caminho:
  - **Continuação de série no Kineo 1**: 22% dos filmes saem com menos de 90%
    do pedido (contra 0,9% no caminho normal). Casos reais: 17s e 20s para
    pedidos de 35s. Causa provável: o que vai para o gerador é a ordem
    *"Create the next episode in the same Short series about…"*, não um assunto.
  - **11 dos 63 filmes de "60s" saíram com exatamente 60,0s** — o Creator
    Rewards do TikTok não paga por eles. 7 no Kineo 1, 4 no Seedance 1.5.

---

## 6. PRÓXIMA JOGADA — três, em ordem de retorno

**1. O gate vira degrau, não porta (o dinheiro está aqui).**
Quando a fala não enche o botão, **descer o alvo sozinho** para o botão que ela
enche e renderizar — o espelho exato do `script_duration_autofit`, que já existe
e já funciona para o caso contrário. Retorno estimado do histórico: 24 dos 41
bloqueios viram filme. Isso é **16 pessoas por quinzena** que hoje vão embora
sem ver o produto funcionar uma vez.
*Por que é não-óbvio:* a gente vem tratando isso como "qualidade" — proteger o
cliente de um filme com silêncio no fim. Mas o dado diz que 59% dos barrados
tinham 70%+ da história pronta, e que a alternativa que a gente escolheu para
eles foi **nada**. Nenhum cliente jamais reclamou de filme curto; 16 sumiram
depois de receberem erro.

**2. "Traga seu roteiro pronto" vira a porta de entrada, não um atalho escondido.**
50 pessoas em 14 dias chegaram do ChatGPT com roteiro pronto no bolso
(`input_type: finished_script`), e a única assinante da semana é uma delas — que
**pagou antes de testar**. É o perfil que menos precisa ser convencido: já fez o
trabalho, só quer a máquina. E é, ironicamente, o perfil que mais bate no gate
do §3 (6 dos 13 bloqueados vindos do ChatGPT tinham roteiro pronto), porque
roteiro escrito por humano nunca cai exatamente em 35/60/90.
*A jogada:* uma landing `/paste-your-script` — "cole seu roteiro, escolha a voz,
receba o filme em 3 minutos" — apontada no ChatGPT e no TAAFT. Zero criatividade
exigida da nossa parte, e vende para quem já está com o cartão na mão.

**3. Série é o produto de retenção que a gente já tem e está quebrado.**
A assinante nova está fazendo *Teil 1* de alguma coisa. Série é a única razão
pela qual alguém volta amanhã — e a continuação hoje entrega metade do filme em
22% das vezes. Consertar a série é consertar a **segunda** compra, que é a que
faz MRR.
*Por que é não-óbvio:* a gente mede "fez o 2º vídeo?" como métrica de ativação,
mas o mecanismo que produz o 2º vídeo é justamente o que está defeituoso. O
funil não está furado no topo aqui — está furado no lugar exato onde nasce a
recorrência.

---

## 7. ⛔ O QUE EU DECIDI **NÃO** FAZER ESTA NOITE — e por quê

Esta lista é tão importante quanto o resto do documento.

1. **Não toquei em `MIN_COVERAGE`, `narrationFit`, `compose`, `generate-script`
   nem `expand-script`.** Era ordem explícita, e é a mudança com maior chance de
   quebrar coisa boa. Entreguei o número; a decisão é sua.
2. **Não mudei nenhuma constante de palavras por segundo.** A medição não
   sustenta mudança nenhuma, e "está tudo muito perfeito hoje" é evidência que
   vale mais que uma constante bonita.
3. **NÃO fiz a Tarefa 3 (copy de vertical/16:9) — e recomendo NÃO fazer.**
   Este é o item mais importante desta lista. O briefing dizia que hoje já
   tínhamos corrigido `lib/comparisons.ts`, `lib/kineoFacts.ts`, `/llms.txt` e
   `/sora-alternative` com o argumento *"o quadro é GERADO, não recortado"*.
   **Fui verificar e as duas metades da premissa não se sustentam:**
   - Na árvore principal, os quatro arquivos **continuam dizendo "9:16 vertical
     only"** (`comparisons.ts:339`, `kineoFacts.ts:470` e `:576`,
     `llms.txt/route.ts:257`, `sora-alternative/page.tsx:116`). A correção não
     está aqui.
   - E, mais grave: **hoje a afirmação antiga é VERDADE.**
     `lib/renderProfile.ts:97-101` fixa `width: 1080, height: 1920` como o único
     perfil de render, e não existe nenhum seletor de proporção em
     `/api/compose` nem em nenhuma tela.
   Trocar a copy para dizer que a Kineo entrega 16:9 seria criar exatamente o
   defeito nº 4 da auditoria de 28/08 — **"copy que mente"** — e desta vez em 28
   páginas de SEO de uma vez. Só depois de o produto renderizar 16:9 de verdade
   é que essa copy pode mudar.
4. **Não abri worktree, não commitei, não escrevi bat, não pedi push.** Não há
   código para entregar; escrever um `1-TESTAR-E-SUBIR-TUDO.bat` sem mudança
   dentro só arrisca a fila.
5. **Não escrevi rascunho para a Cintia.** É o único cliente novo da semana e o
   primeiro do canal ChatGPT — o tom dessa primeira mensagem é decisão de dono,
   não de executor. Deixei o contexto pronto em §2 para você decidir em um
   minuto.
6. **Não implementei a telemetria de palavras** (`narration_word_count`)
   recomendada no §6 do doc da régua, mesmo sendo inofensiva. É código de
   produção numa noite cujo mandato era medir.
7. **Não rodei render nenhum**, nem dry-run. Nenhum crédito e nenhum dólar de
   fal foram gastos.
8. **Não mexi nos vigias, crons ou tarefas programadas.** As sprints continuam
   desligadas, como você decidiu em 02/09.
