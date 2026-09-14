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

## 5. O que falta

1. Prova em vídeo, UM motor por vez, começando pelo H3 (o que falhou no teste do fundador): ideia de 1 linha, 60 s, 45 cr; assistir inteiro (duração, boca, voz, legenda, música, ordem) antes do próximo. Só com o "vai" e custo confirmado antes. Avatar por último.
1b. Publicar e7f975e3 (duração real do arquivo) — pede a exceção pontual do fundador.
1c. Gravar a duração entregue / legendas / trilha por render (ponto cego acima) antes de medir os oito motores.
1d. Decidir a régua do portão para os clássicos (3,1 pal/s).
2. Codex (tela): `error` do 422 + "seus créditos voltaram"; 16:9 pré-selecionado; duplo despacho.
3. Kineo 1 roteiro próprio e brief: cobrir no dry-run (hoje só a ideia).
4. Duração entregue em 90 s e avatar: validar no vídeo final (item 4 da auditoria), não no plano.
5. Hindi e outras línguas fora de EN/PT/ES: decisão de produto (voz + escritor + revisão por língua).
