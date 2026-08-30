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
- [Sprint 6 · 00:35] /my-videos nunca mais abre congelada: a tela e montada
  no servidor e ESPERA o banco antes de mostrar 1 pixel — em rede movel isso
  era segundos de tela morta ao clicar em "My Videos". A /history ja tinha
  skeleton desde 13/08; a tela irma nao. Agora a navegacao mostra na hora a
  FORMA do acervo (header + filtros + grade 9:16 shimmer, mesmas colunas
  responsivas do conteudo real — troca sem salto de layout). 15 verificacoes
  em scripts/test-myvideos-loading-skeleton.mjs.
  (Rebase: origin/main avancou p/ e54939c — Codex subiu kit de aquisicao de
  marketplace + social card; sprints #1-#5 recriados em cima: 83b4e91/999246b/
  23f1ddd/210b314/1876b83. Mesma rota: clone local + push interno, mount
  OneDrive segue com locks presos em main/origin-main.)
  · Pulso 23:35-00:35 BRT: 1 cadastro novo COM credito (25cr trial ok), 0
    videos, 0 erros de render, 0 checkouts, 0 downloads. Eventos: 4
    stranded_compose_attempt→4 stranded_composed (recovery 100%), 3 landing
    sessions, 3 e-mails de trial, 2 chatgpt_quickstart. Nenhuma causa antiga.
- [Sprint 7 · 01:35] /images e /audio abrem mostrando a FORMA do acervo: o
  primeiro carregamento nao tinha estado nenhum — a estante "My Images"/
  "My Audio" simplesmente nao existia ate o banco responder e POPava na tela
  (salto de layout). Agora shimmer no formato real (grade 220px no /images,
  fileiras no /audio), rotulo ja visivel, e o "Try again" da falha re-mostra
  o skeleton em vez de tela parada. Com isso as 5 bibliotecas do produto tem
  o trio completo: skeleton no load, verdade no erro, CTA no vazio. 18
  verificacoes em scripts/test-images-audio-loading-skeleton.mjs.
  (Rebase: origin/main avancou p/ be00a86 — Codex subiu 7 commits de growth
  premium-trial; sprints #1-#6 recriados em cima: c092302/a404347/c730180/
  273b92b/f6e6bbc/44e91b1. Mesma rota: clone local + push interno, mount
  OneDrive segue com locks presos em main/origin-main.)
  · Pulso 00:35-01:35 BRT: 0 cadastros, 0 videos, 0 erros de render, 0
    checkouts, 0 downloads. Eventos: 3 stranded_ready_sent, 3 e-mails de
    trial, 1 stranded_compose_attempt→1 stranded_composed (recovery segue
    100%). Nenhuma causa antiga. Madrugada silenciosa.
- [Sprint 8 · 02:35] O motor invisivel ganhou porta: Avatar e anunciado como
  1 dos 8 motores e tem ZERO debitos na historia — nao porque quebrou, mas
  porque nao existia em NENHUM seletor (achado #2 da auditoria de 28/08; o
  /generate virou porteiro do /studio, entao o picker do Studio e o UNICO
  lugar onde cliente escolhe motor). Agora o picker tem o card "Avatar ·
  Presenter" que leva ao ambiente dedicado /avatar — e porta, nao motor do
  fluxo do Studio (pipeline proprio de foto→apresentador; cobranca do Studio
  intocada). Selo honesto: card sem claim de resolucao (0 masters
  verificados). 10 verificacoes em scripts/test-avatar-card.mjs. Bonus do
  rebase: o symlink node_modules commitado por engano no sprint 7 foi
  removido ao recriar a serie.
  (Rebase: origin/main avancou p/ e7ce42e — Codex subiu 8 commits de
  growth/docs ChatGPT-handoff; sprints #1-#7 recriados em cima, #7 emendado
  sem o symlink. Mesma rota: clone local + push interno, mount OneDrive
  segue bloqueando unlink — locks presos em origin/main de novo.)
  · Pulso 01:35-02:35 BRT: 1 cadastro novo COM credito (trial ativo, 21cr
    restantes — ja gastou 4, ativacao imediata), 1 video completed, 0 erros
    de render, 0 checkouts, 0 downloads. Eventos: 7 generation_stage_reached,
    5 landing sessions, 4 stranded_ready_sent, 2 organic_signup. Nenhuma
    causa antiga. Madrugada saudavel.
- [Sprint 9 · 03:45] Busca nos videos: /history e /my-videos ganharam campo
  "Search your videos…" (titulo + tema/prompt, instantaneo, sem rede). O
  fundador tem 327 videos e achar UM era rolagem infinita — cliente com 20+
  sofria igual e desistia de reusar o acervo. So aparece com 6+ videos; zero
  resultado mostra o termo + botao Clear search; 16px anti-zoom (licao do
  sprint #1); contadores/abas seguem contando o acervo total. 15 verificacoes
  em scripts/test-videos-search.mjs.
  (Rebase: origin/main avancou p/ 9ccdd0b — 4 commits docs do Codex; sprints
  #1-#8 rebaseados limpos por cima. NOTA DE INFRA: o .git montado via OneDrive
  recusou unlink/rebase nesta sessao ["Operation not permitted"]; trabalho foi
  feito em clone /tmp com push de volta so da ref. Sobrou um ref perm-test e
  um packed-refs.lock orfaos no .git — inofensivos, remover quando o OneDrive
  soltar os arquivos.)
  · Pulso 02:45-03:45 BRT: 1 cadastro novo (free, nasceu com 6 creditos — nao
    e zero, parece variante de oferta; anotado), 1 video completed (dispatch
    cinematic ok), 0 erros de render, 0 checkouts, 0 downloads, 3 landing
    sessions, 3 e-mails de ciclo de trial. Noite calma.
- [Sprint 10 · 04:25] Busca na Library — a estante oficial era a UNICA sem
  busca: o sprint #9 deu campo de busca a /history e /my-videos, mas a
  /library (a tela que junta videos + imagens + audio, linkada do popup da
  conta) continuava rolagem infinita. Agora as 3 abas filtram na hora, sem
  rede: video por titulo, imagem por motor, audio por texto/voz/motor. Mesmo
  padrao do #9: so aparece com 6+ itens, 16px anti-zoom, zero resultado
  mostra o termo + Clear search (nunca finge acervo vazio — licao JWT-skew),
  abas seguem contando o total, e trocar de aba limpa a busca. 22
  verificacoes em scripts/test-library-search.mjs.
  (Base: entrega-atual 870bf84 ja estava sobre origin/main 9ccdd0b — primeira
  rodada da noite SEM rebase. Mesma rota de infra: clone /tmp + push interno
  da ref, o .git no OneDrive segue recusando unlink.)
  · Pulso 03:25-04:25 BRT: 0 cadastros, 1 video completed de cliente real
    (video_ready_viewed junto — cliente assistiu), 0 erros de render, 0
    checkouts, 0 downloads. Eventos: 4 e-mails de trial, 2 organic_cta,
    2 landing sessions, 1 animate settled. Nenhuma causa antiga. Madrugada
    calma e saudavel.
