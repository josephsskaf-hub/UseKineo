# Cartão de preço que mostra o que o plano compra (KINEO-PRECOS-CARTAO-VALOR-2026-10-09)

**Pedido do fundador, 09/10/2026, ~01h BRT,** com o print da página de preços da InVideo ao lado do nosso cartão:

> "Mudar para mostrar quantos clipes a gente consegue fazer com cada motor, quantas imagens do Nano Banana a gente
> consegue fazer. Se a decisão está ficando no preço, a gente tem que deixar mais claro o que a gente entrega por
> aquele valor. Já fazer uma mudança de cores, UI e UX e ser mais completo na nossa seção de preços."

E antes: "depois eu já queria ver com você para mudar". Por isso o cartão nasce DESLIGADO e com prévia por link.

## O que muda (só com o interruptor ligado)

- **Palco escuro:** os 3 planos ficam num palco escuro, com uma cor por plano. Starter é prata. Creator é âmbar, com o selo
  "Most popular", que já era dele. Studio é verde-água. É a leitura da InVideo: cartão escuro, créditos no topo, o que os
  créditos compram logo abaixo, preço grande e botão colorido.
- **Topo de cada cartão:**
  - `⚡ 150 credits / month`;
  - `= 30 Nano Banana Pro images`;
  - `≈ 25 Kling 3 clips · 5 s`, `≈ 25 Veo 3.1 clips · 6 s`, `≈ 18 Seedance 2.5 clips · 5 s`;
  - `≈ 4 finished 60 s films · Seedance 1.5, narrated`.
  - Os números são os do Creator a US$ 19,90 / 150 cr.
- **Tabela completa abaixo dos cartões,** "What each plan makes in a month": imagens, clipes de cada motor e filmes de
  60 s de cada motor, com "—" onde o plano não paga um item inteiro.
- **Ordem da página:** a caixa "See the film. Choose how many you want to make" desce para baixo do palco. Os planos vêm
  logo depois do seletor mensal/anual.
- **O que NÃO muda:**
  - preço, créditos e o checkout: o botão chama o mesmo `handleBuy`;
  - o anual: "≈ $13.92/mo, billed $167.00 yearly · save 30%";
  - a nota em reais;
  - o link de UPI;
  - o armazenamento e o "Cancel anytime".

## De onde vem cada número (nenhum digitado)

`lib/pricingPlanValue.ts` faz `planValueFor(créditos, modelo, imagem)` sobre o modelo que o /pricing já usa
(`twoProductsModelForPage` → `clipCreditCost` e `creditCostForDuration`, só para os motores e durações que o público vê).
- **Clipe:** alvo de 5 s, mas com a duração real do motor (o Veo entrega 6 s).
- **Filme:** 60 s.
- **Imagem:** o custo do Nano Banana Pro na rota `/api/images/generate` (5 cr). O espelho fica em `lib/marketingPrice.ts`,
  `IMG_NANOBANANA_CR`.
- **Contagem:** floor(créditos ÷ custo), com o "≈" na tela porque o pool é um só.

## Como ver, ligar e desligar

- **Prévia (só quem abrir o link):** `https://www.usekineo.com/pricing?preview=valor`.
- **Ligar para todos:** `PRICING_VALUE_CARDS_PUBLIC = true` em `app/pricing/PricingClient.tsx`, depois publicar.
  - No dia de ligar, alguns guardiões que renderizam a página padrão podem pedir re-âncora: os que procuram o bloco
    antigo, como "1 film of 60s OR 12 clips", `ConversionPlanCapacity` e "What can I create with these credits?".
  - Rodar a suíte inteira antes e re-ancorar com o motivo.
- **Desligar:** voltar para `false`.

Guardião: `scripts/test-precos-cartao-valor-2026-10-09.mjs`. Ele cobre:
- as contagens executadas com o modelo real;
- a imagem igual à rota;
- o render do cartão e da tabela;
- o interruptor desligado;
- o botão no mesmo `handleBuy`;
- nenhum número digitado no componente;
- 7 mutantes.
