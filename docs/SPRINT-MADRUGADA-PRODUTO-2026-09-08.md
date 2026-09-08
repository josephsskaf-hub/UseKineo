# SPRINT MADRUGADA — PRODUTO (não-vendas) — 08/09/2026

Janela: 2026-09-08 01:30 → 09:30 BRT. Uma rotação a cada 30 min.
Marco de medição desta pista: **2026-09-08 04:30 UTC** (01:30 BRT).

## A ORDEM DO FUNDADOR (08/09 00:20 BRT)
"Essa madrugada quem vai focar em vendas vai ser o ChatGPT (Codex). A gente vai
focar em OUTRAS coisas, pra ter uma mudança e pensamentos diferentes."

Esta pista **não vende**: não toca preço, checkout, carta de venda, porta de $1,
/go nem páginas públicas de SEO (são do Codex esta noite).

Ordem nova (01:20 BRT) — **VERSÃO B**: acabou o trial grátis de 25 créditos e o
Kineo 1 grátis; a única entrada é o trial de $1 (7 dias, 80cr, depois $15/mês).
Já está na origin/main em `89a65eb9`.

## O RETRATO QUE GEROU AS 10 AÇÕES
112 erros de geração e 41 pessoas com tela de falha · 77 de 238 cadastros sem
filme · 5 de 12 pagantes sem filme em 30d · 0 de 1.682 vídeos com thumbnail ·
93 de 430 guardiões vermelhos · toda carta pede resposta e ninguém lê resposta ·
CLAUDE.md com tabela de preço morta · leitura truncada em 1000 em 40 pontos ·
4 telas que mostram erro de leitura como "0 créditos / sem vídeos".

---

### #1 — 01:36→02:00 BRT — M1/M2: o retrato contou EVENTOS, não pessoas — e a parede viva é outra

**O que estava errado (na minha própria lista de tarefas).**
As três causas no topo do retrato, que mandavam M1 e M2 serem as primeiras
ações, são eventos repetidos de **uma ou duas pessoas**, e todas pararam há
dias. Medido em `events.name='generation_stage_error'`, 21 dias, coluna
`pessoas` = `count(distinct user_id)`:

| causa (topo do retrato) | eventos | pessoas | dias | último |
|---|---|---|---|---|
| "Two AI attempts were just refunded" (M1) | 12 | **1** | 1 | 04/09 20:40 |
| "Our video provider did not accept the job" (M1) | 12 | **3** | 2 | 04/09 21:42 |
| `prompt_len=6228 limite=5000` (M2) | 7 | **1** | 1 | 02/09 03:30 |
| "We could not plan the scenes" | 6 | **1** | 1 | 07/09 12:32 |
| **narração curta (família inteira)** | **84** | **36** | **14** | **08/09 01:35** |

M1 e M2, como escritos, mandam gastar a madrugada em paredes de 1 a 3 pessoas
que já pararam de bater. A parede que continua batendo — inclusive cinco
minutos antes desta rotação começar — é a **narração curta**: 36 pessoas em 14
dias. É a família que vale o conserto.

**Os remédios que já existem, e o que eles cobrem.**
Antes de construir, medi os dois que a casa já tem (`lib/durationGhost.ts`,
#20 de 31/08 e #39 de 01/09). Eles resgatam o **alvo fantasma** — a pessoa
recusada por não alcançar um número (45s) que o seletor não oferece. Recorte
por tipo de alvo, extraindo os segundos de `speech=Xs target=Ys`:

| | recusas | pessoas | desde 01/09 |
|---|---|---|---|
| ALVO FANTASMA (coberto pelo #20/#39) | 18 | 15 | **1 pessoa** |
| ALVO OFERECIDO 35/60/90 (não coberto) | 28 | 21 | **17 pessoas** |

**Os remédios funcionaram**: o fantasma caiu de 15 pessoas para 1. Quem sobra
escolheu uma duração que o produto realmente oferece — e para essa pessoa
nenhum dos dois remédios faz nada. Dela é a parede de hoje.

**Onde a pessoa que sobra morre.** Quebrando a coorte de alvo oferecido:
7 pessoas quase encheram (80-95% do alvo), 1 enchia 35s e pediu 60, e
**14 pessoas escreveram menos de 33s de fala** — para essas o produto não tem
tamanho: o piso do seletor é 35s e a régua exige 95% dele (33,25s).

A saída que a casa oferece a elas é o **expansor de roteiro**. Ele alcança, mas
não entrega:

| degrau do expansor (30 dias, todos) | eventos | pessoas |
|---|---|---|
| `script_expand_autostarted` | 56 | **34** |
| `script_expanded` | 26 | 19 |
| `script_expand_failed` | 24 | **16** |
| `script_expand_accepted` | 14 | 12 |
| `script_growth_candidate_offered` | 5 | **4** |

Trinta e quatro pessoas começam a expansão; quatro chegam a ver um candidato.
E o motivo de recusa é nomeado no próprio evento:

| motivo de `script_expand_failed` | eventos | pessoas |
|---|---|---|
| **`growth_limit`** | 10 | **9** |
| `author_rewrite_rejected` | 11 | 6 |
| `network` | 2 | 2 |
| `structure_lost` | 1 | 1 |

O `growth_limit` — o teto de crescimento do expansor — é a maior causa isolada.
O cabeçalho do #39 já suspeitava dele, mas atribuía o estouro ao alvo fantasma
inflando o `missing_words`. **O fantasma morreu e o `growth_limit` continuou
barrando 9 pessoas.** A hipótese do #39 explicava parte, não o todo.

**Uma leitura minha que eu mesmo desmenti.** `script_expanded` e
`script_expand_accepted` não disparam desde 03/09 22:54, enquanto
`_autostarted` e `_failed` seguiam até 06-07/09. Parecia regressão. Não é:
desde aquele instante houve **3 inícios de 3 pessoas** e 2 falhas. Três
tentativas não provam quebra nenhuma — é pouco tráfego, e o número durável é o
agregado acima. Fica registrado para ninguém abrir hotfix em cima disso.

**Parada.** Nada de código nesta rotação: o alvo mudou de mãos no meio dela e
o alvo novo (`growth_limit`) precisa ser lido no código antes de tocado — o
teto pode ser proteção real de custo, não número arbitrário. É a ação da #2.

**Nada foi tocado em produção.** origin/main = `d15a19a3`, fila vazia.

#### ✅ O QUE VOCÊ PRECISA FAZER
Nada.

#### 📋 O QUE ACONTECEU
Antes de codar, conferi se as tarefas da madrugada apontavam para gente de
verdade. As três primeiras não: são a mesma pessoa batendo doze vezes, e ela
parou há quatro dias. A parede que ainda machuca é outra — 36 pessoas que
escreveram um roteiro e ouviram "seu roteiro é curto demais", a última delas
cinco minutos antes de eu começar. Metade dessa parede já tinha sido derrubada
por duas rodadas anteriores (o conserto funcionou: caiu de 15 pessoas para 1).
A metade que sobrou tem nome: 34 pessoas pedem ao produto para aumentar o
roteiro delas, 4 recebem uma sugestão, e o motivo campeão da recusa é um teto
de crescimento nosso. É onde a próxima rotação mexe.
