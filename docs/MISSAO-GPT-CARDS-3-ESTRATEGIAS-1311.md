# MISSÃO 3 PARA O GPT/CODEX (Telas e Produto) — 3 ESTRATÉGIAS DE CARDS + ESTUDO DAS TELAS — 13/11/2026

Escrita pela CEO (Claude) em 13/11 ~04:20, com as palavras do dono. **Ele disse que esta é a mais importante.** Passa na frente da missão 2.
Entrega: até 09:00 de 13/11. NÃO publicar nada desta missão: é estudo e proposta. O site fica como está ("dar esse deploy agora, deixa assim").

## O pedido do dono (13/11 ~04:15)
"Pegar as novas fotos, mandar esse trabalho pro GPT, porque eles fazem muito bem isso. E ver com eles qual é o melhor modelo possível de
estratégia de cards. Eu quero que ele me prepare 3 estratégias das melhores formas possível. Amanhã eu quero um estudo pronto sobre como
que eu posso deixar as minhas telas melhores possíveis. […] Isso que eu falei é o mais importante, porque ele vai arrumar da melhor forma
possível os cards e deixar os mais relevantes no começo pra aumentar nossas vendas."

## O que já está no ar (rebase antes de qualquer coisa: origin/main = 9ee6eb81e ou mais novo)
- 10 clipes novos na vitrine (home + /made-with-kineo), lista única `CLIPES_NOVOS` em lib/clipesNos2Lugares.ts (722c1e75f).
- Topo da home: 6 clipes novos (`CLIPES_NO_TOPO`) em cartão EM PÉ 5:6, 3 por linha, no lugar das seis paisagens (6628aabe6 + 9ee6eb81e).
  Regra do dono: "deixa eles na parte de cima sempre como regra, e maiores também". A CEO mexeu em components/home/HomeMosaic.tsx por ordem dele.
- Arquivos dos clipes: public/previews/galeria/<id>.mp4 e public/posters/galeria/<id>.webp. Originais 768×1152 e as folhas de quadros em
  C:\kineo\docs\home-1311\clipes\ ; os 12 quadros parados em C:\kineo\docs\home-1311\quadros\ .
- Prints do dono e da produção: C:\kineo\docs\home-1311\topo\ e C:\kineo\docs\telas-1311\ .

## Dados para decidir (não é gosto)
- Cliques por cartão da home, 14 dias: docs/home-1311/CLIQUES-POR-CARTAO-1311.md — Filmes 105 pessoas, Desenho infantil 73, Anúncio de
  produto 33, Anúncio UGC 23; 12% de quem vê a home clica num cartão. O evento só grava a FAMÍLIA do cartão: falta o id do clipe.
- Menu: "Films" 46 pessoas; "Examples" 2; "Clips" 27 (e só 5 fizeram clipe).
- Quem paga vem do ChatGPT e paga depois de baixar um filme de nota 8 ou mais; o 1º filme grátis é a vitrine de verdade.
- Líderes: docs/home-1311/DOSSIE-HOME-LIDERES-1311.md (Higgsfield: recreate 41% / filme 46% / ads 14% dos cartões de vídeo).
- Tela de anúncio no mercado: docs/ads-fluxo-mercado-1311/PESQUISA-FLUXO-ADS-LIDERES-1311.md (8 líderes; a CEO recomendou ao dono a opção
  "igual ao mercado, no molde do nosso Recreate"; a escolha é dele).

## Entrega 1 — TRÊS ESTRATÉGIAS DE CARDS (o coração da missão)
Três estratégias de verdade diferentes entre si, cada uma com:
1. A ideia em uma frase (para quem é, o que ela vê primeiro, o que ela clica).
2. A ORDEM dos cartões da primeira tela e das duas seguintes, com o motivo de cada posição (dado ou líder que faz igual).
3. O que cada cartão diz e para onde leva (botão: "Recreate", "Make your ad", "Make my film"…). Cartão sem botão não serve: o dono reclamou
   ("não tem o botão recreate").
4. UMA imagem da home montada com os clipes e fotos que já existem (prévia local fotografada a 1920 e a 390 px, não desenho solto). Para
   fotografar: `npx next dev -p <porta>` na sua worktree com um .env.local só de variáveis NEXT_PUBLIC_, e print de http://localhost.
5. Como medir em 7 dias: qual número sobe (clique por cartão, cadastro, 1º filme, ida ao pagamento) e qual seria o sinal para desfazer.
6. O que precisa ser feito de novo (clipe, foto, teste de troca) e o que já existe.
No fim: a sua recomendação entre as três, com o motivo, e o que você NÃO faria.
Pontos de partida que o dono já deu: clipe novo no topo e maior; "a pessoa tem que se vislumbrar" (isso podia ser eu, o meu produto, o meu
canal); paisagem sem gente nem produto sai; Recreate tem de aparecer; a tela /recreate/<modelo> é o molde ("tá bem melhor").

## Entrega 2 — ESTUDO "COMO DEIXAR AS TELAS AS MELHORES POSSÍVEIS"
Tela por tela (home, /recreate, tela de filme, cartoon, anúncio, /made-with-kineo, /pricing): as 3 mudanças que mais vendem em cada uma,
em ordem, com o líder que faz assim (print ou link) e o tamanho da obra (pequena / média / grande). Uma página, linguagem de dono.
Para a tela de anúncio use a pesquisa já feita; não refaça.

## Regras que não se quebram
- Janela 5:6: cabeça, rosto e produto inteiros em todo cartão (o dono reclamou hoje: "os cards estão cortados"). Conferir no print a 1920 px.
- Sem nome de motor e sem preço em cartão ou botão; nenhum texto < 12 px; a prévia toca muda e sozinha; nenhum render começa sozinho.
- Não prometer o que o cliente não faz hoje: pessoa falando com a própria boca; troca de 2–3 pessoas; troca em vídeo enviado pelo cliente.
- Modelo de Recreate só entra depois do teste pago de troca (a CEO pediu o sim do dono para testar selfie, suéter, balão e dança).
- Nada de gasto acima de US$ 2 nesta missão; nenhum vídeo novo. Só o que já existe.
- NÃO publicar. Commit local com os mockups em docs/home-1311/estrategias/ e uma linha em "Entregue à CEO" no quadro local
  C:\kineo\docs\QUADRO-DE-SESSOES.md. A CEO confere e leva ao dono com foto e A/B/C.
