# Pitch invader (invasor-de-campo) · 15/11/2026

Pedido do dono (15/11): "Esse é o vídeo de futebol que eu quero no Recreate, pra pessoa trocar o rosto!". O vídeo é o de 18,4 s montado à mão pela CEO em 14/11 (`docs/decisoes-1311/recreate-reel-CABELO-NOVO-INTEIRO-1411.mp4`, fora do repositório).

## O que o produto faz
O cliente logado manda UMA foto. O servidor faz 3 pedidos ao `kling/v4/video-to-video/edit` (720p), um de cada vez somando todos os clientes (a vaga única da fila do Kling edit fica com este pedido do 1º ao último trecho), com o texto da receita de 14/11 (alvo "the man in the dark blue shirt", cabelo e barba lidos da foto, "and he wears no glasses" quando a foto não tem óculos). Depois a montagem do Creatomate junta 8 + 8 + 2,4 s (o último trecho, alongado para 3,0 s, volta a 125%), põe o som ORIGINAL e a marca usekineo.com de quem não paga. O MP4 vai para `renders/clips/<dono>/<clipe>.mp4`. Débito único na entrada (`submitClip`/`debitVideoCredits`), estorno em toda falha. Código: `lib/recreate/invasor.ts` (máquina pura), `lib/recreate/invasorMolde.ts` (cortes e arquivos, só servidor), `lib/recreate/invasorServer.ts`, `lib/recreate/invasorRota.ts`, fios em `lib/clips/clipServer.ts` e `lib/clips/clipFlow.ts`. Guardião: `scripts/test-invasor-de-campo-1511.mjs`.

## Os cortes (casados quadro a quadro com o original `reel-DfnUolbRxTf.mp4`, 30 fps)
| trecho | quadros do original | segundos | arquivo ao motor | no filme |
|---|---|---|---|---|
| 0 | 0 a 239 | 0,000 a 8,000 | 8,0 s | 8,0 s |
| 1 | 240 a 479 | 8,000 a 16,000 | 8,0 s | 8,0 s |
| 2 | 641 a 712 | 21,367 a 23,767 | 3,0 s (72 quadros reescritos a 24 fps) | 2,4 s (125%) |

16,0 a 21,2 s fica de fora (vários cortes e o alvo coberto pelo nº 9). Som: o original nos mesmos cortes, 18,4 s.

## Preço
PROVISÓRIO da casa: 74 créditos (10 s = 40 da tabela × 18,4 s). Custo fal previsto: US$ 3,60 por pedido (3 trechos). O preço público é do dono.

## O que falta para abrir
1. Subir os 6 arquivos de `C:\kineo\docs\invasor-de-campo-1511\subir-ao-bucket-privado\` ao bucket PRIVADO `quarantine`, pasta `recreate-guias/v1`, com os mesmos nomes (painel do Supabase → Storage). Tamanho e sha256 estão em `lib/recreate/invasorMolde.ts`; sem eles a rota recusa antes de cobrar.
2. Publicar. O molde é só da casa (`swapInTest`), fora da home e do catálogo público.
3. Teste pago (conta da casa, rosto inventado, ~US$ 3,75 com a foto): só DEPOIS de publicar. Antes disso o cron de produção liquidaria a linha com o código velho (entregaria o trecho 0 como filme e cobraria).
4. Olhar os quadros (4 fps) do filme: rosto trocado nos 3 planos.
