# Estorno indevido de produto entregue — relatório (29/09/2026)

**Resumo:** a varredura horária de estorno devolvia o crédito de **todo** sucesso de imagem, áudio, enhance, clone de voz e upscale. O produto era entregue e o crédito voltava 2-3 h depois. Conserto no commit `KINEO-ESTORNO-INDEVIDO-2026-09-29`. **Nenhum estorno passado foi revertido**: isso é decisão do fundador.

Medição: banco `cqqukkvjjrguayiyjvhh`, 30/09 ~01:40 UTC.

## 1. Causa (provada no código e no banco)

`sweepStuckRenderDebits()` (`lib/credits/refund.ts`, cron `/api/cron/refund-sweep`, de hora em hora) pega débitos `kind='video'` com mais de 2 h e sem estorno. Ele julga "entregou" por **uma prova só**: existir linha em `videos` com o mesmo `render_id`. Oito chaves de débito nunca gravam essa linha, porque o produto delas mora em outro lugar:

| chave | rota | onde a entrega fica |
|---|---|---|
| `image-` | /api/images/generate | tabela `images` |
| `imgedit-` | /api/images/edit | tabela `images` (nenhum débito ainda) |
| `audio-` | /api/audio/generate | tabela `audios` |
| `upscale-` | /api/images/upscale | `images.upscaled_url` |
| `enhance-` / `enhance4k-` | /api/enhance | `videos.enhanced_url` (a chave usa o **id** do vídeo, não o render_id) |
| `voice-clone-` | /api/avatar/voice | `profiles.voice_clone_id` |
| `scene-gen-` | /api/avatar/scene | nenhuma (só devolve a URL) |

Como identificar o autor do estorno pelo relógio:
- **Estorno da própria rota** (falha da fal ou moderação) acontece em segundos, dentro da requisição.
- **Estorno da varredura** cai sempre entre 2 h e 3 h, no minuto :30 (o horário do cron). Em 100% dos casos abaixo foi assim, mínimo de 120,7 min.

Segundo caminho (as 0,6 h das imagens): **não existe**. A média de 0,6 h mistura dois grupos:
- 103 estornos legítimos, feitos pela rota em menos de 1 min;
- 36 estornos da varredura, entre 2,0 h e 3,0 h.

## 2. O que foi estornado: legítimo × indevido

| produto | via | entregue? | débitos | créditos | pessoas |
|---|---|---|---:|---:|---:|
| image | rota (falha da fal) | não | 101 | 481 | 4 |
| image | rota | linha de uma irmã na janela | 2 | 10 | 1 |
| **image** | **varredura** | **sim** | **33** | **91** | **12** |
| image | varredura | sem prova | 5 | 15 | 3 |
| **audio** | **varredura** | **sim (22 de 22)** | **22** | **62** | **10** |
| **enhance HD** | **varredura** | **sim** | **9** | **90** | **5** |
| **enhance 4K** | **varredura** | **sim** | **2** | **80** | **1** |
| enhance 4K | varredura | não (job da fal nunca consultado) | 3 | 120 | 3 |
| **voice-clone** | **varredura** | **sim\*** | **7** | **70** | **5** |
| voice-clone | rota (falha) | não | 1 | 10 | 1 |
| **upscale** | **varredura** | **sim (2 de 2)** | **2** | **2** | **2** |
| scene-gen | varredura | sem prova gravada | 2 | 4 | 1 |

\* Prova de clone = `profiles.voice_clone_id` preenchido hoje. É uma prova fraca, porque pode ter vindo de um clone posterior.

Sobre os 101 estornos legítimos de imagem: 91 são de **uma pessoa em 3 minutos** (14/09 00:17-00:19, 455 cr). Foi falha em rajada da fal, estornada na hora. Está certo.

## 3. Prejuízo (só o indevido: entregue e devolvido)

| produto | débitos | créditos | custo fal estimado |
|---|---:|---:|---:|
| imagem | 33 | 91 | $1,82 (19 dev · 6 nano-banana · 6 seedream · 1 recraft · 1 schnell) |
| áudio | 22 | 62 | $1,74 (17 minimax 15,1k chars · 3 eleven 2,2k · 2 kokoro) |
| enhance HD | 9 | 90 | $9,62 (481 s × $0,02/s) |
| enhance 4K | 2 | 80 | $10,08 (126 s × $0,08/s) |
| clone de voz | 7 | 70 | $10,50 (7 × $1,50) |
| upscale | 2 | 2 | ~$0 |
| **total** | **75** | **395** | **≈ $33,8** |

- **Valor de varejo** dos 395 cr: ≈ $49-65 (entre $0,125/cr do Studio e $0,165/cr do Starter).
- **Pessoas afetadas: 31.** Destas, 2 são contas da casa (`e92d81bf` com 64 cr e `f66a18a8` com 6 cr). Sobram **29 clientes, 325 cr**, e quase todos estão no plano free.
- **Nenhum cliente perdeu dinheiro.** O erro foi sempre a favor do cliente: a Kineo pagou a fal e deu o produto de graça.
- **Em curso:** até este conserto subir, toda imagem, áudio ou enhance entregue continua sendo devolvido na hora cheia seguinte. Hoje há 1 imagem entregue aguardando a varredura.

Lista por pessoa (prefixo do user_id → créditos devolvidos indevidamente):
a2f02d53 80 (enhance 4K) · e92d81bf 64 (casa) · 6fb45a8e 28 · 52749de6 24 · 2762a44e 20 · 75f76a4c 20 · 1e1d9a2a 15 · 5e96fae4 11 · 12410d72 10 · 3b2b703f 10 · 40ac7589 10 · 48175b4b 10 · 6de32206 10 · a1e6d335 10 · b8c73170 10 · fee87133 10 · 3243901a 6 · f66a18a8 6 (casa) · e9b92141 6 · b8eb1515 4 · f4a59266 4 · 25e1db72 4 · 6a562305 4 · 54c9a205 4 · da3b3f3d 3 · 74eca199 2 · 84548827 2 · 89972cf7 2 · b9f49852 2 · 1c94f925 2 · f1ba122a 2.

## 4. O conserto

1. **`lib/credits/sweepScope.ts`** (lib pura, sem import) reúne em `GENERIC_SWEEP_EXCLUDED_PATTERNS` todas as exclusões da varredura genérica, cada uma com o seu porquê. O `refund.ts` aplica a lista em laço no SQL e filtra de novo em JS (duas camadas, mesma lista). Chave nova cuja entrega não vira linha em `videos` entra na lista no mesmo commit.
2. **Rede nova `sweepAbandonedMediaDebits`** para image-/imgedit-/audio-. Só estorna se **não** houver linha em `images`/`audios` do mesmo dono até 3 min depois do débito, ou seja, a requisição morreu no meio. Julga débitos entre 2 h e 24 h e grava `credits_refunded` com `reason:'abandoned_sync_media'`.
3. **Rede nova `sweepAbandonedEnhanceDebits`**. Estorna só se `videos.enhanced_url` estiver vazio. Sem a linha do vídeo (ou com vídeo de outro dono), não estorna. Grava `credits_refunded` com `reason:'abandoned_enhance'`.
4. **/api/enhance: estorno pela mesma chave do débito.** O 4K debitava `enhance4k-<id>` e estornava `enhance-<id>`, então a falha do 4K nunca era devolvida pela rota. Os 3 estornos de 4K "sem entrega" só aconteceram porque a varredura errada os pegava.
5. **upscale-, voice-clone- e scene-gen-** saem da varredura e ficam só com o estorno da própria rota, que existe em todos os caminhos de falha. Buraco que resta: requisição morta no meio. Nesses produtos, isso é no máximo os 2 scene-gen sem prova.
6. **Guardião** `scripts/test-estorno-indevido-2026-09-29.mjs`: 11 checagens que executam o `refund.ts` de verdade contra um banco falso. 5 mutantes ficaram vermelhos. Os guardiões `test-clipes-2026-09-29` e `test-ads-v2-servidor-2026-09-28` foram reancorados para a lista nova, com a mesma intenção.

## 5. Decisões do fundador (nada foi feito)

- **Reverter os 395 cr devolvidos?** Recomendação: **não**.
  - São 29 clientes, quase todos free, e ≈ $34 de fal.
  - Tirar crédito de quem já recebeu o produto gera o "Feeling forgotten" ao contrário.
  - Se quiser cobrar, só faz sentido para `a2f02d53` (80 cr de enhance 4K entregue), e mesmo assim eu não cobraria.
- **Os 3 enhance 4K "não entregues"** (120 cr): foram estornados de forma legítima, porque o cliente não recebeu. Se ele voltar à página, o GET ainda pode entregar o job da fal, e aí sai de graça. Aceitável.

## 6. Achados paralelos (fora deste commit)

- **Enhance refeito é grátis para sempre.** A chave é por vídeo (`enhance-<videoId>`) e `debit_video_credits` engole `unique_violation` mesmo com a linha já estornada. Depois de um estorno, a nova tentativa nunca é cobrada. Conserto: chave por tentativa, ou o débito tratar linha estornada como nova.
- **`clip-` 12/09:** 2 clipes do Studio foram estornados às 2,8 h e ganharam linha em `videos` 17 h depois (recuperação manual). Foi legítimo na hora.
- **`scripts/test-guardiao-2026-08-28.mjs`** já está vermelho na ponta da fila (`live: a coluna soma as 4 fontes`, em `app/api/admin/live/route.ts`). Não foi tocado aqui.
