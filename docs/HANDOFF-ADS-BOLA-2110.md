# HANDOFF — KINEO-ADS-BOLA-2110 (Studio Ads, anúncio "— bola de futebol")

Branch: `codex/ads-bola-2110` (base origin/main `9415fa5dd`). Diagnóstico: `docs/ADS-BOLA-DIAGNOSTICO-2026-10-21.md`.
Parado em 21/10 pelo orçamento do Claude (83%). **NÃO enfileirado. NÃO publicado.**

## Estado
- Os 5 consertos estão FEITOS no commit `dc3b05bb3` (marca `KINEO-ADS-BOLA-2110`, assunto com `[TRAVA 8.2 — vai do fundador 21/10 "o ads que eu tentei está horrível, descobre porquê"]`).
- `tsc --noEmit` = 0 erros (rodado antes dos 2 últimos ajustes pequenos: `v2SceneServer.ts` kind_chosen e `nameList` em `v2Brief.ts`; rodar de novo).
- Guardião novo `scripts/test-ads-bola-2110.mjs` = **55 ok, 0 falha** (vermelho na base 9415fa5dd em 12 provas, 23 mutantes aplicados e vermelhos, desfaz exato).
- Guardiões afetados: rodei 27 de 81 (lista = `grep -lE "autoBrief|v2Brief|scriptPrompt|v2Advance|v2PostDeliveryServer|v2CloseReal|ads/v2/edit/route|v2Simple|v2Scene|v2Presenter|v2PlanCore|desfaz-desenho-nota9|v2SceneServer" scripts/test-*.mjs`).
  26 verdes; **1 vermelho a reancorar: `scripts/test-ads-ia-faz-2026-09-26.mjs`** — o require dublê dele não conhece o import novo de `lib/ads/autoBrief.ts` (`./v2BolaFix`, que importa `./v2Simple`). Conserto: deixar esse require carregar `./v2BolaFix` e `./v2Simple` (ou usar o carregador offline), linha marcada com `KINEO-ADS-BOLA-2110`.
  Faltam rodar os outros ~54 da lista (a partir de `test-ads-mao-ajuste-3-1610.mjs` em ordem alfabética).
- Suíte inteira: NÃO rodada (baseline ≈139–145 vermelhos).

## O que mudou (arquivo:linha aproximada no commit)
1. **Travessão solto no nome** — `lib/ads/v2BolaFix.ts` (novo: `adsV2CleanBusiness`, `adsV2BusinessName`, `adsV2ComposeBusiness`); `lib/ads/autoBrief.ts:53,57,99-100` (prompt pede `{name, sells}`; compõe "<nome> — <o que vende>" só com os dois; formato antigo é limpo); `lib/ads/v2Brief.ts:191` (`brandName` → `adsV2BusinessName`); `lib/ads/v2Advance.ts` `businessName()`; `lib/ads/v2PostDeliveryServer.ts` `businessName()`; `lib/ads/v2CloseReal.ts` `adsV2CloseRealCardName`; `app/api/ads/v2/edit/route.ts:79`. Loja de terceiros (Amazon.com, Mercado Livre…) nunca é a marca (`adsV2IsMarketplace` em `lib/ads/v2Simple.ts`, fim do arquivo). `v2Brief.ts:722`: nome que é substantivo comum não passa pelo conserto de artigo ("da bola" fica).
2. **Foto inteira no apresentador v2** — `lib/ads/v2Presenter.ts` grava `productOriginalUrl` (original_url); `lib/ads/v2PresenterV2.ts` `adsV2PresenterV2ProductSource`; `lib/ads/v2Advance.ts:~620` (referência do nano-banana) e `presenterV2Close` (close de 2 s, montador já usa "contain"). Prompt da foto ganha `ADS_V2_PRESENTER_V2_WHOLE_PRODUCT`; a pergunta das mãos ganha `"product_whole"`; escolha nova `adsV2PresenterV2PickWhole` (produto inteiro > não sei > cortado; depois 2 mãos) usada em `finishPresenterV2Image`. Foto pequena: `adsV2ImageSizeFromHead`/`adsV2MeasureImage` (v2BolaFix) medem a original no `/plan` (`lib/ads/v2PlanCore.ts`, após `badVideo`); trava suave `ADS_V2_SMALL_PHOTO_CONFIRM_REQUIRED = false` (virar `true` quando a tela tiver "usar mesmo assim" → manda `small_photo_ok: true`).
3. **Duração** — medido em produção: Portuguese_ConfidentWoman = **2,14 pal/s** em 18 renders (1,67–2,48), EN 1,89 (o "2,6" do diagnóstico era um render só). `lib/ads/v2PresenterV2.ts` (fim): régua por voz `adsV2PresenterV2PaceWords` (PT 22–24, EN 19–21 igual a antes, ES 21–24) via `adsV2PresenterV2Words(max, {language, gender})` (chamado em `v2PlanCore.ts` linha do `v2Words`); folga de 2 para qualquer teto; `wordsOfV2` e `countWords` (`lib/ads/scriptPrompt.ts:38`) não contam pontuação; voz medida < 9,85 s → `adsV2PresenterV2VoiceExtend` (1 frase neutra na língua + speed até 0,92, + 2ª frase se precisar) dentro de `adsV2PresenterV2VoiceFit` (v2Advance passa a língua). Caso real: 7,668 s → "+ Peça agora mesmo." speed 0,93 → anúncio ≈ 14,6 s. Filmes intocados.
4. **Prompt colado** — `adsV2ReadInstruction` / `simpleInstructionTitle` (fim de `lib/ads/v2Simple.ts`, puro sem import): produto + narração entre aspas (cortada = não usa). `simpleTitle`, `adsV2ProductTitle`, `adsV2AdKind` (`lib/ads/v2Scene.ts`) leem a instrução. `/plan`: `sentenceCopy` = produto; narração inteira na faixa vai verbatim (`narrationVerbatim` em `extractAdsV2Brief`); `adsV2KindWithProductPhoto` (v2Scene, fim) troca "lugar" por "produto" num texto-instrução com foto de produto, salvo `brief.kind_chosen` (gravado por `lib/ads/v2SceneServer.ts` quando o corpo manda `kind_chosen: true`). O servidor já recusava > 400 caracteres (`sentence_too_long`); o corte silencioso é da TELA (`maxLength`). Texto do aviso: `adsV2SentenceLimitText` (v2BolaFix).
5. **Medição** — `ads_v2_plan_served` ganha `photos`, `product_photos`, `instruction`, `kind_fixed`, `product_photo_side/small`. `ads_v2_order_created` intocado.

Desfaz: `scripts/test-support/desfaz-ads-bola-2110.mjs` (+ `-trocas.json`), encadeado como camada mais nova em `desfaz-desenho-nota9-2110.mjs`. Regerar trocas/contagens depois de qualquer edição (todo diff contra a base precisa ser troca 1:1 ou acréscimo, sempre com a marca; nunca apagar linha da base).

## Para a sessão da tela (KINEO-ADS-NOTA9-2110)
- Caixa de texto: tirar o `maxLength` que corta em silêncio; contador + `adsV2SentenceLimitText(lang, n, ADS_V2_SENTENCE_MAX_CHARS)`.
- `/plan` devolve `product_photo_small: {width,height,min,title,body,confirm,replace}` → aviso + "usar mesmo assim" (reenviar com `small_photo_ok: true`), depois ligar `ADS_V2_SMALL_PHOTO_CONFIRM_REQUIRED`.
- Mandar `kind_chosen: true` no POST do pedido quando a pessoa escolhe Produto/Lugar.
- `/plan` devolve `instruction: {product, narration: verbatim|truncated|out_of_range|none}` (dá para dizer "usamos sua narração" / "sua narração veio cortada").

## Como testar
`node scripts/test-ads-bola-2110.mjs` (55 ok) · `node node_modules/typescript/bin/tsc --noEmit -p .` · os 81 afetados acima · suíte inteira em 2 fatias · então `bash scripts/enfileirar.sh` (merge da entrega-atual antes, se andou).
