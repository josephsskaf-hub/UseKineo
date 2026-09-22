# CENA PRESA — a cena que não volta do fornecedor deixa de segurar o filme (22/09/2026)

Passo 3 da volta do H3 (docs/PROPOSTA-MOTORES-VOLTA-2026-09-22.md, fundador: "vai" / "Bora voltar o H3").

## O que o render nº 1 mostrou
H3 35 s (22/09 03:16Z, geração d7f73bf6): 5/5 aceitas, 4 clipes prontos em ~4 min, a cena 3 `IN_PROGRESS` na fal por
50 min. O cliente só desistia em `FAL_POLL_DEADLINE_MS` (50 min); a rota `/api/cinematic-clip-status` só traduzia o
status da fal; ninguém ressubmetia; estorno só pelo cron (~2 h). Uma cena presa = 50 min de spinner e filme nenhum.

## O que já existia (e foi reaproveitado)
O cliente re-submete cenas que o fornecedor RECUSOU: `/api/retry-hollywood-scene` (2 rodadas — a 2ª com o prompt
suavizado; retarget do claim assinado; mutex de cena). Faltava só declarar a cena PRESA como recusada.

## Conserto (branch codex/h3-cena-presa-0922)
- `lib/stuckScene.ts` (puro): `stuckSceneIndexes(status[], minutos)` — com ≥ 1 cena pronta na geração (fornecedor
  vivo) e ≥ **12 min** desde a última submissão, toda cena pendente/em processamento vira presa; sem nenhuma pronta,
  **20 min** (todas presas → all_failed → estorno imediato). `stuckClockStart` (claim settled × último retry);
  `lastSceneRetryAt` (evento `hollywood_scene_retried` por `session_id = generationId`).
- `/api/cinematic-clip-status`: depois do poll das cenas e ANTES de registrar recusas terminais, a cena presa vira
  `failed` mantendo o id (o claim a registra como terminal, o que autoriza o retry); evento `cinematic_scene_stuck`
  (scene_index, request_id, model, elapsed_min, any_done, since_retry).
- `/api/retry-hollywood-scene`: grava `hollywood_scene_retried` (ESPERADO) depois do retarget — reinicia o relógio;
  sem isso a cena nova seria declarada presa no poll seguinte.
- Fluxo resultante: presa aos 12 min → retry 1 (mesmo prompt) → presa de novo aos 24 → retry 2 (suavizado) →
  presa aos 36 → recusa terminal → o cliente monta com as cenas que sobraram, ou a régua recusa e estorna. Pior caso
  36 min em vez de 50, e com duas chances reais de filme; caso comum (fal solta em minutos) → filme inteiro.
- Guardião `scripts/test-cena-presa-2026-09-22.mjs` (18 verificações, cenário H3 real, 2 mutantes).

## Não feito (anotado)
- Compor com 4/5 quando a régua (≥ 95 % da duração) não permitir continua sendo recusa honesta — mudar a régua é
  decisão do fundador.
- Render H3 nº 2 (60 s) só depois deste deploy; critério de despausa continua 3 filmes ≥ 75.
