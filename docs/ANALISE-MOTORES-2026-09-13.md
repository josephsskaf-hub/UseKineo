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
| 7 | Palavras terminando depois do clipe | **Consertado (14/09 03:20)**: o verificador recebe os segundos úteis do clipe (`speech_overruns_clip`); no compose a cena de fala CRESCE até a última palavra em vez de cortar o fim. |

## 5. O que falta

1. Prova em vídeo, UM motor por vez, começando pelo H3 (o que falhou no teste do fundador): ideia de 1 linha, 60 s, 45 cr; assistir inteiro (duração, boca, voz, legenda, música, ordem) antes do próximo. Só com o "vai".
2. Codex (tela): `error` do 422 + "seus créditos voltaram"; 16:9 pré-selecionado; duplo despacho.
3. Kineo 1 roteiro próprio e brief: cobrir no dry-run (hoje só a ideia).
4. Duração entregue em 90 s e avatar: validar no vídeo final (item 4 da auditoria), não no plano.
5. Hindi e outras línguas fora de EN/PT/ES: decisão de produto (voz + escritor + revisão por língua).
