# ANÁLISE DOS MOTORES — 13/09/2026 (noite) → 14/09 madrugada — $0 gasto

Pedido do fundador: "faz uma análise completa dos motores, todos eles, sem gastar nenhum dólar, e me traz aqui pra a gente ver o que vamos arrumar."

Método: (1) banco, 30 dias, por motor: filmes entregues, pessoas, downloads, checkouts, pagantes; (2) matriz de dry-run ($0, conta do fundador, estorno automático) motor × entrada — ideia de 1 linha ("Let AI structure"), roteiro próprio ("Use my script as is", 45-60 s), brief do ChatGPT (o formato que o fundador colou no H3 em 13/09); (3) conserto no mesmo dia do que reprovou, e re-teste com o deploy no ar.

## 1. O que o banco diz (30 dias, só clientes, conta do fundador excluída)

| Motor | Filmes | Pessoas | Downloads | Checkout | Pagou |
|---|---|---|---|---|---|
| Kineo 1 (fast) | 405 | 284 | 189 | 32 | 2 |
| Seedance 1.5 | 275 | 238 | 132 | 20 | 2 |
| MiniMax H3 | 3 | — | — | — | 0 |
| Kling 2.5 | 3 | — | — | — | 0 |
| Clipe (5 cr) | 2 | — | — | — | 0 |
| Veo 3.1 · Kling 3 · Omni | 0 | 0 | 0 | 0 | 0 |

Leitura: Kineo 1 + Seedance 1.5 são 99% do produto que o cliente vê. Os motores caros somam 6 filmes em 30 dias — e o único teste real do fundador no H3 (13/09) falhou no compose (fala de 61 palavras numa cena de 12 s). O motor caro não é "pior": ele quase nunca é usado, e quando é, a estrada tinha furos que o barato não tem.

## 2. Matriz de dry-run ($0) — ANTES dos consertos (13/09 ~23:00)

| Motor | Ideia (IA escreve) | Roteiro próprio | Brief do ChatGPT |
|---|---|---|---|
| Kineo 1 | PASS 193 pal | só modo IA no dry-run (verbatim precisa de marcadores) | — |
| Seedance 1.5 | FAIL 137-150 pal ≈ 44-48 s para 60 s | PASS (45 s) | PASS 184 pal, sem vazar instrução |
| Kling 2.5 | FAIL idem | PASS | PASS |
| Veo 3.1 | FAIL idem | PASS | PASS |
| Kling 3 | FAIL silêncio: 113 pal, 7 cenas, 10-13 s mudos | PASS (10 cenas, 87 s p/ 60) | PASS (brief vira fala do autor) |
| MiniMax H3 | FAIL silêncio: 116 pal | PASS (consertado 13/09: FALA-MAIOR-QUE-A-CENA) | PASS |
| Omni Flash | FAIL silêncio + cena 1 é enchimento "Here is something most people do not know about…" | PASS | PASS |

Duas causas, uma por família:
- Clássicos (Seedance/Kling 2.5/Veo): a expansão das falas curtas só disparava abaixo de 85% do piso — 137-150 palavras passavam e o filme saía 12-16 s mais curto que o pedido.
- Caros (Kling 3/H3/Omni): o planejador dirige bem a câmera e escreve pouco — 16 palavras por cena de 10 s. A régua de silêncio (≤1,5 s/cena, ≤8 s total) reprovava tudo. O Omni ainda abria com um enchimento genérico de lib/runway.ts.

## 3. O que foi consertado (mesma noite)

1. lib/runway.ts — a expansão dos clássicos dispara no piso cheio (era 85%). Seedance ideia: 137 → 177 palavras (57 s de fala para 60 s) — PASS.
2. lib/runway.ts + generate-video-cinematic — KINEO-ENCHE-SILENCIO: no modo IA dos motores caros, toda cena abaixo do alvo (segundos × 2,3 palavras) é reescrita numa chamada (gpt-4o-mini), janela alvo−2..alvo+1, 2ª rodada para quem ficou fora, enchimento genérico vira fato. Verbatim nunca passa por aí (C1: a fala é do autor). Fail-open.
3. Guardião scripts/test-enche-silencio-2026-09-13.mjs (11). Suíte inteira: 396 verdes, 117 vermelhos — todos já vermelhos na origin/main pristina (nenhum novo).

Rodada 1 do re-teste (d84c7909) mostrou dois furos: o Omni voltou com 27 palavras para 10 s (o compose recusaria) e o Kling 3 parou em 14/18. A v2 fechou os dois (teto alvo+1, gatilho em alvo−1, 2ª rodada).

## 4. Matriz DEPOIS (deploy v2) — preenchida abaixo

<!-- RESULTADO-V2 -->

## 5. O que ainda falta (ordem)

1. Prova em vídeo: 6 canários pagos, um por motor caro × entrada (~520 cr). Os dry-runs de $0 já passam; o veredito de qualidade é do fundador.
2. Codex (tela): mostrar o `error` do 422 e "seus créditos voltaram"; 16:9 pré-selecionado; duplo despacho.
3. Decisão do fundador: esconder o H3 até o canário, ou não; oferta no e-mail de render falhado (oferta congelada até 09/10); trava 8.2.
4. Kineo 1 roteiro próprio no dry-run só cobre o modo IA (verbatim entra por analyze-idea) — cobrir na próxima leva.
