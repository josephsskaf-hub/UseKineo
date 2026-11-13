# Recreate com o seu vídeo: contrato da API (13/11)

Pedido do dono, 13/11 por volta de 19:55: "eu quero recreate pra hoje funcionando em qualquer video que eu quiser. ja no nosso site novo."

- Motor: Seedance 2.5 por vídeo de referência (`bytedance/seedance-2.5/reference-to-video`, task `reference`), em 480p e sem som gerado.
- Interruptor: `SEU_VIDEO_RELEASE` em `lib/recreate/seuVideo.ts`. Hoje vale `'internal'`, só para as contas da casa. Para as outras contas, as 3 rotas devolvem 404.
- Guardião: `scripts/test-recreate-seu-video-1311.mjs`.

## O fluxo da tela (GPT)

1. A pessoa escolhe o vídeo (MP4 ou MOV). Antes do envio, a tela pode recusar o que passa de 100 MB.
2. **Reservar o envio**: `POST /api/recreate/seu-video/upload`
   - Corpo: `{ "bytes": 12345678, "content_type": "video/mp4" | "video/quicktime" }`
   - 200: `{ ok: true, video_path, upload_url, token, bucket: "renders" }`
   - 400: `{ ok: false, code: "format" | "size", error }`
   - O arquivo vai direto ao Supabase:
     - `supabase.storage.from('renders').uploadToSignedUrl(video_path, token, file, { contentType })`;
     - ou um `PUT` na `upload_url` com o arquivo e o `Content-Type`.
3. **Conferir antes de cobrar**: `POST /api/recreate/seu-video/check`
   - Corpo: `{ "video_path": "...", "people": 1-3, "positions": ["on the left", ...] }`. O campo `positions` é opcional.
   - 200: `{ ok: true, seconds, fps, width, height, bytes, generated_seconds, aspect_ratio, credits, balance, shortfall, needs_plan, prompt }`
   - 422: `{ ok: false, code: "missing" | "format" | "duration" | "fps" | "size", error }`. A frase já diz que nada foi cobrado; a tela só a mostra.
   - O `prompt` vem pronto e pode ser editado. A tela mostra o texto e deixa a pessoa editar.
   - Com `needs_plan: true` (vídeo de mais de 10 s numa conta grátis), a tela leva a pessoa aos planos.
   - Com `shortfall > 0`, a tela leva a pessoa a `/pricing`.
4. **Fotos**: o mesmo envio de foto do Recreate de hoje (fotos da própria conta), de 1 a 3. Cada foto i é a `@Image{i}` do prompt.
5. **Gerar**: `POST /api/recreate/seu-video`
   - Cabeçalho `Idempotency-Key: <uuid>`. A chave é a mesma em cada nova tentativa do mesmo pedido.
   - Corpo: `{ "video_path", "photos": [url1, url2?, url3?], "prompt", "consent": true, "prompt_edited": true|false }`
   - 202: `{ clip: { id, status }, replay }`
   - Erros: `{ error, code }`. Os códigos possíveis:
     - `consent`, `photos`, `prompt`, `plan` (402), `credits` (vem com `shortfall` e `plans: "/pricing"`);
     - `missing`, `format`, `duration`, `fps`, `size` (422);
     - `engine_refused`: o motor recusou e o estorno já foi feito. A frase é a da CEO: "The engine did not accept this photo. Nothing was charged. Try another photo.";
     - `idempotency_conflict`, `too_many_active`.
6. **Acompanhar**: `GET /api/recreate/status?id=<clip.id>`, que já existe. A tela consulta a cada 5 a 10 s.
   - Resposta: `{ clip: { id, status: "pending"|"processing"|"done"|"failed", video_url, credits_refunded, reason?, message? } }`
   - Com `reason: "engine_refused"`, mostrar o `message` (a mesma frase da CEO). O motor bloqueou um rosto real ou uma cena sensível, e os créditos já voltaram.
   - O `video_url` já é o do nosso bucket. A URL da fal não chega à tela.
   - O teste levou 3 min 36 s para 5 s de vídeo.

## As regras (servidor; a tela não decide nada disto)

- **Vídeo**: de 2 a 15 s, de 24 a 60 fps, até 100 MB, só MP4 ou MOV.
  - O servidor lê o cabeçalho do arquivo no bucket (Range, sem baixar o vídeo) na conferência e de novo no pedido.
  - O número que a tela mostra nunca é o que se cobra.
- **Duração gerada**: os segundos do vídeo arredondados, de 4 a 15.
- **Preço**: a tabela de hoje do Recreate (`lib/checkoutPricing` RECREATE_PRICING), sem preço novo.
  - Até 10 s: 40 créditos.
  - De 11 a 15 s: 60 créditos, só para plano pago.
- **Custo fal (480p)**: US$ 0,1323 por segundo, somando os segundos enviados e os gerados. Um vídeo de 8 s fica em cerca de US$ 2,12.
- **Débito, estorno e idempotência**: o `submitClip` de sempre. Se o motor falhar ou recusar, o estorno é automático.
- **Áudio (CEO 13/11)**: a Entrega A sai muda (`generate_audio: false`) e a tela avisa "sem som nesta versão". A Entrega B devolve o som ORIGINAL do vídeo do cliente pela montagem da casa. Som novo não se gera.
- **Prompt editado**:
  - até 900 caracteres;
  - precisa citar `@Video1` e cada foto enviada;
  - não pode citar foto que não foi enviada.

## Medir (SQL)

```sql
-- pedidos, segundos, custo e recusa por dia
select date(e.created_at) dia, count(*) pedidos,
       sum((e.metadata->>'generated_seconds')::int) segundos, sum((e.metadata->>'fal_usd')::numeric) usd
from events e where e.name = 'recreate_seu_video_started' group by 1 order by 1 desc;
-- espera (pedido → pronto) e recusas do motor
select s.metadata->>'clip_id' clip, d.created_at - s.created_at espera, f.metadata->>'provider_error' recusa
from events s
left join events d on d.name = 'clip_delivered' and d.metadata->>'clip_id' = s.metadata->>'clip_id'
left join events f on f.name = 'clip_failed' and f.metadata->>'clip_id' = s.metadata->>'clip_id'
where s.name = 'recreate_seu_video_started' order by s.created_at desc;
-- recusas antes de cobrar, por código
select metadata->>'code', metadata->>'stage', count(*) from events where name = 'recreate_seu_video_refused' group by 1, 2;
```

## O que ainda falta para "funcionando hoje no site novo"

1. A tela do GPT no site novo, com este contrato.
2. A 1ª prova paga numa conta da casa, que a CEO dispara: vídeo de 5 s, cerca de US$ 1,32.
   - O dry-run desta rota não existe: ela relê o vídeo e só cobra no `submitClip`.
   - Uma prova sem cobrança é a rota `check`.
3. Abrir ao público, trocando `SEU_VIDEO_RELEASE` para `'public'`, depois de 3 provas aprovadas pela CEO.

## Entrega B (som original): o que entrou

- O vídeo pronto passa pela montagem Creatomate da casa (a mesma que põe a marca nos clipes grátis), com o som do vídeo ORIGINAL do cliente.
  - O som é cortado na duração do clipe.
  - Nada de som gerado e nada de ffmpeg no servidor.
- Quem paga recebe só o som, em `clips/<dono>/<id>.som.mp4`.
- Quem não paga recebe marca e som (`.kineo.mp4`).
  - Se a pessoa assinar depois, a lista de clipes troca o arquivo pelo limpo, que é MUDO. Esse caso fica aberto.
- Se a montagem falhar ou passar de 3 min, o clipe sai mudo, como na Entrega A. Ele nunca fica preso nem vira estorno.
- O que liga e desliga:
  - `SEU_VIDEO_SOM_ORIGINAL` em `lib/recreate/seuVideo.ts`, que vale `false` para voltar à Entrega A;
  - o interruptor da marca, `FREE_CLIP_WATERMARK_LIVE`: desligado, nada da montagem roda.
- A tela pode tirar o aviso "sem som nesta versão" quando a CEO publicar a Entrega B.
- Custo: Creatomate, cerca de 1 crédito por clipe de 8 s em 480p (largura × altura × fps × segundos / 1e8). Nada na fal.
- Suposição a conferir na prova paga da CEO: que o elemento `audio` do Creatomate aceita um MP4 como fonte (ele usa só o som).
  - Se não aceitar, o render falha e o clipe sai mudo, sem prejuízo ao cliente.

## Entrega C (catálogo no motor novo): o que entrou

- Outfit Morph, Elevator e Dance duo vão ao Seedance 2.5:
  - task `reference`, 480p, sem som gerado;
  - o vídeo-base da casa sobe ao bucket como hoje e entra em `video_urls`;
  - o prompt vem do código. No Elevator, SÓ o homem vira a pessoa da foto.
- Preço: o de hoje do catálogo, 10 s = 40 créditos. Custo fal: cerca de US$ 2,65 por pedido, somando 10 s enviados e 10 s gerados.
- O que não muda:
  - os 3 continuam só da casa (`swapApproved: false`) até a prova paga da CEO;
  - Passarela, Favorito, Suéter e Selfie seguem no Recast;
  - a trava "não trocou" é do Recast e não roda nos 3.
- Interruptor: `CATALOGO_SEEDANCE25_LIGADO` em `lib/recreate/seuVideo.ts`. Com `false`, os 3 voltam ao Recast, byte a byte.
- `scripts/test-recreate-trava-1011.mjs`: o par de 2 pessoas da prova da trava passou da Dança para o Favorito, que segue no Recast.
  - A prova é a mesma: 375 verificações verdes, fora o bloco A ("redirect kiss"), que já está vermelho na main.
