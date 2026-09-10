# Sprint O PRIMEIRO FILME É O PRODUTO — 10/09/2026

Missão: ninguém que apertar Generate fica sem filme, e o filme é do tema/estilo
que a pessoa pediu. Coorte = cadastro da restauração (evento
`trial_credits_granted` com 30 créditos), nunca relógio.

---

## r1 · 10/09 14:15 BRT — O RETRATO POR PESSOA

### Coorte

`trial_credits_granted` com 30 créditos: **9 pessoas**, de 09/09 23:08:40 UTC a
10/09 16:10:35 UTC. Duas são internas e saem do denominador
(`josephsskaf+testeste10` = sonda do afiliado AF-09; `dodo-review@usekineo.com`).
**Denominador real: 7 pessoas externas.**

### O funil, degrau a degrau, por pessoa

| degrau | pessoas | de quem chegou no degrau anterior |
|---|---:|---|
| cadastro com 30 créditos | **7** | — |
| apertou Generate | **6** | 86% |
| **recebeu o filme** | **6** | **100%** |
| fez o 2º filme | **1** | 17% |
| chegou ao checkout | **0** | 0% |
| pagou | **0** | — |

Uma pessoa (`agrawal05yash`) nasceu 05:02 e nunca apertou: saldo 30 intacto.

### Ninguém ficou sem filme — e isso está medido, não suposto

Desde o marco da restauração:

- `generation_stage_error`: **0 eventos**
- `compose_not_ok`: **0 eventos**
- `cinematic_dispatch_result`: **8 despachos, 6 pessoas** — `planned` = `accepted`
  em **8 de 8** (7/7, 7/7, 9/9, 4/4, 7/7, 4/4, 4/4, 4/4), **0 cenas rejeitadas**,
  `claim_action=published` em todos
- `videos`: **10 linhas, 10 `completed`**, MP4 presente em 10 de 10

Cuidado com o denominador (memória "zero falhas sem denominador não prova
conserto"): a taxa de 100% não vem só de `videos` — vem de `cinematic_dispatch_result`,
que é gravado no despacho e existiria mesmo se o filme morresse depois. As duas
fontes concordam. **A entrega não é o degrau seco hoje.**

### O degrau seco é o 2º filme: 6 → 1

Cinco das seis pessoas que receberam um filme não pediram o segundo, com saldo
para isso (`itztrinity323` 15cr, `vanshumraliya` 15cr, `naumnaki15` 15cr,
`theazmgang00` 22cr, `luciomaceu` 27cr). A única que fez o 2º (`xonipi1699`)
zerou o saldo e parou.

### Por que eles não voltam: o filme não é o que pediram

Cruzei o pedido (`videos.topic`) com o que foi ao fornecedor
(`cinematic_dispatch_result.submitted_prompts`) e depois rodei o classificador
real (`lib/engineFit.ts` + `lib/cinematic/sceneStyle.ts`, executados em sandbox
com os textos do banco):

| pessoa | o que pediu | classificador | look aplicado | veredito |
|---|---|---|---|---|
| `xonipi1699` 09:24 | "The Cheese Heist 🧀🐭" — rato ladrão, narrador, roteiro cômico por cena | `ok`, 1 sinal (`anthropomorphic`) | **photoreal** | ❌ falso negativo |
| `xonipi1699` 09:42 | "a funny video of cats having a silly fight" | `ok`, **0 sinais** | **photoreal** | ❌ falso negativo |
| `naumnaki15` 11:53 | terror narrativo: Emma, batidas às 3:13, mensagem do próprio número | `ok`, 1 sinal (`story_time`) | **photoreal** | ❌ falso negativo |
| `luciomaceu` 16:45 | história infantil **em português**: fazenda do Velho MacDonald, vaca dançante | `ok`, **0 sinais** | Kineo 1 (stock) | ❌ falso negativo |
| `vanshumraliya` 03:44 | "real Indian cinematic short film, **NOT** comedy, **Photorealistic** Indian cinema" | **`stock_cannot_tell`**, sinal `fantasy_creature` | — | ❌ **falso positivo** |
| controle: fatos EN e PT | "How does Shazam recognize a song…" | `ok` | photoreal | ✅ correto |

**O classificador errou em 4 das 6 pessoas que apertaram — nos dois sentidos.**

Causas exatas, uma por uma:

1. **Monoglota** (`luciomaceu`, o caso FILME-01): todo regex de `STRONG`/`MEDIUM`
   é em inglês. "história infantil", "vaca dançante", "cantiga" não existem para o
   classificador. Zero sinais num pedido que é ficção infantil pura.
2. **Roteiro em formato de cena não conta como diálogo** (`xonipi1699`): o regex
   `dialogue` exige `said|whispered|asked` junto das aspas. O formato real —
   `Narrator:\n\n"He had one job."` — não casa. Sobrou 1 sinal médio; precisa de 2.
3. **Apóstrofo e pronome quebram os sinais de personagem** (`naumnaki15`):
   `named_character_action` casa `Emma finds`, não `Emma's door`; `character_gesture`
   casa `she opened her`, não `she opened the door`. Sobrou 1 sinal médio.
4. **Pedido cômico curto não tem sinal nenhum** (`xonipi1699` gatos): "funny",
   "silly fight", "cats … dont speak human language" — nenhum regex cobre humor
   ou animais como protagonistas sem adjetivo ("cats", sem "tiny/little").
5. **`talking\s+\w+` dispara em texto documental** (`vanshumraliya`): dentro do
   sinal FORTE `fantasy_creature` (que sozinho já basta para acusar ficção), o
   ramo pensado para "talking dog" casa com **"talking about business"**,
   **"talking head interview"**, **"people talking quietly"**. Falsificado:

   ```
   DISPARA | Uncle Patel is talking about business at the Besna.
   DISPARA | a talking head interview with the CEO
   DISPARA | no fantasy here, just people talking quietly
     ok    | documentary about elephants
   ```

   Este é o pior dos cinco: manda a caixa "seu pedido é ficção" para quem pediu
   fotorrealismo com todas as letras.

### A caixa de engine fit é um degrau morto

`engine_fit_box_shown`: **1 pessoa** (`vanshumraliya`, 03:38) — e era justamente o
falso positivo. `engine_fit_warned`: 1 (03:44). **`switched` / `kept` / `overridden` /
`dismissed`: 0.** Ninguém clicou em nada. Ele acabou no Seedance às 03:44 sem que
o clique fosse registrado — ou trocou o motor à mão, ou o evento de clique não
grava. Nas duas leituras o remédio de 09/09 não tem prova de adoção.

### Fidelidade ao tempo (observação, não degrau)

`luciomaceu` pediu 35 s e recebeu **32 s** (91% do alvo, abaixo do piso de 95%).
Os demais: 39, 44, 38, 41, 35, 89 s. Nenhum caso grave; fica anotado.
`theazmgang00` entregou 89 s por 8 créditos com `topic` **vazio** — não persegui.

### Baseline da suíte (worktree limpa em `origin/main` 7a7a2441)

**484 guardiões, 109 vermelhos herdados.** Lista completa em
`C:/Users/josep/AppData/Local/Temp/claude/C--kineo/…/scratchpad/baseline-r1.txt`.
Nenhum deles toca `lib/engineFit.ts` nem `lib/cinematic/sceneStyle.ts`
(`test-motores-r2-r6-2026-09-09.mjs` está **verde**). Critério de entrega das
próximas rotações: 0 vermelhos novos sobre 109.

### Limite honesto desta medição

A coorte é de **7 pessoas externas em 17 horas**. Qualquer conserto medido nesta
janela vai ter denominador de uma dezena. Os erros do classificador, porém, não
dependem do tamanho da coorte: foram falsificados executando a lib com os textos
reais, e reproduzem sempre.

### O que fica para a r2 (16:00)

Consertar o classificador de ficção, que é a causa única dos 4 erros — e não o
caminho de entrega, que está 100%. Na ordem em que doem:

1. `talking\s+\w+` fora do sinal FORTE (falso positivo que empurra documentário
   para a caixa).
2. Sinais em **PT/ES** (pedido explícito do FILME-01).
3. Diálogo em formato de roteiro (`Personagem:` + aspas em linha própria).
4. Personagem com apóstrofo/pronome + humor/animais como protagonistas.
5. Instrumentar o clique da caixa (`switched`/`kept`) — hoje 0 de 1 registra.

Guardião novo com os 6 casos reais deste diário, falsificado por mutação.
Medição na r3 com corte no carimbo do deploy (campo novo em `metadata`).
