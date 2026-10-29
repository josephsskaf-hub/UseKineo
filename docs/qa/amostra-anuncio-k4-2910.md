# KINEO-AMOSTRA-ANUNCIO-K4-2910

Data: 29/10/2026. Branch: `codex/amostra-anuncio-k4-2910`.
Base confirmada após fetch: `e61951b5a658361466709d6fa96927976d3fa30c` (origin/main já havia avançado além de `0ba9285d1`).

## Implementação e custo

- **FATO CONFIRMADO / IMPLEMENTADO:** novas amostras usam Kling 4.0 com `KLING4_PAID_LIVE=true`; desligado mantém Kling 3 (`lib/ads/kling4Paid.ts:16`). O servidor decide e grava a rota antes da reserva (`lib/ads/cena/internalEscolha.ts:66`).
- **FATO CONFIRMADO / IMPLEMENTADO:** mesmo builder image-to-video do pago, still escolhido, 720p, duração inteira de 8 s, três tomadas de 3/3/2 s (`lib/ads/cena/escolhaVideo.ts:12`). Montagem vertical 9:16, narração completa, música de biblioteca e marca continuam (`lib/ads/cena/escolhaMontage.ts:77`). Sem segunda geração ou segunda voz na amostra.
- **FATO CONFIRMADO / IMPLEMENTADO:** amostra não debita crédito e não chama reserva/consumo da promo, inclusive no submit e polling (`lib/ads/v2StartCore.ts:147`, `lib/ads/cena/runtime.ts:43`, `lib/ads/cena/runtime.ts:144`). Falha segue `failAdsV2Order`: como não houve débito, não cria crédito de estorno; o estorno do pago permanece intacto. A trava vitalícia da amostra continua após falha ou exclusão do pedido.
- **FATO CONFIRMADO / IMPLEMENTADO:** selo usa a rota persistida, inclusive em recarga; antes de obter estado confiável, fica oculto (`app/(dashboard)/ads/v2/AdsV2Escolha.tsx:67`, `lib/ads/cena/escolhaStills.ts:167`).
- **CONTRADIÇÃO com a premissa de economia:** a amostra anterior compra Kling 3 SEM áudio nativo (`lib/ads/cena/escolhaVideo.ts:22`), a US$ 0,112/s (`lib/ads/cena/adapters.ts:45`), não a tarifa com áudio de US$ 0,168/s. Kling 4 encarece este fluxo específico.
- **FATO CONFIRMADO na documentação oficial, consultada em 29/10/2026:** [preço da fal](https://fal.ai/models/kling/v4/image-to-video) = US$ 0,157/s em 720p. [Schema da fal](https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=kling/v4/image-to-video): `start_image_url`, duração inteira 3–30, tomadas com duração mínima 1 e prompt até 512 caracteres; proporção segue a imagem de entrada. Não há `generate_audio` no schema Kling 4. Não houve chamada de geração.
- **FATO CONFIRMADO / IMPLEMENTADO:** reserva nova de 186¢ = vídeo 125,6¢ + duas fotos 30¢ + mesma provisão auxiliar 30,4¢. Isto é reserva de custo, não fatura medida. Kling 3 continua 150¢. SQL deriva o valor da rota persistida; preserva linhas antigas e teto diário de 2500¢. A consulta de elegibilidade usa o mesmo valor (`lib/ads/cena/escolhaSamplePolicy.ts:17`, `lib/ads/eligibility.ts:42`).

## Validação local

**TESTADO LOCALMENTE — PASS:**

```powershell
node scripts/test-amostra-anuncio-k4-2910.mjs --pglite-module C:\tmp\kineo-amostra-k4-test-deps\node_modules\@electric-sql\pglite
node --test tests/kling4PaidAds.test.cjs tests/kling4PaidAudio.test.mjs tests/kling4PaidPresentation.test.mjs tests/kling4Promo.test.cjs tests/kling4PaidAsyncStatus.test.mjs
$env:NODE_PATH='C:\tmp\kineo-amostra-k4-test-deps\node_modules'
node tests/kling4PaidVideoBadge.cjs
git diff --check
```

O novo guardião executa controllers, start, runtime, media, montage e helpers reais com fornecedores bloqueados/mockados; testa flag ON/OFF em conta grátis e assinante, ausência de débito/promo no início/submit/polling/falha, still aprovado, duração/formato/marca, uma voz/vídeo, e-mail/país/antifarm/propriedade. PostgreSQL embarcado executa as migrations antigas e a nova: replay de 150¢, reserva de 186¢, trava por pessoa após falha/exclusão, mistura de custos e teto de 2500¢. A leitura de disponibilidade real aceita 2314¢ e recusa 2315¢ com Kling 4; desligado aceita 2350¢ e recusa 2351¢. UI preserva o motor dos pedidos salvos.

Os cinco guardiões do pago somaram **38 testes aprovados**; o guardião SQL do selo também passou. Duas expectativas antigas de Kling 3 obrigatório na amostra foram atualizadas para a nova decisão autorizada. PGlite, já declarado em package.json, estava ausente da instalação local: dependência de teste instalada em pasta temporária, sem mudar package/lock. A primeira tentativa do guardião do selo sem essa dependência falhou por MODULE_NOT_FOUND; com NODE_PATH passou.

**TESTADO LOCALMENTE:** a checagem `npx --no-install tsc --noEmit --incremental false` passou. A rechecagem final após ajuste de elegibilidade/selo (`--pretty false`) também passou, sem diagnósticos.

## Falhas pré-existentes, separadas

**TESTADO LOCALMENTE em 29/10/2026:** os nove guardiões abaixo saem com código 1 tanto na base quanto no candidato, com saídas idênticas byte a byte. Não são aprovação integral de suas suítes; as falhas impedem alcançar todas as asserções.

| Guardião (`node <arquivo>`) | Falha já presente na base |
|---|---|
| `scripts/test-ads-amostra-anuncio-2410.mjs` | Upgrade espera não criar draft sem saldo; recebe 2 pedidos em vez de 1. |
| `scripts/test-ads-amostra-data-2410.mjs` | Fixture de conta não fornece país; admissão esperada true recebe false. |
| `scripts/test-ads-amostra-undo-2410.mjs` | Divergência histórica da fonte AdsV2Client no undo. |
| `scripts/test-support/ads-escolha-sample-media-2410.mjs` | Parte comportamental passa; âncora de mutação antiga de áudio ambiente ausente. |
| `scripts/test-support/ads-amostra-race-2410.mjs` | Loader não mocka import de `@fal-ai/client`. |
| `scripts/test-support/ads-amostra-entry-2410.mjs` | Upload espera status 200, recebe 500 no harness. |
| `scripts/test-support/ads-amostra-upgrade-retry-2410.mjs` | Asserção antiga exige checar saldo antes de start. |
| `scripts/test-ads-simples-2810.mjs` | Helper `desfaz-ads-simples-2810.mjs` ausente. |
| `scripts/test-ads-escolha-publico-2410.mjs` | Grupos iniciais passam; função refund extraída sem binding `isKling4AdPromoRef`. |

Evidência reproduzível: `docs/qa/amostra-anuncio-k4-2910-baseline.json` contém os hashes e a comparação dos logs. Logs locais completos: `C:/Users/josep/AppData/Local/Temp/kineo-amostra-k4-baseline/` e `C:/Users/josep/AppData/Local/Temp/kineo-amostra-k4-candidate/`. SQL original da amostra também passou na base isolada.

## Arquivos

**IMPLEMENTADO:** UI `AdsV2Escolha.tsx`; seleção `lib/ads/kling4Paid.ts`; controller `cena/internalEscolha.ts`; validação e mídia `cena/escolhaPlan.ts`, `escolhaVideo.ts`, `escolhaMedia.ts`, `escolhaMontage.ts`; processamento `cena/runtime.ts`; cobrança `v2StartCore.ts`; reserva `cena/escolhaSamplePolicy.ts`, `escolhaSampleServer.ts`; retomada `cena/escolhaStills.ts`, `escolhaSampleUpgrade.ts`; disponibilidade `lib/ads/eligibility.ts`; migration `supabase/migrations/20261029204633_ads_escolha_sample_kling4_budget.sql`; guardião novo; expectativas em `tests/kling4PaidAds.test.cjs` e `tests/kling4PaidPresentation.test.mjs`; preview e este relatório.

**FATO CONFIRMADO:** `app/api/ads/v2/cena/route.ts` já delega ao controller alterado; não precisou de edição. `lib/ads/kling4Voice.ts` é reutilizado pelo runtime sem alteração. Migration antiga não foi editada.

## Entrega e próximo passo

**PREPARADO, NÃO PUBLICADO:** migration e código. Sem deploy, build, escrita em produção ou render pago. **DESCONHECIDO:** qualidade, áudio e custo faturado do render real.

**DEPENDÊNCIA OBRIGATÓRIA:** aplicar `20261029204633_ads_escolha_sample_kling4_budget.sql` ANTES de servir este código com `KLING4_PAID_LIVE=true`. A função SQL antiga poderia criar uma reserva vitalícia de 150¢ que o código novo recusaria por esperar 186¢. A migration depende da anterior de teto 2500¢; ambas devem estar aplicadas na ordem.

**SUGESTÃO / próximo passo recomendado:** Claude aplica migrations na ordem, publica no fluxo autorizado e faz o único render de teste indicado pelo fundador, conferindo motor, 8 s, 9:16, still, voz, marca e ausência de alteração de crédito/promo.

**PREPARADO, verificação visual pendente:** `docs/previews/amostra-anuncio-k4-2910.html` compara antes/depois desktop e mobile. A revisão automática do navegador bloqueou abrir `file://` (só permite HTTP/HTTPS); não houve contorno. O HTML não é captura de produção nem prova de render.
