# Plano de validação paga: Ads Fiel 6 (KINEO-ADS-FIEL-6-1610, 16/10/2026)

**Nada disto foi rodado.** O render pago depende do "vai" do fundador. O último saldo da fal lido foi US$ 14,21 (15/10 20:05 UTC, depois
do reteste da Fiel 5). Ler o saldo antes e depois, dentro do orçamento da casa, e lembrar que os clientes vêm primeiro.
A trava continua em `ADS_V2_PRODUCT_LOCK_MODE = 'internal'` (lib/ads/v2ShotLists.ts, o rollback de 15/10 noite). Só as contas da casa
passam pelo canto reservado. Este conserto **não** religa a trava para os clientes.

## O que o reteste da Fiel 5 mostrou e o que mudou

Resultado completo: `docs/RESULTADO-VALIDACAO-ADS-FIEL-5-2026-10-15.md` (pedido **96788559**; quadros em `C:\kineo-wt\prints-1610\fiel5-*`).
O anúncio saiu sem nenhuma cena de gente: as 3 cenas foram descartadas pela conferência e viraram a foto da caixa. Duas causas, as duas na
conferência, não no Nano Banana:

| # | Defeito visto | Conserto | Onde |
|---|---|---|---|
| A | A pergunta dizia "for example 0.637" e as **6 respostas** devolveram `top_edge_raw` 0,637 (o tampo real ia de ~0,61 a ~0,77) | A pergunta não tem **nenhum número de exemplo**: descreve o formato ("written with three digits after the decimal point, never a rounded default and never a number copied from this question"). Borda igual a **qualquer número do próprio texto da pergunta** (as coordenadas da região, 0,52 · 0,84…) ou ao eco já visto (0,637) = `'copied'`; igual à borda que **outra cena do mesmo pedido** devolveu = `'repeated'`. Nos dois casos a base é a fixa. As caixas de rosto e de corpo passam pelo mesmo filtro, uma a uma (redonda, copiada ou repetida = não conta). | `lib/ads/v2ShotLists.ts` (`adsV2LockCheckQuestionTop`, `adsV2QuestionNumbers`, `adsV2LockEchoesQuestion`, `adsV2LockBoxEchoes`, `adsV2LockReliableBoxes`, `adsV2LockTopEdgeTrust6`, `ADS_V2_LOCK_ECHO_NUMBERS`) |
| B | `corner_person = true` em 5 de 6 imagens com o canto **vazio**: as cenas boas foram descartadas | "Gente no canto" sozinho **nunca** descarta. Só descarta com corroboração geométrica: um rosto **confiável** que toca o retângulo do produto (com a folga e o pescoço de sempre) ou uma caixa de **corpo** confiável (pergunta nova, item 5, `people`) que cobre ≥ 5% do retângulo. Sem isso, o canto fica e o produto é colado (`check.corner = 'corner_person_sem_caixa'`). | `adsV2LockCornerVerdict6`, `adsV2LockBoxCover`, `ADS_V2_LOCK_BODY_MIN_OVERLAP`, `adsV2ParseLockCheck6`, `lib/ads/v2LockVision.ts` |
| C | Sem limite: a conferência podia jogar fora o anúncio inteiro | **Limite global:** se esta cena seria descartada e, com ela, mais da metade das cenas travadas do pedido (no mínimo 2), a conferência é que está errada: a cena fica, na base fixa, sem usar rosto nem borda dela (`check.why = 'conferencia_suspeita'`). Cada conferência grava um registro `…-p<k>-a<n>-check-t<1|2>.json` (mesmo quando descarta), que as outras cenas do pedido leem. | `adsV2LockCheckSuspicious`, `adsV2LockCheckRecord`, `adsV2LockHistoryOf`, `lib/ads/v2ProductLockServer.ts` (`adsV2FinishReservedScene`, `adsV2ReadLockChecks`), `lib/ads/v2Advance.ts` (`finishReservedScene`, `lockSceneCount`, `lockSiblingRows`) |
| D | Base no tampo | Só usa `top_edge_y` quando a borda passa nas regras novas **e** nas da Fiel 5 (não redonda, faixa [0,50; 0,93], `corner_surface = true`); senão, base fixa (85% no 9:16). | `adsV2FinishReservedScene` |

Com as 6 respostas reais do 96788559, o guardião roda o avanço com o código de antes (3 refações e 3 fotos da caixa, como no reteste) e com
o de agora (as 3 cenas de gente ficam no canto, base fixa porque a borda 0,637 é `'copied'`; só refaz a cena cujo rosto caiu dentro do
retângulo).

Limitações conhecidas: duas cenas conferidas no mesmo instante não se enxergam (o registro da outra ainda não existe), então a repetição e o
limite global valem para quem vem depois. Com a conferência suspeita, a cena fica mesmo que o canto tenha mesmo alguém: é a escolha do
fundador (melhor a cena de gente do que o slideshow da caixa), e por isso o render abaixo olha rosto por rosto.

O que **não** mudou: cobrança, preço, acesso, recorte, lado alternado, refação por canto ocupado (uma só por plano), closes, frases e duração.

Guardião: `node scripts/test-ads-fiel-6-1610.mjs` (provas com os números reais + mutantes). Os guardiões antigos da trava leem os arquivos
sem este conserto pelo desfaz encadeado `scripts/test-support/desfaz-ads-fiel-6-1610.mjs`, chamado primeiro por `semFiel5_1510`,
`desfazFiel5_1510`, `semVolta1510` e `desfazVolta1510` (e, por estes, `semFielLiga1510`).

## Render de validação: Só o T1, na conta da casa

| # | Pedido | Créditos | fal (estimado) | O que olhar |
|---|---|---|---|---|
| 1 | **Refazer o T1**: a mesma foto Atheeri (`prints-1610\atheeri-produto.jpg`), "Perfume Atheeri", "num hotel com chuva", **Automático** (se a tela sugerir "Close do produto", trocar antes do plano final), **Comercial 15 s 9:16**, PT, Um produto | **41 cr** | ~US$ 2,40 + ~US$ 0,02 de conferência; ~US$ 0,15 a mais por cena refeita | 3 cenas de gente com o produto no canto (direita · esquerda · direita), nenhum rosto coberto, produto no tampo ou na base fixa sem boiar |

### Dry-run antes (US$ 0)
O `/plan` e o dry-run do `/start` de sempre, com os mesmos parâmetros. Tem de dar **41 cr** e `charged:false`. Ler o saldo da fal antes e
depois. Só seguir para o pago com o dry-run certo na mão.

### Como conferir (SQL só de leitura, projeto `cqqukkvjjrguayiyjvhh`)
```sql
-- as cenas que ficaram: onde a base pousou e o que a conferência disse
select metadata->>'idx' idx, metadata->'placement'->>'side' lado,
       metadata->'placement'->>'base_source' base_source, metadata->'placement'->>'top_edge_y' top_edge_y,
       metadata->'placement'->>'top_edge_why' top_edge_why, metadata->'check'->>'top_edge_raw' borda_crua,
       metadata->'check'->>'corner' canto, metadata->'check'->>'why' conferencia, metadata->'check'->>'corner_person' corner_person
from events where name = 'ads_v2_product_locked' and metadata->>'order_id' = '<pedido>' order by created_at;
-- refações e quedas para a foto real
select metadata->>'idx' idx, metadata->>'to' para, metadata->>'reason' motivo, metadata->>'problem' problema, metadata->'check'->>'corner' canto
from events where name = 'ads_v2_shot_fallback' and metadata->>'order_id' = '<pedido>' order by created_at;
```
Baixar as imagens de cena e as travadas (`…-lock.png`) e os registros `…-check-t1.json`/`…-check-t2.json`; medir à mão a borda do tampo e
olhar o canto em cada uma.

### Critérios de aprovação
- **Cenas de gente no vídeo:** as 3 cenas travadas chegam como `ads_v2_product_locked` (`placement.source = 'reserved'`). Nenhuma
  `product_photo` com `lock_corner_busy` quando o canto está vazio na imagem.
- **Canto:** `check.corner` é `null` ou `'corner_person_sem_caixa'` nas cenas com canto vazio. `'face_in_rect'`/`'body_in_rect'` só onde a
  imagem tem de fato rosto ou mãos no canto (conferir à mão).
- **Borda:** nenhuma resposta 0,637. Se a borda vier igual entre cenas ou igual a um número da pergunta, `top_edge_why` = `'repeated'` ou
  `'copied'` e a base é a fixa (aceitável). Com `base_source = 'tabletop'`, a base fica até ~1 ponto abaixo da borda medida à mão.
- **Suspeita:** se aparecer `check.why = 'conferencia_suspeita'`, registrar quantas e olhar o canto: tem de estar vazio ou com o produto
  sem cobrir rosto.
- **Sem regressão:** nenhum rosto coberto, nada inventado nas mãos, o lado direito termina em x ≤ 0,84, teto de 28%, nada no terço de cima,
  frases na zona segura, MP4 ≤ 15,5 s, cartão ≤ 3 s, `ads_v2_failed` nenhum.
- **Reprovado** se: o vídeo sai de novo como slideshow da caixa, um rosto é coberto, ou o produto boia sobre parede/vão.

### Riscos conhecidos (olhar no T1)
- A 'high' pode passar a chutar a borda num número "não redondo" diferente em cada cena. A faixa, o terço de cima e a proteção de rosto
  limitam o estrago; comparar a borda do evento com a medida à mão.
- A caixa de corpo é larga: uma pessoa encostada no canto descarta a cena (é o objetivo). Se isso derrubar mais da metade, a suspeita mantém
  as cenas, e aí é olhar se o produto não cobre ninguém.
- O Kling O3 travou 2 cenas de foto no reteste (`stuck:shot_stuck`). Não é da trava; anotar se repetir.

## Virada para `'all'`
Só com o T1 aprovado e o "vai" do fundador: `ADS_V2_PRODUCT_LOCK_MODE = 'all'` (uma linha, lib/ads/v2ShotLists.ts), com os guardiões da
trava ajustados junto (o rollback e este guardião conferem `'internal'`).
