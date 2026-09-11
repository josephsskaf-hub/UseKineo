# DECISÃO — Três modos no Studio (11/09/2026)

Ordem do fundador (11/09, ~14:30): "três tipos de ferramenta dentro do vídeo:
um em que a IA escreve a história pra você; um em que você já traz a história
pronta; e um em que a gente só cria as imagens do que a pessoa está falando."

## O caso que decidiu

Render `802f024e` (11/09 16:07 UTC, cliente do ChatGPT, trial de 30 créditos):
a pessoa colou um plano JSON — `clip: 07`, `duration: 10 seconds`, `action:
Luffy rapidly dodges the descending magma fists…`, `camera: FPV drone…`, `vfx`,
`combat_logic`. A Kineo só sabia narrar: fez 5 cenas de Seedance em 35 s e a
narradora **leu o JSON em voz alta** por cima de lava (49 s, 15 créditos). A
pessoa não voltou. Em 30 dias, 2 filmes com esse formato.

## Os três modos

| modo | o que a pessoa dá | o que a Kineo faz | onde |
|---|---|---|---|
| ✨ Let AI structure it | uma ideia | escreve o roteiro, narra, legenda, monta | como sempre |
| 📝 Use my script as is | a história pronta | narra palavra por palavra, monta | como sempre |
| 🎬 Just this clip (no narration) | UMA cena (ação, câmera, estilo) | um clipe de 4–12 s no Seedance 1.5, sem voz, sem legenda | **novo** |

## O que foi construído

- `lib/cinematic/shotSpec.ts` (puro): reconhece prompt de plano (JSON com
  chaves de plano; linhas `chave: valor`; ou linguagem de câmera curta sem
  narrativa) e o transforma num prompt em prosa + segundos (4–12).
- `/api/generate-clip` (POST): debita `CLIP_CREDITS` (5) pelo mesmo RPC de todo
  render, submete UM clipe ao Seedance (`generate_audio:false`, duração exata,
  aspect do pedido), grava a posse em `clip_submitted`; falha de envio estorna.
- `/api/clip-status` (GET): posse por `clip_submitted`; ao concluir, copia o
  mp4 para o nosso bucket ANTES de declarar entregue, grava `videos`
  (`quality_mode='clip'`, `credits_used=5`) e `clip_completed`; falha do
  fornecedor estorna e grava `clip_failed`. Idempotente.
- Studio: terceiro pill, seletor 5/8/10/12 s, botão "Render clip · 5 cr",
  polling a cada 5 s, player e download na própria tela (não passa pelo
  /generate nem pelo compose).
- Guarda nas rotas narradas (`generate-video-cinematic`, `generate-video-fast`):
  plano colado fora do modo clipe → 422 `shot_spec_detected` **antes de
  qualquer débito**, com a saída na mensagem. Evento `shot_spec_detected`.

## Decisões pendentes do fundador

1. **Preço do clipe**: 5 créditos por clipe de até 12 s (Seedance 720p custa
   ~US$ 0,30–0,50 → margem ≥50% no pior caso). Ajustar se quiser.
2. **Marca d'água**: o clipe não passa pelo compose, então **não recebe marca
   d'água** nem para conta grátis. Um clipe de 10 s sem voz não é o produto
   inteiro; se quiser marca, é um passo com ffmpeg no servidor.
3. **Outros motores no modo clipe** (Kling 2.5, Veo, Kling 3): v1 é só
   Seedance; os outros entram por preço por clipe quando você decidir.

## Prova

`scripts/test-tres-modos-clipe-2026-09-11.mjs` (30): a lib executada com o
texto REAL do caso, as duas rotas, o guarda e o Studio. Travas de AST do Studio
(`test-five-improvements`, `test-locale-readiness`) passaram a exigir que os
handlers da base continuem presentes (acréscimo aprovado não derruba a trava).
Vermelhos herdados de origin/main: `test-preco-visivel-2026-09-02` (copy de
25 créditos), `test-studio-hierarchy-runtime` (useContext nulo).
