# KINEO-ADS-CENA-2110 — contratos fal e estimativas, 21/10/2026

**FATO CONFIRMADO — IMPLEMENTADO:** os builders em `lib/ads/cena/adapters.ts:108` e `:149` apenas montam objetos. Não importam SDK, não leem ambiente e não fazem rede. A execução e a aprovação visual ficam a cargo da orquestração. A autorização é o pedido do fundador em 21/10: `[TRAVA 8.2 — vai do fundador 21/10 "A e B, vamo time"]`.

## Contratos consultados

**FATO CONFIRMADO — IMPLEMENTADO:** `lib/ads/cena/adapters.ts:24` registra os endpoints e fontes abaixo, consultados em **21/10/2026**. É conferência de documentação; não é validação em produção.

| Rota | Endpoint e contrato mínimo | Fonte oficial |
|---|---|---|
| Kling 3 Pro | `fal-ai/kling-video/v3/pro/image-to-video`: `start_image_url`, `prompt`, `duration: "15"`, `generate_audio: true`. Produto incorporado ao keyframe, sem `elements`. | [API](https://fal.ai/models/fal-ai/kling-video/v3/pro/image-to-video/api) |
| Seedance 2 standard | `bytedance/seedance-2.0/reference-to-video`: `image_urls`, `prompt`, `duration: "15"`, `resolution: "720p"`, `aspect_ratio: "9:16"`, `generate_audio: true`. Identificação no prompt por `@Image1`, `@Image2`. | [API](https://fal.ai/models/bytedance/seedance-2.0/reference-to-video/api) |
| Veo 3.1 reference | `fal-ai/veo3.1/reference-to-video`: `image_urls`, `prompt`, `duration: "8s"`, `resolution: "720p"`, `aspect_ratio: "9:16"`, `generate_audio: true`. Duas chamadas: conservar 8s + 7s, e cobrir 13–15s com o cartão final real. | [API](https://fal.ai/models/fal-ai/veo3.1/reference-to-video/api), [limite de 8s](https://fal.ai/veo-3.1) |
| Keyframe | `fal-ai/nano-banana-pro/edit`: `image_urls`, `prompt`, `num_images: 1`, `aspect_ratio: "9:16"`, `resolution: "2K"`, `output_format: "png"`, `enable_web_search: false`. Um candidato por chamada, best-of-2 na orquestração. | [API](https://fal.ai/models/fal-ai/nano-banana-pro/edit/api) |

**FATO CONFIRMADO — IMPLEMENTADO:** `lib/ads/cena/adapters.ts:108` retorna `{endpoint,input,seconds,keepSeconds,offsetSeconds,nativeSpeechSupported,warnings}`. Veo recebe indicação explícita do segmento temporal para não repetir o gancho. Kling sem inglês/chinês recebe instrução de áudio ambiental sem diálogo nem movimento labial; o chamador deve acrescentar a narração separada. Não se anuncia fala nativa PT-BR que a documentação não suporta.

**QUESTÃO PENDENTE / DESCONHECIDO:** a [API Veo](https://fal.ai/models/fal-ai/veo3.1/reference-to-video/api) exibe depreciação em **17/11/2026**. Reconfirmar disponibilidade antes do A/B pago. Qualidade das mãos, fidelidade, continuidade e fala não foram verificadas com geração real nesta entrega.

## Estimativa solicitada pelo fundador

**HIPÓTESE — estimativa aritmética, não fatura:** `lib/ads/cena/adapters.ts:183` multiplica as tarifas públicas consultadas em **21/10/2026**. Inclui áudio e dois keyframes, sem novas tentativas. A meta solicitada é cerca de **US$ 3,70** por anúncio final de **15 s**.

| Rota | Tarifa de vídeo | Geração faturável planejada | Vídeo | 2 keyframes | Subtotal conhecido |
|---|---:|---:|---:|---:|---:|
| Kling 3 Pro, sem elements | US$ 0,168/s | 15s | US$ 2,52 | US$ 0,30 | **US$ 2,82** |
| Seedance 2 standard 720p | US$ 0,3024/s | 15s | US$ 4,536 | US$ 0,30 | **US$ 4,836** |
| Veo 3.1 720p com áudio | US$ 0,40/s | 16s, cortar para 15s | US$ 6,40 | US$ 0,30 | **US$ 6,70** |

**FATO CONFIRMADO — fontes da estimativa:** [Kling](https://fal.ai/models/fal-ai/kling-video/v3/pro/image-to-video), [Seedance standard](https://fal.ai/models/bytedance/seedance-2.0/reference-to-video), [Veo](https://fal.ai/models/fal-ai/veo3.1/reference-to-video), [Nano Banana Pro: US$ 0,15/imagem, 4K em dobro](https://fal.ai/models/fal-ai/nano-banana-pro/edit), consulta em **21/10/2026**.

**QUESTÃO PENDENTE / DESCONHECIDO:** custo total é `null`, não zero. Faltam tokens do classificador/roteiro/juiz, custo Creatomate, eventual voz separada e tentativas adicionais. O subtotal Seedance/Veo já supera a meta. Não se trocou standard por fast para esconder isso.

**CONTRADIÇÃO:** a [página Kling](https://fal.ai/models/fal-ai/kling-video/v3/pro/image-to-video) informa US$ 0,168/s com áudio sem ressalva de `elements`; o [comparativo fal](https://fal.ai/learn/tools/seedance-2-0-vs-kling-3-0) informa US$ 0,336/s com `elements`. O builder evita essa discrepância usando o keyframe fiel como imagem inicial, sem `elements` adicionais.

## Transporte e próximo passo

**SUGESTÃO — contrato para o chamador:** injetar submit/poll/result; `submit` devolve `request_id`, `status_url`, `response_url`. Usar as URLs retornadas: reconstruí-las com o endpoint completo pode produzir 405. `COMPLETED` também pode trazer `error`, portanto só concluir depois de verificar o resultado e `video.url`/`images[].url`. [Fila oficial](https://fal.ai/docs/documentation/model-apis/inference/queue), consulta em **21/10/2026**.

**SUGESTÃO — próximo passo recomendado:** comprovar com dublês a aprovação antes do gasto e a montagem/estorno; depois da publicação autorizada, o A/B interno poderá verificar o resultado real. Os objetos e preços documentados não comprovam qualidade de anúncio ou conversão.
