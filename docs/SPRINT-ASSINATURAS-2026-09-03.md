# SPRINT ASSINATURAS — 03/09/2026 → 04/09/2026 (janela de 24h)

> Diário da execução do `docs/PLANO-COWORK-ASSINATURAS-2026-09-03.md`.
> MISSÃO ÚNICA: assinaturas novas. Cadastro e vídeo são meio; assinatura é o fim.
> Marco zero: `created_at > '2026-09-03 16:00:00+00'` (13:00 BRT).
> Cada rodada lê o último `### #N` antes de escolher a jogada. Este arquivo É a
> memória entre rodadas — nenhuma delas lembra da anterior.

---

### #0 — placar de base (03/09 ~13:00 BRT, copiado do plano)

| dia | cadastros | origem dominante | vídeos | pessoas no checkout | assinou |
|---|---:|---|---:|---:|---:|
| 27/08 | 18 | chatgpt 14 | 9 | 1 | 0 |
| 28/08 | 29 | chatgpt 14 · direto 13 | 9 | 2 | 0 |
| 29/08 | 26 | chatgpt 21 | 16 | 7 | 0 |
| 30/08 | 24 | chatgpt 16 | 20 | 0 | 0 |
| 31/08 | 23 | chatgpt 13 | 15 | 1 | **1** (godofloki, Pro, chatgpt) |
| 01/09 | 24 | chatgpt 19 | 17 | 1 | 0 |
| 02/09 | **57** | **taaft 33** · chatgpt 16 | 43 | 11 | **1** (cintia, Starter, chatgpt) |
| 03/09 (parcial) | 26 | taaft 18 | 26 | 5 | 0 |

7 dias: ~230 cadastros → ~155 filmes → 28 no checkout → **2 assinaturas**.
Pagantes na vida: 12. MRR ~$120.

---

### #1 — 13:38→14:10 BRT — o nosso próprio gate de narração recusou 34 renders de ~30 pessoas em 30 dias por "faltam 2 palavras"; 24 deles tinham ≥60% de cobertura. Agora o alvo DESCE sozinho antes do custo e o filme sai.

**Placar medido no início da rodada** (externos = e-mail sem josephsskaf/usekineo/kineo.local):

| métrica | valor |
|---|---:|
| assinaturas 7d | **2** (cintia 02/09 Starter · godofloki 30/08 Pro — as duas do chatgpt) |
| cadastros 7d | 216 |
| cadastros 7d com ≥1 filme entregue | 119 (**55%**) |
| pessoas no checkout 7d | 27 |
| — checkout de **DESEJO** (tem filme) | 15 |
| — checkout de **DEFEITO** (0 filmes) | **12** |
| pagantes na vida | 12 (chatgpt 3 · taaft 4 · direto/outros 5) |
| cadastros pós-marco-zero | 0 (o marco tinha 38 min de vida) |

**Checagem zero (1h):** 0 cadastros, 0 cadastro sem crédito, 0 render preso,
0 `generation_stage_error`, 47 vídeos entregues em 24h. Nada quebrado — a rodada
podia ir direto para a jogada de maior retorno.

**O que estava errado (medido).** `narration_guard_blocked`, 30d, externos:
**34 bloqueios**. Cruzando com 14d de `generation_stage_error`: **78 bloqueios,
32 pessoas, 16 delas nunca viram um único vídeo da Kineo**. A distribuição de
cobertura (`fala ÷ alvo`) tem um degrau óbvio no próprio dado:

    94% 93% 86% 85% 84% 82% 80% 80% 78% 77% 76% 73% 71% 69% 67% 66% 63% 60%   → 24 bloqueios
    ------------------------------- degrau -------------------------------
    57% 31% 12% 9% 9% 6% 5% 5% 5% 3%                                          → 10 bloqueios

Os 24 de cima são gente que escreveu um roteiro quase do tamanho certo e levou
uma porta na cara. Os 10 de baixo são roteiros de 2 a 11 segundos de fala — ali
recusar continua sendo o certo.

**O que mudou (arquivos).**
- `lib/narrationFit.ts` (+130): função pura `autofitDown(script, requestedSeconds, {floorSeconds})`
  + constantes `MIN_AUTOFIT_DOWN_COVERAGE = 0.60`, `AUTOFIT_DOWN_FLOOR_SECONDS = 20`,
  `AUTOFIT_DOWN_FLOOR_SECONDS_HOLLYWOOD = 30`. Desce para o múltiplo de 5
  arredondado **para baixo** (FLOOR, nunca ROUND: 33s de fala → alvo 30, nunca
  35, senão o defeito renasce na 2ª tentativa) e só devolve `applied` depois de
  **verificar a régua de novo** no alvo descido.
- `app/api/generate-video-cinematic/route.ts` (+133/−20): `parseUserScript` e a
  decisão `verbatim` subiram ~900 linhas, para logo depois de `hollywoodPath`;
  `requestedDuration` congelado; `duration` desce ali — **antes** de
  `creditCostForDuration`, do fingerprint e do claim. Este é o coração da
  jogada. Evento novo `script_duration_autofit_down` com
  `credits_requested` × `credits_effective`. Dry-run e as duas respostas de
  sucesso passam a carregar `requested_duration` + `autofit_down`.
- `app/api/compose/route.ts` (+28): ponte necessária. O compose recalcula o
  custo com a duração que o **navegador** manda (o botão), não com a do claim.
  Sem a ponte, todo filme descido morreria em *"These AI clips do not match
  their signed generation"* — com todas as cenas pagas e prontas. A ponte só age
  quando o claim traz duração **menor** que o botão **e** o custo do claim bate
  exatamente com o custo dessa duração; nunca deixa o cliente esticar.
- `scripts/test-narracao-degrau.mjs` (novo, 301 linhas): **746 verificações,
  0 falhas** — inclusive lendo o `route.ts` real e provando por índice no texto
  que a descida acontece ANTES de `creditCostForDuration`.

**Por que isto é dinheiro, não higiene.** A trava vinha DEPOIS do débito. Descer
a duração ali faria a pessoa pagar 35s e receber 30s (`creditCostForDuration` é
linear nos segundos) — cobrança-surpresa, a mesma classe de erro que o
`KINEO-DURACAO-2026-08-20` existe para matar. Descendo antes do custo, custo,
claim, débito, planner, compose e resposta usam todos a mesma duração efetiva:
**zero drift financeiro**. A pessoa paga exatamente o filme que recebe.

**Para o cliente / receita.** ~16 pessoas por quinzena que hoje batem a cabeça no
gate e vão embora sem NUNCA ver um filme da Kineo passam a receber o filme. O
primeiro filme é o produto (memória de 02/09: os 4 pagantes vieram todos da
própria ideia, escrita à mão — exatamente o perfil que este gate matava).

**Decisões que tomei sozinha** (autonomia; registradas para reversão):
1. **Corte em 60% de cobertura**, não 50% nem 70%: o dado tem um abismo entre
   57% e 31%, e 0.60 fica dentro dele. Reverter a jogada INTEIRA =
   `MIN_AUTOFIT_DOWN_COVERAGE = 1.01` em `lib/narrationFit.ts`.
2. **Piso hollywood 30s, clássico 20s**: o planner hollywood trava o alvo em
   `Math.max(30, …)`; descer para 20 ali seria puxado de volta e a fala voltaria
   a faltar. Pedido de 35s com 21-29s de fala em Kling 3/H3/Omni/S25 continua no
   422 de hoje.
3. **Descida de 60s para menos de 60s é permitida** (sai do TikTok Creator
   Rewards), porque a alternativa de hoje é a pessoa não receber filme nenhum.
   Fica medida no evento: `lost_60s_floor`.

**Risco.** A ponte do compose é o ponto sensível: ela muda a duração de
composição de um claim já assinado. Está travada em três condições (só desce, o
custo tem de bater exatamente, `!isServiceFinish`) e a regra dura continua logo
abaixo. Se der ruim, o sintoma é o oposto do de hoje: filme montado com duração
menor que a assinada. Segundo risco, cosmético: os alvos descidos (30/40/50) não
existem no seletor, então a UI mostra "35s" enquanto o filme tem 30s — a resposta
já carrega `requested_duration`/`autofit_down` para o Codex usar quando quiser.

**Modelo.** Código escrito por agente **Fable** (regra do plano para A1/A3/C1).
Medição, revisão do diff, diário e entrega em Opus.

**Como medir (contra o marco zero, 03/09 16:00 UTC).**

```sql
select count(*) filter (where name='script_duration_autofit_down') as desceu,
       count(*) filter (where name='narration_guard_blocked')      as ainda_recusado
from events where created_at > '2026-09-03 16:00:00+00';
```

Meta: `narration_guard_blocked` de PRIMEIRO vídeo perto de 0, e a razão
`cadastros com ≥1 filme / cadastros` saindo de **55%** rumo aos 80% do plano.

**Próximo item.** **C1 — paywall só depois do 1º filme**: 12 dos 27 checkouts de
7d são conta com 0 filmes entregues. Achar o gatilho exato do
`upgrade_modal_opened` com `videos_ok=0` e crédito intacto, e trocar o modal por
"Make it now with Kineo 1 (fits your free credits)". Segunda maior alavanca do
plano, e também jogada de Fable.
