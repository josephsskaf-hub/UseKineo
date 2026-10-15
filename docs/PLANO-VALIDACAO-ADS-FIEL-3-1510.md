# Plano de validação paga: Ads Fiel 3 (KINEO-ADS-FIEL-3-1510, 15/10/2026)

**Nada disto foi rodado.** Os renders pagos dependem do "vai" do fundador. O saldo da fal está curto: ler o saldo antes, dentro do
orçamento da casa de US$ 25 por semana. A trava continua em `ADS_V2_PRODUCT_LOCK_MODE = 'internal'` (lib/ads/v2ShotLists.ts). Só as
contas da casa (`isAdsInternalEmail`) recebem recorte, lugar na superfície e conferência.

Vale para todos desde a publicação:
- frases de tela menores e na zona segura;
- foto do link marcada como produto;
- proibição de objeto novo no movimento das cenas travadas, que só existem com a trava.

## O que a validação de 15/10 mostrou e o que mudou

O resultado completo está em `docs/RESULTADO-VALIDACAO-ADS-FIEL-2-2026-10-16.md` (pedidos 95a23737, f65bae05 e 5748fdf1). Os quadros
estão em `C:\kineo-wt\prints-1610\fiel-T*`.

| # | Defeito visto | Conserto | Onde |
|---|---|---|---|
| 1 | T2 (1:1): o recorte pegou **só o painel dourado** da caixa, porque saiu da foto já cortada no quadrado | A tela sobe também a foto **inteira** do produto (sem o corte do formato, lado maior ≤ 2048), mas só quando o formato cortou alguma coisa. Foto do link: usa a original que a leitura do link já guardou. O /plan confere se ela é do dono (`original_footage_id` → `original_url`). A trava leva `sourceUrl`, e o birefnet recorta dela, com cache pela foto de origem. Sem original: o caminho de antes. | `lib/ads/v2Fiel3.ts`, `AdsV2Simple.tsx` (`ensureOriginal`), `v2Contract.ts`, `v2PlanCore.ts`, `v2ShotLists.ts` (`adsV2ProductLockFor`, `adsV2CutoutSource`), `v2ProductLockServer.ts` (`adsV2CutoutFor`) |
| 2 | Produto **gigante**, no **mesmo lugar** em toda cena (T1: 528×730 em x 276, y 576 nas 3), **tapando o rosto** (2 de 3 no T1, 3 de 4 no T2) e **boiando** no 1:1 | A mesma visão barata (`AI_TEXT_MODELS.vision`, imagem 'low') lê a **superfície vazia** e os **rostos**. O produto tem teto de altura: 28% no 9:16, 32% no 4:5 e 35% no 1:1 (era 38%), e de largura (42%). A base pousa na superfície lida. Ele nunca fica em rosto: muda de lado, procura o vão entre duas pessoas e, se preciso, encolhe para 85% e depois 70%. O lado alterna entre as cenas. Se a visão falha, vale a regra fixa: base no terço de baixo, num dos lados, nunca no meio. O lugar vai num JSON ao lado do quadro (`…-lock.json`) e no evento `ads_v2_product_locked` (`placement`, `faces`, `from_original`). | `v2ShotLists.ts` (`adsV2LockPlacement`, `adsV2FaceGap`, `adsV2ParseSceneLayout`), `v2LockVision.ts` (`adsV2SceneLayout`), `v2Png.ts` (`opts.place`), `v2ProductLockServer.ts`, `v2Advance.ts` (`finishLockedImage`) |
| 3 | T2: o H3 que animou a cena travada **inventou 2 caixas brancas** nas mãos das pessoas | O movimento de todo quadro travado termina com `ADS_V2_LOCK_NO_NEW_OBJECT`: ninguém pega, segura, entrega ou mostra caixa, garrafa ou produto; mão vazia continua vazia; nada entra no quadro. Na cena, a gente faz só movimentos pequenos (respirar, piscar, sorriso). O texto é o mesmo para o Kling O3, para a reserva H3 e para o Seedance. | `v2ShotLists.ts` (`adsV2ProductLockMotion`, `ADS_V2_PRODUCT_LOCK_MOTIONS`) |
| 4 | T3 (link do café): as 3 fotos entraram como **"lugar"** (o título "Café…" cai em restaurante), e a trava **nem ligou** | O leitor de link já separava as fotos que a página **declara** do produto (JSON-LD Product.image, og de produto, JSON do Shopify/VTEX). Agora ele marca essas fotos, a rota devolve `product: true` e a tela marca a 1ª delas como "product" quando "Um produto" está escolhido. A regra de antes vem primeiro e continua intacta. | `v2Link.ts`, `app/api/ads/v2/link-import/route.ts`, `v2Fiel3.ts` (`adsV2SimplePhotoKindFor`), `AdsV2Simple.tsx` |
| 5 | Fundador, olhando o T1: "as legendas estão posicionadas erradas, estão muito grandes" | A fonte tem 48 px por 1080 de largura (era 64 fixo; com 720 de largura cai para 32). A frase usa no máximo 2 linhas: 2 linhas ocupam 5,5% da altura no 9:16, dentro da régua de mercado de 5–6%. A largura é 80% (era 84%). A frase continua centralizada (`x_alignment` 50%). Ela fica presa pela base (`y_anchor` 100%, a âncora que as legendas do compose já usam em produção) na zona segura: no 9:16, fora dos 15% de cima e dos 20% de baixo; no 4:5, de 11% a 86%; no 1:1, de 9% a 89%. No anúncio de produto e no do ator ela vai à faixa de baixo e, se ali cobrir o produto real ou um rosto (o JSON do item 2), sobe para a faixa de cima. O anúncio de lugar continua no centro (45%). O cartão final não mudou. | `lib/ads/adV2Montage.ts` (`adsV2OverlayGeometry`, `adsV2OverlayPlace`, `ADS_V2_OVERLAY_SAFE`), `v2Advance.ts` (`lockAvoidBoxes`) |

**Conferir um quadro do vídeo pronto (item 3) não é possível no servidor.** Não há extrator de quadro: nada de ffmpeg, sharp, canvas ou
jimp no `package.json`, e nenhuma rota extrai quadro de MP4. A fal tem um endpoint de ffmpeg, mas ele nunca foi exercitado aqui, e a regra
da casa é não usar propriedade ou fornecedor novo sem render de validação. Por isso só o pedido de movimento foi reforçado. A conferência
`v2LockVision` continua só sobre a imagem parada, antes do vídeo. Se o T2 ainda mostrar objeto inventado, a próxima saída é animar as cenas
travadas só com câmera ou deixá-las paradas, sem fornecedor novo.

## Renders de validação: só T1 e T2, na conta da casa

A conta da casa tem marca d'água forçada, o que serve para validar. Antes de cada render: dry-run de US$ 0 (regra da casa) e leitura do
saldo da fal.

| # | Pedido | Créditos | fal (estimado) | O que olhar |
|---|---|---|---|---|
| 1 | **Refazer o T1**: a mesma foto Atheeri (frasco + caixa, `prints-1610\atheeri-produto.jpg`), Auto, **Comercial 15 s 9:16**, PT, cena "num hotel com chuva" | 41 | ~US$ 2,40 (+ ~US$ 0,0006 por cena: conferência + leitura) | produto ≤ ~28% da altura, pousado na mesa/prateleira com sombra, **sem tapar nenhum rosto**, lado diferente entre as cenas; nenhum produto desenhado pela IA; frases menores (48 px), no máximo 2 linhas, fora dos 15% de cima e dos 20% de baixo, sem cobrir o produto nem rosto |
| 2 | **Refazer o T2**: a mesma foto, Auto, **Premium 15 s 1:1** | 51 | ~US$ 4,10 | o recorte é o **frasco + a caixa inteira** (não só o painel dourado); o produto **pousa** na superfície, sem boiar, ≤ ~35% da altura, sem tapar rosto; **nenhuma caixa inventada** no vídeo (nem no H3 de reserva); os 2 closes continuam a foto real; frases na zona segura do quadrado |

**Total: 92 créditos da casa, ~US$ 6,50 de fal.** O T3 (link) não é refeito agora. O item 4 é provado no guardião e aparece no
próximo anúncio por link (evento `ads_v2_product_locked` com a foto do link).

### Dry-run antes (US$ 0)
Para cada um dos dois: o `/plan` e o dry-run do `/start`, como na validação anterior, com os mesmos créditos (41 e 51). Também é preciso
conferir no corpo do `/plan` (aba Rede do navegador) que, no 1:1, a foto do produto vai com `original_footage_id`. No 9:16 a foto já é a
inteira, então a chave não vai.

### Como conferir (SQL só de leitura, projeto `cqqukkvjjrguayiyjvhh`)
```sql
-- onde o produto pousou em cada cena, de que foto saiu o recorte e quantos rostos a visão leu
select metadata->>'order_id' id, metadata->>'idx' idx, metadata->'rect' rect, metadata->'placement' lugar, metadata->>'faces' rostos, metadata->>'from_original' original
from events where name = 'ads_v2_product_locked' and created_at > '<marco>'::timestamptz order by created_at;
-- refações e trocas de motor (o H3 de reserva é o que inventou caixa no T2)
select name, metadata->>'order_id' id, metadata->>'idx' idx, metadata->>'to' para, metadata->>'reason' motivo
from events where name in ('ads_v2_shot_fallback', 'ads_v2_shot_retried') and created_at > '<marco>'::timestamptz order by created_at;
-- duração medida
select metadata->>'order_id' id, metadata->>'measured_seconds' segundos from events where name = 'ads_v2_delivered' and created_at > '<marco>'::timestamptz;
```

### Critérios de aprovação (os dois renders)
- **Recorte**: no 1:1, o produto colado é o frasco **e** a caixa inteiros (comparar com a foto). `from_original = true` no 1:1.
- **Tamanho**: `rect.h / altura` ≤ 0,28 no 9:16 e ≤ 0,35 no 1:1.
- **Rosto**: nenhuma cena com o produto na frente de um rosto (`placement.faceOverlap = 0`; conferir nos quadros).
- **Superfície**: `placement.source = 'surface'` na maioria das cenas e a base do produto em cima da mesa, do balcão ou da prateleira, com
  sombra. Se aparecer `'fallback'` em todas, a leitura da visão está falhando: olhar o log, porque a regra fixa ainda deve ficar fora do rosto.
- **Variação**: o lado do produto muda entre cenas seguidas, quando a cena deixa.
- **Vídeo**: nenhuma caixa, garrafa ou produto novo nas mãos das pessoas. Se o H3 de reserva entrar, olhar a cena dele com atenção.
- **Frases**: no máximo 2 linhas e visivelmente menores que no T1 de 15/10. No 9:16, nada acima de 15% nem abaixo de 80% da altura. Elas
  não cobrem o produto nem rosto: sobem para o alto quando embaixo cobririam.
- **Duração e cartão**: como na Fiel 2 (MP4 ≤ 15,5 s, cartão ≤ 3 s).

## Virada para `'all'`
Só com os dois aprovados e o "vai" do fundador: `ADS_V2_PRODUCT_LOCK_MODE = 'all'` (uma linha, lib/ads/v2ShotLists.ts). Depois rodar
`node scripts/test-ads-fiel-1510.mjs`, `node scripts/test-ads-fiel-2-1510.mjs` e `node scripts/test-ads-fiel-3-1510.mjs`. O fiel-3 confere
que a trava ainda está em `'internal'` (V4) e precisa ser ajustado junto com a virada.
