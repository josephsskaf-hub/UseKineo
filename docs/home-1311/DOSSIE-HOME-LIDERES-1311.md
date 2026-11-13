# DOSSIÊ — Home dos líderes × Kineo (13/11/2026)

Legenda: **[MEDIDO]** = lido na página hoje (janela 1920x911, não 1440x900). **[JULGAMENTO]** = opinião minha.
Prints: `docs/home-1311/higgsfield/` (10) e `docs/home-1311/kineo/` (4).

## Resposta em 6 linhas
1. A tela de entrada da Higgsfield quase não tem filme: é banner de promoção, ferramentas e o selo "Claude Fable 5.2 com Higgsfield MCP". [MEDIDO]
2. O conteúdo de vídeo vem logo abaixo, e é 41% preset de recreate, 46% filme, 14% anúncio (96 cartões de vídeo). [MEDIDO]
3. Os presets de recreate (Shorts Studio e Genjutsu) vêm PRIMEIRO, antes dos filmes, e mostram contador (views, curtidas, "Recreates"). [MEDIDO]
4. A nossa tela de entrada tem 4 cartões de produto e 6 clipes de filme. Zero recreate acima da dobra. [MEDIDO]
5. No nosso corpo da página: 37% são imagens paradas, 23% recreate, 18% clipes, 16% filme, 6% anúncio. Anúncio está sub-representado. [MEDIDO]
6. O nome "modelo antigo" do Claude NÃO existe no nosso site nem no repo. Veja a seção do MCP. [MEDIDO]

## Tabela Higgsfield × Kineo
Tipos: (a) preset/recreate, (b) filme, (c) anúncio/produto/UGC, (d) apps/ferramentas, (e) feed da comunidade, (f) banner promo.

### Higgsfield — tela de entrada (1920x911) [MEDIDO]
11 itens: (a) 1 = 9% · (b) 0 · (c) 0 · (d) 6 = 55% · (f) 4 = 36%.

### Higgsfield — página inteira (118 itens contados) [MEDIDO]
| Tipo | Itens | % |
|---|---|---|
| (a) recreate/preset | 39 (Genjutsu 1 + Shorts Studio 24 + Genjutsu comunidade 14) | 33% |
| (b) filme | 44 (comunidade 12 + Seedance 2.5 16 + Seedance 2.0 16) | 37% |
| (c) anúncio | 13 (Marketing Studio 12 + Drama Ads 1) | 11% |
| (d) apps/ferramentas | 14 (6 tiles + 8 casos de uso do MCP) | 12% |
| (f) promo | 8 | 7% |
Só vídeo (a+b+c = 96): recreate 41% · filme 46% · anúncio 14%.
Fora da conta: galerias de imagem (GPT Image 2, Soul Cinema, Soul 2.0), que carregam sob demanda. Não contei.

### Kineo — tela de entrada (1920x911) [MEDIDO]
10 itens: 4 cartões de produto grandes (Faceless, Product Ads, UGC Ads, Cartoon) = 40% · 6 clipes, todos levam a /create/film = 60% · recreate 0.

### Kineo — página inteira (95 cartões de galeria + 4 de produto) [MEDIDO]
| Tipo | Itens | % |
|---|---|---|
| Recreate (pílula "Recreate") | 22 (11 em páginas /recreate/*, 11 apontando para /clips) | 23% |
| Filme (/create/film) | 15 | 16% |
| Clipes (/clips, sem pílula) | 17 | 18% |
| Imagem parada (/images) | 35 | 37% |
| Anúncio (/create/ads) | 6 | 6% |
| Cartoon | 0 na galeria (só o cartão de topo) | 0% |

## O que a Higgsfield faz e nós não [MEDIDO, exceto onde marcado]
- **Ordem:** carrossel de promo (6 cartões 512x348) → faixa de ferramentas → hero do MCP → Shorts Studio (recreate) → Genjutsu (recreate) → filmes da comunidade → galerias por motor → rodapé. A gente abre direto em 4 produtos e uma parede de clipes.
- **Recreate é a estrela:** 2 seções inteiras, cartões verticais 360x641 (Shorts) e masonry de 304 de largura (Genjutsu), com views/curtidas e "Recreates N" em cada um. Nossos recreate são pílulas pequenas dentro de uma parede mista.
- **Prova social numérica:** 79,1K, 832,9K, "Recreates 1,5K" em cada cartão. Nós temos número só em 1 cartão ("441" na Tunguska).
- **Rotinas por motor:** uma seção por motor (Seedance 2.5, Seedance 2.0) mostrando "o que sai". Nós escondemos o motor de propósito (decisão nossa).
- **Densidade:** ~118 itens, mas a primeira tela é leve (poucos blocos grandes). Nossa página é um mosaico de 95 cartões, 37% imagens paradas.
- **Movimento:** os vídeos são loop com `loop` ligado, sem autoplay até entrar na tela (0 tocando no momento da medição). [MEDIDO] Nossos cartões do fundo apareceram escuros/em branco nos prints: carregamento tardio. [MEDIDO no print 04]
- **Hero:** é o selo do MCP (preto, "CLAUDE FABLE 5.2 WITH HIGGSFIELD MCP", 2 botões) com 8 cartões de casos de uso (jogos, filme em código). [JULGAMENTO: serve para atrair desenvolvedor, não é o nosso público.]
- **Promoção:** carrossel e cartão rosa "UP TO 60 DAYS OF UNLIMITED" com contagem regressiva. Nós não temos nada equivalente.

## Achado do MCP e do nome do modelo
- **Higgsfield, texto exato:** "CLAUDE ✺ FABLE 5.2 / WITH HIGGSFIELD MCP"; cartão do carrossel "FABLE 5.2 × HIGGSFIELD MCP — Unlimited generations on frontier models" (/mcp); tile "Higgsfield MCP for Claude — Generate images and videos in Claude"; tile "Supercomputer — Agent powered by Fable 5.2"; botões "Connect Higgsfield MCP" e "Explore use cases". [MEDIDO]
- **Kineo, texto exato:** menu "Claude & ChatGPT" (href `/kineo-in-claude`); título da aba "Generate videos in Claude and ChatGPT with Kineo"; H1 "GENERATE VIDEOS IN CLAUDE WITH KINEO"; botão "Add Kineo in Claude"; URL do conector `https://www.usekineo.com/api/mcp/studio`. [MEDIDO]
- **Resultado:** o site da Kineo NÃO cita nenhum nome de modelo (nem Opus, nem Sonnet, nem Fable). Busca no repo `C:\kineo-wt\seedance-sai-1111` por Fable/Opus/Sonnet em app, components, lib: só "OpusClip" (concorrente). Então não há string de modelo velho para trocar. O que o fundador viu pode estar no app do Claude (a sessão dele) ou em outra superfície. [MEDIDO]
- **Onde mexer se quiser nomear o modelo:** `app/kineo-in-claude/page.tsx` (título, H1) e `lib/ui/homeRemodela2010.ts` linha 30 (`MENU_CONNECTOR_LABEL = 'Claude & ChatGPT'`, usado no menu em `app/KineoLanding.tsx`). [JULGAMENTO: citar versão de modelo envelhece rápido e nossa regra de selo honesto pede só o que é verdade; a Higgsfield pode, porque o selo é promoção deles com a Anthropic.]

## Mix recomendado para a home da Kineo [JULGAMENTO]
Base: o que a Higgsfield faz, ajustado ao que a gente vende (filme, anúncio, recreate).
| Tipo | % do corpo | Por quê |
|---|---|---|
| Recreate/preset | 35% | É o que gera "quero fazer o meu" e o que eles põem primeiro. Hoje 23%. |
| Filme | 30% | É nosso produto de entrada (primeiro vídeo = produto). Hoje 16%. |
| Anúncio (produto + UGC) | 20% | Onde está o dinheiro do cliente que paga. Hoje 6%. |
| Cartoon | 5% | Produto novo, 1 fileira basta. Hoje 0%. |
| Imagem parada | 10% | Hoje 37%; imagem parada vende pouco e não mexe. |
Primeira tela: 4 produtos + 1 faixa de recreate (6 cartões verticais com pílula e número) antes dos filmes. Tirar os 6 clipes de natureza da linha 1 ou deixar só 3.
Mostrar contador real só quando há post do mesmo vídeo (regra já gravada).

## 10 clipes novos propostos [JULGAMENTO]
Todos com pessoas inventadas, sem famoso, sem marca, sem clube. Loops de 5 a 8 s. Presets: cena fixa ou plano simples, 1 a 3 pessoas de frente para a câmera.

### 5 presets (recreate)
| # | Título do cartão | O que se vê no loop | Primeiro quadro | Leva a | Espelha na Higgsfield |
|---|---|---|---|---|---|
| P1 | Talking to camera | Mulher de tranças e camisa xadrez fala com um microfone pequeno e acena | Plano médio, sofá azul, luz de janela, olhar na lente | recreate | Shorts Studio: cartões de pessoa falando (898K) |
| P2 | Selfie with the crowd | Casal posa e comemora com confete ao fundo, câmera na mão | Plano de peito, noite, luzes coloridas, 2 pessoas | recreate | Genjutsu: cenas de festa e dança |
| P3 | Cozy sweater flip | Homem vira o suéter e mostra o estampado, sorri | Plano americano, árvore iluminada ao fundo | recreate | Cartão "Christmas sweater flip" que já temos (mais novo) |
| P4 | Balloon pop surprise | Duas amigas estouram um balão de confete e riem | Plano médio, parede colorida, 2 pessoas de frente | recreate | Genjutsu: movimento + troca de personagem |
| P5 | Dance in the hallway | Pessoa dá 3 passos de dança em corredor de escritório | Plano geral baixo, corredor, luz fria, 1 pessoa | recreate | Genjutsu: dança no escritório |

### 5 vídeos normais
| # | Título do cartão | O que se vê no loop | Primeiro quadro | Leva a | Espelha na Higgsfield |
|---|---|---|---|---|---|
| V1 | Storm over the harbor | Veleiro sacudido por onda, relâmpago no fundo | Plano largo, mar escuro, céu roxo | filme | Seedance 2.5: filmes cinematográficos |
| V2 | The sneaker drop | Tênis branco gira em pedestal com luz de vitrine | Plano fechado, fundo neutro | anúncio de produto | Marketing Studio: produto |
| V3 | Honest face cream review | Pessoa mostra o creme perto da câmera e fala | Selfie vertical, banheiro claro | anúncio UGC | Marketing Studio: cartões UGC |
| V4 | Fox and the lantern | Raposa 3D carrega lanterna por floresta | Plano médio, neblina azul | cartoon | Drama Ads / animação da comunidade |
| V5 | The last train | Estação vazia, neblina, trem chega devagar | Plano largo, trilhos, luz amarela | filme | Seedance 2.0: filmes da comunidade |

Obs: V2 e V3 já têm irmãos na nossa página; aqui entram versões novas, mais curtas, para a primeira tela. Os primeiros quadros podem virar still para aprovação antes de gastar render.
