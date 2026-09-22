# KINEO 1 — "USE MY SCRIPT AS IS" VALE PARA PROSA, E O ROTEIRO MANDA NA DURAÇÃO (22/09/2026)

Fundador (22/09): perguntado se o roteiro colado de 215 palavras num filme de 60 s deve **esticar** o filme ou ser
**reescrito** para caber — "Estica então".

## O que estava acontecendo
- No Kineo 1, `verbatim` só era reconhecido com marcadores `[Pexels: …]` (`parseUserScript.hasMarkers`). O botão "Use my
  script as is" manda `script_mode: 'verbatim'`, mas a rota nunca lia esse campo: **prosa colada caía no modo IA**, o
  escritor de cenas reescrevia a narração para caber na duração e, no caso da Emily (75), inventou uma cena inteira
  ("Emily resided in a peaceful suburban neighborhood").
- Medido (14 d): **10 filmes / 9 pessoas** mandaram verbatim em prosa ao Kineo 1 — todos reescritos. A promessa do
  botão era quebrada em silêncio.

## Conserto (em produção)
- `lib/proseBlocks.ts` (puro): `splitProseIntoBlocks(texto, K)` — K blocos por FRASE, tamanhos parecidos, sem
  reordenar, cortar ou trocar uma palavra (`blocos.join(' ') == texto`); `fallbackStockQuery` (busca de reserva por
  bloco; as buscas de verdade continuam vindo do plano de B-roll alinhado por narração, como no modo IA).
- `lib/durationFollowsScript.ts`: `decideDurationFollowsScriptUp` — espelho da descida de 19/09: se a fala enche uma
  duração MAIOR do seletor (cobertura ≥ 95 %, mesma régua do portão), a duração sobe (35 → 60 → 90); acima de
  90 s × 1,15 é recusa honesta (`script_too_long_for_engine`, sem gasto): "trim the text or Let AI structure it".
- `app/api/generate-video-fast`: `ownScript = verbatim || script_mode === 'verbatim'`; a decisão de duração roda ANTES
  das cenas (clipCount recalculado); prosa própria vira uma cena por bloco com a fala intocada; o portão da fala, a
  narração enviada ao compose e o payload (`verbatim: true`, `speed`) seguem `ownScript` — o compose pula o escalador
  e o filme **acaba quando o texto acaba** (é assim que "estica": 215 palavras a 2,81 pal/s = 76 s de filme com o
  seletor em 60).
- Evento `duration_followed_script` com `direction: 'up'` e `prose: true|false`.
- Guardião `scripts/test-kineo1-verbatim-estica-2026-09-22.mjs` (21 verificações com o texto REAL da Emily, 2 mutantes).

## Fora do escopo (decidido)
- Cota grátis de 15 s: o corte é do plano, não do texto — a parede de roteiro curto continua lá.
- Kineo 1 é 5 cr fixos; +25 % de filme ≈ US$ 0,05 de Creatomate. Preço intocado.

## Medir
`duration_followed_script` (direction up) e `narration_guard_blocked` (script_too_long_for_engine) × nota do juiz
(texto) dos filmes com `verbatim: true` e prosa: alvo texto ≥ 95 (a narração é literalmente a da pessoa).
