# Páginas de entrada do ChatGPT no visual claro — 21/10/2026

`KINEO-PAGINAS-IA-CLARAS-2110` · [TRAVA 8.2 — vai do fundador 21/10 "a preta está muito longe do que é o site"]
Branch `codex/paginas-ia-claras-2110` (base `origin/main` 72d23210c) · sem publicação na main · preview da Vercel pela branch.

## O que mudou para quem chega do ChatGPT

- As páginas de entrada saíram do preto: fundo off-white com o véu azul da home, cartões brancos, texto #0E1116,
  azul da marca #0A5CFF nos botões e links, Manrope (a mesma fonte da home), títulos em peso 650.
- Em cima, o **menu do topo da home** (os mesmos 7 itens, na mesma ordem: Make a film · Product ads · AI UGC Ads ·
  AI Cartoon Videos · Claude & ChatGPT · 🔥 Trending · Pricing + língua, Log in e o botão azul), fixo no topo e com
  hambúrguer no celular. Embaixo, o **mesmo rodapé** de sempre (components/Footer.tsx).
- Logo abaixo do título (e da 1ª frase, a resposta que o ChatGPT cita), os **mesmos 4 cards de produto da home**
  (AI Faceless Videos · AI Product Ads · AI UGC Ads · AI Cartoon Videos), o MESMO componente `HomeThreeCards`, com os
  mesmos destinos dos botões azuis.
- **Vídeos novos**: toda galeria velha dessas páginas virou a vitrine atual da /claude-connector (`ShowcaseGrid`: 3 UGC,
  3 anúncios de produto, 3 filmes — clipes que a home já serve). Nenhum render novo, nenhuma curadoria nova;
  `lib/engineWall.ts` e `lib/homeVideoCuration.ts` só lidos (iguais à base).
- **/chatgpt**: primeiro "Option 1 — connect Kineo to ChatGPT" (os MESMOS 3 passos e a MESMA URL
  `https://www.usekineo.com/api/mcp/studio` da aba ChatGPT da /claude-connector — um componente só, `ChatgptConnectSteps`),
  depois "Option 2 — copy the prompt". O prompt técnico fica só dentro da caixa, recolhido ("Show the prompt"); o botão
  Copy copia sem abrir. Nenhum HOOK/MICRO REWARD no texto da página nem no placeholder da caixa de colar.
- **/claude-connector**: quem chega com `utm_source` ou referrer contendo "chatgpt" ou "openai" abre na aba ChatGPT e
  vê "Try it in ChatGPT" (mesmo catálogo de pedidos; cada botão abre `chatgpt.com/?q=` com o pedido + "se o Kineo Studio
  não estiver ligado, mostre como adicionar"). Quem vem de outro lugar vê a página de antes. O selo "Engine set · <motor>"
  saiu dos cartões.

## Modelos (mudou o modelo, não página a página)

| Modelo | Cobre |
|---|---|
| `app/ai-video-generator/[engine]/page.tsx` | 6 páginas de motor (Seedance 1.5, Veo 3.1, Kling 2.5, Kling 3, MiniMax H3…; o Seedance 2.5 tem rota própria e ficou como está) |
| `app/ai-video-generator/for/[slug]/page.tsx` | 100 páginas de intenção (inclui /for/urdu) |
| `app/free-ai-shorts/[niche]/page.tsx` | 37 nichos (30 + 7 do lote 1; inclui /horror) |
| `app/text-to-video-shorts/page.tsx` | 1 |
| `app/gerador-de-shorts-gratis/page.tsx` | 1 |
| `app/state-of-ai-shorts-2026/page.tsx` | 1 |
| `app/best-ai-shorts-generators/page.tsx` | 1 |
| `app/free-ai-shorts-generator/page.tsx` | 1 |
| `app/chatgpt/page.tsx` | 1 |

Total: ~149 URLs públicas claras. A home e a /claude-connector já eram claras (a home não foi tocada).

## Arquivos

Novos: `components/seo/PaginaClara.tsx` (menu, faixa dos 4 cards, vitrine) · `lib/seo/paginasIaClaras2110.ts` (tokens,
CSS do menu, regra `vemDoChatgpt`, `chatgptPromptHref`) · `app/claude-connector/AiOrigin.tsx` · guardião
`scripts/test-paginas-ia-claras-2110.mjs` · desfaz `scripts/test-support/desfaz-paginas-ia-claras-2110.mjs` (+ tabela .json) ·
este relatório.

Modelos (cores, menu, cards, vitrine): os 9 da tabela + `app/chatgpt/ChatgptPastePanel.tsx`,
`app/claude-connector/ConnectPanel.tsx`, `app/claude-connector/page.tsx`.

Componentes partilhados com outras páginas, clareados só dentro de `<main className="kpl">` (cada cor virou
`var(--kpl-*, <cor de antes>)`: fora das páginas claras, nada muda): BuyCreatorCta, TopicGeneratorForm, AgencyVolumeBridge,
LocalizedScriptHandoff, GeoRodada3Sections, Kineo1RetiredNotice, EngineCitationAnswer (+ prop `semGaleriaVelha`),
SeedanceAnswerSections (+ prop `galeria`), PaginasMotor1610, PaidEngineBudget, SeedanceHeroActions, ScriptToSeedanceBridge,
LocalBusinessAdBrief, TextToVideoIntentForm.

Guardiões antigos reancorados (só a camada nova sai da conta deles, nenhuma asserção afrouxada): ver a seção abaixo.

## Não mudou

URL, `<title>`, meta description, canonical, hreflang, JSON-LD/FAQ schema e o texto que ranqueia (provado linha a linha
contra a base pelo guardião novo, seção C). Preço e oferta: intocados. A home (`app/KineoLanding.tsx`) segue byte a byte.

## Guardiões

- Typecheck (`tsc --noEmit -p tsconfig.json --incremental false`): **verde**.
- Guardião novo `scripts/test-paginas-ia-claras-2110.mjs`: **154 ok, 0 falha** — A sem fundo escuro nos 9 modelos ·
  B menu + 4 cards logo abaixo do título e da 1ª frase · C title/description/canonical/hreflang/JSON-LD iguais à base ·
  D vitrine nova, curadoria intocada · E aba ChatGPT por utm/referrer + "Try it in ChatGPT" + sem selo do motor ·
  F /chatgpt conectar → copiar, jargão só na caixa recolhida · R render real (react-dom/server) de 11 variações com o
  código novo · X desfaz exato · M mutantes.
- Comparação com a origin/main pura (worktree 72d23210c), lista de **322 guardiões** (todos os que leem algum arquivo
  tocado, todos com trava por diff/commit, todos os que usam as cadeias de desfaz, + os 5 pedidos):
  - antes: 37 vermelhos · depois: 37 vermelhos — **os mesmos 37, nenhum vermelho novo** (ex.: chatgpt-paste-page,
    checkout-currency-truth, faixa-continuar, home-welcome-goal-router, manrope-system, public-video-privacy,
    guardiao-2026-08-28, meta95-personagem-ajuste-2010, ugc-ajustes-2010… já vermelhos na base).
  - os 5 pedidos: test-verbatim-intocavel-2010 ✅ · test-mcp-studio-2010 ✅ · test-mcp-studio-ajuste-2010 ✅ ·
    test-home-cards-claros-2010 ✅ · test-interface-language ✅.
- Reâncoras no padrão da casa (a camada sai da conta deles; nenhuma asserção afrouxada; toda linha nova leva a marca):
  - lendo a fonte SEM a camada (`semPaginasIaClaras2110`): citation-engine-metadata, paid-seedance-bridge,
    indice-video-ia, motores-16-linguas, projeto-1-google, avatar-fora, paid-engine-proof, citation-entry-truth,
    paginas-motor-1610, motores-geo, geo-rodada2, geo-rodada3, paginas-lote1, mcp-pagina, works-with-claude e o
    `scripts/gpt24h-engine-fixture.mjs` (seedance/veo-hero-plans, motor-capacidade-35s);
  - cadeias: `desfaz-bing-seo-1510` (bing-seo, marca-kineo, paginas-citadas-ponte) e a CABEÇA das cadeias
    `desfaz-ads-cena-ajuste-2110` chamam o desfaz desta camada primeiro; checkout-clareza-1610 idem;
  - travas por diff/commit: mcp-studio-ajuste-2010, mcp-studio-2010, ads-cena-2110, ads-cena-ajuste-2110,
    meta95-personagem-2010, verbatim-intocavel-2010 (arquivos e commits desta entrega fora da conta deles).
- Não rodei a suíte inteira (976): rodar em série leva horas aqui; a lista acima cobre tudo o que lê os arquivos tocados.

## Ofertas contraditórias com o /pricing

Nenhuma achada. O "20% off your 1st month" do botão de compra (BuyCreatorCta) vem do mesmo interruptor do /pricing
(`WELCOME20_SITE_OFFER_LIVE`, `lib/growth/publicPromoTruth.ts`), que mostra os mesmos 20% no Creator/Studio mensal; o
grátis vem de `lib/freeTierOffer.ts` e o Starter de `lib/marketingPrice.ts` (fontes únicas). Observação: o CLAUDE.md
antigo ainda diz "sem 1º mês com desconto" — regra de 17/08 superada pela decisão de 09/10 (20% no cartão).

## O que não deu / riscos

- **VideoObject do JSON-LD**: /text-to-video-shorts, /free-ai-shorts-generator e /ai-video-generator/for/* ainda descrevem
  o vídeo de exemplo antigo no JSON-LD (a regra era não mexer em JSON-LD), mas o player antigo saiu da tela. O Google
  pode tratar como "vídeo não visível". Decisão do fundador: trocar o VideoObject para um clipe da vitrine nova ou remover.
- **Página do Seedance**: os filmes do Seedance 1.5 com "Start from this idea / Make one like this" (SeedanceAnswerSections)
  saíram da página clara junto com a galeria velha; os botões de compra e o formulário continuam. Se esses cliques
  convertiam, dá para voltar com uma prop (`semGaleriaVelha`).
- **Vitrine em inglês** na página PT (/gerador-de-shorts-gratis): título e frase em PT, mas os rótulos dos clipes
  (ShowcaseGrid) são os da /claude-connector, em inglês.
- **Menu do topo é um PAR** do topo da home (como /examples e /trending): sem o mega-menu de motores no "Make a film"
  (vai direto ao Studio). Mexeu no menu da home, mexe em `components/seo/PaginaClara.tsx`.
- **Medição dos cards**: o clique segue o contrato da home (`home_card_clicked`, surface 'home'); separar estas páginas
  pela coluna `events.path` (o trackEvent grava o pathname).
- **Modo escuro**: estas páginas ficam sempre claras (a home troca com a aparência escolhida).
- Não rodei servidor nem build (regra); o render foi conferido offline pelo guardião (react-dom/server, 11 variações).

## Integração da main — 22/10/2026

**FATO CONFIRMADO — IMPLEMENTADO:** a branch recebe `origin/main = f3532d7d21a15b5dfa8859c3a1d2d603ea8cd1a7`, mantendo a venda Kids e Cena95. Os sete conflitos eram de guardiões/desfaz; os arquivos do visual aprovado não tiveram conflito nem nova alteração nesta integração. Fontes: merge Git e `scripts/test-paginas-ia-claras-2110.mjs`.

**FATO CONFIRMADO — desfaz composto:** a tabela de Páginas agora restaura literalmente a fonte deF353 em55 arquivos existentes, com sete arquivos novos declarados. Cada entrada compara a fonte INTEGRAL antes de restaurar: adulteração no meio ou fora dos antigos blocos é recusada. Ordem: Páginas → Cena95 → Kids → Ajuste → camadas anteriores; Bing: Páginas → Bing. O auxiliar95 retira Páginas antes de consultar marca/hash, e Páginas não importa95/Kids, evitando ciclo. As tabelas95 eKids permanecem iguais às recebidas da main. Fontes: `scripts/test-support/desfaz-paginas-ia-claras-2110.mjs`, sua tabela, `desfaz-ads-cena-95-2110.mjs`, `desfaz-ads-cena-ajuste-2110.mjs` e `desfaz-bing-seo-1510.mjs`.

**FATO CONFIRMADO — reâncoras:** os guardiões históricos mantêm asserções, hashes e contagens, retirando somente a camada nova. Os filtros de assunto Páginas exigem prefixo com fronteira de espaço/dois-pontos e aTRAVA exata; o guardião próprio verifica todos os seus commits. Verbatim conserva os filtros95/Kids e acrescenta Páginas na última consulta efetiva. No guardião95, `app/components` são comparados byte a byte SEM Páginas, enquanto os caminhos de produto Kids e os cinco arquivos protegidos mantêm a exigência de diff zero. Fontes: `scripts/test-ads-cena-95-2110.mjs`, `test-kids-venda-2010.mjs`, `test-mcp-studio-2010.mjs`, `test-meta95-personagem-2010.mjs`, `test-meta95-personagem-ajuste-2010.mjs` e `test-verbatim-intocavel-2010.mjs`.

**FATO CONFIRMADO — marcadores:** a busca `git grep -n '^<<<<<<<'` aponta somente bytes de um PNG histórico, inalterado contraF353. A busca textual `git grep -I -n '^<<<<<<<'` está vazia. Nenhuma chamada paga, banco, `.env`, PR, build ou deploy foi executado nesta integração.

**FATO CONFIRMADO — HISTÓRICO:** a integração parcial com F353 foi substituída pela integração final contra 3e7 abaixo. Seus recibos anteriores permanecem preservados; não certificam o merge atual.

## Integração final da main 3e7 — 22/10/2026

**FATO CONFIRMADO — IMPLEMENTADO:** a branch incorpora integralmente a main `3e7ef8a42ea6c1f8566a6dbb55f10cc838b0dbdb`. O visual aprovado de Páginas permanece igual a 2c1803d5e nos caminhos verificados; home, curadoria, preços, produto Kids e billing permanecem iguais à main nos caminhos protegidos. Fontes: inventários e diffs no [recibo portátil](qa/paginas-ia-claras-2210-merge-proof.json).

**FATO CONFIRMADO — reâncoras sem afrouxar:** as fontes integrais de Páginas restauram 3e7 antes das camadas anteriores; ordem Páginas→Roteiro→Cena95→Kids→Ajuste; Bing retira Páginas antes das suas trocas. Além dos guardiões pedidos, os leitores diretos dos dois guardiões do desenho infantil foram corrigidos para retirar Páginas antes de Roteiro. Bases, contagens, mutantes e comparações exatas foram preservados. Fontes: `scripts/test-support/desfaz-ads-cena-95-2110.mjs:23`, `scripts/test-support/desfaz-bing-seo-1510.mjs:23`, `scripts/test-bebe-que-fala-2010.mjs:43`, `scripts/test-desenho-nota9-2110.mjs:38`.

**FATO CONFIRMADO — TESTADO LOCALMENTE — suíte comparada:** referência 991 arquivos (835 verdes, 156 não verdes); candidato 992 (836 verdes, 156 não verdes). Nenhum vermelho novo, nenhuma nova asserção falha nos testes já não verdes, nenhum teste removido/duplicado, nenhuma exceção inesperada e nenhum timeout na seleção final. As primeiras tentativas e todas as repetições permanecem no recibo, com o SHA de origem de cada resultado. A bateria completa foi executada em 27c; a correção posterior de dois testes e tabela foi provada por diff exato e quatro reexecuções em b709. Não se alega uma segunda bateria inteira em b709. Fonte/data: recibo portátil, 22/10/2026.

**FATO CONFIRMADO — TESTADO LOCALMENTE — guardiões:** os cinco pedidos estão verdes; Páginas 195/0, Kids 92/0, MCP 157/0 e Roteiro 90/0. As reâncoras adicionais ficaram verdes: Bebê 53/0, DesenhoNota9 30/0, desfaz de Roteiro 725/0. Os 10 mutantes reais de Roteiro foram rejeitados, com restauração byte a byte das seis fontes e controle positivo verde. TypeScript `tsc --noEmit --incremental false` verde em b709; a primeira tentativa de 300 s expirou, e a repetição de 600 s terminou com código 0 em 321308 ms, sem alteração de configuração. Fontes/data: recibos completos incorporados ao JSON, 22/10/2026.

**FATO CONFIRMADO — escopo da entrega:** somente commits da branch com a TRAVA exata; nenhum comando de PR, build ou deploy foi executado. As provas são locais/offline e não representam validação nova em produção.

## Nova integração da main 2b2 — PlanFailed — 22/10/2026

**FATO CONFIRMADO — IMPLEMENTADO:** merge da main `2b2ea93971ca7fef45ec1bfa46d94d48281bd934` em `c9bd980b03028e6c08465af7b750d343370b5a56`, sem conflito de texto. Os dois guardiões divergentes foram reproduzidos antes da correção, com logs preservados. Os arquivos de produto da nova correção Ads permanecem iguais à main; as fontes visuais de Páginas permanecem sem alterações em relação ao commit aprovado 2c1803d5e. Fonte/data: [recibo desta integração](qa/paginas-ia-claras-2210-2b2-merge-proof.json), 22/10/2026.

**FATO CONFIRMADO — desfaz estrito:** ordem Páginas → PlanFailed → Roteiro → Cena95 → Kids → Ajuste; Bing retira Páginas antes das suas trocas. A tabela de Páginas restaura integralmente a base 2b em 60 arquivos existentes: 56 entradas permaneceram inalteradas, duas foram reancoradas e duas foram acrescentadas para a reâncora PlanFailed. A tabela SHA de PlanFailed e sua base 3e permanecem byte a byte iguais às da main. Os mutantes de PlanFailed são criados depois de retirar Páginas; asserções, SHA, CRLF e rejeições de adulteração permanecem. O escopo continua sendo a árvore atual: um arquivo existente de Páginas só sai da conta após desfaz integral igual à base 3e; caminhos desconhecidos continuam reprovando. Fontes: `scripts/test-support/desfaz-ads-cena-95-plan-failed-2110.mjs:17` e `scripts/test-ads-cena-95-plan-failed-2110.mjs:164`; auditoria independente no recibo.

**FATO CONFIRMADO — TESTADO LOCALMENTE:** bateria pertinente, referência 27 guardiões (27 verdes/0 não verdes), candidata 28 (28 verdes/0 não verdes). Nenhum vermelho novo nem nova asserção falha ou exceção inesperada na comparação; os sete pedidos estão verdes. Esta rodada cobre os leitores e cadeias afetados, sem alegar uma nova execução da suíte integral. TypeScript real `tsc --noEmit --incremental false` verde, código 0, em 53663 ms. Fontes/data: recibos e comparação incorporados ao JSON, 22/10/2026.

**FATO CONFIRMADO — escopo:** mesma TRAVA de Páginas nos commits próprios; somente push na branch, sem comando de PR, build ou deploy. Validação local, sem renderização de vídeo, banco ou chamada paga.
