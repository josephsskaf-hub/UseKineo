# Plano de validação paga: Ads Fiel 4 (KINEO-ADS-FIEL-4-1510, 15/10/2026)

**Nada disto foi rodado.** O render pago depende do "vai" do fundador. O saldo da fal está curto (US$ 19,81 depois do reteste de 15/10):
ler o saldo antes, dentro do orçamento da casa de US$ 25 por semana, e lembrar que os clientes vêm primeiro. A trava continua em
`ADS_V2_PRODUCT_LOCK_MODE = 'internal'` (lib/ads/v2ShotLists.ts). Só as contas da casa (`isAdsInternalEmail`) passam pelo canto reservado.

## O que o reteste de 15/10 mostrou e o que mudou

Resultado completo: `docs/RESULTADO-VALIDACAO-ADS-FIEL-3-2026-10-15.md` (pedidos ec695e63 e 3f77289f; quadros em
`C:\kineo-wt\prints-1610\fiel3-*`). O recorte, o teto de altura, as frases e o vídeo sem objeto inventado ficaram bons. **O lugar do produto
falhou:** ele boiou em 7/7 cenas, cobriu o rosto do homem no T1 cena 4 e ficou sempre à esquerda no T2. A causa é que a visão 'low' devolvia
caixas de palpite (rostos "redondos" 0,40–0,60 repetidos em toda cena), e a posição dependia dessa leitura.

**Decisão da CEO:** a posição passa a ser **decidida em código**, antes de a imagem existir. A visão vira só conferência.

| # | Defeito visto | Conserto | Onde |
|---|---|---|---|
| A | O produto boiava (ao lado da cabeça, acima do balcão), embora o evento dissesse `surface` | Cada cena reserva um **canto de baixo**. O pedido da imagem manda deixar ali o tampo de uma superfície vazia (mesa, balcão ou pedestal), entre ~73% e ~93% da altura no 9:16, e põe as pessoas **na metade oposta, com o rosto na metade de cima**. O recorte real é colado exatamente nesse canto: a base fica em 85% da altura no 9:16, 88% no 4:5 e 90% no 1:1, e o produto encosta na margem do lado, sem passar da metade do quadro: 6% na esquerda; na direita, 16% no 9:16 (o produto termina em x ≈ 0,84, fora da coluna de botões do TikTok/Reels) e 6% no 4:5 e no 1:1. O pedido da cena e a pergunta da conferência usam o mesmo recuo (no 9:16 direito, o canto vai de 50% a 84% da largura). O teto de altura (28%/32%/35%) e o de largura (42%) continuam. | `lib/ads/v2ShotLists.ts` (`ADS_V2_LOCK_RESERVE_BASE`, `ADS_V2_LOCK_RESERVE_EDGE_RIGHT`, `adsV2LockReservedRect`, `adsV2LockReserveZone`, `adsV2LockedScenePromptAt`, `adsV2LockCornerAction`), `lib/ads/v2Png.ts` (`adsV2ReservedLayout`, `adsV2ReservedFramePng`), `lib/ads/v2Advance.ts` (o pedido da cena usa o mesmo lado da colagem) |
| B | T1 cena 4: a caixa cobriu o rosto; a visão disse que o rosto estava em 0,40–0,60, e ele estava em 0,24–0,40 | A conferência usa a imagem em **'high'** e só responde se o canto está ocupado. Resposta **suspeita** vira "não sei" e o canto fica: caixa "redonda" (as 4 coordenadas na grade de 0,05, como todos os palpites do reteste), caixa idêntica à de outra cena do pedido (lida do `seen` no JSON ao lado de cada quadro), ou nenhum rosto quando a cena pediu gente. Conferência **confiável** dizendo que há rosto ou pessoa no canto, **ou que não há tampo vazio no canto** (`corner_surface: false`, o produto seria colado sobre parede ou painel): a imagem da cena é refeita 1 vez (`scene_retry`, motivo `lock_dup_retry:corner`). Se acontecer de novo, a vaga usa a foto real do produto em movimento (`product_photo`, motivo `lock_corner_busy`). A refação é **uma só por plano**: a da Fiel 2 (produto desenhado) e a do canto contam juntas. As frases de tela só desviam de rostos confiáveis; o palpite nunca vai ao JSON das frases. | `lib/ads/v2LockVision.ts` (`adsV2SceneCheck`, `adsV2LockCheckBody`), `lib/ads/v2ShotLists.ts` (`adsV2LockCheckTrust`, `adsV2LockBoxRound`, `adsV2LockCornerBusy`, `adsV2LockCornerProblem`, `adsV2LockCornerStep`, `ADS_V2_LOCK_CORNER_REASON`), `lib/ads/v2ProductLockServer.ts` (`adsV2FinishReservedScene`), `lib/ads/v2Advance.ts` (`finishReservedScene`, `lockSeenOfSiblings`) |
| C | T2: o lado ficou sempre à esquerda (`gap` 4/4) | O lado segue a **ordem da cena** entre as cenas travadas do plano: 1ª direita, 2ª esquerda, 3ª direita, 4ª esquerda. Não existe mais o "vão". | `adsV2LockSideFor`, `adsV2LockSceneOrdinal`; `lockSideOf` em `v2Advance.ts` (a MESMA conta no pedido da imagem e na colagem) |
| D | Sombra | A sombra de contato (`adsV2ShadeAndMatch`, modo `scene`) nasce na base do retângulo do canto: escurece a mesa rente à base e some longe dela. | `lib/ads/v2Png.ts` (`adsV2ReservedFramePng`) |

O que **não** mudou: cobrança, preço, acesso, recorte, closes (`real_closeup`), frases (só deixam de desviar de palpite), duração e
movimento. O caminho antigo (lugar lido pela visão) só volta se o servidor carregado não tiver `adsV2FinishReservedScene`.

Guardião: `node scripts/test-ads-fiel-4-1510.mjs` (provas com os números reais do reteste + mutantes). Os guardiões antigos da trava
(fiel-1510, fiel-2, fiel-3, lista, refação do ator, demo Universo) leem os arquivos sem este conserto, pelo desfaz encadeado
`scripts/test-support/desfaz-ads-fiel-4-1510.mjs` (byte a byte).

## Render de validação: Só o T1, na conta da casa

O T1 é o pior caso: teve o rosto coberto e mostra a troca de lado em 3 cenas. O T2 só é refeito se o T1 passar e o fundador pedir.

| # | Pedido | Créditos | fal (estimado) | O que olhar |
|---|---|---|---|---|
| 1 | **Refazer o T1**: a mesma foto Atheeri (`prints-1610\atheeri-produto.jpg`), "Perfume Atheeri", "num hotel com chuva", Auto, **Comercial 15 s 9:16**, PT, Um produto | **41 cr** | **~US$ 2,40** + ~US$ 0,02 de conferência ('high', 3 cenas). Se o canto vier ocupado e a cena for refeita: ~US$ 0,15 a mais por cena refeita | o produto **pousado no tampo, no canto de baixo** (direita, esquerda, direita); nenhuma pessoa no canto; nenhum rosto coberto; sombra encostada na base; no lado direito, o produto termina em ~84% da largura (907 px de 1080) |

### Dry-run antes (US$ 0)
O `/plan` e o dry-run do `/start` de sempre, com os mesmos parâmetros. Tem de dar **41 cr** e `charged:false`. Ler o saldo da fal antes e
depois.

### Como conferir (SQL só de leitura, projeto `cqqukkvjjrguayiyjvhh`)
```sql
-- onde pousou (tem de ser 'reserved', lados alternando) e o que a conferência disse
select metadata->>'idx' idx, metadata->'rect' rect, metadata->'placement' lugar, metadata->'check' conferencia, metadata->>'faces' rostos_confiaveis
from events where name = 'ads_v2_product_locked' and created_at > '<marco>'::timestamptz order by created_at;
-- refações por canto ocupado e quedas para a foto real
select name, metadata->>'idx' idx, metadata->>'to' para, metadata->>'reason' motivo, metadata->>'side' lado, metadata->'check' conferencia
from events where name in ('ads_v2_shot_fallback', 'ads_v2_shot_retried') and created_at > '<marco>'::timestamptz order by created_at;
-- duração medida
select metadata->>'order_id' id, metadata->>'measured_seconds' segundos from events where name = 'ads_v2_delivered' and created_at > '<marco>'::timestamptz;
```
Baixar também as imagens travadas (`…-p<k>-a<n>-lock.png`) e os JSON ao lado (`…-lock.json`, com `faces` confiáveis e `seen` crus).

### Critérios de aprovação
- **Lugar:** `placement.source = 'reserved'` em toda cena de gente. Na imagem travada, a base do produto fica no tampo da mesa ou do balcão, no
  canto de baixo, sem boiar. O retângulo tem base em ~85% da altura (1632 px de 1920).
- **Lado:** direita, esquerda, direita (cenas 2, 3, 4).
- **Rosto:** nenhum rosto coberto em nenhum quadro, nem na imagem travada nem no vídeo.
- **Gente ou falta de tampo no canto:** se a conferência confiável achar alguém no canto, ou disser `corner_surface: false`, tem de aparecer `scene_retry` com `lock_dup_retry:corner`. Se achar
  de novo, `product_photo` com `lock_corner_busy`. Uma cena que vira foto real é aceitável; três não são (o pedido da imagem não está sendo
  obedecido).
- **Conferência:** `check.why` mostra quantas respostas foram rejeitadas (`round_boxes`, `repeated_boxes`, `no_face`). Se forem todas, a 'high'
  também chuta; o canto continua garantindo a posição, mas registrar isso.
- **Sem regressão:** recorte da foto inteira, teto de altura, frases ≤ 2 linhas na zona segura, nenhum objeto inventado no vídeo, MP4 ≤ 15,5 s,
  cartão ≤ 3 s.

### Riscos conhecidos (olhar no T1)
- O Nano Banana pode não obedecer ao canto vazio. A conferência confiável recusa pessoa no canto e falta de tampo (`problem` = `person` ou
  `no_surface` no evento `ads_v2_shot_fallback`); a conferência suspeita não recusa nada. Se o produto ainda aparecer sobre parede ou painel,
  a conferência estava rejeitada (`check.why`) — registrar.
- No 9:16, o canto direito agora termina em x ≈ 0,84 (fora da coluna de botões do TikTok/Reels). Conferir no celular que nada do produto fica
  sob curtir/comentar.
- Quando o produto ocupa a faixa de baixo, a frase de tela sobe para a faixa de cima. Como agora só rostos confiáveis entram no JSON, conferir
  se a frase de cima não cai sobre um rosto.

## Virada para `'all'`
Só com o T1 aprovado e o "vai" do fundador: `ADS_V2_PRODUCT_LOCK_MODE = 'all'` (uma linha, lib/ads/v2ShotLists.ts). Depois rodar
`node scripts/test-ads-fiel-1510.mjs`, `node scripts/test-ads-fiel-2-1510.mjs`, `node scripts/test-ads-fiel-3-1510.mjs` e
`node scripts/test-ads-fiel-4-1510.mjs`. O fiel-3 e o fiel-4 conferem que a trava ainda está em `'internal'` e precisam ser ajustados junto com
a virada.
