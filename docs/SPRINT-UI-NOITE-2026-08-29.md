# Sprint noturno de UI — 29/08/2026 (12 sprints, 1/h até 07:00 BRT)
Regras do fundador: NÃO tocar nos cards de motores da home (EngineCycleCard/
engineWall — desenho dele) nem na pista do Codex (aquisição/fluxo/assinaturas/
checkout/pricing). Cada sprint: worktree limpa a partir de entrega-atual,
mudança visível de UI, teste, commit, mover branch entrega-atual. O fundador
sobe TUDO com um clique no !RODAR-AGORA.bat às 07:00.

## Registro (cada rodada appenda aqui)
- [Sprint 1 · feito na sessão principal] Ergonomia de toque no studioKit:
  textarea 16px anti-zoom iOS, alvos ≥44px, vrow 2 colunas no celular.
- [Sprint 2 · 20:20] Tela de erro da casa: app/error.tsx + global-error.tsx.
  Antes, qualquer quebra de tela caia no erro branco default do Next — a mesma
  divida do incidente JWT-skew (telas mascarando erro como vazio). Agora o
  cliente ve "your videos and credits are safe", botao Try again e o codigo do
  erro pra suporte. 8 verificacoes em scripts/test-error-pages.mjs.
  (Base rebaseada: sprint #1 reaplicado sobre origin/main 67b88b0 → a5e788c.)
- [Sprint 3 · 21:25] Library sem mentira de vazio: quando a leitura falha, a
  tela dizia "No videos yet" — a MESMA mascara do incidente JWT-skew (fundador
  viu 0 videos com 327 intactos). Agora falha de leitura mostra aviso ambar
  "your videos and credits are safe" + botao Try again, e o loading virou
  skeleton 9:16 shimmer (forma do resultado, nunca spinner). 11 verificacoes
  em scripts/test-library-error-state.mjs.
  (Rebase: origin/main avancou p/ dad3b00 — Codex subiu 3 commits de growth;
  sprints #1/#2 recriados em cima: 73a5f79/0e33fde.)
  · Pulso 20:25-21:25 BRT: 0 cadastros, 1 video completed de cliente real
    (fluxo cinematic, dispatch ok), 2 downloads, 0 erros de render, 0
    checkouts, 4 e-mails de ciclo de trial. Noite calma e saudavel.
- [Sprint 4 · 22:35] My Videos sem mentira de vazio (as DUAS telas): /history
  e /my-videos ignoravam o `error` do select — a page do /history e a
  exata tela onde o fundador viu "No videos yet" com 327 videos intactos no
  incidente JWT-skew. Falha de leitura agora mostra aviso ambar "your videos
  and credits are safe" + Try again, nos dois lugares. Bonus: o commit do
  sprint 3 tinha um symlink node_modules commitado por engano — removido no
  rebase. 16 verificacoes em scripts/test-myvideos-error-state.mjs.
  (Rebase: origin/main avancou p/ e86710c — sprints recriados em cima:
  #1=0450a1e #2=5d12c9c #3=5d74676. Obs de infra: o mount OneDrive desta
  sessao bloqueou DELETE de arquivos; trabalho feito em clone local e
  devolvido por push interno.)
  · Pulso 21:35-22:35 BRT: 1 cadastro novo COM credito (25cr, ja gastou 19 e
    completou 1 video — ativacao imediata), 2 generation_stage_error benignos
    (guardrail: "speech=38s target=45s", produto pedindo mais 12 palavras),
    0 checkouts, 0 downloads, 6 e-mails de trial. Nenhuma causa antiga. Saudavel.
- [Sprint 5 · 23:25] Images e Audio sem mentira de vazio — as DUAS ultimas
  telas com a mascara do JWT-skew: /images e /audio engoliam falha de leitura
  (`r.ok ? json : []` + catch vazio) e mostravam galeria vazia em silencio.
  Agora falha vira aviso ambar "your images/audio and credits are safe" +
  Try again que recarrega so a galeria. Com isso, TODAS as telas de biblioteca
  do produto (library, history, my-videos, images, audio) dizem a verdade
  quando o banco tosse. 17 verificacoes em
  scripts/test-images-audio-error-state.mjs.
  (Rebase: origin/main avancou p/ 1b4732d — Codex fechou atribuicao de
  afiliado no signup; sprints recriados em cima: #1=d575095 #2=1fad787
  #3=4df29a1 #4=ec21eaf. Mesma rota do sprint 4: clone local + push interno,
  o mount OneDrive segue com locks presos.)
  · Pulso 22:25-23:25 BRT: 0 cadastros, 1 video completed de cliente real,
    0 erros de render, 0 checkouts, 0 downloads. Eventos: 4 e-mails de trial,
    3 stranded_compose_attempt→3 stranded_composed (o recovery de compose
    encalhado esta convertendo), 1 trial_downgraded. Noite calma e saudavel.
