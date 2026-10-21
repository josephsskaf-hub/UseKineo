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

### Rodada 1a (deploy ea4559a46) — 3 renders, 123 cr

| Produto | Formato | Nota | Problema | Vídeo |
|---|---|---|---|---|
| Smartwatch (packshot) | Product Ads | 6 | Gancho e cartão com faixas PRETAS (o fundo "canto ampliado 4×" não renderiza no Creatomate); fala com "intuitive features", "modern look", "upgrade your tech", "take a closer look". Benefício "7-day battery" e "free shipping" ditos; selo "Free shipping this week" + "Shop now" no cartão; 15,4 s | [194e9b50](https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/renders/e92d81bf-0068-46c3-8de7-1f67e2006756/adsv2-194e9b50-8970-4df7-9686-cb1f898a49da-27b6b372-4a0f-4e14-9d97-cf708a4c4982.mp4) |
| Perfume (packshot) | Product Ads | 6 | Mesmas faixas pretas; "delightful fragrance experience", "Treat yourself"; título só "LUME". Com "20% off this week" o plano falhou 2× ("ends soon / last chance" inventado + régua 29–30 palavras) — passou com "20% off" | [0aef9199](https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/renders/e92d81bf-0068-46c3-8de7-1f67e2006756/adsv2-0aef9199-8e1d-4dd7-850f-dbcf961cc015-776b60dc-6f30-4c43-9f11-83e87af7db66.mp4) |
| Pote GLOW (packshot) + Sofia | UGC | 3 | O Kling Avatar estourou o prazo (`presenter_failed:presenter_deadline`, 11,3 min) e o pedido caiu no anúncio de produto SEM apresentadora, com o cartão antigo — o cliente pagou UGC e recebeu outra coisa. As 4 fotos da apresentadora ficaram ÓTIMAS (peito, 1 mão, nada no rosto, escala real) | [9de2a502](https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/renders/e92d81bf-0068-46c3-8de7-1f67e2006756/adsv2-9de2a502-a2b6-42d3-83c0-5ae7b03236c2-57af4e89-afc8-47eb-b088-d46a153f870c.mp4) |

Tela conferida no navegador: aviso de foto de estilo de vida OK (o relógio no pulso parou antes de cobrar; "Trocar foto" tirou a foto); entrada nova por card OK ("Your ad is still being made — view it"); aviso de pessoas de IA AINDA aparecia no Product Ads reaberto pelo link (consertado no c66a27d31).

Consertos enfileirados em **c66a27d31**: fundo = a própria foto em cover (sem truque); roteiro sem urgência inventada e sem qualidade não digitada (lista de genéricos maior; o que a pessoa digitou não conta como genérico); título do cartão com até 3 palavras do que vende; fontes do cartão maiores; aviso de IA lê os planos do pedido.
