# Missão 6 para o GPT/Codex: construir o WATCH de verdade, em etapas (13/11/2026)

**De:** CEO Claude, por ordem do dono. **Para:** GPT Telas e Produto (Codex).
**Começa:** hoje. **Vai ao ar:** sim, uma etapa por vez, depois da revisão da CEO.

## O que o dono disse

13/11, 16:42, depois de ver a foto das três estruturas da missão 5: **"Vamos seguir com as páginas novas do site novo, um recomendado Watch."**

A estrutura escolhida é a **1 · WATCH** (parede de vídeos, produtos no topo, barra de baixo no celular). PROMPT e ROOMS ficam guardadas em `docs/sites-diferentes-1311/` e não são construídas.

## O ajuste que entra junto

A recomendação que o dono aceitou foi "WATCH, com um ajuste". O ajuste é este:

- No protótipo, o WATCH pede a conta **antes** da ideia (vídeo, cadastro, ideia, revisão, Generate). **Isso não entra.**
- Vale a ordem: **a pessoa escolhe o vídeo, escreve a ideia e só então cria a conta**, no primeiro botão que precisa de conta.

Por quê:

1. Já é decisão do dono, de 04/11, e está no ar: `lib/growth/visitanteEscreveAntes.ts`. O cartão de filme, de anúncio, de UGC e de desenho da home abre a tela de verdade, e o cadastro vem depois. O WATCH não pode desfazer isso.
2. A caixa não pode abrir em branco. Em 11/11 medimos que 18% de quem vem do ChatGPT e se perde abre a caixa de texto e não escreve nada. No WATCH a caixa abre **já com a ideia do vídeo que a pessoa clicou**, e ela troca o que quiser.

## Os números que a obra tem de mexer

| O que | Hoje |
|---|---|
| Quem vê a home e clica num cartão de vídeo | 12% (182 de 1.470 pessoas em 14 dias) |
| Cliques por produto na home, em pessoas | filme 105, desenho 73, anúncio de produto 33, UGC 23 |
| Visitas do link do afiliado em 8 dias | 544, das quais 527 pelo celular |
| Dessas 544, quantas chegaram ao Studio, escreveram e criaram conta | 14, 1 e 0 |
| Celular real (375 px) na página de entrada do afiliado | primeira tela só com texto e aviso de cookies; a caixa de ideia fica a 2.285 px do topo |

Conclusão que guia o desenho: o celular vem primeiro, e a primeira tela é vídeo com botão, não texto.

## Etapas

Uma etapa por entrega. Não espere as cinco para entregar a primeira.

### Etapa 1: home do visitante (celular primeiro, depois computador)

- Primeira tela: parede de vídeos, com o título curto e o botão **sobre** cada vídeo. Janela 5:6 com cabeça, rosto e produto inteiros.
- Navegação: produtos no topo no computador; barra de baixo no celular, como aplicativo. As duas levam aos mesmos destinos.
- Ordem: os clipes de `CLIPES_NO_TOPO` (`lib/clipesNos2Lugares.ts`) abrem a primeira tela. Filme e desenho antes de anúncio.
- O clique no vídeo abre a tela de verdade do produto com a ideia daquele vídeo já escrita. Nada de cadastro antes.
- Tudo o que o ChatGPT cita continua na página, embaixo da parede: perguntas e respostas, tabelas, a palavra "faceless", os textos de `lib/seo/paginasCitadas0511.ts`. Mudar de lugar pode; apagar não.
- Peso no celular: só toca o vídeo que está visível; os outros ficam parados no primeiro quadro (pôster, ou `comPrimeiroQuadro` de `lib/videoPrimeiroQuadro.ts`). Use os vídeos recomprimidos que o dono aprovou em 11/11 (branch `claude/div-plataforma-062ca9`, commit `36f9f2309`, pasta `public/previews/leve-1111/`; a home ainda aponta para `home-clean-sep24`). Meça no navegador quanto a primeira tela do celular baixa antes de rolar e escreva o número na entrega. Alvo: até 4 MB.
- O evento `home_card_clicked` passa a levar o id do clipe. Hoje ele só grava a família do cartão, e sem o id não dá para saber qual vídeo puxa clique.
- Nasce numa rota de prévia no ar, sem índice (noindex, fora do sitemap e do `llms.txt`), para a CEO e a Div. 1 conferirem em celular de verdade. Um interruptor só, em constante de código, troca a `/` pelo WATCH e desfaz a troca em um commit. A home de hoje fica no repositório.

### Etapa 2: tela de criação com o vídeo como palco

Film, Cartoon e Ads no celular e no computador. A conta só é pedida no Generate. O rascunho (ideia, produto e vídeo escolhido) atravessa o cadastro e volta para a mesma tela. Reaproveite `visitanteEscreveAntes.ts` e `lib/growth/ideiaPousaNoStudio.ts`; não crie um segundo caminho de conta. Texto digitado, foto e credencial não vão para a URL.

### Etapa 3: Recreate em feed

No celular, uma cena por vez, rolando. Os 32 modelos continuam acessíveis. A tela do modelo mantém os três passos (foto, revisar, gerar). Só troca aprovada diz "Recreate"; efeito diz "Use effect".

### Etapa 4: My videos em parede única

Uma coleção só, com o estado em cada item: pronto, em andamento, falha com o crédito devolvido.

### Etapa 5: o resto

Login e cadastro sobre a parede (login e signup mudam juntos), Pricing, páginas de produto, Made with Kineo.

## O que não muda

- Sem nome de motor e sem preço em cartão ou botão. Preço só sai de `lib/checkoutPricing.ts`.
- Nenhum texto com menos de 12 px.
- Geração nunca começa sozinha. Prévia muda pode tocar sozinha.
- Clipe novo continua entrando em 3 lugares (lista `CLIPES_NOVOS`).
- `/clips?free_clip=1` continua valendo. Compra sem login continua valendo. O botão de compra não se esconde antes do primeiro filme.
- Esta missão só mexe em tela. Não toca em geração, cobrança, crédito, e-mail nem banco.
- Não mexa em `/free-ai-shorts-generator` até o SHA da Div. 3 aparecer em "No ar": ela está pondo vídeo e caixa de ideia na primeira tela do celular (branch `claude/div3-pouso-afiliado-1311`).

Das pendências antigas: a faixa de Recreate da home e a retirada da aba Clip entram no desenho do WATCH. As outras (miniaturas do Cartoon, 1 a 2 s em branco em `/create/ads`, valor sem fonte em `/tiktok-vs-youtube-shorts-monetization`, 126 testes de tela vermelhos na main) continuam valendo.

## Pronto, em cada etapa

1. `npx tsc --noEmit` limpo.
2. `bash scripts/ci/novos-vermelhos.sh '<área>'` sem vermelho novo, com árvore limpa e commit feito. Guardião preso ao desenho antigo: reancore no mesmo commit, com mutante. Não apague guardião.
3. Foto a 1920 px e foto de **celular de verdade** (aparelho, ou emulação de dispositivo a 390 px). Janela de navegador encolhida não vale: abaixo de uns 500 px ela sai cortada e inventa defeito.
4. No celular, sem rolagem para o lado: `document.documentElement.scrollWidth === window.innerWidth`.
5. Tela logada conferida logada.

Entrega: branch nova a partir da `origin/main` de agora, commit local, linha em "Entregue à CEO" do quadro (`C:\kineo\docs\QUADRO-DE-SESSOES.md`) com branch, SHA, fotos de antes e depois e o peso medido da primeira tela. A CEO revisa com a Div. 1, publica e mede.

## Como medimos

A CEO mede; você deixa o evento certo.

- Depois da Etapa 1: clique em vídeo na home (base 12%), com o celular contado à parte; visitante que escreve a ideia; conta criada; primeiro filme.
- Se, com 1.000 visitantes na home nova, o clique não passar de 12% ou o cadastro cair, a home de hoje volta pelo interruptor e a gente olha o porquê.

## Ordem de hoje

A Etapa 1 no celular é a primeira entrega. Escreva no quadro quando o commit existir.
