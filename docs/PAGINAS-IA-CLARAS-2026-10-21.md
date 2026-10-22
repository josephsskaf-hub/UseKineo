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
| `app/ai-video-generator/[engine]/page.tsx` | 6 páginas de motor (seedance, veo, kling, kling-3, minimax-h3, h3max…; o 2.5 tem rota própria e ficou como está) |
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

@@GUARDIOES@@

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
