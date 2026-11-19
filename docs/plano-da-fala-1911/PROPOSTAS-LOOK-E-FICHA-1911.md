# Duas propostas do ensaio A2 · Div. 2 · 19/11

Nenhuma das duas está construída. As duas tocam o caminho do cliente: cada uma pede passo próprio, interruptor, guardião e revisor.

## 1. O look do pedido decide o meio do plano
**O defeito.** 80d9a38d pediu "videogame 3D retrô, gráficos low-poly de PS1/PS2, texturas pixeladas" e saiu "Photoreal film." no começo de todo plano, hoje e no novo. O meio do plano ("Photoreal film.", "3D animated film.") vem da escolha do look da rota (o styleAnchor, isStylizedLook), que lê o look dos poucos looks conhecidos. Um pedido de estilo fora deles cai no fotorreal. O descritor por seção agora mantém o estilo do pedido em cada descrição, mas o meio "Photoreal film." continua mandando o motor ao fotorreal.

**A proposta.** Quando o PEDIDO do cliente escreve um estilo visual (low-poly, pixel art, claymation, anime, videogame retrô…), uma leitura semântica curta do pedido devolve esse estilo em inglês, com a citação conferida no texto. Ele vira o meio do plano no lugar de "Photoreal film." ("Low-poly retro video game look."). Sem estilo escrito, nada muda. A leitura é gpt-4o-mini, uma vez por filme, a mesma família do leitor do sujeito.

**O que muda para o cliente.** Quem pede um estilo recebe o filme nesse estilo, em vez de fotorreal. Quem não pede nada vê o filme de hoje. Risco: o estilo novo também precisa valer na imagem-chave e na folha do personagem, não só no texto do Kling 4. Senão a primeira cena (da imagem-chave) sai fotorreal e as outras estilizadas. A prova tem de olhar os quadros das duas.

**Medida antes de construir.** Contar, em 14 dias, quantos pedidos escrevem um estilo que hoje cai no fotorreal (só SELECT, com a leitura offline sobre o texto do pedido).

## 2. A ficha cortada em fronteira de palavra
**O defeito.** A linha de identidade sai cortada no meio da palavra: "high cheekbones an.", "sandy-blond hai.", "natural skin texture and real fabr.". Acontece hoje e no novo. O compactor da cena corta o prompt inteiro no teto de 512 code points, e a ficha (a parte mais longa) é cortada onde o teto cai. Depois, o plano por seção copia essa ficha já truncada. O motor recebe meia palavra, e o crítico e o juiz comparam a ficha inteira com a truncada.

**A proposta.** No compactor da cena, a ficha é cortada em fronteira de oração (", " ou "; ") ou, em último caso, de palavra, nunca no meio, e a cláusula de estilo repetida sai antes do resto da ficha. É o mesmo corte que o plano por seção já usa (cortaInteiro e quemSemEstilo). O resto do prompt (meio, ação, proteção do fim) fica como está.

**O que muda para o cliente.** Nenhuma palavra cortada na ficha. A ficha pode ficar UMA oração mais curta que hoje (perde o pedaço que hoje sai pela metade). Nada muda nos filmes cuja ficha já cabe. Como a cena 1 vira a imagem-chave, a prova paga precisa de 1 filme com ficha longa (b4de7d59 ou 1c770cb7) olhado em quadros.

**Medida antes de construir.** Contar nos claims de 14 dias quantos planos do Kling 4 têm a linha Identity:/Visible: terminando em palavra cortada (só SELECT).
