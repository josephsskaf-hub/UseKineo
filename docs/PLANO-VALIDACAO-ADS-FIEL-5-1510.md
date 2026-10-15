# Plano de validação paga: Ads Fiel 5 (KINEO-ADS-FIEL-5-1510, 15/10/2026)

**Nada disto foi rodado.** O render pago depende do "vai" do fundador. O saldo da fal estava em US$ 17,51 depois do reteste da Fiel 4
(menos de 1 dia de uso): recarregar antes, ler o saldo antes e depois, dentro do orçamento da casa, e lembrar que os clientes vêm primeiro.
A trava continua em `ADS_V2_PRODUCT_LOCK_MODE = 'internal'` (lib/ads/v2ShotLists.ts). Só as contas da casa passam pelo canto reservado.

## O que o reteste da Fiel 4 mostrou e o que mudou

Resultado completo: `docs/RESULTADO-VALIDACAO-ADS-FIEL-4-2026-10-15.md` (pedido **08ef80e5**; quadros em `C:\kineo-wt\prints-1610\fiel4-*`).
O canto reservado funcionou: 3/3 cenas no canto, lados direita · esquerda · direita, nenhum rosto coberto, e a refação por gente no canto
funcionou. **Faltou uma coisa:** o produto ficou na FRENTE da face do móvel, não EM CIMA do tampo. O Nano Banana desenhou o tampo em 59–71%
da altura (o pedido era 73–93%) e a base foi colada fixa em 85%. A conferência 'high' ainda devolveu caixas "redondas" (`round_boxes` 3/3).

| # | Defeito visto | Conserto | Onde |
|---|---|---|---|
| A | Base fixa em 85%, abaixo do tampo desenhado (0,59 · 0,59 · 0,71) | A conferência também pede **`top_edge_y`**: a altura da borda de cima do tampo no canto, com 3 casas. Só vale se não for "redonda" (múltiplo de 0,05, julgado na resposta crua), estiver em **[0,50; 0,93]** no quadro (a borda passa pela mesma janela `cover` da imagem) e vier com `corner_surface = true`. Confiável: a base do produto vai ao **tampo + 0,005**, no mesmo lado e com a mesma margem (o lado direito do 9:16 segue terminando em x ≈ 0,84), com o mesmo teto de altura (28%/32%/35%) e de largura. Se o alto do produto passaria do **terço de cima**, ele encolhe (preso pela base) até **70%**; nem assim, base fixa. Se subir ao tampo tocaria um rosto **confiável**, base fixa. Não confiável ou sem resposta: a base fixa de antes (85%/88%/90%). | `lib/ads/v2ShotLists.ts` (`adsV2LockCheckQuestionTop`, `adsV2ParseLockCheckTop`, `adsV2LockTopRound`, `adsV2LockTopEdgeTrust`, `adsV2LockReservedPlace`, `ADS_V2_LOCK_TOP_*`), `lib/ads/v2LockVision.ts` (`adsV2LockCheckBody`, `adsV2SceneCheck`), `lib/ads/v2Png.ts` (`adsV2TopEdgeToFrame`, `adsV2ReservedLayoutTop`), `lib/ads/v2ProductLockServer.ts` (`adsV2FinishReservedScene`) |
| B | O tampo nasceu alto | O pedido da imagem diz a geometria em proporção: "the empty tabletop surface occupies the bottom 15–25% of the frame; its top edge is at about 78% of the frame height" (80% no 4:5 e no 1:1), móvel **baixo** visto um pouco de cima, e aceita o **chão ou tapete** do canto para cena sem mesa. | `adsV2LockedScenePromptAt` |
| C | Sombra caía na face da frente do móvel | A sombra de contato nasce na base do **mesmo** retângulo que foi conferido e colado (no tampo, quando a base veio do tampo). | `adsV2PlacedFramePng` |
| D | Sem registro do porquê | Evento `ads_v2_product_locked`: **`placement.base_source`** (`'tabletop'` ou `'fixed'`), `placement.base`, **`placement.top_edge_y`** (no quadro), `placement.top_edge_why` (`round`, `out_of_range`, `no_surface`, `no_answer`, `too_tall`, `face` ou nulo), **`check.round`** e `check.top_edge_raw`. | `lib/ads/v2Advance.ts` (`finishReservedScene`) |

Com os números reais do reteste (recorte 273×376 no 9:16): tampo 0,59 à direita → produto 364×502 com base em 0,595 (o alto para em 0,333);
0,59 à esquerda → 364×502, base 0,595; 0,71 à direita → 367×506 (tamanho cheio), base 0,715. Um 0,60 "redondo" fica na base fixa (0,85).

O que **não** mudou: cobrança, preço, acesso, recorte, lado alternado, refação por canto ocupado, closes, frases e duração.

Guardião: `node scripts/test-ads-fiel-5-1510.mjs` (provas com os números reais + mutantes). Os guardiões antigos da trava (fiel-1510,
fiel-2, fiel-3, fiel-4, lista, refação do ator, demo Universo) leem os arquivos sem este conserto pelo desfaz encadeado
`scripts/test-support/desfaz-ads-fiel-5-1510.mjs` (byte a byte).

## Render de validação: Só o T1, na conta da casa

| # | Pedido | Créditos | fal (estimado) | O que olhar |
|---|---|---|---|---|
| 1 | **Refazer o T1**: a mesma foto Atheeri (`prints-1610\atheeri-produto.jpg`), "Perfume Atheeri", "num hotel com chuva", Auto, **Comercial 15 s 9:16**, PT, Um produto | **41 cr** | ~US$ 2,40 + ~US$ 0,02 de conferência; ~US$ 0,15 a mais por cena refeita | o produto **em cima do tampo** (não na frente do móvel), direita · esquerda · direita, nenhum rosto coberto, sombra no tampo |

### Dry-run antes (US$ 0)
O `/plan` e o dry-run do `/start` de sempre, com os mesmos parâmetros. Tem de dar **41 cr** e `charged:false`. Ler o saldo da fal antes e
depois.

### Como conferir (SQL só de leitura, projeto `cqqukkvjjrguayiyjvhh`)
```sql
-- onde a base pousou (tampo ou fixa), a borda lida e se a conferência chutou
select metadata->>'idx' idx, metadata->'rect' rect,
       metadata->'placement'->>'base_source' base_source, metadata->'placement'->>'base' base,
       metadata->'placement'->>'top_edge_y' top_edge_y, metadata->'placement'->>'top_edge_why' por_que,
       metadata->'check'->>'round' check_round, metadata->'check'->>'top_edge_raw' borda_crua, metadata->'check'->>'why' conferencia
from events where name = 'ads_v2_product_locked' and created_at > '<marco>'::timestamptz order by created_at;
-- refações por canto ocupado e quedas para a foto real
select name, metadata->>'idx' idx, metadata->>'to' para, metadata->>'reason' motivo, metadata->>'problem' problema
from events where name in ('ads_v2_shot_fallback', 'ads_v2_shot_retried') and created_at > '<marco>'::timestamptz order by created_at;
```
Baixar as imagens travadas (`…-p<k>-a<n>-lock.png`) e medir à mão a borda do tampo em cada uma.

### Critérios de aprovação
- **Pousado:** em toda cena de gente, a base do produto está no tampo (ou no chão do canto), não na face da frente do móvel. Pelo evento:
  `base_source = 'tabletop'` e a base até ~1 ponto abaixo da borda medida à mão.
- **Base fixa:** aceitável quando o tampo veio na faixa pedida (~0,78) e a base fixa caiu sobre ele. Se aparecer `base_source = 'fixed'`
  com o tampo bem acima de 0,85, ler `top_edge_why`: `round` = a 'high' ainda chuta a borda (registrar); `out_of_range`/`too_tall` = o tampo
  nasceu alto demais (o pedido não foi obedecido).
- **Sem regressão:** lado direita · esquerda · direita, nenhum rosto coberto, o lado direito termina em x ≤ 0,84, teto de 28%, nada no
  terço de cima, frases na zona segura, nenhum objeto inventado nas mãos, MP4 ≤ 15,5 s, cartão ≤ 3 s.
- **Conferência:** registrar `check.round` das 3 cenas (no reteste da Fiel 4 foram 3/3).

### Riscos conhecidos (olhar no T1)
- A 'high' pode chutar a borda num valor "não redondo" errado. A faixa [0,50; 0,93], o terço de cima e a proteção de rosto limitam o
  estrago, mas um tampo lido 5 pontos acima do real faria o produto boiar um pouco. Comparar a borda do evento com a medida à mão.
- Com a base no tampo, o produto sobe e fica menor quando o tampo está alto (até 70%). Conferir se continua legível no celular.
- A frase de tela evita o produto pelo JSON ao lado do quadro; com o produto mais alto, conferir que a frase não cai sobre ele.

## Virada para `'all'`
Só com o T1 aprovado e o "vai" do fundador: `ADS_V2_PRODUCT_LOCK_MODE = 'all'` (uma linha, lib/ads/v2ShotLists.ts). Os guardiões fiel-3,
fiel-4 e fiel-5 conferem que a trava ainda está em `'internal'` e precisam ser ajustados junto com a virada.
