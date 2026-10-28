# "Put your face in it" em duas etapas — KINEO-ROSTO-QUADRO-CHAVE-2810 (28/10/2026)

Ramo `codex/rosto-quadro-chave-2810` sobre `origin/main` 9d6dd2e77. `FACE_REMIX_PUBLIC` segue **false** (só contas da casa, por
`/clips?remix=<id>`). Nada enfileirado, nada publicado.

## 1. O 502 das 04:32 UTC no /images (foto de referência) — causa

- Log da Vercel (deploy dpl_HmUdSRWvZy7Ci2MB8BVZMnAzdSza, 04:32:24 e 04:33:12): `[images] provider failed — refunding: Forbidden`
  → a fal respondeu **403** no envio.
- Log de storage do Supabase: por tentativa há **um único GET** da URL assinada (0,9 s depois de assinar = a moderação). A fal
  **nunca baixou a foto** — logo tamanho (1,8 MB), formato (PNG) e a URL assinada não foram julgados por ela.
- Linha do tempo: 04:31:03 o clipe Kling da4ae49c fechou (último gasto, ~US$ 0,56); 04:32:24 e 04:33:12 os dois 403;
  **nenhum pedido pago na fal entre 04:33 e 06:40**; 06:40 o filme Seedance recebeu a recusa de saldo e o alarme acordou. Ou seja,
  06:40 é quando o esgotamento foi *detectado* pelo primeiro caminho que sabe lê-lo, não quando aconteceu. 403 no envio, sem baixar
  nada, é a resposta da fal com a conta trancada por saldo. Às ~16:30 houve recarga e às ~17:00 o MESMO fluxo com foto de referência
  voltou 200 (imagem 12f3c417).
- Defeito nosso que ficou: a rota lia só `err.message` ("Forbidden"), nunca `err.body.detail`, não acordava o alarme de saldo e
  devolvia "Image generation failed" para o cliente. **Conserto** (`app/api/images/generate/route.ts`): lê `falErrorText`, grava
  `provider_status`/`provider_error` no evento `images_reference_used`, `looksExhausted` → `alertFalExhausted` + **503** "motor pausado,
  créditos devolvidos" (Retry-After 300); outra falha segue 502.

## 2. O fluxo novo (lib/clips/faceRemix.ts · clipFlow.ts · clipServer.ts)

| Etapa | Quem | O quê | Tempo típico | Custo fal |
|---|---|---|---|---|
| Pedido | `submitClip` | confere `remix` no catálogo, posse/bytes/moderação da foto (+ recorte do rosto), **cobra 10 cr**, envia a etapa 1 | < 3 s | — |
| 1 · quadro-chave | `fal-ai/nano-banana-pro/edit` (1K, 9:16, PNG) | edita a foto para dentro da cena: `image_urls = [recorte do rosto, foto inteira]`, plano médio, trava de identidade genérica, figurantes descritos como pessoas diferentes | 15–40 s | US$ 0,15 |
| settle | `settleClip` (aba a cada 3–6 s, cron de 1 min, varredura horária) | persiste o PNG em `renders/clips/<uid>/<clipId>-keyframe.png` → **reserva condicional** (`model`→i2v, `fal_request_id`→null; só um ator ganha) → envia o Kling partindo do quadro-chave NOSSO → grava o request_id → evento `face_remix_keyframe` {keyframe:'done', video:'submitted'} | < 2 s | — |
| 2 · vídeo | `fal-ai/kling-video/o3/pro/image-to-video`, 5 s, sem áudio | prompt de movimento do modelo + "mesmo rosto do início ao fim, duas mãos, plano único sem corte" | 2–4 min | US$ 0,56 |
| Entrega | `settleClip` | MP4 no bucket, `done`, `clip_delivered` + `face_remix_ready` {keyframe:'done', video:'delivered'} | — | — |

- A etapa é lida pelo `model` da linha (`faceRemixStageForRow`); nenhuma coluna nova. A linha guarda a foto original; o quadro-chave
  mora em caminho determinístico.
- Falhas: etapa 1 falhou → `clip_failed` reason `keyframe_failed` {keyframe:'failed', video:'skipped'}, **estorno dos 10, Kling nunca
  chamado**; Kling recusou → `provider_rejected` {keyframe:'done', video:'rejected'}, estorno dos 10; vídeo falhou → {keyframe:'done',
  video:'failed'}, estorno. Envio perdido depois da reserva → rede de 10 min (`submit_lost`), como no pedido comum.
- Custo total **US$ 0,71** por remix; 10 cr × US$ 0,1327 (Creator mensal) = US$ 1,33 → margem ≈ **47%**.
- Tela: a foto do remix passa SEMPRE pelo canvas (JPEG ≤ 1600 px, barras pretas do letterbox cortadas); o recorte do rosto nasce no
  navegador (FaceDetector quando existe, senão heurística de selfie: quadrado centrado, lado = min(largura, 55% da altura), topo a 4%)
  e sobe como 2ª foto moderada; "Placing you in the scene… / Filming your scene…" no cartão.

## 3. Modelo por tendência (dado, não código) — `FaceTemplate` em lib/homeGaleria.ts

`face: { keyframeScene, motionPrompt, framing: 'medium'|'knees-up', extras, maxPeople }`. O código cola o resto: plano, "the person
from the photo", trava de identidade ("same face shape, eyes, eyebrows, nose, lips, hairline, beard and skin texture; same age; do
not beautify or change any feature"), "exactly two arms and two hands", anti-clone dos figurantes, "no text/logos". Receita completa de
"como adicionar um modelo" no comentário acima de `GALERIA_NEW_CLIPS`. Regra de publicação: 1 render interno com foto consentida e
nota pelo olho **≥ 8** (1º quadro já na cena, mesmo rosto/cabelo/barba do início ao fim, sem corte, sem texto/logo).

## 4. Plano de teste pós-deploy (conta da casa; foto do fundador, consentida, NUNCA no repo/vitrine)

1. `/clips?remix=golden-ball` logado como fundador. Foto: `…\scratchpad\rosto2810\fundador.png` (7,5 MB PNG, barras pretas). Esperado
   no upload: 2 POSTs em `/api/avatar/upload` (foto JPEG ≤ 1600 px sem barras + recorte do rosto ≤ 768 px).
2. Marcar o consentimento → "Generate · 10 credits". Esperado: 202, saldo −10, linha `clips` com `model = fal-ai/nano-banana-pro/edit`,
   `fal_usd = 0.71`, cartão "Placing you in the scene…".
3. Em ≤ 1 min: evento `face_remix_keyframe` {keyframe:'done', video:'submitted'}, arquivo `renders/clips/<uid>/<id>-keyframe.png`
   (abrir: plano médio, rosto grande, 2 amigos visivelmente diferentes, troféu de bola de futebol), linha com `model` = Kling o3 i2v.
4. Em 2–4 min: `done`, `face_remix_ready`. Nota ≥ 8 = **1º quadro já na festa** (nenhum quadro do parque/da foto), **mesmo rosto,
   cabelo e barba do início ao fim**, **sem corte seco**, duas mãos por pessoa, sem texto/logo. Comparar com bb36c88d (7) e
   004bbd4b/21c0008c/7b18efcb (~8).
5. Falha controlada: repetir com uma foto SEM rosto (paisagem) → esperado `keyframe_failed` ou recusa da moderação, 10 cr de volta,
   nenhuma chamada ao Kling (events: `clip_failed` com keyframe:'failed', video:'skipped').
6. `/images` com foto de referência (JPEG 162 KB que já funcionou) → 200; o evento `images_reference_used` traz `outcome:'delivered'`.
7. 4º remix com 3 clipes em andamento → 429 "You already have 3 clips in progress. Wait for one to finish." (mensagem do servidor,
   mostrada no painel do remix).

## 5. Pesquisa na fal (ids reais, lidos no OpenAPI/páginas em 28/10)

**Etapa 1b — troca/restauração de rosto por cima do quadro-chave (não ligada; `FACE_REMIX_FACE_SWAP_MODEL = null`):**
- `easel-ai/advanced-face-swap` — US$ 0,05, **depreciado** ("no longer supported").
- `fal-ai/face-swap` (`base_image_url` + `swap_image_url`) — OpenAPI responde, mas a página do modelo é uma casca sem docs/preço e
  ele não aparece na busca do catálogo. Não confiável para produto.
- `fal-ai/codeformer` — US$ 0,0021/MP: **restauração** (nitidez), não devolve identidade.
- `fal-ai/hy-wu-edit` — US$ 0,10/MP (+0,15/MP com "thinking"); "swap faces" com referências; único resultado da busca "face swap".
  A 1K ≈ US$ 0,15 → remix a ≈ US$ 0,86 → margem ≈ 35% nos 10 cr. Candidato a A/B só se o olho disser que melhora.

**Referência de MOVIMENTO (foto + vídeo de dança → a pessoa faz a coreografia exata) — existe, não construído:**
- `minimax/h3-max/recast` — **troca as pessoas de um vídeo por até 4 fotos** mantendo movimento, câmera, cortes e som
  (`video_url` 5–30 s, `reference_image_urls` 1–4, `prompt` "quem vira quem", 768P/1080P, `enhance_realism`). US$ 0,30/s (768p) ·
  0,45/s (1080p) → **5 s = US$ 1,50 / 2,25**. É exatamente "coloque você (e os amigos) NESTE clipe" com a coreografia do clipe da
  casa — sem quadro-chave, sem Kling. Para ≥ 40% de margem: ≥ 19 cr a 768p (US$ 2,52) ou ≥ 29 cr a 1080p.
- `fal-ai/kling-video/v2.6/pro/motion-control` — imagem + vídeo de referência (3–30 s) → a pessoa da imagem executa o movimento;
  US$ 0,112/s (5 s = US$ 0,56, igual ao i2v de hoje). Precisa de um quadro-chave de corpo inteiro como imagem; dá para encadear
  com a etapa 1 atual (0,15 + 0,56 = US$ 0,71, mesma margem) trocando só a etapa 2.
- `fal-ai/wan/v2.2-14b/animate/move` — US$ 0,04–0,08/s; mais barato, qualidade não validada.
Recomendação: canário com **recast** (o clipe original da Golden Ball + 1 foto, 768p) antes de qualquer outra coisa — é o produto
que o fundador descreveu, e resolve grupo e coreografia de uma vez.

## 6. Grupo (1–4 pessoas) — desenho, ainda não ligado

- Catálogo: `maxPeople` já existe (Golden Ball = 4, lobisomem = 1); `framing: 'knees-up'` já tem texto (`FACE_REMIX_FRAMING_GROUP`).
- Pedido: `image_url`/`face_image_url` da pessoa 1 + `friends: [{ image_url, face_image_url }]` (até maxPeople−1), cada foto da
  própria conta, bytes e moderação; `image_urls` da etapa 1 = recortes na ordem (1→N) + fotos na ordem (o `/edit` não limita a
  contagem; o teto de 14 referências é do Gemini) — sem grade 2×2 no servidor (não há decodificador de imagem no servidor), e sem a
  trava de 3 do `/api/images/generate`, porque o remix chama o edit direto.
- Prompt: "Reference images 1–N are close face crops of the N people, left to right in the scene; N+1–2N are their full photos in the
  same order", plano knees-up, "each person has exactly two arms and two hands", figurantes zero quando N ≥ 2.
- Custo: o edit cobra por imagem de saída (US$ 0,15 a 1K, referências grátis) + Kling 5 s US$ 0,56 = **US$ 0,71, igual ao single**.
  Proposta (não é preço público): 10 cr para 1 pessoa; **15 cr para grupo** (margem ≈ 64%) — o valor percebido é maior e cobre
  refações; ou manter 10 (47%). Com recast: 20 cr (768p) / 30 cr (1080p).
- Tela: "Add a friend" até 4 slots, cada um com foto + recorte; consentimento único cobre todas.

## 7. Pendências

- Render real pós-deploy (plano acima) e nota pelo olho; só então `FACE_REMIX_PUBLIC = true`.
- Grupo (commit separado) e canário do recast.
- `/images`: o reduzidor do navegador deixou passar um PNG de 1,8 MB sem converter (shrinkPhoto caiu no catch); não foi a causa do 502,
  mas vale forçar JPEG ≤ 2048 como no remix.
