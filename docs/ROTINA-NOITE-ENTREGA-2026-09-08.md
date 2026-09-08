# ROTINA ENTREGA — noite 08→09/09/2026

Missão: quem aperta Generate recebe o filme. Métrica: despachos que terminam
em vídeo `completed` / despachos totais, POR PESSOA, com corte no SHA de cada
conserto (nunca por relógio).

Worktree: `C:\kineo-wt\noite-entrega` · base `origin/main` a6d9cd7a.

---

## r1 20:40 — AUDITORIA COM DENOMINADOR

### O QUE MEDI

Contas externas (email sem josephsskaf/usekineo/kineo.local), **14 dias**,
por PESSOA. Denominador = `video_generation_started` (evento de cliente, o
único que existe para TODOS os motores). Desfecho = linha em `videos`
(verdade de servidor; a tabela só ganha linha quando o filme completa —
conferido: zero linhas com status ≠ completed nesta coorte).

**280 pessoas apertaram Generate · 230 receberam filme (82,1%) · 50 não.**

| causa (por PESSOAS) | pessoas | viram alguma tela de falha |
|---|---:|---:|
| **1. SILÊNCIO — nenhum erro registrado** | **22** | **0** |
| **2. narração curta (`narration_guard_blocked`)** | **12** | 4 |
| 3. PORTÃO de pagamento (não é falha) | 9 | 2 |
| 4. falha técnica (`fast_threw`/TypeError) | 6 | 2 |
| 5. PORTÃO via modal de upgrade (não é falha) | 1 | 0 |

Separando o que a ordem manda separar: **falha real = 40 pessoas**,
**portão = 10**.

**O fato transversal, e o maior número da noite: das 40 pessoas com falha
real, 32 (80%) NUNCA viram uma tela de falha.** O produto não erra alto —
ele fica mudo.

### DUAS CORREÇÕES DE LEITURA (números anteriores que não se sustentam)

1. **"O POST morre dentro do navegador" é artefato de corte.** O comentário
   em `app/api/cron/finish-stranded-renders/route.ts:1009` registra "9 das 11
   não têm sequer `generation_dispatch_received`". Esse evento **nasceu em
   05/09 20:56:54 UTC** (`KINEO-DISPATCH-ENTRY-2026-09-05`): quem despachou
   antes disso não podia tê-lo. Medido só na janela em que o campo existe:
   **100 de 101 despachos chegaram ao servidor** (65 pessoas). Um único
   despacho se perdeu no navegador em 3 dias. A coorte da carta
   `attempt_lost` é muito menor do que o comentário supõe.
   (memória `campo-novo-e-o-carimbo-do-deploy`)

2. **`narration_too_short` já está muito mitigado.** O autofit-down
   (`KINEO-DEGRAU-2026-09-03`, `lib/narrationFit.ts`) está LIGADO e chamado
   em `app/api/generate-video-cinematic/route.ts:1416`: **11 pessoas salvas**
   desde 04/09 (`script_duration_autofit_down`). Os 4 bloqueios que sobraram
   desde então têm cobertura de 6%, 14%, 32% e 53% — fala de 2s, 5s, 19s e
   32s. Ali recusar continua certo. O que NÃO está certo é como se recusa
   (ver causa nº2).

### AS DUAS CAUSAS ESCOLHIDAS (por pessoas atingidas, não por gravidade)

**CAUSA Nº1 — O TRABALHO PRONTO QUE EVAPORA COM A ABA. 22 pessoas.**

Mecanismo, lido no código e confirmado no rastro de duas pessoas na janela
válida:

- `/api/generate-video-fast` roda 30–40s e termina devolvendo o payload
  COMPLETO do compose (`generationId`, `clip_urls`, `voiceover_script`,
  `scene_captions`, `duration`) — rota, linha 1146.
- O checkpoint durável no servidor (`/api/render-recovery`,
  `KINEO-RECOVERY-2026-09-06`) só nasce quando **o CLIENTE recebe essa
  resposta** e a reenvia (`GenerateClient.tsx:9466`).
- Se a aba morreu enquanto o servidor trabalhava, a resposta cai no vazio:
  clipes buscados e script pronto **evaporam**, nenhum checkpoint existe, a
  fase 4 do cron é cega, e a pessoa nunca é avisada de nada.

Rastro da pessoa `1968136d` (06/09, Fast, vinda do ChatGPT): despacho 07:21:19
→ `generation_dispatch_received` 07:21:27 → aba embora 07:21:45 (27s de
espera) → **nunca mais nenhum evento, nenhum vídeo, nenhum erro**. O servidor
recebeu, trabalhou e o resultado morreu no ar.

O remédio existe e funciona — 43 de 48 checkpoints viraram filme desde 06/09.
Ele só nasce tarde demais: depende do sobrevivente para socorrer o afogado.

**CAUSA Nº2 — A RECUSA QUE NÃO CHEGA À TELA. 8 das 12 de narração curta.**
A guarda recusa o render e devolve 422; 8 das 12 pessoas bloqueadas em 14
dias não têm `generation_failed_screen_shown`. Elas apertaram, foram
barradas por uma decisão NOSSA, e não viram a frase que explica o porquê.

### O QUE MUDOU NESTA ROTAÇÃO
Nada em código. Rotação de auditoria — a ordem manda escolher as causas pelo
número de pessoas, e as duas escolhidas mudaram depois do corte correto.

### SHA
Sem commit de código nesta rotação.

### O QUE FICOU
r2: causa nº1 em código — o servidor grava o próprio checkpoint antes de
devolver, para que o filme não dependa da aba continuar viva. Guardião
`scripts/test-entrega-noite-2026-09-09.mjs`.
