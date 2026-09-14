# ANÁLISE DOS MOTORES — 13/09/2026 (noite) → 14/09 03:30 — $0 gasto

Pedido do fundador: "faz uma análise completa dos motores, todos eles, sem gastar nenhum dólar, e me traz aqui pra a gente ver o que vamos arrumar." Depois, colou uma auditoria externa (7 itens, código bcff1868).

Método: (1) banco, 30 dias, por motor; (2) matriz de dry-run ($0, conta do fundador, estorno automático) motor × entrada — ideia de 1 linha ("Let AI structure"), roteiro próprio ("Use my script as is"), brief do ChatGPT; (3) conserto na mesma noite do que reprovou, 5 rodadas de re-teste com o deploy no ar; (4) auditoria externa conferida item a item no código de hoje.

## 1. O que o banco diz (30 dias, só clientes)

| Motor | Filmes | Pessoas | Downloads | Checkout | Pagou |
|---|---|---|---|---|---|
| Kineo 1 (fast) | 405 | 284 | 189 | 32 | 2 |
| Seedance 1.5 | 275 | 238 | 132 | 20 | 2 |
| MiniMax H3 | 3 | — | — | — | 0 |
| Kling 2.5 | 3 | — | — | — | 0 |
| Clipe (5 cr) | 2 | — | — | — | 0 |
| Veo 3.1 · Kling 3 · Omni | 0 | 0 | 0 | 0 | 0 |

Kineo 1 + Seedance 1.5 são 99% do que o cliente vê. Os motores caros somaram 6 filmes em 30 dias, e o único teste real do fundador no H3 (13/09) falhou no compose. O motor caro não é "pior": ele quase nunca é usado, e a estrada dele tinha furos que a do barato não tem.

## 2. Matriz de dry-run — ANTES (13/09 23:00) → DEPOIS (14/09 02:55, deploy d54683fb)

| Motor | Ideia (IA escreve) | Roteiro próprio | Brief do ChatGPT |
|---|---|---|---|
| Kineo 1 | PASS 193 pal → PASS | (verbatim entra por analyze-idea; dry-run só cobre IA) | — |
| Seedance 1.5 | FAIL 137-150 pal (44-48 s p/ 60) → **PASS 192-198 pal, 62-64 s** | PASS | PASS 184 pal, sem vazar instrução |
| Kling 2.5 | FAIL idem → **PASS** (mesma estrada) | PASS | PASS |
| Veo 3.1 | FAIL idem → **PASS** (mesma estrada) | PASS | PASS |
| Kling 3 | FAIL 113 pal, 10-13 s mudos → **PASS 62 s, 6,8 s** | PASS (10 cenas) | PASS |
| MiniMax H3 | FAIL 116 pal → **PASS 64 s, 7,4 s** · em PT: **PASS 65 s, narrado em português** | PASS | PASS |
| Omni Flash | FAIL silêncio + cena 1 enchimento → **PASS 63 s, 6,4 s** | PASS | PASS |

Régua de silêncio: ≤1,5 s por cena, ≤8 s no total. Tudo acima é $0 e estornado.

**Cobertura honesta do dry-run**: 6 motores × 3 entradas + Kineo 1 só na ideia (o roteiro próprio do Kineo 1 entra por analyze-idea e não passa pelo dry-run; o brief no Kineo 1 não foi testado). Dry-run prova plano (palavras, segundos, silêncio, schema do fornecedor); NÃO prova áudio final, boca, voz, música nem duração entregue. "Validado" só depois do vídeo assistido.

## 3. O que foi consertado (8 commits, 13/09 23:30 → 14/09 02:20)

1. **Clássicos escreviam curto** (lib/runway.ts): a expansão só disparava abaixo de 85% do piso. Agora dispara no piso cheio. Seedance ideia: 137 → 192-198 palavras.
2. **Motores caros nasciam mudos** (KINEO-ENCHE-SILENCIO, lib/runway.ts + generate-video-cinematic): o planejador dirige bem a câmera e escreve 16 palavras por cena de 10 s. No modo IA, toda cena fora da janela ganha uma reescrita (gpt-4o-mini, 2 rodadas, pede alvo×1,2 porque o modelo entrega ~85%), aceita até (segundos+1)×2,3, os SEGUNDOS seguem a fala (como no verbatim), enchimento genérico vira fato, e o "+1 s de respiro" é aparado sem cair abaixo do pedido. Verbatim nunca passa por aí. Foram 6 versões medidas em 5 rodadas de dry-run.
3. **Auditoria externa, item 1** (frase maior que a cena): frase acima do teto é quebrada na vírgula mais perto do meio (palavras e ordem intactas), e o caminho PAGO passa a conferir fala × segundos antes de qualquer POST — antes só o dry-run conferia. Provado no ar: frase de 34 palavras quebrou em ", and the wave…".
4. **Item 2** (sobra reordenava a história): a cota é proporcional sobre o que RESTA e a sobra vai só para a última cena narrada. Provado: 6 cenas, frases 1→6 em ordem.
5. **Item 3** (apresentador sem pedir): "anchor" solto (navio, Anchorage) saiu da lista; negação ("no presenter", "sem apresentador") vence. Provado: "Anchorage… No presenter" → documentary_faceless, motivo "pede explicitamente SEM apresentador".
6. **Idioma** (achado da rodada 4, casa com o item 5 da auditoria): o planejador dos motores caros mandava "ALL text in English regardless of the input language", e o detector deixava passar uma ideia claramente em PT (9 marcas × 3, mas só 2 "exclusivas"). Agora a narração nasce na língua da pessoa (sem cena de diálogo fora do inglês, porque o lipsync dos motores é EN). Provado: H3 em PT → "Em 9 de julho de 1958, Lituya Bay, no Alasca…".
7. Guardiões: test-enche-silencio (19), test-auditoria-motores (25); suíte inteira comparada com a origin/main pristina — nenhum vermelho novo.

## 4. Auditoria externa — veredito item a item

| # | Achado | Estado |
|---|---|---|
| 1 | Fala maior que a cena só no dry-run | **Consertado** (quebra na vírgula + régua no caminho pago) |
| 2 | Sobra de trás para frente | **Consertado** |
| 3 | "anchor"/"Anchorage"/"No presenter" | **Consertado** |
| 4 | Piso de duração só para ≥60 (pedido de 90 com áudio de 45 sai 61,5) | **Não mexido, de propósito**: esticar imagem sobre 45 s de áudio é o defeito que o item 4 quer evitar. A cura está a montante: o roteiro nascer do tamanho (conserto 1 e 2). Avatar segue com o áudio como relógio. |
| 5 | Interface em hindi ≠ narração em hindi | **Parcial**: PT/ES agora chegam à narração dos motores caros. Hindi/outros seguem "en" — decisão de produto (abrir uma quarta língua é voz + escritor + revisão). |
| 6 | "22" vs "veintidós", "1959" vs "nineteen fifty nine" | **Consertado (14/09 03:20)**: numerais por palavras em EN/ES/PT (unidades, dezenas, centenas, mil, conectores, padrão de ano); número diferente segue diferente. |
| 7 | Palavras terminando depois do clipe | **Consertado (14/09 03:20, completado 04:00 após o Board)**: o verificador recebe os segundos úteis do clipe (`speech_overruns_clip`); no compose a cena cresce até a última palavra, RE-CONFERE contra o teto (diálogo 15 s, host 20 s) e recusa honestamente se ainda passa; o montador (lib/compose.ts) confere a fala contra os segundos FINAIS. Os timestamps do Whisper NÃO são medição independente da duração do arquivo: a disponibilidade real do trecho no clipe continua pendente de verificação (não há sonda ffprobe no servidor). |

**Placar honesto da auditoria (Board, 14/09 04:00)**: 1, 2, 3, 6 e 7 consertados; 4 (duração entregue em 90 s e avatar) e 5 (hindi) PENDENTES. Não são "sete fechados". Dry-run aprovado não é vídeo assistido.

**Três estados, separados (Board, 14/09 04:30)** — item 7:
- Proteção de duração implementada: sim (rota re-confere depois do teto e recusa; montador confere contra os segundos finais). Commit 05ee899e + testes em 14/09 04:30, NÃO publicados até o fundador aprovar a exceção 8.2.
- Testes executados: sim, de comportamento — rota real com transcrição simulada terminando dentro do teto (200, cena cresce) e além (diálogo 16 s > 15, host 22 s > 20 → 422 `cinematic_dialogue_overruns_clip`, clipes preservados, únicas chamadas: ASR e liberação do claim; nenhuma segunda geração, TTS, pin ou upload); montador real recusa fala além dos segundos finais e aceita dentro. Guardião: test-cinematic-speech.
- Qualidade validada em vídeo: NÃO. Nenhum render pago foi feito; nenhum vídeo foi assistido.

## 4b. Exceção de escopo — trava 8.2 (aguarda o fundador)

A trava do sprint ("nada tocado em lib/cinematic, lib/hollywood e lib/compose.ts", guardiões test-memoria-episodio, test-caixa-vazia-episodio2 e test-despacho-vazio) mede o diff contra a main e fica verde depois do merge; por isso só a vi no último commit. A exceção é PONTUAL — a proteção global continua ligada, sem afrouxar guardião:

| Arquivo | Commit | Motivo | Estado |
|---|---|---|---|
| lib/cinematic/visualMode.ts | fb44bff2 | auditoria item 3 (apresentador por palavra inteira, negação) | publicado |
| lib/hollywood/router.ts | d54683fb | narração na língua da pessoa (item 5, PT/ES) | publicado |
| lib/cinematic/speechContract.ts | 0e948900 | auditoria itens 6 e 7 | publicado |
| lib/compose.ts | 05ee899e + 9cd3d506 | item 7 completado após o Board (montador confere a duração final) + testes de comportamento | **publicado 14/09 05:00 com autorização do fundador** (main 9cd3d506, deploy dpl_qztrB3VV READY) |
| lib/cinematic/mp4Duration.ts (novo) + lib/compose.ts + app/api/compose/route.ts | e7f975e3 | proteção pendente: duração REAL do arquivo (cabeçalho mvhd do MP4, lido no mesmo download do Whisper); o teto vira min(teto do engine, duração do arquivo); cabeçalho ilegível mantém o teto do engine; 10 verificações (sonda + rota real com mídia curta) | **NÃO publicado** — pede a mesma exceção pontual |
| lib/scriptParser.ts (fora da trava) | 165e5713 | rótulo de fala/produção na MESMA linha vazava na narração (achado do dry-run do Seedance 2.5) | publicado 14/09 05:45 (deploy dpl_FZrLHr2R READY) |

Recomendação do Board: preservar as correções, não reverter só para deixar a trava verde. Autorização formal da exceção e da publicação do 05ee899e: do fundador (**mantém** / **reverte**).

## 4c. Etapa 2 (14/09 05:00 → 06:00) — matriz completada a $0

| Motor | Ideia | Roteiro próprio | Brief do ChatGPT |
|---|---|---|---|
| Kineo 1 | PASS (193-200 pal) | **PASS** verbatim com marcadores `[Pexels: …]` por cena (é assim que o Studio manda "Use my script as is" ao Kineo 1): 108 pal, 34,8 s para 35 s | **PASS** (o Kineo 1 sem marcadores trata o brief no modo IA: 189 pal, sem vazar instrução) |
| Seedance 2.5 (interno) | **PASS** 61 s, 5,7 s de silêncio | **PASS** 45 s (roteiro de 47 s de fala; o portão recusou 60 s com honestidade) | **PASS** 35 s depois do conserto 165e5713 |

**Achado novo (brief "inline")**: `Use the following voiceover: <texto na mesma linha>` e `EDITING: fast cuts…` entravam na narração verbatim — o Seedance 2.5 leu "Use the following voiceover" e "captions on" no dry-run. Consertado em lib/scriptParser.ts (165e5713) e provado no ar nas três estradas (Seedance 2.5, Seedance 1.5, H3): narração começa em "On July 9, 1958…" e termina em "…from the air today.", zero rótulo. A fala caiu de 36 s (com lixo) para 29 s (só o autor).

**Achado novo (duas réguas no portão)**: o portão de narração mede TODO roteiro a 2,3 pal/s (lib/narrationFit), mas os clássicos (Seedance 1.5 / Kling 2.5 / Veo / Kineo 1) narram com TTS a 3,1 pal/s. Um brief de 66 palavras passa no portão para 30 s (29 s a 2,3) e o dry-run do Seedance 1.5 reprova (21 s a 3,1): o filme clássico sairia curto do pedido. NÃO mexi: o portão é trancado por 26 guardiões e é regra da casa ("uma régua por voz"). Proposta para decisão: o portão usar 3,1 pal/s quando o motor é clássico (mais recusas/degraus nos clássicos, filmes do tamanho pedido).

**Ponto cego (item 4 da auditoria, duração entregue)**: `videos.duration_seconds` está NULO em 775 de 775 filmes dos últimos 30 dias, e nenhum evento grava a duração do MP4 final (compose_submission_claim guarda só o pedido). A casa não sabe, hoje, quanto dura o que entregou. Verificar "duração, sequência, narração, legendas, música e entrega final por motor" sem render exige primeiro gravar isso — proposta: o compose/cron gravar duração real, legendas ligadas e trilha usada por render (evento + coluna), e o placar por motor sair daí.

**O que a matriz $0 prova por motor (e o que não prova)**: duração PLANEJADA (palavras × régua, cena a cena) ✔ · sequência da história (ordem 1→N no verbatim) ✔ · narração na língua da pessoa ✔ · instrução fora da fala ✔ · schema do fornecedor ✔. Legendas, música, boca/voz e duração ENTREGUE: só com o vídeo final — e hoje nem o banco guarda.

## 4d. Etapa 3 (14/09 06:00 → 07:30) — diferenças REAIS entre pedido e resultado, medidas nos arquivos entregues

Método: a sonda do cabeçalho MP4 (`mvhd`) rodou sobre 46 filmes já entregues (até 8 por motor, 30 dias), baixando só 2 MB por arquivo. 46/46 legíveis. Comparação: `pedido` = duração do claim (o botão); `planejado` = `videos.duration` (a timeline montada); `real` = o arquivo.

| Motor | Medidos | real − pedido (média) | Abaixo de 95% do pedido | Pedido ≥60 e real <61,5 | real ≈ planejado |
|---|---|---|---|---|---|
| Kineo 1 (fast) | 8 | +3,0 s | 1 (515c188b: 35 → 18,7 s, 13/09) | 0 | sim (±0,5 s) |
| Seedance 1.5 | 8 | +12,3 s | 0 | 0 | sim |
| Kling 2.5 | 5 | +5,1 s | 0 | 1 (577481c6: 59,8 s, 18/08) | sim |
| Veo 3.1 | 5 | +5,0 s | 0 | 1 (18ddfd51: 60,5 s, 17/08) | sim |
| Kling 3 | 6 | −0,6 s | 2 (141dfeda 60 → 52,8 s, 08/09; 4b12925e 45 → 30 s, 17/08, vitrine) | 3 | 1 fora (4b12925e) |
| MiniMax H3 | 6 | +10,4 s | 0 | 1 (04189a48: 58,2 s, 20/08) | 2 fora (5d58cb4f plan 30 → real 65, 20/08) |
| Omni | 6 | −8,0 s | 3 (8df84efb 60 → 39,9 s, 11/09; a66e975a 90 → 48,5 s; cc17475a 60 → 46,4 s, 02/09) | 3 | sim |
| Clipe | 2 | — | 0 | 0 | sim |

Leitura, por motor:
- **Kineo 1**: 515c188b — roteiro próprio de 50 palavras, botão 35 s, filme de 18,7 s, sem recusa, sem degrau, sem evento. A rota do Kineo 1 não tinha portão de narração (a cinematic tem). Correção direcionada: portão com a régua clássica, antes do gasto, com saída (expansão ou duração menor com consentimento). Código pronto na branch codex/regua-unica-0914.
- **Omni e Kling 3 (modo IA)**: 8df84efb (11/09, 96 palavras para 60 s) e 141dfeda (08/09, 107 palavras) são o defeito "o planejador escreve pouco" — corrigido em 14/09 (KINEO-ENCHE-SILENCIO, dry-run PASS), ainda NÃO comprovado em vídeo. Os dois de 02/09 do Omni são anteriores à gravação da narração no claim.
- **Seedance 1.5 / Kling 2.5 / Veo**: entregam acima do pedido (+5 a +12 s); nenhum abaixo. Dois casos de 59,8 e 60,5 s para pedido de 60 (agosto) ficam abaixo do piso 61,5 do TikTok — anteriores ao piso (18/08).
- **H3**: 04189a48 (20/08) 58,2 s para 60; 5d58cb4f (20/08) planejado 30, real 65 — o único caso em que a coluna `videos.duration` mente (era o compose antigo). Desde então planejado ≈ real.
- **Kling 3 vitrine** (4b12925e, 17/08): 30 s reais para 45 planejados — o corte curado do fundador (Maracaibo), não um defeito de motor.

`videos.duration` é, na prática, a duração planejada da timeline e bate com o arquivo em 44 de 46 (±0,5 s). O que faltava era a MEDIÇÃO do arquivo e o pedido lado a lado — é o que o evento `render_delivered_measured` passa a gravar.

### Cobertura registrada: motor × entrada × duração testada (dry-run $0)

| Motor | Ideia | Roteiro próprio | Brief do ChatGPT |
|---|---|---|---|
| Kineo 1 | 60 s | 35 s (marcadores) · 45 s FAIL honesto (108 pal) | 60 s (modo IA) |
| Seedance 1.5 | 60 s | 45 s · 30 s FAIL honesto (66 pal a 3,1) | 35 s · 30 s |
| Kling 2.5 | 60 s | 45 s | 35 s |
| Veo 3.1 | 60 s | 45 s | 35 s |
| Kling 3 | 60 s (×5 rodadas) | 60 s (10 cenas, roteiro do fundador) | 35 s |
| MiniMax H3 | 60 s (EN e PT) | 45 s · 60 s | 35 s · 30 s |
| Omni Flash | 60 s | 45 s | 35 s |
| Seedance 2.5 | 60 s | 45 s | 35 s · 30 s |

PASS a 35 ou 45 s NÃO comprova 60 ou 90 s. Ninguém testou 90 s em roteiro próprio ou brief; avatar não foi testado (fica por último).

### Réguas (item 2 da direção)

lib/speechRate.ts é a fonte única: hollywood 2,3 pal/s, clássicos 3,1 pal/s, × velocidade, `basis: 'estimate'`. Envolve lib/narrationFit.ts sem tocá-la (trava 8.2); a rota cinematic mede portão, degrau e dry-run com a régua da família; o Kineo 1 ganha o portão. O preflight da tela (app/api/analyze-idea, também sob a trava) ainda mede a 2,3 para todos — três guardiões de identidade ("o servidor usa a MESMA função do preflight") ficam vermelhos até o preflight adotar a mesma régua. Escopo apresentado abaixo, não executado.

### Instrumentação (item 3 da direção) — implementação mínima, sem schema

Evento `render_delivered_measured` no ponto de entrega (compose/status), com: render_id, engine, requested_seconds (claim), planned_seconds (timeline), measured_seconds + measure_method ('mvhd' | 'unknown'), narration_words, result. Campos que a rota não conhece hoje vão como `null` (input_mode, language, voice, speed, captions_configured, music_configured) — desconhecido, não inventado. A medição vem dos MESMOS bytes da cópia para o bucket (lib/renderAssets), sem segundo download. Validada nos 46 arquivos já entregues (acima). Cron de resgate e clipes: fora desta leva (mesmo evento, escopo próprio).

### Trava 8.2 — descoberta de escopo (14/09 07:30)

A trava cobre também `app/api/generate-video-*`, `app/api/analyze-idea/`, `app/api/generate-script/`, `lib/narrationFit`, `lib/broll/`, `lib/lyriaMusic` — não só lib/cinematic, lib/hollywood e lib/compose.ts. Os commits de hoje que tocaram a rota cinematic (d84c7909, ee4f8751, fb44bff2, 59f6845a, ea6e8a90, d54683fb, 0e948900, 9cd3d506) estavam fora da lista que eu apresentei. A trava mede o diff contra a main e ficou verde ao mergear; só a vi agora, ao trabalhar numa branch com a rota tocada e sem merge. Registro para decisão do fundador; nada foi revertido.

Segurados na branch, aguardando a mesma exceção pontual:

| Branch | Commits | Arquivos sob a trava |
|---|---|---|
| codex/proximos20-0948 | e7f975e3 + 2c2af80d | lib/compose.ts, lib/cinematic/mp4Duration.ts (a mover para lib/mp4Duration.ts), app/api/compose/route.ts |
| codex/regua-unica-0914 | (ver PEDIDOS) | app/api/generate-video-cinematic, app/api/generate-video-fast (+ lib/speechRate.ts, lib/mp4Duration.ts, lib/renderAssets.ts, compose/status fora da trava) |

## 4e. Etapa 4 (14/09 08:00 → 09:40) — direção do Board executada; cobertura 60/90 s fechada a $0

### Branch consolidada: codex/motores-0914 — HEAD 7da4eef0 (6 commits sobre a main 693be8e3)

| Commit | O quê | Caminhos sob a trava 8.2 |
|---|---|---|
| cc059ad6 | duração REAL do clipe de fala (sonda mvhd no download do Whisper) | lib/compose.ts, app/api/compose/route.ts |
| ec50c690 | duração desconhecida não cresce a cena (só o Whisper não basta); log `medicao: desconhecida` | app/api/compose/route.ts |
| 427650eb | sonda única: lib/cinematic/mp4Duration.ts → lib/mp4Duration.ts (fora da trava), imports atualizados | lib/compose.ts |
| 1f30be29 | régua única (lib/speechRate, envolve lib/narrationFit sem tocá-la), portão do Kineo 1, entrega medida (lib/renderAssets + compose/status) | app/api/generate-video-cinematic, app/api/generate-video-fast |
| f56ee7c2 | integração do Board: portão ANTES do dry-run; tela trata a recusa do Kineo 1 (expandir / duração menor); expansão e preflight na régua da família; guardiões de identidade estendidos; caminho executado + evento executados com mocks | app/api/generate-video-fast, app/api/expand-script, GenerateClient |
| 7da4eef0 | cobertura 60/90: Kineo 1 não joga fora blocos acima de 12; Kineo 1 modo IA terceira passada abaixo de 95%; Veo/Sora >64 s ganham clipes para o footage cobrir a fala | app/api/generate-video-fast, app/api/generate-video-cinematic, lib/scriptParser (fora) |

Typecheck: 0 erros. Suíte inteira em f56ee7c2: 397 verdes / 118 vermelhos contra 396 / 117 da base — o único vermelho novo é test-despacho-vazio (trava 8.2, esperado nesta branch). Guardião novo: scripts/test-regua-unica-e-entrega-medida-2026-09-14.mjs (55 verificações). Os três guardiões de identidade (narration-ruler, duration-floor-39, preflight-que-nao-acusa) foram ESTENDIDOS: aceitam narrationFitAt/autofitDownAt e provam que eles delegam a narrationFit/autofitDown — não enfraquecidos.

### Board, item a item
1. Correções publicadas: mantidas; exceção pontual registrada abaixo com todos os arquivos e commits. Não é qualidade validada.
2. Régua + preflight + Kineo 1: integrados na branch. Achados do Board corrigidos: o portão do Kineo 1 roda ANTES do dry-run (o relatório carrega `gate`) e a recusa do Kineo 1 cai na mesma caixa da cinematic (expandir com "Finish it for me" ou aceitar a duração menor), não mais em fast_dispatch_not_ok. Caminho executado com mocks: 50 palavras / 35 s → 422 sem POST e com `narration_guard_blocked` (charged:false); dry-run com a mesma decisão sem evento; 120 palavras liberam; duração menor só com consentimento explícito (`narration_autofit_down`); sem consentimento, recusa honesta com a duração que cabe. Sem loop: a expansão passa a medir na régua da família (a 2,3 um Kineo 1 de 60 s era expandido para 138 palavras e o portão clássico pedia 177). Nada altera o texto do autor.
3. Duração real: consolidada (cc059ad6 + ec50c690 + 427650eb), sonda única em lib/mp4Duration.ts. Ainda pede a exceção (lib/compose.ts).
4. Medição da entrega: pedido/planejado/medido separados; ausência = null + 'unknown'. Evento executado no caminho real com mocks: medido, medição falhada, claim ausente, banco fora (nenhum evento, entrega segue), uma emissão por filme (o bloco vive no ramo do primeiro done; cache sem download = unknown).
5. Cobertura 60/90 s por entrada (dry-run $0, prod atual):

| Motor | Roteiro 60 | Brief 60 | Roteiro 90 | Brief 90 |
|---|---|---|---|---|
| Kineo 1 | PASS 180 pal / 58 s | PASS (IA) 193 pal / 62 s | 21 blocos: FAIL (cortado a 12) → 8 blocos: PASS 275 pal / 89 s | 180 pal FAIL / 280 pal PASS (IA oscila) |
| Seedance 1.5 | PASS 58 s | PASS | PASS 275 pal / 89 s (291 pal: FAIL, footage 90 < fala 94) | PASS |
| Kling 2.5 | PASS | PASS | PASS | PASS |
| Veo 3.1 | PASS | PASS | **FAIL: footage 72 s (9 × 8 s) para 88,7 s de fala** | **FAIL idem** |
| Kling 3 | PASS 68 s | PASS | PASS 93 s | PASS |
| MiniMax H3 | PASS | PASS | PASS | PASS |
| Omni | PASS | PASS | PASS | PASS |
| Seedance 2.5 | PASS | PASS | PASS | PASS |

Ideia a 60 s: 8/8 PASS (etapas anteriores). Ideia a 90 s no Kineo 1: 263 palavras = 84,8 s para piso de 86 s (FAIL por 1,2 s). Os 402 "Other active renders already hold…" de um lote de 16 dry-runs simultâneos foram concorrência de holds do meu lote, não do motor — refeitos em lotes de 4.

### Diferenças reais que a cobertura 90 s achou (correções direcionadas, na branch)
- **Veo 3.1 a 90 s**: 9 clipes de 8 s = 72 s de footage para 89 s de fala — o compose repetiria cena. Correção: acima de 64 s, clipes suficientes (teto 12 = 96 s). **Custo: +3 clipes de Veo por filme de 90 s com preço fixo de 100 cr — decisão do fundador antes de publicar.**
- **Kineo 1, roteiro com mais de 12 blocos**: o 13º em diante era JOGADO FORA (71 palavras do autor, em silêncio). Correção: o excedente se funde no 12º; nenhuma palavra some.
- **Kineo 1 modo IA a 90 s**: o escritor entrega ~5% abaixo do alvo (263/279) e oscila (180 ou 280 para o mesmo brief). Correção: terceira passada por cena quando o total fica abaixo de 95% (texto da IA, nunca do autor).
- **Seedance 1.5 / Kling 2.5 a 90 s**: 9 × 10 s = 90 s de footage; roteiro de 291 palavras (94 s) já estoura. O dry-run barra com honestidade. Sem correção: é o teto do motor.

### Exceção 8.2 — lista completa (para registro e aprovação)

Publicados: d84c7909, ee4f8751, 59f6845a, ea6e8a90 (app/api/generate-video-cinematic) · fb44bff2 (idem + lib/cinematic/visualMode.ts) · d54683fb (idem + lib/hollywood/router.ts) · 0e948900 (app/api/compose/route.ts + lib/cinematic/speechContract.ts) · 05ee899e + 9cd3d506 (lib/compose.ts + app/api/compose/route.ts).
Na branch codex/motores-0914 (não publicados): cc059ad6, ec50c690, 427650eb (lib/compose.ts, app/api/compose/route.ts) · 1f30be29, f56ee7c2, 7da4eef0 (app/api/generate-video-cinematic, app/api/generate-video-fast, app/api/expand-script). A proteção global segue ligada; nenhum guardião de trava foi alterado.

## 4f. Etapa 5 (14/09 10:00 → 11:30) — segunda revisão do Board, executada

Branch codex/motores-0914 — HEAD **8680747d** (sobre a main 16288433). Typecheck 0 erros. Suíte inteira comparada por NOME com a causa de cada vermelho em docs/SUITE-MOTORES-2026-09-14.md: 397 verdes / 118 vermelhos contra 396 / 117 da base; o único vermelho novo é a própria trava 8.2 (test-despacho-vazio: "nao toca lib/compose"), esperado nesta branch. Nenhum vermelho herdado mudou de causa. Guardião da leva: scripts/test-regua-unica-e-entrega-medida-2026-09-14.mjs (61 verificações, comportamento com mocks).

| # do Board | Achado | O que mudou | Como foi provado |
|---|---|---|---|
| 1 Dry-run | o portão do Kineo 1 conferia só `body.dry_run`; conta externa com dry_run:true pulava a recusa e chegava à seção paga | a autorização (conta do fundador) é conferida ANTES de qualquer decisão (`dryRunAutorizado`), no fast e no salvage do cinematic | portão real executado: externo×true, externo×false, interno×false → 422 + evento; interno×true → mesma decisão no relatório, sem 422, sem evento |
| 2 Régua | tela (7709, 13973) media a 2,3 para tudo; expand-script ignorava velocidade | `speechRateForScript(motor, roteiro)` = família do motor + velocidade escrita no roteiro; usada no contador, na checagem local, no preflight, na expansão e nos portões; nenhum `speechSeconds()` antigo sobrou na tela | 138 palavras: 60 s em hollywood, 44,5 s em clássico; 180 palavras a 60 s passam a 1× e são recusadas a 1,2× (48 s); expansão medida a 3,1 (177 pal) passa no portão clássico, a 2,3 (138) não — o loop |
| 3 Coerência visual | a fusão de blocos descartava a direção visual 13–21 | fusão silenciosa REMOVIDA; mais de 12 blocos [Pexels] = recusa explícita antes do gasto (422 `too_many_clips`, clips e máximo na resposta, nada cobrado); no ensaio autorizado, o relatório diz | portão executado com 21 blocos (422 + evento) e com 12 blocos de 24 palavras (passa) |
| 4 Testes | "uma emissão" era texto; terceira passada mudava a fala sem a legenda | evento sai DEPOIS da linha de `videos` nascer e só quando nasceu agora (`ok && !duplicate`, índice único por render_id); terceira passada atualiza a legenda junto com a fala e nunca toca descrição/consulta visual | bloco real executado: linha nova → 1 evento; medição falhada → null/unknown; polling repetido (duplicate) → 0; 3 polls concorrentes → 1; persistência falhada → 0; banco fora → 0 sem exceção. Terceira passada: resposta longa → fala+legenda novas, consulta intacta; resposta igual/curta → nada muda; erro → cenas intactas; total ≥95% → nem chama |
| 5 Veo | custo misturado; Sora no hunk | saiu desta branch; commit separado **6b50d136** (branch codex/veo-90-0914), SÓ Veo, com orçamento no código e no guardião | scripts/test-veo-90-2026-09-14.mjs (5) |

### Orçamento do Veo (item 5)

Modelo realmente usado: `fal-ai/veo3.1/fast`, $0,10/s (docs/PRECOS-MOTORES-V4.md), 8 s por clipe = **$0,80/clipe**. Filme de 90 s hoje: 9 clipes = $7,20 nesta etapa, e o filme sai com 72 s de imagem para 89 s de fala (repete cena). Com o ajuste: 12 clipes = $9,60 (+$2,40). O preço do filme é fixo (100 cr) e o valor do crédito varia por plano; a margem total inclui TTS/compose (~$0,3). Só esta etapa muda; o fundador decide entre (a) aceitar +$2,40 por filme de 90 s no Veo, (b) travar o Veo em 60 s até a revisão de preços (09/10), ou (c) subir o preço do Veo a 90 s (preço congelado até 09/10).

### Cenários pagos

Nenhum render pago nesta etapa. A autorização condicional já existe: depois da publicação com os gates verdes e do deploy confirmado, um motor por vez, começando pelo H3, assistindo inteiro (duração, fidelidade ao texto, cenas, fala, legendas, música). Avatar por último.

## 4g. Etapa 6 (14/09 12:00 → 12:40) — terceira revisão do Board: só o delta

Branch codex/motores-0914 — HEAD **41513f2b** (um commit sobre 8680747d). Typecheck 0 erros. Guardião da leva: 70 verificações. Suíte por nome: docs/SUITE-MOTORES-2026-09-14.md (atualizada nesta etapa; o único vermelho novo continua sendo a trava 8.2).

| Ajuste | O que mudou | Regressão executada |
|---|---|---|
| 1 Dry-run não autorizado | `dry_run:true` de conta não autorizada é REJEITADO explicitamente (403 `dry_run_not_authorized`, evento próprio) antes de qualquer caminho pago, no Kineo 1 e no cinematic (antes da reserva de crédito). Nunca vira geração real em silêncio | externo × dry_run=true com roteiro CURTO → 403; com roteiro SUFICIENTE → 403; interno × dry_run=true → relatório 200; interno/externo × dry_run=false → portão normal |
| 2 Relatório = portão | o relatório do dry-run do Kineo 1 recebe a MESMA velocidade efetiva do portão (família × velocidade do roteiro) e nunca diz PASS quando o portão bloqueia — por roteiro curto ou por excesso de blocos | reprodução do Board: 180 palavras, 1,2×, 60 s → `gate.blocked`, veredito "FAIL — portão: 48s de fala a 3,72 pal/s…" com o mock do relatório dizendo PASS; 21 blocos → FAIL por excesso; o relatório recebeu 3,72 |
| 3 Mesma narração | tela, checagem local e servidor medem a narração EXTRAÍDA (`speechSecondsOfScript`): velocidade lida do texto ORIGINAL, diretivas (`speed:`, `Visual:`, rótulos) fora da contagem; a velocidade nunca é recuperada depois de remover as diretivas | 60 palavras + diretivas a 1,2× → conta 60, 3,72 pal/s, 16,1 s; sem diretiva → 1×, 19,4 s |

### Veo, orçamento corrigido (branch codex/veo-90-0914 @ d14b619f, só Veo)

Preço real do filme: `creditCostForDuration('cinematic_veo', pago, 90)` = 100 × 90/60 = **150 cr** (não 100), lido da função da casa no guardião. Custo completo por filme de 90 s: 12 clipes × $0,80 (fal-ai/veo3.1/fast, $0,10/s) = $9,60 + TTS/compose ≈ $0,30 → **≈ $9,90**. Receita por 150 cr: Starter $24,75 · Creator $19,90 · Studio $19,95 (trial $0). Margem nos planos pagos ≈ 50-60% (com 9 clipes era ≈ 63-71%, mas o filme saía com 72 s de imagem para 89 s de fala). Decisão pedida: aceitar +$2,40 por filme de 90 s no Veo.

## 4h. Etapa 7 (14/09 13:00 → 13:30) — quarta revisão do Board: só o delta

Branch codex/motores-0914 — HEAD **478c5da7** (um commit sobre 41513f2b). Typecheck 0 erros. Guardião da leva: 73 verificações.

| Ajuste | O que mudou | Regressão |
|---|---|---|
| 1 Posição da rejeição | No Kineo 1 a rejeição do dry-run não autorizado sobe para logo depois do body: antes de classificar o motor, planejar (generateScenes), expandir, buscar clipes (Pixabay), gerar abertura (fal) ou cobrar | trecho real executado: externo × dry_run=true → 403 e a única chamada é o evento (planejador, expansor e Pixabay mockados nunca são chamados); interno × true e externo × false seguem. Prova de posição: entre a autenticação e a rejeição existe um único `await`, o do body; classifyEngineFit, generateScenes, expandVoiceoversToTargets, getPixabayClipsForScene, classicDryRunReport e o portão vêm todos depois; a rejeição antiga (pós-planejamento) foi removida |
| 2 Preflight da tela | `autofitDownAt` passa a receber a velocidade lida do texto ORIGINAL (baseChecagem); a narração extraída (falaServidor) segue sendo o que se mede. Telemetria, não fluxo | guardião do preflight (B2) e o da leva conferem a chamada exata |

### Veo (branch codex/veo-90-0914 @ 5b2dc929) — NÃO APROVADO

O bloco está marcado "NÃO APROVADO: ajuste de CUSTO pendente de decisão do fundador". O orçamento é rotulado ESTIMATIVA, com a fonte de cada número: clipe $0,80 (docs/PRECOS-MOTORES-V4.md, fal-ai/veo3.1/fast, tabela pública do fornecedor); clipes por filme (clipCountForDuration); TTS + compose ≈ $0,30 (estimativa da casa, não medida); preço 150 cr (lib/credits/engineCost.ts, lido no guardião). Receita ALOCADA por crédito (preço de tabela ÷ créditos do plano, lib/checkoutPricing V5) separada de recebimento: Starter 150 cr = $24,75 · Creator $19,90 · Studio $19,95 · trial $0. Recebimento líquido desconta taxas da Stripe (≈ 2,9% + $0,30), comissão de afiliado quando houver, descontos e câmbio BRL — a margem após taxas/comissões/descontos NÃO está calculada; a margem bruta sobre a alocação fica ≈ 50-60% nos planos pagos.

## 5. O que falta

1. Publicar a branch codex/motores-0914 (7da4eef0) com a exceção aprovada; confirmar SHA e deploy; re-rodar os dry-runs de 60/90 do Kineo 1 e do Veo no ar.
2. Só depois dos gates verdes e do deploy confirmado: cenários pagos, UM por vez, começando pelo H3 (ideia, 60 s, 45 cr), assistindo inteiro (duração, fidelidade ao texto, cenas, fala, legendas, música). Avatar por último. Nenhum render pago nesta etapa.
1b. Publicar e7f975e3 (duração real do arquivo) — pede a exceção pontual do fundador.
1c. Gravar a duração entregue / legendas / trilha por render (ponto cego acima) antes de medir os oito motores.
1d. Decidir a régua do portão para os clássicos (3,1 pal/s).
2. Codex (tela): `error` do 422 + "seus créditos voltaram"; 16:9 pré-selecionado; duplo despacho.
3. Kineo 1 roteiro próprio e brief: cobrir no dry-run (hoje só a ideia).
4. Duração entregue em 90 s e avatar: validar no vídeo final (item 4 da auditoria), não no plano.
5. Hindi e outras línguas fora de EN/PT/ES: decisão de produto (voz + escritor + revisão por língua).

## 4i. Liberação técnica e publicação (14/09 13:40) — REGISTRO

GO técnico do Board para 478c5da7. Integração sobre a main 156d9b78: rebase com um conflito só de documento (a suíte por nome, resolvido com a versão da main); código do SHA integrado **874aedff** idêntico ao 478c5da7 (`git diff 478c5da7 874aedff -- . ':!docs'` vazio). Gates repetidos no SHA integrado: guardião da leva 73/73, preflight 28/28, fala cinematic 184/184, dry-run clássico 18/18, typecheck 0. Publicado pelo fluxo da casa (enfileirar → !RODAR-AGORA): main = 874aedff. Deploy **dpl_5B1i8FZ9EiYcBdetALs5vUkrYwnT READY** (Vercel confirma o SHA).

Validação em produção (conta interna, $0): Kineo 1 roteiro curto (5 blocos, 35 s) → relatório `gate.blocked=true`, motivo narration_too_short, 21 s de fala a 3,1, veredito FAIL; Kineo 1 com 21 blocos a 90 s → `too_many_clips`, veredito FAIL; H3 ideia 60 s → PASS (7 cenas, 64 s, 4,8 s de silêncio). O 403 para conta EXTERNA com dry_run:true não é testável com a conta interna — fica provado pelo trecho real executado no guardião, não em produção.

A suíte inteira NÃO está verde: 118 vermelhos herdados permanecem (docs/SUITE-MOTORES-2026-09-14.md). Veo 5b2dc929 segue fora da publicação; Veo a 90 s continua com a limitação conhecida (72 s de imagem para 89 s de fala). Os oito motores NÃO estão validados em vídeo final: isso começa com o cenário H3, um por vez, assistido inteiro com áudio.

## 4j. Cenário pago 1 — MiniMax H3 (14/09 13:48 → 13:59 UTC) — ENTREGUE, aguardando o fundador assistir

Dentro da autorização condicional (um por vez, H3 primeiro). Ideia de 1 linha (Lituya Bay), 60 s, modo IA, 45 cr, conta do fundador (saldo 1.430 → 1.385). Geração 598caf17, render f04527a7, vídeo 604afd43. Disparo pela interface do Studio (não pela API).

| Medida | Valor | Fonte |
|---|---|---|
| Cenas planejadas / aceitas | 7 / 7, 0 rejeitadas, HTTP 200 nas 7 | cinematic_dispatch_result |
| Segundos planejados | 11+7+10+9+11+8+9 = 65 | claim (scene_seconds) |
| Duração medida do MP4 | 65 s (mvhd) | render_delivered_measured |
| Narração | 7 cenas, ~135 palavras, voz onyx, documentário sem rosto | claim |
| Tempo | 9 min de clipes + 5 min de compose | eventos |
| Custo do fornecedor | estimativa da casa $9,24 (cost_estimate_usd) para 45 cr | claim |

Achados $0 no PLANO entregue (a confirmar assistindo):
1. **Nome real no prompt visual**: o planejador escreveu "Howard Ulrich" (pessoa real) nas cenas 1, 5 e 7, contra a própria regra do planejador ("NEVER name or depict a real person"). A narração também diz "Ulrich".
2. **Voz em primeira pessoa num documentário**: a cena 5 nasceu como diálogo ("My son and I saw the wave coming…"), foi convertida para cena de apoio pelo modo sem rosto, e a fala ficou na NARRAÇÃO ("My son and I spotted the colossal wave…") dita pelo narrador de documentário. Fidelidade de voz quebrada.
3. **Enchimento no prompt visual**: a cena 1 carrega, entre aspas, o texto antigo "Here is something most people do not know about…" dentro do prompt de imagem (a narração dessa cena foi reescrita, o prompt não). O H3 pode tentar fazer a boca acompanhar o texto citado.
4. **Evento de entrega**: `requested_seconds` e `narration_words` saíram nulos — o claim era lido com o cliente do usuário e `public.events` não tem SELECT para authenticated (RLS). Corrigido e publicado: main 4da5379c (cliente da casa), deploy dpl_E4mZEoKXLtU3PyYdQ8yHLUkzPnNx.
5. **Custo × preço**: $9,24 estimados de fornecedor para 45 cr — margem do H3 a 60 s merece revisão na janela de preços (09/10), não agora.

O que só o vídeo com áudio confirma: sincronia, boca/rosto, legendas, música, coerência visual. Sequência pausada até o veredito do fundador (se houver defeito, para e registra reprodução).

## 4k. H3 Lituya reprovado pelo Board (revisão visual) → correções de fidelidade, SEGURADAS (14/09 15:00)

Achados do Board no MP4: (1) abertura prolongada em retrato, sem o acontecimento; (2) deslizamento narrado sobre fiorde tranquilo; (3) onda sem referência de escala; (4) "My son and I" na narração sem atribuição; (5) aparências diferentes para o mesmo sobrevivente. Música, voz e sincronia seguem sem escuta validada. Renders pausados.

Causas no código e correções (branch **codex/fidelidade-0914 @ caf68d3d**, sobre a main 68433c23; toca lib/hollywood e a rota cinematic — trava 8.2, aguarda exceção):
- lib/hollywood/fidelidade.ts (novo, puro): `atribuirFalaConvertida` (fala em 1ª pessoa de diálogo convertido vira "The fisherman would later recall: «…»", nenhuma palavra some), `limparCitacaoDoPrompt` (citação de fala sai do prompt de imagem), `despersonalizarPrompt` (nome próprio de pessoa + verbo de pessoa → papel da ficha; "Howard Ulrich looks" → "the fisherman looks"), `garantirFichaNoPrompt` (cena que mostra a pessoa abre com a ficha VERBATIM; paisagem pura não recebe), `garantirAcaoCentral` (se nenhuma palavra de AÇÃO da narração — nomes próprios fora — está no prompt, ele abre com a frase a mostrar; e se a narração anuncia ESCALA — número+unidade ou "dwarfing/taller than" — e o prompt não, idem).
- lib/hollywood/router.ts: a conversão diálogo→narração do modo sem rosto usa as três primeiras; toda cena sem diálogo passa por despersonalizar + ficha.
- app/api/generate-video-cinematic: o prompt FINAL (depois do enche-silêncio, antes do POST) passa por garantirAcaoCentral; duração planejada reconciliada — acima de 105% do pedido, o respiro das cenas folgadas é aparado, nunca uma palavra (65 s → ≤63 s no plano real).
- Regressões offline sobre o PLANO REAL do H3 (26 verificações, scripts/test-fidelidade-h3-2026-09-14.mjs): cena 1 sem "Here is something…" e sem "Howard Ulrich", com a ficha; cena 2 ganha "experienced a catastrophic tsunami that reshaped its landscape"; cena 3 ganha "A massive landslide…"; cena 4 ganha "524 meters, dwarfing the Empire State Building"; cena 5 narrada como "The fisherman would later recall: «My son and I…»"; cena 7 "the fisherman and his son" com a ficha; cena 2 (paisagem) não recebe a ficha; Lituya/Empire State não viram pessoa. Typecheck 0. Guardiões vizinhos verdes (visual-contract 330, enche-silêncio 19, timeline 44, primeira-pessoa 21, scene-truth, fala 184); vermelhos herdados iguais à base.

Não comprovado em vídeo: nada disto foi renderizado. Próximo gasto só depois da exceção, publicação, deploy validado e um novo cenário H3 assistido — nunca repetindo a combinação defeituosa.
