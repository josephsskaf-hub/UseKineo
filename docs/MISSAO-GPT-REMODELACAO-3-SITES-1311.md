# Missão 4 para o GPT/Codex — 3 sites totalmente remodelados (13/11/2026)

**De:** CEO Claude, por ordem do dono. **Para:** GPT Telas e Produto (Codex).
**Prazo:** entregar ainda em 13/11, para o dono ver quando acordar. Se algo ficar de fora, diga o que falta e o que trava; não entregue pela metade sem avisar.
**Nada vai ao ar nesta missão.** É proposta para o dono escolher. Publicar só depois do sim dele.

## O pedido, nas palavras do dono (13/11, ~06:10, por voz)

> "Pede pro GPT amanhã, para ele me montar e fazer amanhã, me entregar amanhã, uma remodelação de todo o meu site. Eu quero 3 sites totalmente remodelados. A única coisa que eu quero preservar são os fluxos. E mesmo assim, se ele quiser indicar outros fluxos, ele pode e deve fazer fluxos de botões, essas coisas ele deve fazer. De como ficaria o recreate, enfim, ele sabe nossos produtos."

## O que é para entregar

Três propostas **completas e diferentes entre si** do site inteiro. Não são três variações da mesma tela: cada uma é uma direção com tese própria (para quem é, por que vende mais, que líder de mercado ela segue).

Para cada uma das 3 propostas:

1. **Nome e tese em 3 linhas:** para quem é, o que a pessoa entende nos primeiros 5 segundos, por que isso deve vender mais que o site de hoje.
2. **As telas, montadas de verdade** (página local navegável, com os clipes e as fotos que já existem), em 1920 px e em 390 px:
   - Home (deslogada e logada)
   - Recreate: a grade de modelos, a tela de um modelo e o resultado pronto
   - Film (Studio), Cartoon e Ads (produto e UGC)
   - Library / My videos
   - Preços
   - Login e cadastro
   - Made with Kineo
   - Menu do topo e menu lateral, no computador e no celular
3. **Mapa de fluxos:** cada botão principal e para onde ele leva. Os fluxos de hoje são preservados. Onde você achar que um fluxo novo vende mais ou confunde menos, **proponha**, mostrando o de hoje e o novo lado a lado, com o motivo.
4. **Esforço:** o que é só aparência (pequeno), o que mexe em componente compartilhado (médio) e o que mexe em fluxo ou em dado (grande).
5. **Risco:** o que pode cair (texto que o ChatGPT cita, medição, páginas de SEO) e como a proposta protege.

No fim, **uma página só de comparação** das 3, com a sua recomendação marcada, e uma **foto de decisão** (as 3 primeiras telas lado a lado, os números ao lado, A, B e C). O dono decide por foto.

## O que preservar e o que está livre

- **Preservar:** os fluxos que funcionam hoje (cadastro, teste grátis, geração só com clique em Gerar, checkout, resgate de oferta `/clips?free_clip=1`, acompanhamento de trabalho em andamento e de falha com reembolso).
- **Livre:** layout, hierarquia, menu, nomes de botões, ordem das seções, tipografia, cor, cartões, a própria estrutura das páginas. O dono disse "totalmente remodelados".
- **Regras do dono que continuam valendo em qualquer proposta:**
  - Cartão e botão sem nome de motor e sem preço.
  - Nenhum texto menor que 12 px.
  - Geração nunca começa sozinha (prévia muda pode tocar sozinha: "cards são trailer").
  - Janela do cartão mostra cabeça, rosto e produto inteiros (5:6 em pé foi o tamanho que ele aprovou em 13/11: "tamanho certo").
  - Clipe novo abre a primeira tela, em cartão grande.
  - Selo honesto: só diz "Recreate" quem é modelo de troca aprovado; exemplo feito à mão não diz que saiu do produto.
  - Texto que o ChatGPT cita ("faceless", tabelas, perguntas e respostas) não some. Se a proposta mudar de lugar, diga para onde vai.
  - Sem cartão de promoção. Login em quadro.
- **Método do dono (09/11):** copiar 90% do que funciona nos líderes e mudar só o que é nosso (arquivo, rosto, marca, fatos). Vale escolher um líder por proposta e dizer qual.

## O que já existe para você partir

- Suas 3 estratégias de cards (`docs/home-1311/estrategias-gpt/`, na sua worktree). **O dono escolheu a A** ("Your next story"), com o ajuste da CEO: carta do front · raposa · selfie na 1ª linha; hambúrguer · creme · suéter na 2ª. Selfie e suéter são modelos de Recreate de verdade desde 13/11 05:01.
- Cliques por tipo de cartão nos últimos 14 dias: `docs/home-1311/CLIQUES-POR-CARTAO-1311.md` (filme 105, desenho 73, anúncio de produto 33, anúncio UGC 23; 12% de quem vê a home clica num cartão).
- Pesquisa do fluxo de anúncio dos 8 líderes: `docs/ads-fluxo-mercado-1311/PESQUISA-FLUXO-ADS-LIDERES-1311.md`. O dono escolheu a opção A para a tela de Ads (igual ao mercado, no molde da tela do Recreate).
- Missões anteriores: `docs/MISSAO-GPT-HOME-1311.md`, `docs/MISSAO-GPT-TELAS-2-1311.md`, `docs/MISSAO-GPT-CARDS-3-ESTRATEGIAS-1311.md`.
- Falas do dono em 13/11 sobre as telas: a tela nova do Recreate "tá bem melhor"; a página de um clipe "não tem muito significado, pode tirar"; clipe e Recreate "é a mesma coisa, acho que a gente podia juntar"; a pessoa "nem quer saber qual motor"; existem três telas de "My videos" (/library, /history, /my-videos) e ele se perdeu nelas pelo celular; no celular o vídeo pronto do Recreate ficava escondido atrás do botão fixo.
- No ar desde a sua última base (`1c736d3a6`): `da56b406d` (suéter e selfie no Recreate), `235d513c0`, `3863bfc39`, `4a2c2b1a4`, `0cd740603`, `203ebbf96`, `c5f0beb56` (vídeo já abre com o primeiro quadro), `651ed0d80`. Parta da `origin/main` de agora.

## Como entregar

- Branch nova a partir da `origin/main`, por exemplo `codex/remodelacao-3-sites-1311`. Commits locais. **Não publicar.**
- As propostas ficam em rota ou página local de prévia, fora do código ativo das telas de hoje. Nenhuma tela de produção muda nesta missão.
- Prints em `docs/remodelacao-1311/` (1920 e 390 px de cada tela de cada proposta), a página de comparação e a foto de decisão.
- Ao terminar: linha no quadro `C:/kineo/docs/QUADRO-DE-SESSOES.md` em "Entregue à CEO" e o aviso "Sessão terminada · GPT Telas · resultado · próximo passo". A CEO puxa sozinha (confere a cada 30 minutos), revisa e leva ao dono com foto.

## O que a CEO faz com a entrega

Confere os prints um a um (cabeça inteira, texto ≥ 12 px, botão honesto, nada de motor ou preço em cartão), junta os números e leva ao dono a foto de decisão com A, B e C. A proposta escolhida vira obra em etapas pequenas, cada uma publicada e medida.
