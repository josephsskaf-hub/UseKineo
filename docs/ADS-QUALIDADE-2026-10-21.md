# Studio Ads — qualidade de anúncio para qualquer produto (KINEO-ADS-QUALIDADE-2110), 21/10/2026

Pedido do fundador (21/10, opção "A": um agente local, render real, olho em cada quadro). Teste real de hoje: UGC (Sofia + pote de creme,
pedido 44a14cfc) nota **7** — "a pessoa encostando… não tem muita movimentação… o cartão final muito feio"; Product Ads (relógio, pedido d0816e88)
nota **4** — foto de pulso (só o braço na tela), "7-day battery" sumiu, frases genéricas, cartão = retângulo pequeno no fundo marrom.

Verdade: o código de geração não mudou hoje; UGC e Product Ads só tinham sido validados com FRASCO DE PERFUME.

## O que mudou (código)

| Onde | O quê |
|---|---|
| `lib/ads/v2PresenterV2.ts` | Foto do apresentador: produto **na altura do peito**, virado para a câmera, mão segurando, espaço entre produto e rosto, a outra mão fora do quadro (era "perto do rosto" + "mão aberta no peito"); escala real por tipo (pote, frasco, caixa, tênis, bolsa, aparelho). A MESMA chamada de visão das mãos agora lê a pose (`touching_face`, altura, segurado, escala) e a escolha recusa encostando no rosto / flutuando / mãos demais. Atuação viva (acenos, sobrancelhas, ombros, produto vai em direção à lente no nome), olhos abertos primeiro. |
| `lib/ads/v2AdsQualidade.ts` (novo) | Punch-in de UGC no meio da fala (mesmo clipe, 2 pedaços, só a animação `scale` que a casa já usa); gancho de 0,7 s com o produto inteiro (esconde o piscar longo do 1º segundo do motor); produto inteiro sobre o próprio fundo (canto da foto ampliado, sem propriedade nova); **cartão final v3** montado no Creatomate: produto inteiro grande, painel escuro, nome em branco, **selo amarelo com a oferta digitada**, **botão branco** com a chamada na língua; regras do roteiro (todo benefício digitado na fala, sem frase genérica, sem travessão). |
| `lib/ads/adV2Montage.ts`, `lib/ads/v2CloseReal.ts` | Ganchos opcionais (`quality`): sem eles a montagem é idêntica à de antes (provado no guardião). |
| `lib/ads/v2Advance.ts` | Liga a camada: UGC (punch-in, gancho, close, cartão v3) e Product Ads (gancho com a foto inteira, cartão v3; o Kit BF segue com o cartão dele). |
| `lib/ads/v2Brief.ts` | Product Ads: pede cada benefício/oferta digitado; recusa 1× "stunning design", "elevate your style", "X, for you", benefício faltando, travessão (o afrouxamento de sempre garante que nunca vira 502). |
| Tela (`AdsV2Simple.tsx`, `AdsV2Client.tsx`, `v2PlanCore.ts`, `v2LifestylePhoto.ts`, `v2BolaFix.ts`) | Aviso "pessoas realistas de IA" só quando há pessoa; cada entrada da home abre pedido novo (o que está renderizando fica num link); foto pequena = lado menor < 500 px; **foto de estilo de vida** (mão/pulso/pessoa dominando) → aviso "use uma foto do produto sozinho" com "Trocar foto" / "Continuar mesmo assim" (1 visão gpt-4o-mini, ~US$ 0,0004). |

## Conjunto de teste (6 packshots, Nano Banana Pro na conta do fundador, 30 cr)

Frasco de perfume "LUME", pote "GLOW", caixa de chá "Calm Leaf", smartwatch sozinho, tênis, bolsa de couro — fundo cinza claro, sem marca real.

## Rodada 1 — renders em produção

(a preencher depois da publicação)
