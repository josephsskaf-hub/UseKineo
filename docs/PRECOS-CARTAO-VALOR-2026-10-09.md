# Cartão de preço que mostra o que o plano compra (KINEO-PRECOS-CARTAO-VALOR-2026-10-09 + KINEO-PRECOS-REFINO-2026-10-09)

## Os pedidos do fundador (09/10/2026, madrugada)

1. **~01h BRT**, com o print da página de preços da InVideo ao lado do nosso cartão:
   > "Mudar para mostrar quantos clipes a gente consegue fazer com cada motor, quantas imagens do Nano Banana… se a
   > decisão está ficando no preço, a gente tem que deixar mais claro o que a gente entrega por aquele valor."
2. **"1 sim"** para ligar a página nova para todo mundo (`PRICING_VALUE_CARDS_PUBLIC = true`).
3. **~02h30 BRT**, com os prints da nossa página: a parte abaixo dos planos "ficou muito poluída"; "o pricing tem que ser
   mais refinado"; "várias fontes diferentes" no cartão; a caixa "See the film…" precisa de outra fonte e de uma
   comunicação "mais amigável". Em seguida, com o print da InVideo (BASIC/PRO/ULTRA): "mais refinado, menos cores, mais
   fácil da pessoa ver… o botão de comprar no meio do plano, abaixo do preço: Get Starter, Get Creator, Get Studio".
   Pediu 3 ou 4 opções de cor "para ter um norte".
4. **Escolha:** "Cor 1 porcelana, precisamos manter os 2 temas" — e confirmou que o escuro tem de seguir o resto do site.

## Como o cartão ficou (modelo InVideo)

De cima para baixo, igual nos 3 planos:
- **Painel do topo:** nome + selo "Most popular" (só Creator) + uma frase; `⚡ 150 credits a month`;
  `= 30 Nano Banana Pro images`; `≈ 25 Kling 3 clips · 5 s`; `≈ 4 narrated films · 60 s, Seedance 1.5`;
  "One credit balance. Mix them any way you like."
- **Preço:** no anual, o mensal riscado ao lado (`$19.90 $13.92`) e "/month, $167.00 billed yearly"; a nota em reais
  continua para quem paga em BRL.
- **Botão logo abaixo do preço:** "Get Starter / Get Creator / Get Studio" (assinante vê o rótulo de troca de plano;
  sem conta e sem compra de convidado, "Sign up & continue").
- **Embaixo do botão:** no anual, "Save $71.80 a year compared to monthly" (= 12 × mensal − anual, das funções do caixa);
  no mensal, "Cancel anytime".
- **"Each month, by engine":** uma tabela com cada motor (Kling 3, Veo 3.1, Seedance 2.5, Kling 2.5, MiniMax H3,
  Seedance 1.5), clipes de 5–6 s e filmes de 60 s; "—" onde o plano não paga um inteiro. Embaixo: "A clip is one AI scene.
  A film is a finished Short with voice, captions and music."
- **"Included":** No watermark · Commercial use · Voice, captions and music on films · o armazenamento do plano · no
  Studio, "2 free HD enhances a month" (`app/api/enhance/route.ts`, plano `pro`, 2 por mês).

**Uma fonte só** (a do site, Manrope) e tamanhos fixos por função. **Uma cor de destaque:** o cobalto do site, só no
plano popular (borda, selo e botão).

## Paleta: porcelana, nos 2 temas

`PRICING_VALUE_PALETTE = 'porcelana'` em `app/pricing/PricingClient.tsx`. A porcelana não tem cor própria: o bloco base do
CSS (`.pv-stage`) lê os tokens de `app/appearance.css` (`--card`, `--card2`, `--text`, `--border`, `--indigo`,
`--on-accent`). Por isso ela troca sozinha com o seletor de aparência do site: claro = cartões brancos, botão tinta e o
Creator em cobalto `#0A5CFF`; escuro = cartões `#10141B`, botão claro e o Creator em `#4D8DFF`.

As outras 3 opções que o fundador viu continuam no CSS para comparação por link, sem mudar a página de ninguém:
`/pricing?tema=cobalto`, `?tema=ambar`, `?tema=tinta` (palco escuro). Trocar a paleta de todos = trocar a constante.

## Abaixo dos planos (limpeza, só com o cartão novo)

- "What one credit buys" saiu: cada cartão já diz o que o crédito compra, motor por motor.
- A linha de uso comercial saiu: virou "Commercial use" no "Included" de cada plano.
- A caixa do convite grátis virou uma linha ("Not ready to choose? Start free…"), e só para quem ainda não tem conta.
- O bloco das agências ("Need a batch for clients…") desceu para depois das tabelas de clipes e filmes.
- "See the film. Choose how many you want to make" virou **"How many films do I get?"** (`components/growth/
  MrrPricingProof.tsx`): três botões (15, 35, 60 seconds) no lugar do `<select>`, as contagens dos 3 planos, "Watch
  Lituya Bay", e uma linha de letra miúda com as mesmas garantias (crédito de volta se o render falhar; dinheiro de volta
  em 7 dias no 1º mês pago).
- No topo, a frase do reembolso do anual deixou de aparecer duas vezes (fica só a colada no seletor).

## De onde vem cada número (nenhum digitado)

`lib/pricingPlanValue.ts` → `planValueFor(créditos, modelo, imagem)`. O cartão chama `planValueForPage(TIER_CREDITS[plano])`
(`components/pricing/PlanValueStage.tsx`), com o modelo que as tabelas do /pricing usam (`twoProductsModelForPage` →
`clipCreditCost` e `creditCostForDuration`, só motores e durações públicos) e o Nano Banana Pro ao custo da rota
`/api/images/generate` (5 cr; espelho `IMG_NANOBANANA_CR` em `lib/marketingPrice.ts`). Contagem = floor(créditos ÷ custo).

O cálculo mora dentro do cartão de propósito: os harnesses de render (`scripts/preview-ux-complete.mjs`) trocam todo
import de @/components por um stub, e uma conta feita no PricingClient com uma função de componente quebrava a página no
teste. O harness agora renderiza o cartão e o modelo de verdade (são o conteúdo principal da página).

## Hidratação

O CSS do cartão e da caixa dos filmes entra por `<style dangerouslySetInnerHTML>` (string fixa). Como filho de `<style>`,
o React escapava o `>` do seletor no servidor, o navegador recebia outro texto e a hidratação da página inteira caía
(medido na prévia local: "Text content does not match server-rendered HTML"; sumiu com a troca).

## Guardiões

- `scripts/test-precos-cartao-valor-2026-10-09.mjs` (17 verificações, 16 mutantes): contagens executadas, imagem = rota,
  render do Creator e do Starter (botão abaixo do preço, mensal riscado, tabela por motor com "—"), página (interruptor,
  porcelana, `?tema=`, `handleBuy`, "Get <plano>", economia, CSS sem escape, PricingClient sem conta), os 2 temas, nada
  digitado, a caixa dos filmes.
- Re-ancorados em 09/10, com mutação provada: `test-app-blue-layout` ("credits a month", "$83.00 billed yearly", "Save
  $35.80"), `test-avatar-fora-2026-09-28` (Studio com os motores vendidos e "2 free HD enhances a month").
- `test-selo-omni-pausado-2026-09-30` ficou vermelho por um comentário com `/*` (o leitor de código do guardião apaga de
  `/*` até o próximo `*/`): a redação do comentário mudou; nada no guardião.

## Medição

O teste de preço (Starter/Creator a $9,90/$19,90) começou em 2026-10-09 03:38 UTC; a página nova entra no ar no mesmo dia.
A medição de 16/10 mede preço + página juntos. Separar pela hora do deploy desta entrega, se for preciso.
