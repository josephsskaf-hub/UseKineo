# Plano de validação: "pessoa segurando o produto real" no Comercial (KINEO-ADS-PRODUTO-NA-MAO-1610)

**O que foi construído:** no nível Comercial de 15 s do Studio Ads, para **contas internas**, a colagem foi trocada pelo método do teste de 16/10.

- **Foto da cena:** o Nano Banana Pro edit recebe a foto REAL do produto (a original, sem o corte do formato) e põe o produto **na mão** de uma pessoa, na cena pedida.
- **Juiz do rótulo:** um modelo de visão compara o produto da foto gerada com a foto real (nome/logo, cores, forma, mãos, um produto só).
- **Vídeo:** o Kling O3 anima por 3 s com o rosto, os olhos, a respiração e os dedos vivos. A **mesma foto entra como quadro final** (`end_image_url`), para segurar a embalagem. O anúncio usa só o começo do clipe (0,15 → 2,65 s).

Quem não é interno continua na colagem, e ela também é o fallback.

Fica fora da TRAVA 8.2 (é o Ads, não o filme). Trava do produto e interruptor novo: `ADS_V2_PRODUCT_LOCK_MODE = 'internal'` e
`ADS_V2_IN_HAND_MODE = 'internal'`. Nada publicado, nada enfileirado, nenhum render pago rodado.

## A estrutura nova (15 s, 1 foto)

| Tempo | Plano | Fonte |
|---|---|---|
| 0,0–2,0 | GANCHO: a pessoa traz o produto para o quadro, já na cena | Nano Banana (foto real como referência) + Kling O3 |
| 2,0–4,5 | USO 1: o produto na palma, rótulo de frente (o prompt aprovado em 16/10) | Nano Banana + Kling O3 |
| 4,5–7,0 | USO 2: uma mão segura, a outra toca como quem abre ou aplica | Nano Banana + Kling O3 |
| 7,0–9,5 | CLOSE: a mão com o produto perto da câmera, dentro da cena | Nano Banana + Kling O3 |
| 9,5–12,5 | PACKSHOT REAL: a foto verdadeira, parada, com zoom lento (rótulo 100% fiel) | sem IA |
| 12,5–15 | CARTÃO | montagem |

- **Packshot + cartão:** 5,5 s. Era ~8,5 s.
- **Mantidos:** duração, frases de tela, narração, preço (41 cr) e os 3 formatos.
- **Quando o juiz reprova:** refaz 1 vez. Se reprovar de novo, faz um enquadramento sem o rótulo de frente. Se reprovar mais uma vez, usa a foto real do produto. Cada veredito gera o evento `ads_v2_in_hand_judged`.

## Custo

| Item | US$ |
|---|---|
| 4 clipes Kling O3 × 3 s × 0,112 | 1,344 |
| 4 fotos Nano Banana Pro (2K) × 0,15 | 0,600 |
| Fixos (Lyria, voz, Creatomate, GPT) | 0,250 |
| Juiz: 5 conferências × ~0,01 | 0,050 |
| Reserva de 1 refação de foto | 0,150 |
| **Total estimado (é o que o dry-run mostra)** | **2,394** |

O plano de antes custava US$ 2,38. Os créditos não mudam (41).

## O teste (T1): UM anúncio, conta da casa, depois do "vai" do fundador

**Pedido:** Atheeri (a mesma foto `atheeri-produto.jpg` do teste de 16/10), frase **"perfume Atheeri num hotel com chuva"**, nível **Comercial**, **15 s**, **9:16**, **PT**, narração ligada, sem estilo, sem ator. Conta `josephsskaf@gmail.com`, que é interna e sempre leva marca d'água.

1. **Antes de tudo, conferir o saldo da fal.** O teste custa ≈ US$ 2,40 (no pior caso, com 3 fotos no mesmo plano, ≈ US$ 2,85).
2. **Publicar** esta entrega só depois do ok do fundador. Este documento não publica nada.
3. **/plan:** a resposta precisa trazer `in_hand` com os 5 planos (hook, hold, use, close, packshot) e `usd_estimate.totalUsd` = 2,394.
4. **Dry-run (US$ 0)** com `POST /api/ads/v2/start` e `{ order_id, dry_run: true }`. Conferir:
   - `charged: false` e `credits: 41`;
   - `usd_estimate.inHand: true`, `judgeUsd: 0.05`, `retryReserveUsd: 0.15`, `totalUsd: 2.394`;
   - `in_hand` com os 5 planos, e o `shots[0]` do tipo `people` / `generated_scene` (nunca o packshot);
   - os `scene_prompt` trazem "keep the packaging design, colors, logo and printed text exactly as in the reference" e a cena "num hotel com chuva";
   - os `prompt` (movimento) trazem breathes / blink / eyes / fingers e "does not rotate, flip, tilt, slide or grow".
5. **Só com o dry-run certo:** o mesmo pedido sem `dry_run`.
6. **Recolher para a análise:**
   - o MP4;
   - as fotos das 4 cenas (as cópias no bucket renders, que `persistSceneImage` grava);
   - os eventos `ads_v2_in_hand_judged` e `ads_v2_shot_fallback` do pedido;
   - os `input` enviados ao Kling (o `end_image_url` tem de ser igual ao `image_url`).

## Critério de aprovação

### 1. A nota do olho do fundador (o que manda)

O fundador dá uma nota de 0 a 10 em cada item. **Passa só com todos ≥ 8** (mira: 9).

| Item | O que olhar |
|---|---|
| Parece filmado | Não parece colagem. A luz da caixa vem da cena, os dedos passam por cima da caixa, há sombra de contato. |
| Escala e luz | A caixa tem o tamanho de uma caixa de perfume numa mão adulta. A luz e a cor da cena (hotel com chuva) caem nela. |
| Pessoa viva (rosto e mãos) | Respira, pisca, os olhos mudam de ponto, o sorriso se forma, os dedos ajustam a pegada. Não é foto parada com zoom. Era o que faltou no 8/10 de 16/10. |
| Rótulo parecido e legível | أثيري / ATHEERI, a abelha e o favo dourado parecidos com a foto nos planos de gente. Texto pequeno ("Lattafa") pode borrar, mas nunca virar outra palavra. Exato no packshot e no cartão. |
| Daria para postar | Sem 6º dedo, sem segundo produto, sem caixa girando ou crescendo no trecho usado, sem cara de IA plástica. |

### 2. Critérios técnicos (todos obrigatórios)

- Duração final de 15 s (até +0,5 s), 9:16. Packshot + cartão ≤ 6 s. O 1º quadro tem gente (não o fundo branco).
- 4 planos de gente vieram do caminho novo:
  - nenhum evento `ads_v2_product_locked` (a colagem não rodou);
  - os 4 `ads_v2_in_hand_judged` existem;
  - ≤ 1 plano caiu na foto real.
- Os 4 envios ao Kling O3 têm `end_image_url === image_url`, `duration: "3"` e `generate_audio: false`.
- Débito de 41 cr e nenhum estorno. Custo real na fal ≤ US$ 3 (comparar o saldo antes e depois).
- Tempo total ≤ ~8 min (o prazo de foto parada do v2 continua valendo).

### Se reprovar

- **Rótulo:** a próxima rodada testa o Bria Product Holding (US$ 0,04, que promete o rótulo "as given") no lugar do Nano Banana, ou o ref2v do Kling O3 com o produto como element (estudo, alternativa B).
- **Movimento** (caixa gira ou cresce mesmo com o quadro final): reduzir o `push-in` para "static camera" e o trecho para 2,0 s.

Nunca religar para clientes antes de um T1 aprovado pelo olho.
