# Prova C · filme 3 · as propostas · Div. 2 · 20/11

Branch `codex/div2-reserva-imagem-2011` (da origin/main 6f75a2028). Sem gasto, sem render.

## 1. Reserva sempre com imagem (CONSTRUÍDA, interruptor 'off')
- **O quê:** ao começar a reserva, a cena sem imagem aprovada ganha a imagem-chave 9:16 desenhada do texto da própria cena. É o still da rota (flux/dev, no nosso bucket); com o meio 3D, sai sem o sufixo fotorreal. As 3 cenas vão pelo H3 com imagem e nunca mais pelo H3 só de texto. As URLs entram no claim na mesma transição atômica que começa a reserva. Se faltar alguma imagem, o desenho travar ou vier URL da fal, fica o caminho de hoje inteiro (sem misturar motor).
- **Antes × depois** (guardião, com as cenas assinadas dos 3 casos reais):

  | Filme | Antes | Depois | Cenas desenhadas | Custo |
  |---|---|---|---|---|
  | 76c4c5c4 | H3 só de texto × 3 | H3 com imagem × 3 | cenas 1 e 2 | US$ 0,06 |
  | eec8a2d3 | H3 só de texto × 3 | H3 com imagem × 3 | cena 3 | US$ 0,03 |
  | 5910c0e8 | H3 só de texto × 3 | H3 com imagem × 3 | cenas 2 e 3 | US$ 0,06 |

  No H3 vai o texto da cena, sem mudança, mais a `image_url` (a aprovada ou a desenhada). Sai o `aspect_ratio`, que o H3 com imagem tira da própria foto.
- **Custo a mais:** ~US$ 0,03 por cena sem imagem, só nos filmes que caem na reserva sem imagem em todas as cenas. Média medida: 2 cenas por filme, ~US$ 0,06 por filme.
- **Quantos filmes:** clientes na reserva só de texto foram **2 em 7 dias** (3 cenas sem imagem) e **5 em 30 dias** (10 cenas sem imagem; 3 deles antes de 11/11, ainda no Seedance de texto). Na reserva com imagem foram 4 em 7 dias e 20 em 30 dias. Isso dá ~US$ 0,06 a US$ 0,12 por semana.
- **Tempo a mais:** até 25 s de teto para desenhar, em paralelo, uma vez por filme na reserva.
- **Ligar para cliente** é gasto por filme: pede o sim do dono.

## 1-B. Plano B, só desenhado: o leitor de 1 quadro
- Depois de cada clipe do H3 só de texto, um quadro do meio vai ao gpt-4o-mini (~US$ 0,001), com a pergunta "a cena está deitada?" e resposta em JSON {deitado, confiança}.
- Deitado com confiança alta: o clipe é pedido de novo UMA vez (+US$ 0,785 por clipe de 6 s). Se vier deitado de novo, monta assim e grava o evento.
- **Por que é o B:** reduz e não elimina (a 2ª tentativa também pode vir deitada); custa mais quando acerta (um clipe novo contra uma imagem nova); soma ~1 a 2 min ao filme.

## 2. Ficha reprovada também no caminho de hoje (CONSTRUÍDA, 'internal')
- Se a ficha não agiu dentro da revisão do A2, o mesmo passo roda depois dele, com o veredito do juiz de ANTES das imagens (`juiz_plano_ficha_antes`), nas cenas do Kling 4 e antes do POST pago.
- No filme 3, planos 3 e 4: reprovada de novo, sai a identidade do Daniel e ficam a Emily e a Sarah; aprovada sem as âncoras, sai a folha e a origem e fica a ficha do autor.
- Interruptor próprio `FICHA_REPROVADA_NO_HOJE_2011 = 'internal'`. Guardião com 9 mutantes.

## 3. A ficha antes da imagem (só o desenho)
- **Onde:** no passo que já existe antes das imagens (`fichaAntesDoRender1311`, `route.ts` ~7555). Hoje ele lê o juiz e, com `a_ficha`, só refaz a ORDEM (`refeitos: sem_ordem | nada`).
- **O quê:** com `a_ficha` verificado, aplicar às cenas longas (`classicScenePrompts`) o mesmo passo da ficha reprovada: sem as âncoras e a origem, e o juiz relê no mesmo prazo; reprovada de novo, sem a ficha. Isso acontece ANTES de desenhar as imagens-chave e a folha.
- **O que muda:**
  - a imagem-chave nasce sem a ficha errada (resolve o limite da imagem: 63 de 77 envios têm imagem inicial desenhada com a ficha);
  - a folha do personagem não é desenhada para uma ficha reprovada (economiza a folha, ~US$ 0,15 a 0,73);
  - a ficha fica no tamanho do ensaio, então a descrição do A2 volta a caber (o motivo do filme 3 cair no caminho de hoje).
- **Risco:** a folha e o crítico do still leem a ficha. Com a ficha fora, a folha não nasce e o crítico compara sem ela. Precisa de ensaio grátis em quadros (sem render) nos 40 filmes COM ficha do corpus e de prova paga própria.
- **Medida antes de construir:** quantos dos 40 COM ficha têm `juiz_plano_ficha_antes` com `a_ficha` (só SELECT).

## 4. Os clipes deitados (para ver com os olhos)
Folhas na mesma pasta: 4 quadros por clipe (0,5 · 1,8 · 3,1 · 4,4 s), uma linha por clipe.
- `76c4c5c4-reserva-h3-texto-quadros.jpg`:
  - linha 1, cena 1 (rua nevada): deitada;
  - linha 2, cena 2 (a tira de fotos): em pé;
  - linha 3, cena 3 (Daniel e Sarah): deitada.
  - Clipes: `https://v3b.fal.media/files/b/0ab3302b/p78I0CrWu0eAU8Lo3EkEM_minimax-h3.mp4`, `…/n94SJPlcA7Rjjx2Z1gaMm_minimax-h3.mp4`, `…/DGDq3jjokDqU_aW910O9-_minimax-h3.mp4`.
- `eec8a2d3-reserva-h3-texto-quadros.jpg` (cliente, 17/11):
  - linha 1, cidade: em pé;
  - linha 2, o NPC de vermelho (cena 2): DEITADA;
  - linha 3, o grupo: em pé;
  - linha 4, a cena 2 de novo (a 2ª passagem no filme): DEITADA.
  - Clipes: `https://v3b.fal.media/files/b/0ab2e025/Tg2gAK0pMw0vquyBmQJMZ_minimax-h3.mp4`, `https://v3b.fal.media/files/b/0ab2e02e/E1OWBl06tPCAXzfaI-DWO_minimax-h3.mp4`, `…/0ab2e025/gzFGqMm8eTk5jnTBsdkMa_minimax-h3.mp4`, `…/0ab2e025/6CSyynvXLJGY4VAsVLhPP_minimax-h3.mp4`.
- Cópias locais: `C:\Users\josep\AppData\Local\Temp\claude\1aca8f9721d748f8\d4e283a0-3249-4055-bb67-f79cfa2c5fc9\scratchpad\rv9m\h3clips\` (76c4c5c4) e `…\rv9m\h3t2v\` (c4 a c7 = eec8a2d3).
- Não estão no nosso bucket: são da fal e expiram.

## 5. A URL da fal na montagem
`lib/freeRedo/fonteDoFilme.ts:17` grava a fonte assinada do filme (`free_redo_film_source`) com os clipes em `v3b.fal.media`, e as imagens aprovadas da reserva também são da fal. O filme final vai ao bucket (`app/api/cron/finish-stranded-renders/route.ts:1643`), mas a refação grátis, que remonta da fonte, quebra quando a fal apaga os clipes.
- **Proposta, sem construir:** copiar cada clipe e cada imagem ao bucket no momento em que a URL é autorizada no claim (`authorizeCinematicCompletedUrls`), e gravar a fonte já com as cópias.

## 6. O relógio da reserva
- Em 30 dias, **1 de 103** filmes de cliente com Kling 4 passou de 10 min entre o envio e a montagem.
- 4 foram à reserva por tempo, depois de 8 min.
