# EPISÓDIO COM ASSUNTO — o "próximo episódio" recebe o assunto, não só o gancho (22/09/2026)

Fundador (22/09, manhã): "os motores que já estão no site… alguns vídeos saem com coerência baixa. Vou te mostrar
uma coerência de 25% para você ajustar para não acontecer mais." O filme: balaj.dxb@gmail.com, Kineo 1, 22/09 11:08Z,
36 s, 3 cr, **nota 20** (texto 0 · visual 40).

## O que aconteceu (rastro)
1. 10:56Z — a pessoa colou um roteiro do ChatGPT: drone sobre a Pirâmide de Gizé, Burj Khalifa, Torre Eiffel, Estátua
   da Liberdade. Kineo 1, 60 s, 5 cr. **Nota 80.**
2. 11:08Z — clicou em "próximo episódio" (`continuation_source: generate_recent_video`, depois `returning_ready_banner`).
   O pedido que chegou ao servidor foi SÓ: `Topic: "Witness the ultimate cinematic drone journey... a world of wonders
   in one frame.". This is the next episode in the same Short series…` — a semente é o TÍTULO do filme 1, e o título
   é o gancho (teaser), não o assunto. O escritor de cenas leu "maravilhas" e escreveu Saara, recifes de coral,
   Amazônia, Tóquio. **Nota 20.** Terceira tentativa (11:17) barrada por crédito.
3. Medido (14 d, juiz v5): **6 episódios de continuação, média 56,7, metade ≤ 50** — a peça que a casa empurra em
   banner, tela de "pronto", e-mails de ciclo e next-action produzia um filme errado em 1 de cada 2 usos.

## Conserto (em produção)
- `lib/seriesContinuation.ts` (puro, sem import): `isSeriesContinuationPrompt` (reconhece as duas formas do pedido) e
  `enrichSeriesContinuationPrompt(prompt, anterior)` — cola no FIM do pedido o bloco `PREVIOUS EPISODE (same series —
  keep the SAME subject, places, names and format…)` com `Original request:` (≤ 600 chars) e `What it narrated:`
  (≤ 600). A primeira linha continua sendo o `Topic: …` que vira título na biblioteca. Idempotente.
- `lib/episodeSubject.ts` (servidor): `findPreviousEpisode(db, userId, prompt)` — últimos 8 filmes completos da pessoa,
  escolhe o que casa com a semente (título/topic/narração), senão o mais recente; falha aberta (null).
- `app/api/generate-video-fast` e `app/api/generate-video-cinematic`: depois das recusas (pílula, tela própria) e antes
  do escritor, o pedido de continuação é enriquecido; evento `series_continuation_enriched` {found, matched_by,
  previous_video_id, added_chars}. Cobre tela, e-mails e next-action (todos chegam por estas duas rotas).
- Guardião `scripts/test-episodio-com-assunto-2026-09-22.mjs` (22 verificações com o pedido REAL do balaj, banco
  falso, 2 mutantes). `test-serie-episodio-2` segue verde (o template não mudou).
- Trava #6 de `test-caixa-vazia-episodio2` ("nada tocado em app/api/generate-video-") fica vermelha na branch por
  design — coberta pelo "vai" do fundador de 22/09 para os consertos dos motores no ar.

## O que medir (corte no deploy)
`series_continuation_enriched` com `found=true` vs nota do juiz do filme resultante: alvo média ≥ 75 nos próximos 6
episódios (era 56,7). Se `found=false` aparecer com frequência, a semente não está casando — olhar `matched_by`.

## Outros baixos dos últimos 7 d (56 filmes ≤ 50), por classe — próximos alvos
- Seedance 1.5 (18): "as cenas não correspondem à história" — fala×imagem (livro de estado 19/09 ainda sem medição).
- Kineo 1: juiz lendo o pedido errado/truncado ("The unsolved mystery of" quando o pedido era "…of Dyatlov pass";
  "island where landing is illegal: Lumi e Pipo") → notas 0 falsas no radar. É defeito do LEITOR do painel
  (`lib/admin/fastCoherence` escolhe o candidato mais longo e o topic da biblioteca pode ser um card colado), não do
  filme. Próximo.
- Escritor inventa fatos contra pedido explícito ("morning routine… inventou pesquisa de saúde", 40 ×2).
