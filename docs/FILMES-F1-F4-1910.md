# Filmes "Faceless 15 s" — fases F1–F4 no código (19/10/2026)

Tarefa KINEO-FILMES-F1-F4-1910 · [TRAVA 8.2 — vai do fundador 19/10 "vai, sim pra tudo"]. Base: `docs/FILMES-COMO-OS-LIDERES-FAZEM-2026-10-19.md` (§3 a receita, §4 as fases). Escopo: **só o Seedance 1.5 de 15 s em 9:16** (`quality 'cinematic_ai'` + `duration 15`). Outros motores, durações e quadros passam intocados.

## Onde mora

- `lib/filmes/faceless15.ts` — a receita inteira, módulo puro. `lib/compose.ts`, `lib/hookFirstFrame.ts` e `lib/lyriaMusic.ts` **não mudam** (byte a byte; o guardião prova). A montagem de sempre acontece e DEPOIS este módulo reescreve, em memória, só as peças da fase ligada — o mesmo jeito do logo da marca e do gancho do 1º quadro.
- `app/api/compose/route.ts` — 6 linhas, todas marcadas `KINEO-FILMES-F1-F4-1910`: resolve a decisão, aplica F1/F3/F4 logo depois de `buildCreatomateSource` (síncrono, antes do 1º `await`), aplica F2 depois do gancho da conta interna, e grava o evento `faceless15_fases` por filme.
- `public/sfx/faceless15-{riser,whoosh,pop}.wav` — os 3 SFX (síntese própria, `scripts/gerar-sfx-faceless15-1910.mjs`), servidos em `https://www.usekineo.com/sfx/`.
- `scripts/test-filmes-f1f4-1910.mjs` — guardião (88 provas, 20 mutantes). `scripts/test-support/desfaz-filmes-f1f4-1910.mjs` — desfaz para os guardiões byte a byte.

## Como ligar uma fase POR PEDIDO (conta interna) — uma variável por vez, um deploy só

No corpo do `POST /api/compose`, campo `formatFlags` (também aceito `format_flags`), lista ou texto:

```json
{ "formatFlags": ["f1"] }            // F0 + F1
{ "formatFlags": ["f1", "f2"] }      // F0 + F1 + F2
{ "formatFlags": ["f1", "f2", "f3"] }
{ "formatFlags": ["f1", "f2", "f3", "f4"] }
{ "formatFlags": "f1,f2,f3,f4,cta" } // + cartão de texto de 1 s (cta exige f4)
```

- Só vale para conta interna (`lib/internalAccounts isInternalEmail`) — cliente que manda o campo é ignorado (`ignoradas: [...:conta_externa]`).
- Só vale no formato (Seedance 1.5 · 15 s · 9:16 · sem avatar · fora do Studio Ads). Fora dele, nada entra nem para conta interna.
- **F2 e a conta interna:** dentro do formato, o gancho escrito segue a fase — sem `f2` no pedido ele **sai** mesmo da conta interna (que hoje o recebe sempre), para a F0/F1/F3/F4 serem testadas uma variável por vez. Fora do formato, nada muda (conta interna segue com o gancho desde 03/10).
- O pedido não precisa passar pela tela: o `/studio` manda o corpo do compose pelo `GenerateClient`; para o teste, o jeito mais simples é o Cowork repetir o POST do `/api/compose` com o campo (ou um fetch no console da própria aba logada). Nenhuma tela foi mexida.

## Como ligar para TODOS (depois da nota ≥ 9 do fundador na fase)

`lib/filmes/faceless15.ts`:

```ts
export const FACELESS15_PUBLIC = { f1: false, f2: false, f3: false, f4: false, cta: false }
```

Trocar o `false` da fase para `true`. Nada mais. (`GANCHO_1Q_PUBLIC` de `lib/hookFirstFrame.ts` continua `false` para os outros formatos.)

**Estado em 20/10/2026 (KINEO-FILMES-F1F3-PUBLICO-2010 · [TRAVA 8.2 — vai do fundador 20/10 "nota 10"]):** `{ f1: true, f2: false, f3: true, f4: false, cta: false }`. O fundador deu **nota 10** ao filme com a legenda nova (F1) + o som novo (F3) — render `e48e17bf`. Valem para **todo** filme Seedance 1.5 · 15 s · 9:16 (sem avatar, fora do Studio Ads), cliente ou conta interna, com ou sem `formatFlags`; o pedido do cliente segue ignorado. F2 (gancho escrito), F4 (5 planos) e o cta continuam só por pedido de conta interna. Fora do formato o JSON do Creatomate segue idêntico byte a byte. O export limpo (`/api/compose/unlock`) acompanha: o cliente manda `quality` e a duração do filme, a mesma `resolverFaceless15` decide, e a montagem limpa recebe a mesma legenda/música/SFX da prévia. Efeito colateral conhecido: dentro do formato a conta interna SEM `f2` no pedido deixa de receber o gancho escrito de 03/10 (o gancho segue a fase — regra da F2 acima). Guardião: `scripts/test-filmes-f1f3-publico-2010.mjs`; os guardiões das fases (`test-filmes-f1f4-1910`) provam B1–B5/D–G no módulo da época (interruptor desligado, `desfaz-filmes-f1f3-publico-2010`) e B6–B8/C1 no estado novo. Para voltar atrás: o `true` da fase vira `false` (um deploy).

## O que cada fase faz (e o que o guardião prova)

| Fase | Muda | Números | Trilha |
|---|---|---|---|
| **F1** legenda | borda inferior 78 % → **62 %**; ≤4 → **≤5 palavras**, agrupadas pela receita (ajuste 19/10, abaixo): bloco nunca atravessa fim de frase, nunca fica com 1 palavra no meio da frase, não fecha em preposição/artigo/conjunção; 62/76 → **64/80 px**; entra **120 ms antes da palavra** (a base entra 150 ms depois); linha inteira amarela **só no PAYOFF** (última frase); karaokê amarelo mantido; Montserrat 800 caixa alta, pílula de sempre | `FACELESS15_LEGENDA_*`, `agruparLegendaFaceless15` | 5 |
| **F2** gancho | o gancho escrito de `lib/hookFirstFrame` (≤8 palavras, topo, 0–2,5 s) entra no formato; medido contra a legenda da F1 e marca d'água/logo como sempre | — | 11 |
| **F3** som | Lyria 12 % → **14 % fixos num elemento só**, do 0 ao fim do filme, fades 0,8/1,2 s de sempre, sem ducking (ajuste 19/10, abaixo); **riser** 0–1,2 s a −14 dB (20 %), **whoosh** 0,25 s a −12 dB (25 %) em cada corte (0,1 s antes), **pop** 0,3 s a −10 dB (30 %) no reveal | `FACELESS15_MUSICA_*`, `SFX_FACELESS15` | 8 · 12 |
| **F4** planos | 3 clipes × 6 s → **5 planos** (A A B B C): 2º plano = mesmo clipe com `trim_start` 3,0 s; cortes em fronteira de frase do Whisper quando cabe, piso 2,4 s / teto 4,0 s; o reveal é corte fixo com **punch 100→104 % em 0,15 s** + zoom 104→108 %; zoom alternado nos outros; nenhum plano passa do clipe (segundos assinados do claim; sem eles, o que a base mostrava; trim recua; loop só por falta, contado) | `FACELESS15_PLANO_*` | 2 |
| **cta** | "Follow for part 2 →" 48 px Montserrat 700, centro, 1 s depois do fim da fala (o filme cresce 1 s; fundo/véu/marca esticam) — opcional, exige f4 | `FACELESS15_CTA_*` | 13 |

Garantias que o guardião prova: interruptor desligado = JSON do Creatomate **idêntico byte a byte** (claim assinado e caminho clássico); cada fase só mexe nas suas trilhas (a voz, trilha 4, nunca muda); falha numa fase = a fase não entra e o filme sai; nunca monta duas vezes (uma reescrita em memória, um `submitCreatomateRender`); débito intocado (a rota só tem acréscimos); réguas de voz intocadas (`lib/scriptWriterRate`, `generate-script` não mudam).

## SFX — fonte e licença

Síntese própria, determinística (`scripts/gerar-sfx-faceless15-1910.mjs`: ruído com semente fixa + senóides → WAV PCM 16 bits mono 44,1 kHz). **Nenhum arquivo de terceiro, nenhuma licença a registrar** — o som é da casa (equivalente a CC0 para todos os efeitos). Hash sha256 de cada arquivo está em `SFX_FACELESS15` e o guardião regenera em memória e confere disco = catálogo = regenerado. Para trocar por um Pixabay CC0: subir o arquivo em `public/sfx/` (ou no bucket), apontar `url` e atualizar `sha256`/`licenca` no catálogo. `url: null` = slot vazio (o SFX não entra; o relato diz `slot_vazio`).

Por que `public/sfx/` e não o bucket: URL estável sem depender de chave de serviço (não havia como subir no bucket sem ler o `.env`), fora do middleware de rotas protegidas, versionado junto com o código.

## Ajuste de 19/10 (KINEO-FILMES-F1F3-AJUSTE-1910) — o que a escada de produção mostrou

Fonte: `docs/RESULTADO-ESCADA-F1-F4-2026-10-19.md`. Guardião: `scripts/test-filmes-f1f3-ajuste-1910.mjs` (roteiro exato da escada, montagem real offline, mutantes aplicados); `scripts/test-filmes-f1f4-1910.mjs` reancorado (desfaz em `scripts/test-support/desfaz-filmes-f1f3-ajuste-1910.mjs` — camada nova sai primeiro).

- **F1 · palavras órfãs.** O corte cego de lib/compose (≤5 sem olhar a frase) deixava "…SKY OVER" / "CUBA" e "MONTHS" sozinho. O agrupador agora é da receita (`agruparLegendaFaceless15`): usa o normalizador de tokens de lib/compose (AM/PM) com 1 palavra por bloco e agrupa por frase (fim de frase do Whisper; sem pontuação nenhuma, a pausa ≥ 0,28 s), cada frase em blocos de 2..5 com o menor número de blocos e tamanhos parecidos (6 → 3+3), sem fechar em preposição/artigo/conjunção EN/PT/ES, preferindo vírgula/pausa. Frase de UMA palavra ("Gone.") fica sozinha porque é frase inteira. No roteiro da escada sai: IN 1859 THE SUN FIRED / A STORM STRAIGHT AT EARTH / TELEGRAPH WIRES SPARKED / AND SHOCKED THEIR OPERATORS / SOME LINES KEPT SENDING MESSAGES / WITH THE BATTERIES UNPLUGGED / AURORAS LIT THE SKY / OVER CUBA / TODAY THE SAME STORM / COULD KNOCK OUT POWER / GRIDS FOR MONTHS (payoff inteiro amarelo).
- **F3 · música sumindo no payoff e cauda muda.** Os 3 pedaços (18 · 10 · 18 com junções de 0,3 s e `trim_start`) caíram ~20 dB sob o payoff e deixaram a cauda em silêncio. Volume por keyframe **nunca foi exercitado pela casa** (nenhum uso no repo), então não entrou: a música é UM elemento só na trilha 8, a **14 % fixos**, do 0 ao fim do filme (inclusive o 1 s do CTA), loop, com os mesmos fades do F0 (cauda audível medida em produção). Riser/whoosh/pop intocados. Relato do evento: `f3.musica = "unica"`, `f3.volume`, `f3.cobre`.
- **Antes de ligar:** 1 render de validação de cada (F1 sozinha; F1+F3) e nota do fundador ≥ 9.

## Ajuste 2 de 19/10 (KINEO-FILMES-F1-VIRGULA-1910) — F1 nas frases com vírgula + export limpo

Escada v2 (`docs/RESULTADO-ESCADA-F1-F4-2026-10-19.md` §v2): F3 consertada e medida; a F1 ainda saiu com 12 blocos — "A STORM STRAIGHT AT" / "EARTH" e "KNOCK OUT POWER GRIDS FOR" / "MONTHS".

- **Causa:** o Whisper REAL dá duração ZERO à última palavra da frase (Earth 3,48–3,48 = o fim de "at"; months 16,58–16,58 = o fim de "for"). O agrupador casava token e palavra original pelo tempo de fim, então o ponto de "Earth" grudava em "at" e "Earth" virava uma frase de 1 palavra. O Whisper sintético do guardião anterior não tinha palavra de duração zero, por isso passou.
- **Conserto:** o casamento agora é pela ORDEM e pelo TEXTO (token colado "5 AM" consome as originais até o texto bater). Com o Whisper real da escada sai: IN 1859 THE SUN FIRED / A STORM STRAIGHT AT EARTH / TELEGRAPH WIRES SPARKED / AND SHOCKED THEIR OPERATORS / SOME LINES KEPT SENDING MESSAGES / WITH THE BATTERIES UNPLUGGED / AURORAS LIT THE SKY / OVER CUBA / TODAY THE SAME STORM / COULD KNOCK OUT POWER / GRIDS FOR MONTHS (11 blocos).
- **Prova permanente:** `scripts/test-support/fixture-whisper-carrington-1910.json` (o cache de voz da escada, `voiceovers/cache/20a86ed9….meta.mp3`) em `scripts/test-filmes-f1-virgula-1910.mjs`, pela cadeia da rota (Whisper → grafia do roteiro → builder → receita). Vermelho no código anterior, verde no novo; mutante "casamento por tempo de fim" fica vermelho.
- **Export limpo ligado:** `app/api/compose/unlock/route.ts` ganhou 5 linhas marcadas (só acréscimos): a mesma decisão (`resolverFaceless15`, conta interna do servidor, quality do rebuild, duração, quadro, `formatFlags` do corpo), `aplicarFaceless15` síncrono logo depois do builder com o mesmo Whisper com a grafia do roteiro, e a F2 depois do gancho da conta interna. Desligado = JSON idêntico (provado). O cliente do unlock hoje não manda `formatFlags`: para conta interna por pedido o export limpo segue a montagem de sempre; quando uma fase virar pública (`FACELESS15_PUBLIC`), prévia e export saem iguais.

## Rastro para medir

Evento `faceless15_fases` (`events.name`), `metadata.fases` = o que valeu naquele filme, `metadata.relato` = o que cada fase fez (chunks, cortes, trims, ducking, SFX). Medição de % ≥95 antes × depois **por fase**: `where name = 'faceless15_fases' and metadata->'fases' ? 'f1'` etc., cortado no deploy.

## Protocolo de teste (o do §4 do estudo)

Dry-run $0 antes; saldo da fal lido antes; os mesmos 2 roteiros (1 mistério/história, 1 ciência/fato) em todas as fases; nota do olho ≥ 9 na folha de quadros. Ordem: F0 (sem `formatFlags`) → `["f1"]` → `["f1","f2"]` → `["f1","f2","f3"]` → `["f1","f2","f3","f4"]`. Cada render ≈ US$ 0,80. Só então virar a constante pública da fase aprovada.

## Fora desta entrega (anotar, não esquecer)

1. ~~**Export limpo**~~ — FEITO em 19/10 (KINEO-FILMES-F1-VIRGULA-1910): `app/api/compose/unlock/route.ts` aplica a mesma receita (ver "Ajuste 2" acima).
2. **Roteiro** (§3.7: HOOK como pergunta/número ≤9 palavras; PAYOFF 8–10) não mudou — `app/api/generate-script/` é caminho proibido da trava e a tarefa pediu só o interruptor do gancho. Fase à parte.
3. **Imagem por frase + `sujeito/acao/lugar`** (§3.3) e best-of-2 (R4) — fora da receita F1–F4.
4. O riser da receita "para no pico na 1ª palavra" (silêncio de 0,3 s antes da voz): hoje a voz começa em 0 s; o riser de 1,2 s cobre o gancho a −14 dB. Se o fundador quiser o silêncio de 0,3 s, é a voz (trilha 4) que desloca — não mexido.
