# KINEO-VERBATIM-INTOCAVEL-2010 — "Use my script as is" volta a ser intocável no filme de 15 s

[TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"]

## O defeito (achado 7 do teste da folha de personagem, 20/10)

No teste de 20/10 (Dino, Ravan e menino da moto; Seedance 1.5, 15 s, "Use my script as is"), o roteiro colado chegou ao filme com um bloco de fala a mais ou trocado:

- Dino: + `Dino: "What was that?"`;
- Ravan: "Ravan's face comes alive…" virou "The ashes of the effigy scatter into the wind";
- moto: + "A mysterious girl appeared, asking for a ride".

Prova no banco: `events.script_written` de 20/10, 21:04:48, 21:09:33 e 21:13:34 UTC. Nos três, `original_idea` (o texto colado) é diferente de `script_head` (o texto que foi filmado).

## A causa

1. O /studio/create manda para `/generate?…&autoanalyze=1`.
2. O auto-analyze do /generate confere se o roteiro cabe no filme de 15 s com `roteiroCabeNoFilmeCurto` (`lib/growth/entradaSeedance15.ts`). Se não cabe, chama `handleAnalyze(…, { scriptModeOverride: 'ai' })`, que vira o teaser em modo IA (decisão da E2b de 29/09).
3. Desde 29/09 a função contava o **texto cru**. Os rótulos (`HOOK (0-2s):`, `MICRO REWARD 2:`, `PAYOFF:`) e as pistas `[Pexels: …]` entravam como se fossem fala.
4. Os três roteiros tinham 41, 44 e 41 palavras faladas. A guarda do cinematic aceita até 56. Mas a contagem crua dava 57, 62 e 62, então a função respondia "não cabe".
5. Com isso, o verbatim virava modo IA. O texto ia para `/api/generate-script`, que só devolve o texto intacto quando ele tem os 5 elementos. Os três tinham só 3 seções, então o GPT reescreveu e completou o bloco que faltava.

Não é regressão das entregas de 19–20/10: o defeito existe desde a E2b (29/09, `ff74b5d48`/`241d46352`). O resto da cadeia verbatim (`falaSemBuraco`, ideia no escritor, F1, folha de personagem) não mexeu no texto. O filme original do Dino (19/10, b3732cf0) foi filmado com o roteiro de 3 blocos sem nenhuma alteração.

## O conserto

`roteiroCabeNoFilmeCurto` passa a contar a fala do mesmo jeito que a guarda do cinematic: `parseUserScript(texto).narration`, com as palavras separadas por espaço. O handoff do GPT (`validateHandoffInput`) já contava assim.

- Prosa sem rótulo dá exatamente o mesmo resultado de antes (420 de 420 casos).
- O teaser em modo IA continua para o roteiro que a guarda recusaria de verdade (57 ou mais palavras faladas em en/pt/es; o teto por língua continua).
- Todos os chamadores leem a mesma função: auto-analyze, parede (2 pontos), episódio, conta sem subida, auto-start e o `/go` do GPT.

Efeito colateral esperado: um roteiro marcado **curto demais** (abaixo de 36 palavras faladas) não é mais "salvo" pelo escritor por acidente. Ele vai verbatim e recebe a resposta de narração curta de sempre, com o botão de expandir. É o contrato: a fala colada não é alterada sem a pessoa pedir.

## Provas

- Guardião `scripts/test-verbatim-intocavel-2010.mjs`: 52 verificações e 3 mutantes.
  - Os 3 roteiros exatos do banco dão vermelho antes e verde depois.
  - A régua é igual à guarda e ao handoff em 33 de 33 roteiros marcados.
  - A expressão real de `needsStructuring` foi executada.
  - O `/go` abre em `script_mode=verbatim`.
- Desfaz: `scripts/test-support/desfaz-verbatim-intocavel-2010.mjs`. Ele devolve a fonte de antes byte a byte.

## Impacto em clientes

- O texto colado só passou a ser gravado em 20/10 (`script_written.original_idea`). Antes disso não há como comparar a fala colada com a fala filmada.
- **20/10**: 15 reescritas de clientes no escritor a 15 s.
  - 14 eram prosa ou briefing. A contagem crua e a falada são iguais, então nada muda para elas.
  - 1 era roteiro marcado na faixa do defeito (57 palavras cruas, 31 faladas; conta vinda do ChatGPT, 17:37 UTC). Não saiu filme: a fal estava sem saldo.
- **Handoff do GPT desde 29/09**: 0 dos 24 roteiros clicados caem na faixa do defeito.
- **Teaser por desenho (não muda)**: nos últimos 7 dias houve 120 chegadas a 15 s reescritas pelo escritor (98 pessoas, 83 filmes entregues).
  - Em 36 delas (29 pessoas) sabemos que a tela estava em verbatim. São colagens com cara de ordem, briefing ou roteiro longo, acima de 56 palavras faladas.
  - É a decisão da E2b (teaser de 15 s em vez de 422). Fica como está; muda só se o fundador decidir.
